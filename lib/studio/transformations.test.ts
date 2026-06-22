import { describe, it, expect } from "vitest";
import {
  TEXT_TRANSFORMS,
  isTextKind,
  normalizeGuide,
  normalizeFaq,
  normalizeFlashcards,
  normalizeMindmap,
  normalizeTimeline,
} from "@/lib/studio/transformations";

describe("registry / isTextKind", () => {
  it("tem as 5 transformações e build/normalize", () => {
    expect(Object.keys(TEXT_TRANSFORMS).sort()).toEqual(["faq", "flashcards", "guide", "mindmap", "timeline"]);
    const g = TEXT_TRANSFORMS.guide.build("conteúdo de teste");
    expect(g.system).toMatch(/JSON/);
    expect(g.user).toContain("conteúdo de teste");
    expect(TEXT_TRANSFORMS.guide.title("Biologia")).toBe("Guia de estudo — Biologia");
  });
  it("isTextKind valida", () => {
    expect(isTextKind("faq")).toBe(true);
    expect(isTextKind("podcast")).toBe(false);
  });
});

describe("normalizeGuide", () => {
  it("aceita campos canônicos e alternativos", () => {
    const out = normalizeGuide({
      summary: "resumo X",
      concepts: [{ term: "A", definition: "def A" }, { termo: "B", definicao: "def B" }, { termo: "", definicao: "x" }],
      perguntas: ["p1", { pergunta: "p2" }, ""],
    });
    expect(out.resumo).toBe("resumo X");
    expect(out.conceitos).toEqual([{ termo: "A", definicao: "def A" }, { termo: "B", definicao: "def B" }]);
    expect(out.revisao).toEqual(["p1", "p2"]);
  });
  it("lança se vazio", () => {
    expect(() => normalizeGuide({})).toThrow();
  });
});

describe("normalizeFaq / normalizeFlashcards", () => {
  it("faq filtra pares incompletos", () => {
    const out = normalizeFaq({ questions: [{ question: "q1", answer: "a1" }, { q: "q2" }, { pergunta: "q3", resposta: "a3" }] });
    expect(out.faq).toEqual([{ q: "q1", a: "a1" }, { q: "q3", a: "a3" }]);
  });
  it("flashcards aceita front/back e frente/verso", () => {
    const out = normalizeFlashcards({ flashcards: [{ frente: "f1", verso: "v1" }, { front: "f2", back: "b2" }, { front: "x" }] });
    expect(out.cards).toEqual([{ front: "f1", back: "v1" }, { front: "f2", back: "b2" }]);
  });
  it("lança sem cards", () => {
    expect(() => normalizeFlashcards({ cards: [] })).toThrow();
  });
});

describe("normalizeMindmap", () => {
  it("monta nós + edges a partir de parent, saneando pais inválidos", () => {
    const out = normalizeMindmap({
      nodes: [
        { id: "1", label: "Raiz" },
        { id: "2", label: "Filho", parent: "1" },
        { id: "3", label: "Órfão", parent: "999" }, // pai inexistente → vira raiz
        { id: "4", label: "" }, // sem label → descartado
      ],
    });
    expect(out.nodes.map((n) => n.id)).toEqual(["1", "2", "3"]);
    expect(out.nodes.find((n) => n.id === "3")!.parent).toBeNull();
    expect(out.edges).toEqual([{ from: "1", to: "2" }]);
  });
  it("lança com menos de 2 nós", () => {
    expect(() => normalizeMindmap({ nodes: [{ id: "1", label: "só um" }] })).toThrow();
  });
});

describe("normalizeTimeline", () => {
  it("aceita when/title/detail e variantes, mantém ordem", () => {
    const out = normalizeTimeline({
      eventos: [
        { ano: "1500", titulo: "A", detalhe: "d1" },
        { date: "1510", title: "B" },
        { titulo: "" }, // sem título → descartado
      ],
    });
    expect(out.events).toEqual([
      { when: "1500", title: "A", detail: "d1" },
      { when: "1510", title: "B", detail: "" },
    ]);
  });
  it("lança vazio", () => {
    expect(() => normalizeTimeline({ events: [] })).toThrow();
  });
});
