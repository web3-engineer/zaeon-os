/**
 * instrumentation.ts — roda UMA vez no boot do servidor Next (register()).
 *
 * Aqui a gente sobe os WORKERS de fundo (BullMQ) — Sala de Pesquisa (fila "scholar") e
 * chat da Aura (fila "chat", Fase 3) — mais o reaper de jobs presos. SÓ quando
 * SCHOLAR_WORKER=1. Assim o mesmo build serve pra:
 *   - web (SCHOLAR_WORKER=0): só atende HTTP e ENFILEIRA jobs;
 *   - worker dedicado (SCHOLAR_WORKER=1): consome a fila e roda o pipeline até o fim,
 *     independente do cliente estar na sala ou não.
 *
 * Nada acontece sem REDIS_URL (isQueueEnabled=false) nem fora do runtime nodejs.
 * O corpo mora em instrumentation-node.ts (ver lá por que).
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.SCHOLAR_WORKER === "1") {
    const { iniciarWorkers } = await import("./instrumentation-node");
    await iniciarWorkers();
  }
}
