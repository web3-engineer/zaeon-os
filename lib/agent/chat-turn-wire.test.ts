import { describe, it, expect } from "vitest";
import { outputToWire, isHarnessOutput, STRUCTURED_SENTINEL, STUDIO_SENTINEL, RESEARCH_SENTINEL } from "@/lib/agent/chat-turn-wire";
import { parseStructuredStream } from "@/lib/agent/structured-client";

describe("chat-turn-wire", () => {
  it("structured → sentinela + JSON que o parser do cliente lê de volta", () => {
    const answer = { nucleo: "n", conceitos: ["a"] };
    const wire = outputToWire({ mode: "structured", answer } as any);
    expect(wire.startsWith(STRUCTURED_SENTINEL)).toBe(true);
    expect(parseStructuredStream(wire)).toEqual({ kind: "answer", answer });
  });
  it("studio/research/texto no formato que o stream sempre emitiu", () => {
    expect(outputToWire({ mode: "studio", kind: "mindmap", topic: "t", text: "x" })).toBe(STUDIO_SENTINEL + '{"type":"studio","kind":"mindmap","topic":"t","text":"x"}');
    expect(outputToWire({ mode: "research", kind: "artigo", topic: "t", text: "x" })).toBe(RESEARCH_SENTINEL + '{"type":"research","kind":"artigo","topic":"t","text":"x"}');
    expect(outputToWire({ mode: "text", text: "oi" })).toBe("oi");
  });
  it("isHarnessOutput valida o Json do banco", () => {
    expect(isHarnessOutput({ mode: "text", text: "a" })).toBe(true);
    expect(isHarnessOutput({ mode: "structured", answer: {} })).toBe(true);
    expect(isHarnessOutput({ mode: "studio", kind: "k", topic: "t", text: "x" })).toBe(true);
    for (const v of [null, "x", {}, { mode: "text" }, { mode: "structured" }, { mode: "studio", kind: 1 }, { mode: "outro" }]) expect(isHarnessOutput(v)).toBe(false);
  });
});
