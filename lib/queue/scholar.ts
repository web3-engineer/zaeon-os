/**
 * Fila de jobs da Sala de Pesquisa (BullMQ sobre Redis).
 *
 * IMPORTANTE: o `bullmq` é uma dependência OPCIONAL — não pode derrubar o boot quando não
 * está instalado. Por isso NÃO importamos bullmq no topo; carregamos sob demanda (dynamic
 * import com webpackIgnore) só quando de fato vamos enfileirar. Sem REDIS_URL ou sem bullmq,
 * `isQueueEnabled()` continua respondendo e a rota cai no modo inline legado.
 *
 * O WORKER que consome esta fila é iniciado em instrumentation.ts (SCHOLAR_WORKER=1).
 */
import IORedis from "ioredis";

export const SCHOLAR_QUEUE = "scholar";

export type ScholarJobData = {
  sessionId: string;
  prompt: string;
  room?: string | null;
  isDeep: boolean;
  userId: string;
};

const REDIS_URL = process.env.REDIS_URL || "";

let _connection: IORedis | null = null;
let _queue: any = null; // Queue<ScholarJobData> — sem tipar aqui pra não importar bullmq no topo

export function isQueueEnabled(): boolean {
  return Boolean(REDIS_URL);
}

/** Conexão ioredis compartilhada (BullMQ exige maxRetriesPerRequest: null). */
export function getRedisConnection(): IORedis | null {
  if (!REDIS_URL) return null;
  if (!_connection) {
    _connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
  }
  return _connection;
}

/** Carrega bullmq sob demanda; devolve null se não estiver instalado (degrada em silêncio). */
export async function loadBullmq(): Promise<any | null> {
  try {
    const spec = "bull" + "mq"; // esconde do bundler → import só em runtime
    return await import(/* webpackIgnore: true */ spec as any);
  } catch {
    console.warn("[queue] bullmq não instalado — fila desativada (rode `npm install`).");
    return null;
  }
}

async function getScholarQueue(): Promise<any | null> {
  if (!REDIS_URL) return null;
  if (_queue) return _queue;
  const bull = await loadBullmq();
  if (!bull) return null;
  _queue = new bull.Queue(SCHOLAR_QUEUE, {
    connection: getRedisConnection() as any,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "fixed", delay: 3000 },
      removeOnComplete: 50,
      removeOnFail: 100,
    },
  });
  return _queue;
}

export async function enqueueScholarJob(data: ScholarJobData): Promise<boolean> {
  const q = await getScholarQueue();
  if (!q) return false;
  await q.add("run", data, { jobId: data.sessionId }); // jobId = sessionId → idempotente
  return true;
}
