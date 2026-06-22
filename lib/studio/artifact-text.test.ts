import { describe, it, expect } from "vitest";
import { artifactToText } from "@/lib/studio/artifact-text";

describe("artifactToText", () => {
  it("guia: resumo + conceitos + revisão", () => {
    const t = artifactToText("guide", {
      resumo: "abc",
      conceitos: [{ termo: "X", definicao: "def" }],
      revisao: ["r1"],
    });
    expect(t).toContain("Resumo\nabc");
    expect(t).toContain("• X: def");
    expect(t).toContain("• r1");
  });

  it("faq: pares P/R", () => {
    expect(artifactToText("faq", { faq: [{ q: "q1", a: "a1" }] })).toBe("P: q1\nR: a1");
  });

  it("flashcards: frente → verso", () => {
    expect(artifactToText("flashcards", { cards: [{ front: "f", back: "b" }] })).toBe("f\n→ b");
  });

  it("timeline: quando — título + detalhe", () => {
    expect(artifactToText("timeline", { events: [{ when: "1500", title: "T", detail: "d" }] })).toBe("1500 — T\nd");
  });

  it("mindmap: árvore indentada por profundidade", () => {
    const t = artifactToText("mindmap", {
      nodes: [
        { id: "1", label: "Raiz", parent: null },
        { id: "2", label: "Filho", parent: "1" },
      ],
    });
    expect(t).toBe("• Raiz\n  • Filho");
  });
});
