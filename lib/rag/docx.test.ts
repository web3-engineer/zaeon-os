/**
 * lib/rag/docx.test.ts — .docx → Markdown.
 *
 * TODO defeito testado aqui é um defeito que EU cometi, e nenhum deles apareceu lendo o código:
 *   · a tabela saía como lixo (o mammoth embrulha cada célula num parágrafo, e a regra genérica de
 *     parágrafo partia a linha antes de ela existir);
 *   · a imagem vinha embutida como `data:image/png;base64,…` e injetaria MEGABYTES no prompt;
 *   · o estilo `Title` do Word não é reconhecido pelo mapa default do mammoth.
 *
 * O `.docx` de prova é construído AQUI, em vez de entrar como binário no repositório: um blob que
 * ninguém consegue revisar não é fixture, é fé. O escritor de ZIP abaixo usa STORE (sem compressão)
 * e um CRC32 próprio — `zlib.crc32` existe no Node 22 desta máquina mas só a partir do 20.15, e o
 * CI roda Node 20: apostar na versão do runner é o erro que já me custou um deploy.
 */
import { describe, it, expect } from "vitest";
import {
  docxParaMarkdown,
  htmlDoWordParaMarkdown,
  ehArquivoDocx,
  ehDocAntigo,
  MAPA_DE_ESTILO,
} from "./docx";

// ───────────────────────── o .docx de prova, construído aqui ─────────────────────────

