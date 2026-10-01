/**
 * lib/agent/chat-turn-wire.ts — o fim de um turno do harness, em texto de protocolo.
 * Módulo PURO (sem React, sem rede, sem Prisma): roda no route, no worker e no cliente.
 *
 * POR QUE EXISTE. O mesmo turno agora termina em três lugares — no stream inline de hoje,
 * no stream que acompanha o worker (CHAT_BG=1) e no cliente que reengata por polling
 * depois de ter saído da sala. Se cada um montasse a sentinela à mão, bastaria um
 * divergir pra resposta retomada renderizar diferente da ao vivo. Aqui é o único lugar.
 *
 * As sentinelas batem com lib/agent/progresso.ts (TERMINAIS) e com o parser do cliente
 * (structured-client.ts / StudyCoworkChat).
 */
import type { HarnessOutput } from "@/lib/agent/aura-harness";

export const STUDIO_SENTINEL = "@@STUDIO_ACTION@@";
export const RESEARCH_SENTINEL = "@@RESEARCH_ACTION@@";
export const STRUCTURED_SENTINEL = "@@STRUCTURED@@";

/** O payload final do turno, exatamente como o stream inline sempre emitiu. */
export function outputToWire(out: HarnessOutput): string {
  switch (out.mode) {
    case "studio":
      return STUDIO_SENTINEL + JSON.stringify({ type: "studio", kind: out.kind, topic: out.topic, text: out.text });
    case "research":
      return RESEARCH_SENTINEL + JSON.stringify({ type: "research", kind: out.kind, topic: out.topic, text: out.text });
    case "structured":
      return STRUCTURED_SENTINEL + JSON.stringify(out.answer);
    default:
      return out.text; // fallback texto (retrocompat)
  }
}

/**
 * O `answer` do ChatTurn vem do banco como Json — pode ser qualquer coisa se alguém
 * mexeu na mão ou se o shape mudar um dia. Só aceita o que `outputToWire` sabe tratar.
 */
export function isHarnessOutput(v: unknown): v is HarnessOutput {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  switch (o.mode) {
    case "text":
      return typeof o.text === "string";
    case "structured":
      return !!o.answer && typeof o.answer === "object";
    case "studio":
    case "research":
      return typeof o.kind === "string" && typeof o.topic === "string" && typeof o.text === "string";
    default:
      return false;
  }
}
