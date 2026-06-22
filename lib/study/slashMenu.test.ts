import { describe, it, expect } from "vitest";
import { filterSlash, SLASH_OPTIONS } from "@/lib/study/slashMenu";

describe("filterSlash", () => {
  it("query vazia retorna tudo", () => {
    expect(filterSlash("")).toHaveLength(SLASH_OPTIONS.length);
    expect(filterSlash("  ")).toHaveLength(SLASH_OPTIONS.length);
  });

  it("filtra por label sem acento e case-insensitive", () => {
    expect(filterSlash("mapa").map((o) => o.key)).toEqual(["mindmap"]);
    expect(filterSlash("TÍTULO").map((o) => o.key)).toContain("h1");
    expect(filterSlash("tit").map((o) => o.key)).toContain("h1"); // "título" → "titulo"
  });

  it("também casa pela key", () => {
    expect(filterSlash("faq").map((o) => o.key)).toContain("faq");
    expect(filterSlash("podcast").map((o) => o.key)).toEqual(["podcast"]);
  });

  it("sem match → vazio", () => {
    expect(filterSlash("xyz")).toEqual([]);
  });
});