const TABELA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(b: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = TABELA_CRC[(c ^ b[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** ZIP com entradas STORE (método 0). Suficiente pro mammoth, e sem dependência nenhuma. */
function zip(arquivos: Record<string, string>): Uint8Array {
  const enc = new TextEncoder();
  const locais: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let desloc = 0;
  for (const [nome, texto] of Object.entries(arquivos)) {
    const n = enc.encode(nome);
    const d = enc.encode(texto);
    const c = crc32(d);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true);
    lh.setUint32(14, c, true); lh.setUint32(18, d.length, true); lh.setUint32(22, d.length, true);
    lh.setUint16(26, n.length, true);
    locais.push(new Uint8Array(lh.buffer), n, d);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true);
    ch.setUint32(16, c, true); ch.setUint32(20, d.length, true); ch.setUint32(24, d.length, true);
    ch.setUint16(28, n.length, true); ch.setUint32(42, desloc, true);
    central.push(new Uint8Array(ch.buffer), n);
    desloc += 30 + n.length + d.length;
  }
  const tamCentral = central.reduce((s, x) => s + x.length, 0);
  const fim = new DataView(new ArrayBuffer(22));
  fim.setUint32(0, 0x06054b50, true);
  fim.setUint16(8, Object.keys(arquivos).length, true);
  fim.setUint16(10, Object.keys(arquivos).length, true);
  fim.setUint32(12, tamCentral, true); fim.setUint32(16, desloc, true);
  const partes = [...locais, ...central, new Uint8Array(fim.buffer)];
  const total = partes.reduce((s, x) => s + x.length, 0);
  const saida = new Uint8Array(total);
  let i = 0;
  for (const p of partes) { saida.set(p, i); i += p.length; }
  return saida;
}

const par = (texto: string, estilo?: string, numerado = false) => {
  let pr = "";
  if (estilo || numerado) {
    pr = "<w:pPr>";
    if (estilo) pr += `<w:pStyle w:val="${estilo}"/>`;
    if (numerado) pr += '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>';
    pr += "</w:pPr>";
  }
  return `<w:p>${pr}<w:r><w:t xml:space="preserve">${texto}</w:t></w:r></w:p>`;
};

/** Um .docx com título, dois níveis de seção, lista, tabela e numeração "1.1." no corpo. */
function docxDeProva(): Uint8Array {
  const celula = (t: string) => `<w:tc>${par(t)}</w:tc>`;
  const tabela =
    "<w:tbl>" +
    `<w:tr>${celula("Ano")}${celula("Autor")}${celula("Achado")}</w:tr>` +
    `<w:tr>${celula("2021")}${celula("Silva")}${celula("Reducao de 12%")}</w:tr>` +
    "</w:tbl>";
  const corpo =
    par("Monografia de Teste", "Title") +
    par("Introducao", "Heading1") +
    par("Paragrafo com numeracao 1.1. e porcentagem de 50%.") +
    par("Hipoteses", "Heading2") +
    par("primeira hipotese", "ListParagraph", true) +
    par("segunda hipotese", "ListParagraph", true) +
    par("Resultados", "Heading1") +
    tabela +
    par("Fim do documento.");
  const est = (id: string, nome: string) =>
    `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${nome}"/></w:style>`;
  return zip({
    "[Content_Types].xml":
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
      '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>',
    "_rels/.rels":
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    "word/_rels/document.xml.rels":
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>',
    "word/styles.xml":
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      est("Title", "Title") + est("Heading1", "heading 1") + est("Heading2", "heading 2") +
      est("ListParagraph", "List Paragraph") + "</w:styles>",
    "word/numbering.xml":
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/></w:lvl></w:abstractNum>' +
      '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>',
    "word/document.xml":
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
      corpo + "</w:body></w:document>",
  });
}

// ───────────────────────── a função PURA (onde todos os defeitos estavam) ─────────────────────────

describe("htmlDoWordParaMarkdown (puro)", () => {
  it("o nível do título vem da tag — é o que faz `cortarEmTrechos` montar o caminho do trecho", () => {
    const md = htmlDoWordParaMarkdown("<h1>Introdução</h1><p>corpo</p><h2>1.1 Estado da Arte</h2><h3>fundo</h3>");
    expect(md).toContain("# Introdução");
    expect(md).toContain("## 1.1 Estado da Arte");
    expect(md).toContain("### fundo");
  });

  it("O DEFEITO DA TABELA: a célula vem embrulhada num parágrafo, e a linha não pode quebrar", () => {
    // Saída REAL do mammoth: <td><p>Ano</p></td>. A primeira versão trocava `</td><td>` por " | "
    // e deixava a regra genérica de parágrafo cuidar do resto — e cada célula virava uma linha.
    const html =
      "<table><tr><td><p>Ano</p></td><td><p>Autor</p></td></tr><tr><td><p>2021</p></td><td><p>Silva</p></td></tr></table>";
    const md = htmlDoWordParaMarkdown(html);
    expect(md).toContain("Ano | Autor");
    expect(md).toContain("2021 | Silva");
    // e a asserção que mata o defeito: a linha NÃO se parte
    expect(md).not.toMatch(/Ano\s*\n\s*\|/);
  });

  it("A TRAVA DA IMAGEM: o mammoth embute base64 por padrão — megabytes no prompt", () => {
    const html = `<p>antes</p><img src="data:image/png;base64,${"A".repeat(200_000)}"><p>depois</p>`;
    const md = htmlDoWordParaMarkdown(html);
    expect(md.length).toBeLessThan(200);          // 200 KB de entrada → algumas dezenas de bytes
    expect(md).not.toContain("base64");
    expect(md).toContain("[imagem]");             // mas NÃO finge que ali não havia nada
    expect(md).toContain("antes");
    expect(md).toContain("depois");
  });

  it("pontuação e numeração ficam INTACTAS (o motivo de não usar `convertToMarkdown`)", () => {
    // o `convertToMarkdown` do mammoth escrevia `1\.1\.` e `importante\.`
    const md = htmlDoWordParaMarkdown("<p>Veja a seção 1.1. e os 50% de redução.</p>");
    expect(md).toBe("Veja a seção 1.1. e os 50% de redução.");
    expect(md).not.toContain("\\");
  });

  it("ênfase sobrevive como Markdown; lista vira `- `", () => {
    expect(htmlDoWordParaMarkdown("<p>um <strong>forte</strong> e um <em>fraco</em></p>"))
      .toBe("um **forte** e um *fraco*");
    expect(htmlDoWordParaMarkdown("<ul><li>a</li><li>b</li></ul>")).toBe("- a\n- b");
  });

  it("entidades são decodificadas (o mammoth escapa & < >)", () => {
    expect(htmlDoWordParaMarkdown("<p>M&amp;A &lt;teste&gt; &quot;x&quot; &nbsp;y</p>"))
      .toBe('M&A <teste> "x" y');
  });

  it("não cola parágrafos nem deixa três quebras seguidas", () => {
    const md = htmlDoWordParaMarkdown("<p>um</p><p></p><p>dois</p>");
    expect(md).toBe("um\n\ndois");
  });

  it("entrada vazia ou lixo não estoura", () => {
    expect(htmlDoWordParaMarkdown("")).toBe("");
    expect(htmlDoWordParaMarkdown(null as unknown as string)).toBe("");
    expect(htmlDoWordParaMarkdown("<p>sem fechar")).toBe("sem fechar");
  });
});

// ───────────────────────── detecção do tipo ─────────────────────────

describe("ehArquivoDocx / ehDocAntigo", () => {
  const MIME_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  it("reconhece pelo MIME e pela extensão — nenhum dos dois é confiável só", () => {
    expect(ehArquivoDocx({ name: "x.bin", type: MIME_DOCX })).toBe(true);
    // vários navegadores mandam octet-stream: a extensão é o que salva
    expect(ehArquivoDocx({ name: "Monografia.docx", type: "application/octet-stream" })).toBe(true);
    expect(ehArquivoDocx({ name: "MAIUSCULA.DOCX", type: "" })).toBe(true);
    expect(ehArquivoDocx({ name: "x.pdf", type: "application/pdf" })).toBe(false);
  });

  it("o `.doc` ANTIGO é separado de propósito: a recusa dele tem conserto", () => {
    expect(ehDocAntigo({ name: "antigo.doc", type: "application/msword" })).toBe(true);
    expect(ehDocAntigo({ name: "novo.docx", type: MIME_DOCX })).toBe(false);
    // e o .doc NÃO pode ser confundido com docx — o mammoth não abre o binário antigo
    expect(ehArquivoDocx({ name: "antigo.doc", type: "application/msword" })).toBe(false);
  });

  it("o mapa de estilo cobre o Word em pt-BR, não só em inglês", () => {
    expect(MAPA_DE_ESTILO.some((r) => r.includes("'Título'"))).toBe(true);
    expect(MAPA_DE_ESTILO.some((r) => r.includes("'Title'"))).toBe(true);
  });
});

// ───────────────────────── ponta a ponta, com um .docx de verdade ─────────────────────────

describe("docxParaMarkdown (contrato com o mammoth)", () => {
  it("um .docx REAL vira Markdown com título, níveis, lista e tabela", async () => {
    const { markdown, avisos } = await docxParaMarkdown(docxDeProva());

    // o estilo `Title` do Word NÃO é reconhecido pelo mapa default do mammoth — sem o MAPA_DE_ESTILO
    // o título da monografia saía como corpo de texto. Esta é a asserção desse defeito.
    expect(markdown.startsWith("# Monografia de Teste")).toBe(true);
    expect(avisos.join(" ")).not.toContain("Title");

    expect(markdown).toContain("# Introducao");
    expect(markdown).toContain("## Hipoteses");
    expect(markdown).toContain("- primeira hipotese");
    expect(markdown).toContain("Ano | Autor | Achado");
    expect(markdown).toContain("2021 | Silva | Reducao de 12%");
    expect(markdown).toContain("1.1. e porcentagem de 50%.");
    expect(markdown).not.toContain("\\.");
  });

  it("bytes que não são .docx falham com erro, não devolvem texto falso", async () => {
    await expect(docxParaMarkdown(new Uint8Array([1, 2, 3, 4]))).rejects.toThrow();
  });
});
