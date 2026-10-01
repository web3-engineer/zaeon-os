/**
 * Fila de turnos do chat da Aura (BullMQ sobre Redis) — o clone de lib/queue/scholar.ts
 * pra Fase 3 ("sai da sala, a Aura continua e você reengata").
 *
 * Mesma conexão ioredis E mesmo carregador opcional do bullmq que a fila scholar: bullmq
 * nunca é importado no topo (o web sobe mesmo sem o pacote). Sem REDIS_URL ou sem bullmq,
 * `enqueueChatJob` devolve false e o /api/ai/chat segue no modo inline de sempre.
 *
 * Quem consome: o Worker("chat") que instrumentation.ts sobe junto do scholar quando
 * SCHOLAR_WORKER=1 (mesmo container). O processamento em si é processChatJob (chat-worker.ts).
 */
import { getRedisConnection, isQueueEnabled, loadBullmq } from "@/lib/queue/scholar";
import type { ChatTurnParams } from "@/lib/agent/runChatTurn";

export const CHAT_QUEUE = "chat";

export type ChatJobData = ChatTurnParams & { turnId: string };

let _queue: any = null; // Queue<ChatJobData> — sem tipar pra não importar bullmq no topo

export { isQueueEnabled };

/** Opções da fila — exportadas pra teste (a decisão de attempts é de produto, não detalhe). */
export const CHAT_JOB_OPTIONS = {
  // attempts: 1, e não 2 como no scholar. Um turno que FALHOU já foi marcado como erro
  // no ChatTurn e o cliente já mostrou a mensagem; retentar reabriria o turno por baixo
  // dele e gastaria modelo de novo. O caso que importa (worker morrer no meio) não
  // depende de attempts: o BullMQ devolve job "stalled" pra fila sozinho.
  attempts: 1,
  removeOnComplete: 100,
  removeOnFail: 200,
} as const;

async function getChatQueue(): Promise<any | null> {
  if (!isQueueEnabled()) return null;
  if (_queue) return _queue;
  const bull = await loadBullmq();
  if (!bull) return null;
  _queue = new bull.Queue(CHAT_QUEUE, { connection: getRedisConnection() as any, defaultJobOptions: CHAT_JOB_OPTIONS });
  return _queue;
}

/** Enfileira o turno. false = sem fila (o chamador cai no inline). jobId = turnId → idempotente. */
export async function enqueueChatJob(data: ChatJobData): Promise<boolean> {
  const q = await getChatQueue();
  if (!q) return false;
  await q.add("turn", data, { jobId: data.turnId });
  return true;
}
