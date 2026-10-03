/**
 * lib/map/queue.ts — o CHAIN WORKER (HANDOFF_CEREBRO_AURA §2): o clique na bolinha enfileira
 * `generateMap` (caro: 2 chamadas de modelo). Fila "cerebro" sobre o MESMO Redis/bullmq do scholar
 * (carregados sob demanda — o web sobe sem o pacote). jobId = `${userId}:${scopeId}` → idempotente:
 * duplo clique não gera dois cérebros. Sem fila (sem Redis), quem chama roda inline fire-and-forget.
 */
import { getRedisConnection, isQueueEnabled, loadBullmq } from "@/lib/queue/scholar";
import type { MapSurface } from "@/lib/map/store";

export const CEREBRO_QUEUE = "cerebro";

export type CerebroJobData = { userId: string; surface: MapSurface; scopeId: string; topico: string; contexto?: string; force?: boolean };

export const CEREBRO_JOB_OPTIONS = {
  attempts: 2,          // o generateMap lança em conflito de rev → vale 1 retentativa
  backoff: { type: "exponential", delay: 3_000 },
  removeOnComplete: 100,
  removeOnFail: 200,
} as const;

/** jobId determinístico: a mesma conversa nunca tem dois jobs vivos. */
export const cerebroJobId = (userId: string, scopeId: string) => `${userId}:${scopeId}`.replace(/[^\w:.-]/g, "_");

let _queue: any = null;
async function getQueue(): Promise<any | null> {
  if (!isQueueEnabled()) return null;
  if (_queue) return _queue;
  const bull = await loadBullmq();
  if (!bull) return null;
  _queue = new bull.Queue(CEREBRO_QUEUE, { connection: getRedisConnection() as any, defaultJobOptions: CEREBRO_JOB_OPTIONS });
  return _queue;
}

/** true = enfileirado (ou já na fila); false = sem fila (chamador roda inline). */
export async function enqueueGenerateMap(data: CerebroJobData): Promise<boolean> {
  const q = await getQueue();
  if (!q) return false;
  await q.add("generate", data, { jobId: cerebroJobId(data.userId, data.scopeId) });
  return true;
}

/**
 * O processamento (worker OU inline): gera o mapa, liga a Conversation ao mapa e avisa o painel.
 * Injetável pra teste. Lança em falha (o BullMQ retenta conforme attempts).
 */
export async function processCerebroJob(
  data: CerebroJobData,
  deps?: {
    generateMap?: (i: any) => Promise<{ mapa: { id: string; backbone: string[]; tipoTopico: string }; degraded: boolean }>;
    ligarConversa?: (userId: string, scopeId: string, mapaId: string) => Promise<void>;
    avisarGerado?: (ev: { mapaId: string; backbone: string[]; tipoTopico: string; degraded: boolean }) => Promise<void>;
  },
): Promise<{ mapaId: string; degraded: boolean }> {
  const generateMap = deps?.generateMap ?? (await import("@/lib/map/generateMap")).generateMap;
  const ligar = deps?.ligarConversa ?? ligarConversaAoMapa;
  const avisar = deps?.avisarGerado ?? (await import("@/lib/map/realtime")).avisarGerado;
  const r = await generateMap({ ownerId: data.userId, surface: data.surface, scopeId: data.scopeId, topico: data.topico, contexto: data.contexto, force: data.force });
  await ligar(data.userId, data.scopeId, r.mapa.id).catch(() => {});
  await avisar({ mapaId: r.mapa.id, backbone: r.mapa.backbone, tipoTopico: r.mapa.tipoTopico, degraded: r.degraded });
  return { mapaId: r.mapa.id, degraded: r.degraded };
}

/** Conversation.mapaId ← mapa (cria a linha se a conversa ainda não foi registrada). */
export async function ligarConversaAoMapa(userId: string, scopeId: string, mapaId: string): Promise<void> {
  const { prisma } = await import("@/src/lib/prisma");
  const conv = await prisma.conversation.findFirst({ where: { userId, surface: "estudos", scopeId }, select: { id: true } });
  if (conv) await prisma.conversation.update({ where: { id: conv.id }, data: { mapaId, estudavel: true } });
  else await prisma.conversation.create({ data: { userId, surface: "estudos", scopeId, mapaId, estudavel: true } });
}
