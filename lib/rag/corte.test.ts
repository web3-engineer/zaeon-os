import { describe, it, expect } from "vitest";
import type { Block } from "@/lib/scholar/types";
import { parseLoaderResponse } from "@/lib/scholar/pdf";
import { ALVO_CHARS, MAX_TITULO, cortarEmTrechos, pareceCorpo } from "./corte";

const h = (text: string, level?: number, page = 1): Block => ({ type: "heading", level, page, text });
const p = (text: string, page = 1): Block => ({ type: "paragraph", page, text });

describe("cortarEmTrechos — caminho (árvore de títulos)", () => {
  it("usa a pilha por nível e esvazia ao voltar pro nível 1", () => {
    const out = cortarEmTrechos(
      [
        h("Cap 1", 1), p("texto cap 1"),
        h("1.1", 2), p("texto 1.1"),
        h("1.1.1", 3), p("texto 1.1.1"),
        h("Cap 2", 1), p("texto cap 2"),
      ],
      "Apostila",
    );
    expect(out).toHaveLength(4);
    expect(out[2].caminho).toBe("Apostila › Cap 1 › 1.1 › 1.1.1");
    expect(out[3].caminho).toBe("Apostila › Cap 2");
    for (const t of out) expect(t.texto.startsWith(t.caminho + "\n\n")).toBe(true);
    expect(out[2].texto).toBe("Apostila › Cap 1 › 1.1 › 1.1.1\n\ntexto 1.1.1");
  });

  it("sem level: fallback com os 3 títulos mais recentes", () => {
    const out = cortarEmTrechos(
      [h("A"), p("a"), h("B"), p("b"), h("C"), p("c"), h("D"), p("d")],
      "Apostila",
    );
    expect(out[3].caminho).toBe("Apostila › B › C › D");
  });
});

describe("cortarEmTrechos — tamanho, páginas e tabelas", () => {
  it("fecha em limite de parágrafo ao passar de ALVO_CHARS e acompanha páginas", () => {
    const x = "x".repeat(1200);
    const out = cortarEmTrechos([h("T", 1, 3), p(x, 3), p(x, 3), p(x, 4)], "Doc");
    expect(out).toHaveLength(2);
    expect(out[0].paginaIni).toBe(3);
    expect(out[0].paginaFim).toBe(3);
    expect(out[1].paginaFim).toBe(4);
  });

  it("tabela grande entra inteira num trecho próprio", () => {
    const tabela = "c".repeat(5000);
    const out = cortarEmTrechos(
      [h("T", 1), p("antes"), { type: "table", page: 1, text: tabela }, p("depois")],
      "Doc",
    );
    const comTabela = out.filter((t) => t.texto.includes(tabela));
    expect(comTabela).toHaveLength(1);
    expect(out.filter((t) => t.texto.includes("c".repeat(50)))).toHaveLength(1);
    expect(comTabela[0].texto).not.toContain("antes");
    expect(out).toHaveLength(3);
  });

  it("parágrafo gigante é partido em frases, sem perder texto", () => {
    const frase = "Esta é uma frase de teste com tamanho razoável para o corte. ";
    const longo = frase.repeat(Math.ceil(10000 / frase.length)).trim();
    const out = cortarEmTrechos([h("T", 1, 7), p(longo, 7)], "Doc");
    expect(out.length).toBeGreaterThanOrEqual(4);
    for (const t of out) {
      expect(t.texto.startsWith(t.caminho + "\n\n")).toBe(true);
      expect(t.texto.slice(t.caminho.length + 2).length).toBeLessThanOrEqual(ALVO_CHARS);
      expect(t.caminho).toBe("Doc › T");
      expect(t.paginaIni).toBe(7);
      expect(t.paginaFim).toBe(7);
    }
    const junto = out.map((t) => t.texto.slice(t.caminho.length + 2)).join(" ");
    expect(junto.replace(/\s+/g, "")).toBe(longo.replace(/\s+/g, ""));
    // cortou em fronteira de frase
    expect(out[0].texto.endsWith(".")).toBe(true);
  });

  it("parágrafo gigante sem fronteira: corte seco em ALVO_CHARS, sem perda", () => {
    const longo = "a".repeat(7000);
    const out = cortarEmTrechos([p(longo)], "Doc");
    expect(out.map((t) => t.texto.slice(t.caminho.length + 2).length)).toEqual([3000, 3000, 1000]);
  });

  it("blocos sem página herdam a última vista (começa em 1); figure é ignorada", () => {
    const out = cortarEmTrechos(
      [{ type: "paragraph", text: "sem página" }, { type: "figure", page: 9, text: "fig" }, p("na 5", 5), { type: "paragraph", text: "herda 5" }],
      "Doc",
    );
    expect(out).toHaveLength(1);
    expect(out[0].paginaIni).toBe(1);
    expect(out[0].paginaFim).toBe(5);
    expect(out[0].texto).not.toContain("fig");
  });

  it("vazio e só figure ⇒ []", () => {
    expect(cortarEmTrechos([], "Doc")).toEqual([]);
    expect(cortarEmTrechos([{ type: "figure", page: 1, text: "f" }], "Doc")).toEqual([]);
  });

  it("ordem é 0,1,2… sem buracos", () => {
    const out = cortarEmTrechos([h("A", 1), p("a"), h("B", 1), p("b"), h("C", 1), p("c")], "Doc");
    expect(out.map((t) => t.ordem)).toEqual([0, 1, 2]);
  });
});

