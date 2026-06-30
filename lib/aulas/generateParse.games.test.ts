import { describe, it, expect } from "vitest";
import { buildQuestionBlock } from "@/lib/aulas/generateParse";

describe("buildQuestionBlock games", () => {
  it("flashcards: normaliza os cards", () => {
    const b = buildQuestionBlock(JSON.stringify({ config: { cards: [{ front: "Brasil", back: "Brasília" }] } }), "flashcards");
    expect(b).toMatchObject({ type: "flashcards", config: { cards: [{ front: "Brasil", back: "Brasília" }] } });
  });
  it("flashcards sem cards → null", () => {
    expect(buildQuestionBlock(JSON.stringify({ config: { cards: [] } }), "flashcards")).toBeNull();
  });
  it("memória: normaliza os pares (mín. 2)", () => {
    const b = buildQuestionBlock(JSON.stringify({ config: { pairs: [{ a: "gato", b: "cat" }, { a: "cão", b: "dog" }] } }), "game-memory");
    expect(b).toMatchObject({ type: "memory", config: { pairs: [{ a: "gato", b: "cat" }, { a: "cão", b: "dog" }] } });
  });
  it("memória com 1 par → null", () => {
    expect(buildQuestionBlock(JSON.stringify({ config: { pairs: [{ a: "x", b: "y" }] } }), "game-memory")).toBeNull();
  });
});
