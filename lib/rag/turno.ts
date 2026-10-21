/**
 * lib/rag/turno.ts — a base RAG (pessoal + das turmas) no turno do chat da Aura.
 *
 * Roda em TODO turno (requisição inline e worker do BullMQ), então NUNCA lança nem rejeita: qualquer falha vira
 * `status: "indisponivel"` e o turno segue sem base (com `console.error("[rag/chat] ...")`). O passo inteiro (turmas no
 * Prisma + contagem + embed + SQL) tem um prazo TOTAL (`prazoMs`, padrão 5000 ms); estourou ⇒ `indisponivel` e o
 * trabalho pendurado é abandonado (a rejeição tardia é engolida, o timer é sempre limpo).
 *
 * Segurança: o escopo da busca é `{ userId, turmaIds }` com `turmaIds` vindo SÓ do Prisma — turmas em que a pessoa é
 * aluna (`TurmaMember`) ou professora dona (`Turma.professorId`). Nunca de entrada do cliente. Prisma falhou ⇒
 * `turmaIds: []` (a base pessoal ainda vale; nada de turma alheia).
 *
 * Disjuntor (estado do módulo): banco indisponível (`ehBancoIndisponivel`, inclusive `RAG_PG_URL` ausente) ou estouro
 * do prazo ⇒ pula o RAG por 60 s, sem consultar — a tailnet caída não pode somar 5 s em cada turno. Erro de SQL que
 * não é queda (bug nosso) não arma: loga e tenta no próximo turno.
 *
 * Corte de relevância: só passa trecho que casou por texto ou com similaridade cosseno ≥ corte (padrão 0.62,
 * override `RAG_CORTE_SIMILARIDADE`) — vizinho vetorial sem relação não vira "fonte" no prompt.
 */
import { buscar, type BuscaDeps, type TrechoAchado } from "./busca";
import { embedVertex } from "./embed";
import { ehBancoIndisponivel, ragPg } from "./pg";
import type { EscopoRag } from "./permissao";
import { contarBase } from "./store";

/** Similaridade cosseno mínima (medido 2026-10-21: relacionadas 0.64–0.77, não relacionadas ≤ 0.57). */
export const CORTE_SIMILARIDADE_PADRAO = 0.62;
/** Teto da pergunta que vai pra busca (embed + tsquery): prompt colado de 20 mil caracteres não vira query enorme. */
export const MAX_PERGUNTA = 2000;
const PRAZO_TOTAL_PADRAO_MS = 5000;
const DISJUNTOR_MS = 60_000;

/** O mínimo do Prisma (Mongo) para saber as turmas reais de alguém. */
export type PrismaTurmas = {
  turmaMember: { findMany(a: { where: { studentId: string }; select: { turmaId: true } }): Promise<{ turmaId: string }[]> };
  turma: { findMany(a: { where: { professorId: string }; select: { id: true } }): Promise<{ id: string }[]> };
};

export type StatusBase = "sem_usuario" | "sem_base" | "sem_trecho" | "ok" | "indisponivel";
export type BaseDoTurno = { status: StatusBase; trechos: TrechoAchado[] };

export type TurnoRagDeps = {
  prisma: PrismaTurmas;
  busca: () => BuscaDeps;
  /** Prazo total do passo RAG no turno. Padrão 5000 ms. */
  prazoMs?: number;
  /** Similaridade mínima. Padrão `RAG_CORTE_SIMILARIDADE` ou 0.62. */
  corte?: number;
  agora?: () => number;
};

/** Até quando (epoch ms) o RAG fica desligado depois de uma queda/estouro. 0 = fechado. */
let disjuntorAte = 0;

/** SÓ PARA TESTES: desarma o disjuntor. */
export function _zerarDisjuntor(): void {
  disjuntorAte = 0;
}

/** Turmas reais da pessoa: aluna (TurmaMember) ∪ professora dona (Turma.professorId). Sem duplicata nem vazio. */
export async function turmasDaPessoa(prisma: PrismaTurmas, userId: string): Promise<string[]> {
  const [membro, professor] = await Promise.all([
    prisma.turmaMember.findMany({ where: { studentId: userId }, select: { turmaId: true } }),
    prisma.turma.findMany({ where: { professorId: userId }, select: { id: true } }),
  ]);
  const ids = [...membro.map((m) => m.turmaId), ...professor.map((t) => t.id)];
  return [...new Set(ids.filter((id): id is string => typeof id === "string" && id.trim() !== ""))];
}

/** Corte de relevância: casou por texto OU similaridade ≥ corte (sem similaridade conta como 0). */
export function relevantes(trechos: TrechoAchado[], corte: number): TrechoAchado[] {
  return trechos.filter((t) => t.porTexto || (t.similaridade ?? 0) >= corte);
}

/**
 * Corte em uso: `deps.corte` quando dado; senão `RAG_CORTE_SIMILARIDADE` se for número finito em [0, 1] ("0" vale);
 * qualquer outra coisa ("62", "abc", vazio, ausente) ⇒ `CORTE_SIMILARIDADE_PADRAO`.
 */
