/**
 * lib/queue/reenfileirar.ts — G4 (Fatia 7): o que a fila faz com um job cujo LLM falhou. PURO.
 *
 * Usado por chores (agent-chores) e, quando existirem, agent-tasks (A4) e programa-ciclo (A8).
 * Adoção no processor (1 linha no catch):
 *
 *   const d = decidir(e, new Date(), job.data.expiraEm, job.attemptsMade);
 *   if (d.acao === "adiar")   { await store.adiar(id, d.ate); await job.moveToDelayed(d.ate.getTime(), token); throw new DelayedError(); }
 *   if (d.acao === "expirar") { await store.expirar(id); return; }
 *   await store.falhar(id, d.classe);
 *
 * Pool esgotado NÃO é erro de app (lei 5): nada no fio; só o humano que pediu e viu expirar
 * recebe 1 linha (messageForError("pool_esgotado")).
 */
import { ErroLlm, PoolEsgotadoError, retryAfterDoPool, POOL_BACKOFF_MAX_MS } from "@/lib/llm/envelope";
import { classificarErroLlm, type ClasseErroLlm } from "@/lib/llm/usage";

export type Decisao = { acao: "adiar"; ate: Date } | { acao: "expirar" } | { acao: "falhar"; classe: ClasseErroLlm };

/** Jobs que dependem do pool vivem 24h; depois disso o pool esgotado vira `expired`. */
export const EXPIRA_MS = 24 * 60 * 60_000;
export const RATE_LIMIT_BASE_MS = 60_000;
export const RATE_LIMIT_MAX_MS = 15 * 60_000;
export const TIMEOUT_ADIA_MS = 60_000;

/** `createdAt + 24h` — o `expiraEm` de quem nasce dependendo do pool. */
export const expiraEmDe = (createdAt: Date): Date => new Date(createdAt.getTime() + EXPIRA_MS);

const classeDe = (e: unknown): ClasseErroLlm => (e instanceof ErroLlm ? e.classe : classificarErroLlm(e));

/**
 * erro × relógio × prazo → adiar | expirar | falhar.
 *  - pool_esgotado → adiar min(retryAfterMs, 30min, expiraEm − agora); já passou do prazo → expirar
 *  - rate_limit / provedor_fora → adiar 60s × 2^tentativa (teto 15min, nunca além do prazo); passou → expirar
 *  - timeout → adiar 1× (tentativa 0) e depois falhar
 *  - auth | credito | teto | cota_esgotada | modelo_inexistente | resposta_nao_json | outro → falhar
 */
export function decidir(erro: unknown, agora: Date, expiraEm: Date | string | number, tentativa = 0): Decisao {
  const classe = classeDe(erro);
  const fim = new Date(expiraEm).getTime();
  const t = agora.getTime();
  const restante = Number.isFinite(fim) ? fim - t : Infinity;
  const adiar = (ms: number): Decisao => ({ acao: "adiar", ate: new Date(t + Math.max(1_000, Math.min(ms, restante))) });
  const n = Math.max(0, Math.floor(tentativa || 0));

  if (classe === "pool_esgotado") {
    if (restante <= 0) return { acao: "expirar" };
    const ms = erro instanceof PoolEsgotadoError ? erro.retryAfterMs : retryAfterDoPool(erro, n);
    return adiar(Math.min(ms, POOL_BACKOFF_MAX_MS));
  }
  if (classe === "rate_limit" || classe === "provedor_fora") {
    if (restante <= 0) return { acao: "expirar" };
    return adiar(Math.min(RATE_LIMIT_BASE_MS * 2 ** n, RATE_LIMIT_MAX_MS));
  }
  if (classe === "timeout" && n === 0 && restante > 0) return adiar(TIMEOUT_ADIA_MS);
  return { acao: "falhar", classe };
}

// ───────────────────────────── adoção no processor ─────────────────────────────
export type JobAdiavel = { moveToDelayed(timestamp: number, token?: string): Promise<void> };
export type StoreReenfileirar = {
  adiar(ate: Date): Promise<void>;
  expirar(): Promise<void>;
  falhar(classe: ClasseErroLlm): Promise<void>;
};

/**
 * Aplica a Decisao num job do BullMQ. `adiar` grava `delayed`, move o job e LANÇA o DelayedError
 * do bullmq (é o protocolo dele: o worker não marca falha nem conclusão). `expirar`/`falhar` só gravam.
 * Devolve o que aconteceu para quem quiser avisar o humano (só em "expirado" e só com requesterId).
 */
export async function aplicarDecisao(
  d: Decisao, job: JobAdiavel, token: string | undefined, store: StoreReenfileirar, DelayedErrorCtor: new () => Error,
): Promise<"expirado" | "falhou"> {
  if (d.acao === "adiar") {
    await store.adiar(d.ate);
    await job.moveToDelayed(d.ate.getTime(), token);
    throw new DelayedErrorCtor();
  }
  if (d.acao === "expirar") { await store.expirar(); return "expirado"; }
  await store.falhar(d.classe);
  return "falhou";
}
