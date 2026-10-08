/**
 * lib/queue/chores.ts — fila `agent-chores` (C8), no molde de lib/canal/queue.ts.
 *
 *   CHORES_QUEUE=1 (+ REDIS_URL) → BullMQ; o worker (CHORES_WORKER=1, instrumentation) consome.
 *   Sem fila → INLINE só para chore pedida por humano (requesterId); autônoma = "recusado" + warn.
 *   Erro de LLM → decidir() (G4): pool esgotado/rate limit = `delayed` (moveToDelayed), não falha.
 *   Expirou e havia humano esperando → 1 mensagem EFÊMERA (messageForError("pool_esgotado")).
 * Serialização: emSerie(`chore:${canalId ?? agentKey}`) — uma chore por canal por vez.
 */
import { emSerie } from "@/lib/canal/serial";
import { runChore, type RunDeps, type RunResultado } from "@/lib/chore/run";
import { adiar, expirar, falhar, postsHoje, type ChoreDb, type ChoreRow } from "@/lib/chore/store";
import { aplicarDecisao } from "@/lib/queue/reenfileirar";

export const CHORES_QUEUE = "agent-chores";
type Env = Record<string, string | undefined>;

export const filaLigada = (env: Env = process.env): boolean => env.CHORES_QUEUE === "1" && Boolean(env.REDIS_URL);
/** BullMQ não aceita jobId com ":" (fora do formato de 3 partes) — o jobId do banco tem 4. */
export const bullJobId = (jobId: string): string => jobId.replace(/:/g, "_");
const chaveSerie = (row: Pick<ChoreRow, "canalId" | "agentKey">) => `chore:${row.canalId ?? row.agentKey}`;

async function loadBullmq(): Promise<any | null> {
  try { const spec = "bull" + "mq"; return await import(/* webpackIgnore: true */ spec as any); } catch { return null; }
}

let _queue: any = null;
async function getQueue(): Promise<any | null> {
  if (!filaLigada()) return null;
  if (_queue) return _queue;
  const bull = await loadBullmq();
  if (!bull) return null;
  const { getRedisConnection } = await import("@/lib/queue/scholar");
  _queue = new bull.Queue(CHORES_QUEUE, {
    connection: getRedisConnection() as any,
    // attempts:1 — quem decide repetir é o decidir() (moveToDelayed), não o retry cego do BullMQ.
    defaultJobOptions: { attempts: 1, removeOnComplete: 200, removeOnFail: 200 },
  });
  return _queue;
}

// ───────────────────────────── deps reais ─────────────────────────────

/** Prisma + Pusher + envelope + Leitor. Separado para teste injetar outra coisa. */
export async function depsReais(env: Env = process.env): Promise<RunDeps> {
  const { prisma } = await import("@/src/lib/prisma");
  const { gerar } = await import("@/lib/llm/envelope");
  const { lerUrl } = await import("@/lib/leitor/cliente");
  const { publicarPusher, EV_MENSAGEM } = await import("@/lib/canal/realtime");
  const db = prisma as unknown as ChoreDb;
  return {
    db, env, agora: Date.now,
    gerar: (req) => gerar(req),
    lerUrl: (url, opts) => lerUrl(url, { ...opts, env }),
    postsHoje: (canalId) => postsHoje(db, canalId),
    async postar({ canalId, agentKey, texto }) {
      // CanalMensagem ainda não tem parentId (thread = Fatia 2): posta na raiz; o parentId fica no destino da chore.
      const row = await (prisma as any).canalMensagem.create({ data: { canalId, autorTipo: "agente", autorId: agentKey, texto, mencoes: [] } });
      const ident = await identidade(prisma, agentKey);
      await publicarPusher(canalId, EV_MENSAGEM, {
        id: row.id, canalId, autorTipo: "agente", autorId: agentKey, texto: row.texto, mencoes: [],
        createdAt: new Date(row.createdAt).toISOString(), autorNome: ident.nome, autorAvatar: ident.avatarUrl,
      });
      return { id: row.id };
    },
  };
}

async function identidade(prisma: any, agentKey: string): Promise<{ nome: string; avatarUrl: string | null }> {
  try {
    const { rosterComMentores, mergeProfiles } = await import("@/lib/agents/roster");
    const [mentores, profiles] = await Promise.all([prisma.mentorTemplate.findMany().catch(() => []), prisma.agentProfile.findMany().catch(() => [])]);
    const a = mergeProfiles(rosterComMentores(mentores), profiles).find((x: any) => x.agentKey === agentKey);
    return { nome: a?.nome ?? agentKey, avatarUrl: a?.avatarUrl ?? null };
  } catch { return { nome: agentKey, avatarUrl: null }; }
}

/** Falhas que o humano precisa saber (lei 5: fora do ar se declara). As outras ficam no admin. */
export const MOTIVOS_DECLARAVEIS = ["leitor_dominio_fora_da_lista", "leitor_offline", "skill_offline"] as const;

/** Humano esperando + (expirou | falha declarável) → 1 linha efêmera. Autônoma: silêncio. */
async function avisarHumano(row: ChoreRow, code: "pool_esgotado" | (typeof MOTIVOS_DECLARAVEIS)[number]): Promise<void> {
  if (!row.requesterId || !row.destino?.canalId) return;
  try {
    const { messageForError } = await import("@/lib/agent/errors");
    const { publicarPusher, EV_MENSAGEM } = await import("@/lib/canal/realtime");
    await publicarPusher(row.destino.canalId, EV_MENSAGEM, {
      id: `efemera-${Date.now()}`, canalId: row.destino.canalId, autorTipo: "agente", autorId: row.agentKey,
      texto: messageForError(code), mencoes: [], createdAt: new Date().toISOString(), efemera: true,
    });
  } catch { /* best-effort */ }
}