export function corteEfetivo(corte?: number): number {
  if (corte !== undefined) return corte;
  const bruto = (process.env.RAG_CORTE_SIMILARIDADE ?? "").trim();
  const n = bruto === "" ? NaN : Number(bruto);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : CORTE_SIMILARIDADE_PADRAO;
}

/** Prisma real, importado TARDE: testes e o `next build` não tocam no Mongo. */
async function prismaReal(): Promise<PrismaTurmas> {
  const { prisma } = await import("@/src/lib/prisma");
  return prisma as unknown as PrismaTurmas;
}

function buscaReal(): BuscaDeps {
  return { db: ragPg(), embed: embedVertex, contar: (e) => contarBase(ragPg(), e) };
}

const msgDe = (e: unknown) => (e as Error)?.message ?? String(e);

/** Sempre um objeto novo: quem recebe pode mutar sem afetar o turno do vizinho. */
const indisponivel = (): BaseDoTurno => ({ status: "indisponivel", trechos: [] });

/** O trabalho do turno (pode lançar; quem chama embrulha). */
async function consultar(userId: string, pergunta: string, deps: Partial<TurnoRagDeps>): Promise<BaseDoTurno> {
  let turmaIds: string[] = [];
  try {
    turmaIds = await turmasDaPessoa(deps.prisma ?? (await prismaReal()), userId);
  } catch (e) {
    // Sem as turmas, segue só com a base pessoal — nunca com turma "adivinhada".
    console.error("[rag/chat] turmas da pessoa falharam, seguindo só com a base pessoal:", msgDe(e));
  }

  const base = (deps.busca ?? buscaReal)();
  let contagem: { pessoais: number; deTurma: number } | null = null;
  const busca: BuscaDeps = {
    ...base,
    contar: async (e) => {
      const c = await base.contar(e);
      contagem = c;
      return c;
    },
  };
  const escopo: EscopoRag = { userId, turmaIds };
  const achados = await buscar(busca, escopo, pergunta);

  const c = contagem as { pessoais: number; deTurma: number } | null;
  if (c && c.pessoais === 0 && c.deTurma === 0) return { status: "sem_base", trechos: [] };
  const trechos = relevantes(achados, corteEfetivo(deps.corte));
  return trechos.length ? { status: "ok", trechos } : { status: "sem_trecho", trechos: [] };
}

/**
 * Base RAG do turno: trechos relevantes (já filtrados por permissão e corte) ou o motivo de não haver. NUNCA lança.
 */
export async function baseParaTurno(
  entrada: { userId: string | null; pergunta: string },
  deps: Partial<TurnoRagDeps> = {},
): Promise<BaseDoTurno> {
  try {
    const userId = entrada.userId;
    if (!userId || userId.trim() === "") return { status: "sem_usuario", trechos: [] };
    const pergunta = (entrada.pergunta ?? "").trim().slice(0, MAX_PERGUNTA).trim();
    if (!pergunta) return { status: "sem_trecho", trechos: [] };

    const agora = deps.agora ?? Date.now;
    if (agora() < disjuntorAte) return indisponivel();
    const prazoMs = deps.prazoMs ?? PRAZO_TOTAL_PADRAO_MS;

    type Fim = { ok: BaseDoTurno } | { erro: unknown } | { estouro: true };
    // `.then(ok, erro)`: o trabalho NUNCA rejeita — rejeição tardia (depois do prazo) não vira unhandledRejection.
    const trabalho: Promise<Fim> = consultar(userId, pergunta, deps).then((ok) => ({ ok }), (erro) => ({ erro }));
    let timer: ReturnType<typeof setTimeout> | undefined;
    const prazo = new Promise<Fim>((resolve) => {
      timer = setTimeout(() => resolve({ estouro: true }), prazoMs);
    });
    let fim: Fim;
    try {
      fim = await Promise.race([trabalho, prazo]);
    } finally {
      if (timer) clearTimeout(timer);
    }

    if ("ok" in fim) return fim.ok;
    if ("estouro" in fim) {
      disjuntorAte = agora() + DISJUNTOR_MS;
      console.error(`[rag/chat] prazo de ${prazoMs} ms estourado, turno segue sem base (RAG desligado por 60 s)`);
      return indisponivel();
    }
    if (ehBancoIndisponivel(fim.erro)) {
      disjuntorAte = agora() + DISJUNTOR_MS;
      console.error("[rag/chat] banco da base fora do ar, turno segue sem base (RAG desligado por 60 s):", msgDe(fim.erro));
    } else {
      console.error("[rag/chat] erro na busca da base, turno segue sem base:", msgDe(fim.erro));
    }
    return indisponivel();
  } catch (e) {
    // Cinto: nada aqui deveria lançar, mas o turno do chat não pode cair por causa do RAG.
    console.error("[rag/chat] erro inesperado, turno segue sem base:", msgDe(e));
    return indisponivel();
  }
}
