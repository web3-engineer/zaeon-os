/**
 * Boot dos workers de fundo — SÓ runtime nodejs. Importado por instrumentation.ts dentro de
 * `if (process.env.NEXT_RUNTIME === "nodejs")`: é o padrão documentado do Next pra que o
 * compilador do runtime EDGE nunca siga estes imports (Prisma, bullmq, crypto, o harness
 * inteiro). Com o `return` antecipado de antes, o edge seguia os import() dinâmicos e o build
 * do worker (SCHOLAR_WORKER=1) quebrava com "Can't resolve 'crypto'".
 */
import type { ScholarJobData } from "@/lib/queue/scholar";
import type { ChatJobData } from "@/lib/queue/chat";

export async function iniciarWorkers() {
  const { getRedisConnection, isQueueEnabled, SCHOLAR_QUEUE } = await import("@/lib/queue/scholar");
  if (!isQueueEnabled()) {
    console.warn("[worker] SCHOLAR_WORKER=1 mas sem REDIS_URL — worker não iniciado.");
    return;
  }

  // bullmq é opcional: import escondido do bundler (webpackIgnore) + try/catch, pra o boot
  // NÃO quebrar quando o pacote não está instalado. Sem ele, o worker só não sobe.
  let bull: any;
  try {
    const spec = "bull" + "mq";
    bull = await import(/* webpackIgnore: true */ spec as any);
  } catch {
    console.warn("[worker] bullmq não instalado — worker não iniciado (rode `npm install`).");
    return;
  }
  // Só o TIPO vem de `typeof import("bullmq")` (apagado na compilação — o bundler não vê):
  // o import real continua escondido acima. Sem isto `Worker` é `any` e o tsc recusa o
  // `new Worker<ScholarJobData>(…)` (TS2347), que é o que deixava o portão de tipos vermelho.
  const { Worker } = bull as { Worker: typeof import("bullmq").Worker };
  const { prisma } = await import("@/src/lib/prisma");
  const { runScholarPipeline } = await import("@/lib/scholar/pipeline");

  // Reaper ANTES dos workers: o que ficou preso quando o processo anterior morreu vira
  // `error` (o cliente para de esperar). Falhar aqui não impede o worker de subir.
  const { reapStuckJobs } = await import("@/lib/queue/reaper");
  await reapStuckJobs(prisma as any).catch((e) => console.warn("[reaper] falhou:", e?.message || String(e)));

  const connection = getRedisConnection()!;
  const concurrency = Number(process.env.SCHOLAR_WORKER_CONCURRENCY || 3);

  // Persiste cada evento de progresso na própria sessão (fonte da verdade pro cliente
  // reconectar). Poucos eventos por job → um write por evento é barato. `done`/`error`
  // são tratados fora (o pipeline já grava o resultado final).
  async function persistEvent(sessionId: string, ev: any) {
    if (ev?.type === "done" || ev?.type === "error") return;
    try {
      const cur = await prisma.scholarSession.findUnique({ where: { id: sessionId }, select: { thread: true } });
      const thread: any = (cur?.thread as any) ?? {};
      const events = Array.isArray(thread.events) ? thread.events : [];
      events.push(ev);
      if (ev?.type === "answer") thread.answer = ev.text;
      thread.events = events;
      await prisma.scholarSession.update({ where: { id: sessionId }, data: { thread } });
    } catch { /* progresso é best-effort; o resultado final é o que importa */ }
  }

  const worker = new Worker<ScholarJobData>(
    SCHOLAR_QUEUE,
    async (job) => {
      const { sessionId, prompt, room, isDeep } = job.data;
      await prisma.scholarSession.update({ where: { id: sessionId }, data: { status: "running" } }).catch(() => {});
      try {
        await runScholarPipeline(sessionId, { prompt, room, isDeep }, (ev) => persistEvent(sessionId, ev));
      } catch (err: any) {
        console.error("[worker] scholar job falhou:", sessionId, err?.message);
        await prisma.scholarSession.update({
          where: { id: sessionId },
          data: { status: "error", thread: { error: err?.message ?? "Erro inesperado" } as any },
        }).catch(() => {});
        throw err; // deixa o BullMQ registrar a falha (e retentar conforme attempts)
      }
    },
    { connection: connection as any, concurrency },
  );

  worker.on("failed", (job, err) => console.error("[worker] job failed", job?.id, err?.message));
  worker.on("completed", (job) => console.log("[worker] job done", job?.id));
  console.log(`[worker] Scholar worker ATIVO (concurrency=${concurrency})`);

  // ── Fase 3: chat da Aura retomável — MESMO container, MESMA conexão ─────────────
  // O turno roda até o fim aqui mesmo que o aluno saia da sala; o parcial e a resposta
  // vão pro ChatTurn e o cliente reengata por /api/ai/chat/turns/[id].
  const { CHAT_QUEUE } = await import("@/lib/queue/chat");
  const { processChatJob } = await import("@/lib/queue/chat-worker");
  const chatConcurrency = Number(process.env.CHAT_WORKER_CONCURRENCY || 4);
  const chatWorker = new Worker<ChatJobData>(
    CHAT_QUEUE,
    async (job) => processChatJob(job.data),
    { connection: connection as any, concurrency: chatConcurrency },
  );
  chatWorker.on("failed", (job, err) => console.error("[worker] chat job failed", job?.id, err?.message));
  console.log(`[worker] Chat worker ATIVO (concurrency=${chatConcurrency})`);
}
