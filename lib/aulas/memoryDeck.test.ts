import { describe, it, expect } from "vitest";
import { buildMemoryDeck, isMatch } from "@/lib/aulas/memoryDeck";

describe("buildMemoryDeck", () => {
  it("gera 2 cartas por par com pairId e textos certos", () => {
    const deck = buildMemoryDeck([{ a: "gato", b: "cat" }, { a: "cão", b: "dog" }], "s");
    expect(deck).toHaveLength(4);
    expect(deck.map((c) => c.text).sort()).toEqual(["cat", "cão", "dog", "gato"]);
    expect(new Set(deck.filter((c) => c.pairId === 0).map((c) => c.text))).toEqual(new Set(["gato", "cat"]));
    expect(deck.map((c) => c.id).sort()).toEqual(["0-a", "0-b", "1-a", "1-b"]);
  });
  it("é determinístico por seed", () => {
    const p = [{ a: "1", b: "2" }, { a: "3", b: "4" }, { a: "5", b: "6" }];
    expect(buildMemoryDeck(p, "x")).toEqual(buildMemoryDeck(p, "x"));
  });
});

describe("isMatch", () => {
  it("mesmo pairId e cartas diferentes = par", () => {
    expect(isMatch({ id: "0-a", pairId: 0, text: "x" }, { id: "0-b", pairId: 0, text: "y" })).toBe(true);
    expect(isMatch({ id: "0-a", pairId: 0, text: "x" }, { id: "1-a", pairId: 1, text: "y" })).toBe(false);
    expect(isMatch({ id: "0-a", pairId: 0, text: "x" }, { id: "0-a", pairId: 0, text: "x" })).toBe(false);
  });
});