// ───────────────────────────── processar (worker e inline) ─────────────────────────────

type JobLike = { data: { id: string }; attemptsMade?: number; moveToDelayed(ts: number, token?: string): Promise<void> };

/** O processor: roda a chore e aplica a decisão da fila. `DelayedErrorCtor` = o do bullmq (worker). */
export async function processarChore(
  id: string, deps: RunDeps, job: JobLike | null, token: string | undefined, DelayedErrorCtor: new () => Error, tentativa = 0,
): Promise<RunResultado | null> {
  const row = (await deps.db.agentChore.findUnique({ where: { id } })) as ChoreRow | null;
  if (!row) return null;
  if (row.status === "done" || row.status === "skipped" || row.status === "expired" || row.status === "failed") return null; // idempotente
  const r = await emSerie(chaveSerie(row), () => runChore(row, deps, { tentativa }));
  if (r.status === "failed" && (MOTIVOS_DECLARAVEIS as readonly string[]).includes(r.motivo)) await avisarHumano(row, r.motivo as (typeof MOTIVOS_DECLARAVEIS)[number]);
  if (r.status !== "decidir") return r;
  const store = {
    adiar: (ate: Date) => adiar(deps.db, row.id, ate),
    expirar: () => expirar(deps.db, row.id),
    falhar: (classe: string) => falhar(deps.db, row.id, classe, { ms: r.ms, chamadasLlm: r.chamadasLlm }),
  };
  if (job) {
    const fim = await aplicarDecisao(r.decisao, job, token, store, DelayedErrorCtor); // adiar LANÇA o DelayedError
    if (fim === "expirado") await avisarHumano(row, "pool_esgotado");
    return r;
  }
  // inline (sem fila): adiar = timer no próprio processo (dev / web sem Redis). Morreu o processo → expira em 24h.
  if (r.decisao.acao === "adiar") {
    await store.adiar(r.decisao.ate);
    const espera = Math.max(1_000, r.decisao.ate.getTime() - Date.now());
    setTimeout(() => { void processarChore(id, deps, null, undefined, DelayedErrorCtor, tentativa + 1).catch(() => undefined); }, espera).unref?.();
  } else if (r.decisao.acao === "expirar") { await store.expirar(); await avisarHumano(row, "pool_esgotado"); }
  else await store.falhar(r.decisao.classe);
  return r;
}

class DelayedInline extends Error {}

/**
 * Dispara a chore. "fila" | "inline" | "recusado". Nunca lança.
 * Inline SÓ com requesterId (pedida por humano); autônoma sem fila = recusado + warn (P3 nasce com worker).
 */
export async function dispararChore(row: ChoreRow, deps: () => Promise<RunDeps> = depsReais): Promise<"fila" | "inline" | "recusado"> {
  try {
    const q = await getQueue();
    if (q) { await q.add("chore", { id: row.id }, { jobId: bullJobId(row.jobId) }); return "fila"; }
  } catch (e) {
    console.warn("[chores] fila indisponível:", (e as Error)?.message);
  }
  if (!row.requesterId) { console.warn(`[chores] chore autônoma ${row.jobId} sem fila (CHORES_QUEUE=1 + REDIS_URL) — recusada`); return "recusado"; }
  void deps().then((d) => processarChore(row.id, d, null, undefined, DelayedInline)).catch((e) => console.warn("[chores] inline falhou:", (e as Error)?.message));
  return "inline";
}

/** Reaper: `running` parado há mais de STUCK_MS → failed("reaper"). delayed/queued poupados. */
export async function reapChoresPresas(db: { agentChore: { updateMany(a: { where: any; data: any }): Promise<{ count: number }> } }, agora = new Date()): Promise<number> {
  const { STUCK_MS } = await import("@/lib/queue/reaper");
  const r = await db.agentChore.updateMany({ where: { status: "running", updatedAt: { lt: new Date(agora.getTime() - STUCK_MS) } }, data: { status: "failed", motivo: "reaper" } });
  if (r.count) console.log(`[chores] reaper: ${r.count} presas → failed`);
  return r.count;
}

/** Worker BullMQ (instrumentation, CHORES_WORKER=1). */
export async function iniciarWorkerChores(env: Env = process.env): Promise<boolean> {
  if (env.CHORES_WORKER !== "1" || !filaLigada(env)) return false;
  const bull = await loadBullmq();
  if (!bull) return false;
  const { Worker, DelayedError } = bull as { Worker: new (n: string, p: (job: any, token?: string) => Promise<void>, o: Record<string, unknown>) => { on(ev: string, fn: (...a: any[]) => void): void }; DelayedError: new () => Error };
  const { getRedisConnection } = await import("@/lib/queue/scholar");
  const deps = await depsReais(env);
  await reapChoresPresas(deps.db as any).catch((e) => console.warn("[chores] reaper falhou:", (e as Error)?.message));
  const concurrency = Math.max(1, Number(env.CHORES_WORKER_CONCURRENCY || 2) || 2);
  const tentativas = new Map<string, number>();
  const worker = new Worker(CHORES_QUEUE, async (job, token) => {
    const id = String(job.data?.id ?? "");
    const n = tentativas.get(id) ?? 0;
    tentativas.set(id, n + 1);
    try { await processarChore(id, deps, job, token, DelayedError, n); }
    finally { if (tentativas.size > 5_000) tentativas.clear(); }
  }, { connection: getRedisConnection()! as any, concurrency });
  worker.on("failed", (job: any, e: Error) => console.error("[chores-worker] job falhou:", job?.id, e?.message));
  console.log(`[chores-worker] ouvindo "${CHORES_QUEUE}" (concurrency=${concurrency})`);
  return true;
}
