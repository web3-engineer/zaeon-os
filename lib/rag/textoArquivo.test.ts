import { describe, it, expect } from "vitest";
import {
  EXTENSOES_TEXTO, MAX_BLOCOS, blocosDeTexto, ehArquivoTexto, semExtensao, textoDeBytes, tituloDeTexto,
} from "./textoArquivo";
import { cortarEmTrechos } from "./corte";

describe("textoArquivo · a porta", () => {
  it("aceita as extensões de texto, com ou sem MIME", () => {
    for (const e of EXTENSOES_TEXTO) {
      expect(ehArquivoTexto({ name: `anotacoes${e}`, type: "" }), e).toBe(true);
      expect(ehArquivoTexto({ name: `ANOTACOES${e.toUpperCase()}` }), e).toBe(true);
    }
  });

  it("aceita pelo MIME quando o nome não tem extensão (upload de clipboard)", () => {
    expect(ehArquivoTexto({ name: "colado", type: "text/plain" })).toBe(true);
    expect(ehArquivoTexto({ name: "colado", type: "text/markdown; charset=utf-8" })).toBe(true);
  });

  it("recusa PDF e binário — o PDF tem o caminho dele", () => {
    expect(ehArquivoTexto({ name: "artigo.pdf", type: "application/pdf" })).toBe(false);
    expect(ehArquivoTexto({ name: "foto.png", type: "image/png" })).toBe(false);
    expect(ehArquivoTexto({ name: "tese.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })).toBe(false);
    expect(ehArquivoTexto({})).toBe(false);
  });

  it("semExtensao tira só a extensão conhecida", () => {
    expect(semExtensao("Capítulo 1.md")).toBe("Capítulo 1");
    expect(semExtensao("notas.v2.txt")).toBe("notas.v2");
    expect(semExtensao("sem-extensao")).toBe("sem-extensao");
  });

  it("textoDeBytes come o BOM do Notepad", () => {
    const comBom = new Uint8Array([0xef, 0xbb, 0xbf, 0x6f, 0x69]);
    expect(textoDeBytes(comBom)).toBe("oi");
  });
});

describe("textoArquivo · título", () => {
  it("usa o primeiro # do arquivo", () => {
    expect(tituloDeTexto("x.md", "# Membranas celulares\n\ntexto")).toBe("Membranas celulares");
  });

  it("cai no nome do arquivo quando não há h1", () => {
    expect(tituloDeTexto("Minhas notas.md", "## Subtítulo\n\ntexto")).toBe("Minhas notas");
    expect(tituloDeTexto("notas.txt", "texto corrido")).toBe("notas");
  });

  it("# dentro de bloco de código NÃO é título", () => {
    const md = "```sh\n# instala as deps\nnpm i\n```\n\n# Título de verdade\n";
    expect(tituloDeTexto("x.md", md)).toBe("Título de verdade");
  });
});

describe("textoArquivo · blocos", () => {
  it("texto puro: um título e um parágrafo por linha em branco", () => {
    const b = blocosDeTexto("Primeiro.\n\nSegundo.\n\n\nTerceiro.", "Notas");
    expect(b[0]).toMatchObject({ type: "heading", level: 1, text: "Notas" });
    expect(b.filter((x) => x.type === "paragraph").map((x) => x.text)).toEqual(["Primeiro.", "Segundo.", "Terceiro."]);
  });

  it("markdown: os # viram heading COM NÍVEL — é isso que o PDF entrega e o texto perdia", () => {
    const md = "# Tese\n\nAbertura.\n\n## Referencial\n\nCorpo do referencial.\n\n### Estado da arte\n\nMais.";
    const b = blocosDeTexto(md, "Tese");
    const heads = b.filter((x) => x.type === "heading").map((x) => [x.level, x.text]);
    expect(heads).toEqual([[1, "Tese"], [2, "Referencial"], [3, "Estado da arte"]]);
  });

  it("o # que deu nome ao documento não entra duas vezes", () => {
    const b = blocosDeTexto("# Tese\n\nAbertura.", "Tese");
    expect(b.filter((x) => x.text === "Tese")).toHaveLength(1);
  });

  it("mas um segundo h1 igual É uma seção (não apaga conteúdo do aluno)", () => {
    const b = blocosDeTexto("# Intro\n\na\n\n# Intro\n\nb", "Intro");
    expect(b.filter((x) => x.text === "Intro")).toHaveLength(2);
  });

  it("bloco de código inteiro sobrevive como conteúdo, sem virar títulos", () => {
    const md = "# Doc\n\n```py\n# comentário\nx = 1\n\ny = 2\n```\n\nDepois.";
    const b = blocosDeTexto(md, "Doc");
    expect(b.filter((x) => x.type === "heading")).toHaveLength(1);           // só o "Doc"
    const corpo = b.filter((x) => x.type === "paragraph").map((x) => x.text).join("\n");
    expect(corpo).toContain("# comentário");                                  // não foi engolido
    expect(corpo).toContain("y = 2");                                         // linha em branco dentro da cerca não parte
    expect(corpo).toContain("Depois.");
  });

  it("texto vazio não gera parágrafo fantasma", () => {
    expect(blocosDeTexto("   \n\n  ", "T")).toEqual([{ type: "heading", level: 1, page: 1, text: "T" }]);
    expect(blocosDeTexto("", "")).toEqual([]);
  });

  it("tudo em page 1 — arquivo de texto não tem página, e inventar quebraria a citação", () => {
    for (const b of blocosDeTexto("# A\n\nx\n\n## B\n\ny", "A")) expect(b.page).toBe(1);
  });

  it("muitas linhas curtas NÃO viram milhões de blocos (um log exportado não derruba o processo)", () => {
    const log = Array.from({ length: MAX_BLOCOS * 3 }, (_, i) => `linha ${i}`).join("\n\n");
    const b = blocosDeTexto(log, "Log");
    expect(b.length).toBeLessThanOrEqual(MAX_BLOCOS + 1); // +1: o bloco final com o resto
  });

  it("e o conteúdo além do teto é PRESERVADO num bloco final, não descartado", () => {
    const log = Array.from({ length: MAX_BLOCOS * 2 }, (_, i) => `linha ${i}`).join("\n\n");
    const texto = blocosDeTexto(log, "Log").map((x) => x.text).join("\n");
    expect(texto).toContain(`linha ${MAX_BLOCOS * 2 - 1}`); // a última linha do arquivo está lá
  });
});

describe("textoArquivo · integra com o corte do RAG", () => {
  it("o caminho do trecho sai hierárquico — o que justifica preservar os #", () => {
    const md = "# Tese\n\n## Referencial Teórico\n\n### Estado da Arte\n\n" + "conteúdo relevante. ".repeat(40);
    const trechos = cortarEmTrechos(blocosDeTexto(md, "Tese"), "Tese");
    expect(trechos.length).toBeGreaterThan(0);
    expect(trechos[0].caminho).toContain("Referencial Teórico");
    expect(trechos[0].caminho).toContain("Estado da Arte");
  });

  it("texto puro também corta (sem hierarquia, mas com conteúdo)", () => {
    const trechos = cortarEmTrechos(blocosDeTexto("conteúdo. ".repeat(500), "Notas"), "Notas");
    expect(trechos.length).toBeGreaterThan(0);
    expect(trechos[0].texto.length).toBeGreaterThan(0);
  });
});
