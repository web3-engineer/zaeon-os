import { describe, it, expect } from "vitest";
import { splitParagraphs, paragraphsFromPages, parseLoaderResponse } from "./pdf";

describe("splitParagraphs", () => {
  it("splits on blank lines and trims", () => {
    expect(splitParagraphs("Para one.\n\nPara two.")).toEqual(["Para one.", "Para two."]);
  });
  it("drops empty fragments", () => {
    expect(splitParagraphs("\n\n  \n\nOnly one")).toEqual(["Only one"]);
  });
});

describe("paragraphsFromPages", () => {
  it("assigns the correct page to each paragraph and sequential idx", () => {
    const out = paragraphsFromPages([
      { page: 1, text: "A1.\n\nA2." },
      { page: 2, text: "B1." },
    ]);
    expect(out).toEqual([
      { idx: 0, page: 1, text: "A1." },
      { idx: 1, page: 1, text: "A2." },
      { idx: 2, page: 2, text: "B1." },
    ]);
  });
});

describe("parseLoaderResponse (resposta do pdf-loader)", () => {
  const sample = {
    markdown: "# Título\n\nParágrafo um.\n\n| a | b |\n|---|---|\n| 1 | 2 |",
    paragraphs: [
      { idx: 0, page: 1, text: "Título" },
      { idx: 1, page: 1, text: "Parágrafo um." },
    ],
    blocks: [
      { type: "heading", page: 1, bbox: [10, 20, 30, 40], text: "Título" },
      { type: "table", page: 2, bbox: [5, 5, 100, 100], text: "a | b | 1 | 2" },
    ],
  };

  it("mapeia paragraphs, markdown e blocks", () => {
    const out = parseLoaderResponse(sample)!;
    expect(out.paragraphs).toHaveLength(2);
    expect(out.paragraphs[1]).toEqual({ idx: 1, page: 1, text: "Parágrafo um." });
    expect(out.markdown).toContain("# Título");
    expect(out.blocks).toHaveLength(2);
    expect(out.blocks![1]).toEqual({ type: "table", page: 2, bbox: [5, 5, 100, 100], text: "a | b | 1 | 2" });
  });

  it("normaliza tipo inválido para 'paragraph' e descarta bbox malformado", () => {
    const out = parseLoaderResponse({
      paragraphs: [{ idx: 0, text: "x" }],
      blocks: [{ type: "weird", page: 1, bbox: [1, 2, 3], text: "y" }],
    })!;
    expect(out.blocks![0].type).toBe("paragraph");
    expect(out.blocks![0].bbox).toBeUndefined();
  });

  it("preenche idx ausente e remove parágrafos vazios", () => {
    const out = parseLoaderResponse({ paragraphs: [{ text: "  só esse  " }, { text: "   " }] })!;
    expect(out.paragraphs).toEqual([{ idx: 0, page: undefined, text: "só esse" }]);
  });

  it("retorna null sem texto útil ou entrada inválida", () => {
    expect(parseLoaderResponse({ paragraphs: [] })).toBeNull();
    expect(parseLoaderResponse({})).toBeNull();
    expect(parseLoaderResponse(null)).toBeNull();
  });

  it("markdown vazio vira undefined", () => {
    const out = parseLoaderResponse({ markdown: "   ", paragraphs: [{ idx: 0, text: "t" }] })!;
    expect(out.markdown).toBeUndefined();
  });
});