describe("parseLoaderResponse — level", () => {
  const base = { paragraphs: [{ text: "x" }] };
  it("repassa level numérico ≥ 1", () => {
    const out = parseLoaderResponse({ ...base, blocks: [{ type: "heading", level: 2, text: "T" }] })!;
    expect(out.blocks![0].level).toBe(2);
  });
  it("omite level inválido", () => {
    const out = parseLoaderResponse({
      ...base,
      blocks: [
        { type: "heading", level: "x", text: "T" },
        { type: "heading", level: 0, text: "T" },
      ],
    })!;
    expect(out.blocks![0].level).toBeUndefined();
    expect("level" in out.blocks![0]).toBe(false);
    expect(out.blocks![1].level).toBeUndefined();
  });
});

describe("cortarEmTrechos — nenhum texto some", () => {
  const conteudo = (t: { texto: string; caminho: string }) => t.texto.slice(t.caminho.length + 2);

  it("heading longo (corpo com a mesma fonte do título) vira conteúdo, não caminho", () => {
    // caso de prod 2026-10-21: a página 2 inteira veio como um heading nível 1 de ~180 chars
    const corpo =
      "A célula é a unidade básica da vida e todos os seres vivos são formados por células que podem ser procariontes " +
      "ou eucariontes conforme a organização do material genético";
    expect(corpo.length).toBeGreaterThan(MAX_TITULO);
    const out = cortarEmTrechos([p("Apostila de Biologia", 1), h(corpo, 1, 2)], "Apostila");
    expect(out).toHaveLength(1);
    expect(out[0].caminho).toBe("Apostila");
    expect(conteudo(out[0])).toBe(`Apostila de Biologia\n\n${corpo}`);
    expect(out[0].paginaFim).toBe(2);
  });

  it("heading curto com frases é corpo; numeração e abreviação continuam título", () => {
    expect(pareceCorpo("Introdução. Esta apostila apresenta a célula.")).toBe(true);
    expect(pareceCorpo("A mitocôndria produz ATP. O núcleo guarda o DNA!")).toBe(true);
    expect(pareceCorpo("1. Introdução")).toBe(false);
    expect(pareceCorpo("Cap. 2 Membrana plasmática")).toBe(false);
    expect(pareceCorpo("1.1 Organelas")).toBe(false);
    expect(pareceCorpo("Por que estudar a célula?")).toBe(false);

    const out = cortarEmTrechos([h("Cap 1", 1), h("Introdução. Esta apostila apresenta a célula.", 1), p("mais")], "Doc");
    expect(out).toHaveLength(1);
    expect(out[0].caminho).toBe("Doc › Cap 1");
    expect(conteudo(out[0])).toBe("Introdução. Esta apostila apresenta a célula.\n\nmais");
  });

  it("heading enorme é partido como parágrafo gigante, sem perder texto", () => {
    const frase = "Esta é uma frase de teste com tamanho razoável para o corte. ";
    const longo = frase.repeat(Math.ceil(7000 / frase.length)).trim();
    const out = cortarEmTrechos([h("T", 1), h(longo, 1)], "Doc");
    expect(out.map(conteudo).join(" ").replace(/\s+/g, "")).toBe(longo.replace(/\s+/g, ""));
    for (const t of out) expect(t.caminho).toBe("Doc › T");
  });

  it("título sem conteúdo embaixo (seguido de irmão ou no fim) vira trecho próprio", () => {
    const out = cortarEmTrechos(
      [h("Capa", 1, 1), h("Cap 1", 1, 2), p("texto cap 1", 2), h("Cap 2", 1, 3), h("2.1", 2, 3), h("Anexo", 1, 4)],
      "Doc",
    );
    expect(out.map((t) => t.texto)).toEqual([
      "Doc › Capa\n\nCapa",
      "Doc › Cap 1\n\ntexto cap 1",
      "Doc › Cap 2 › 2.1\n\n2.1", // o caminho já guarda "Cap 2": não repete
      "Doc › Anexo\n\nAnexo",
    ]);
    expect(out.map((t) => [t.paginaIni, t.paginaFim])).toEqual([[1, 1], [2, 2], [3, 3], [4, 4]]);
    expect(out.map((t) => t.ordem)).toEqual([0, 1, 2, 3]);
  });

  it("sem level: o título que cai da pilha sem ter entrado em caminho é guardado", () => {
    const out = cortarEmTrechos([h("A"), h("B"), h("C"), h("D"), p("d")], "Doc");
    const tudo = out.map((t) => t.texto).join("\n");
    for (const s of ["A", "B", "C", "D", "d"]) expect(tudo).toContain(s);
    expect(out[out.length - 1].texto).toBe("Doc › B › C › D\n\nd");
  });

  it("título com conteúdo não gera trecho extra", () => {
    const out = cortarEmTrechos([h("Cap 1", 1), p("a"), h("1.1", 2), p("b")], "Doc");
    expect(out).toHaveLength(2);
  });
});
