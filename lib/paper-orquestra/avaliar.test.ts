import { describe, it, expect } from "vitest";
import { comparar, documentoDoMarkdown, markdownDoDocumento, medir } from "@/lib/paper-orquestra/avaliar";

const P = (n: number, extra = "") => `${"palavra ".repeat(n)}${extra}`.trim();

const REF = documentoDoMarkdown([
  "# Título do trabalho",
  "## RESUMO",
  `${P(180)}\n\n**Palavras-chave:** a; b; c.`,
  "## INTRODUÇÃO",
  `${P(120, "como mostram estudos (SILVA, 2020; SOUZA, 2021).")}\n\n${P(100, "Segundo Costa (2019), isso vale.")}`,
  "### 1.1 Objetivo",
  P(60, "(SILVA, 2020)."),
  "## METODOLOGIA",
  `${P(90)}\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n$$x = y$$`,
  "## REFERÊNCIAS",
  "SILVA, A. Um paper longo o bastante. 2020.\n\nSOUZA, B. Outro paper longo o bastante. 2021.\n\nCOSTA, C. Mais um paper longo o bastante. 2019.",
].join("\n\n"));

describe("medir", () => {
  it("conta quantidade, riqueza, regras e entrega", () => {
    const m = medir(REF);
    expect(m.palavrasPorSecao["INTRODUÇÃO"]).toBeGreaterThan(250);
    expect(m.subsecoes).toBe(1);
    expect(m.citacoesDistintas).toBe(3); // SILVA 2020, SOUZA 2021, Costa (2019)
    expect(m.referencias).toBe(3);
    expect(m.tabelas).toBe(1);
    expect(m.formulas).toBe(1);
    expect(m.resumoPalavras).toBe(180);
    expect(m.temPalavrasChave).toBe(true);
    expect(m.primeiraPessoa).toBe(0);
    expect(m.secoesVazias).toEqual([]);
  });
  it("pega 1ª pessoa e chave interna sobrando", () => {
    const m = medir({ titulo: "t", secoes: [{ titulo: "X", corpo: "Nós realizamos isso [E3] e eu acho [[T2]]." }] });
    expect(m.primeiraPessoa).toBe(3);
    expect(m.chavesSobrando).toBe(2);
  });
});

describe("comparar", () => {
  it("o mesmo documento é similar a si mesmo", () => {
    expect(comparar(REF, REF).similares).toBe(true);
  });
  it("documento raso (metade das palavras, sem citação, seção vazia) não é similar — e diz onde", () => {
    const raso = { titulo: "t", secoes: REF.secoes.map((s) => (s.titulo === "METODOLOGIA" ? { ...s, corpo: "" } : s.titulo === "INTRODUÇÃO" ? { ...s, corpo: P(100) } : s)) };
    const c = comparar(raso, REF);
    expect(c.similares).toBe(false);
    const ruins = c.linhas.filter((l) => !l.ok).map((l) => l.metrica);
    expect(ruins).toEqual(expect.arrayContaining(["palavras (total)", "palavras · INTRODUÇÃO", "seções vazias"]));
  });
});

describe("markdown ida e volta", () => {
  it("documento → markdown → documento preserva seções e subtítulos", () => {
    expect(documentoDoMarkdown(markdownDoDocumento(REF))).toEqual(REF);
  });
});

describe("parágrafo colado no subtítulo", () => {
  it("\"### Título\\nTexto\" conta como parágrafo", () => {
    const m = medir({ titulo: "t", secoes: [{ titulo: "X", corpo: `### Sub\n${"palavra ".repeat(40)}\n\n### Outra\n${"palavra ".repeat(30)}` }] });
    expect(m.paragrafos).toBe(2);
  });
});
