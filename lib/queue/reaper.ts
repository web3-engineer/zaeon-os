/**
 * Reaper — higiene no boot do worker (instrumentation.ts).
 *
 * Um job que estava rodando quando o processo morreu (deploy, OOM, reinício) deixa o
 * ChatTurn/ScholarSession preso em queued/running pra sempre, e o cliente fica pollando
 * até o próprio teto. Aqui, tudo que está nesses estados e não é tocado há mais de
 * STUCK_MS vira `error`. Idempotente: rodar duas vezes não muda nada na segunda.
 *
 * Por que `updatedAt` e não `createdAt`: um turno longo mas VIVO continua gravando o
 * parcial (e a sessão de pesquisa, seus eventos) — então updatedAt anda. Só o que parou
 * de verdade fica pra trás.
 */
export const STUCK_MS = 15 * 60 * 1000;

type UpdateMany = (args: { where: any; data: any }) => Promise<{ count: number }>;
export type ReaperDb = {
  chatTurn: { updateMany: UpdateMany };
  scholarSession: { updateMany: UpdateMany };
};

export async function reapStuckJobs(db: ReaperDb, now: Date = new Date()): Promise<{ chatTurns: number; scholarSessions: number }> {
  const cutoff = new Date(now.getTime() - STUCK_MS);
  const where = { status: { in: ["queued", "running"] }, updatedAt: { lt: cutoff } };
  const [chat, scholar] = await Promise.all([
    db.chatTurn.updateMany({ where, data: { status: "error", error: "reaper: turno preso (worker reiniciou no meio)" } }),
    // ScholarSession não tem campo de erro próprio: o erro mora no thread (como no worker).
    db.scholarSession.updateMany({ where, data: { status: "error", thread: { error: "Pesquisa interrompida — tenta de novo." } } }),
  ]);
  const out = { chatTurns: chat.count, scholarSessions: scholar.count };
  console.log(`[reaper] presos → error: chatTurns=${out.chatTurns} scholarSessions=${out.scholarSessions}`);
  return out;
}
