/**
 * O que o Worker("chat") faz com cada job. Separado de instrumentation.ts pra ser
 * testável sem Redis: aqui não existe BullMQ, só (job.data) → turno rodado e persistido.
 */
import { runChatTurn } from "@/lib/agent/runChatTurn";
import { savePartial } from "@/lib/agent/chat-turn-store";
import { serializarProgresso } from "@/lib/agent/progresso";
import type { ChatJobData } from "@/lib/queue/chat";

/**
 * Acumula o parcial e grava no máximo a cada `intervalMs` — o trajectory pode narrar
 * várias fases em sequência rápida, e um write por evento seria desperdício. As gravações
 * são ENCADEADAS: uma lenta nunca é ultrapassada por uma mais nova (o banco nunca volta
 * pra um parcial mais curto).
 */
export function createPartialWriter(write: (partial: string) => Promise<void>, intervalMs = 300) {
  let acc = "";
  let dirty = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let chain: Promise<void> = Promise.resolve();

  const flush = (): Promise<void> => {
    if (timer) { clearTimeout(timer); timer = null; }
    if (!dirty) return chain;
    dirty = false;
    const snapshot = acc;
    // progresso é best-effort: um write que falhar não pode derrubar o turno
    chain = chain.then(() => write(snapshot)).catch((e) => {
      console.warn("[chat-worker] parcial não gravado:", e?.message ?? e);
    });
    return chain;
  };

  return {
    push(chunk: string) {
      acc += chunk;
      dirty = true;
      if (!timer) timer = setTimeout(() => { void flush(); }, intervalMs);
    },
    flush,
    get value() { return acc; },
  };
}

/**
 * Roda um turno enfileirado até o fim. NUNCA relança o erro do turno: o runChatTurn já o
 * gravou no ChatTurn (status=error) e o cliente reage a isso. Relançar só faria o BullMQ
 * contar uma falha que não tem o que retentar (attempts: 1 — ver lib/queue/chat.ts).
 */
export async function processChatJob(data: ChatJobData, opts: { partialIntervalMs?: number } = {}): Promise<void> {
  const { turnId, ...params } = data;
  const partial = createPartialWriter((p) => savePartial(turnId, p), opts.partialIntervalMs ?? 300);
  // Mesmo primeiro sinal de vida do modo inline — quem reengata vê a mesma fase inicial.
  partial.push(serializarProgresso({ fase: "acordar", rotulo: "Acordando a Aura" }));
  try {
    await runChatTurn(turnId, params, (chunk) => partial.push(chunk));
  } catch (e: any) {
    console.error("[chat-worker] turno falhou:", turnId, e?.message ?? e);
  } finally {
    // Espera as gravações em voo; depois do saveDone/saveError nenhum parcial chega atrasado
    // porque o timer foi cancelado aqui e `chain` já drenou.
    await partial.flush();
  }
}
