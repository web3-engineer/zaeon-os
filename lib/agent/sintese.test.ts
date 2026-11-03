import { describe, it, expect } from "vitest";
import {
  MAX_EXTRATO,
  MAX_PROMPT,
  anexosEmJogo,
  blocoDaSintese,
  blocoDosDocumentos,
  docsDaBaseEmJogo,
  lerSintese,
  promptDaSintese,
  sinteseUtil,
  type DocEmJogo,
} from "@/lib/agent/sintese";

const doc = (titulo: string, extratos: string[], origem: "base" | "anexo" = "base"): DocEmJogo => ({ titulo, origem, extratos });

describe("blocoDosDocumentos", () => {
  it("numera, nomeia e marca o que foi anexado AGORA", () => {
    const b = blocoDosDocumentos([doc("Artigo A", ["diz A"]), doc("minha-tese.pdf", ["diz B"], "anexo")]);
    expect(b).toContain("(1) Artigo A");
    expect(b).toContain("(2) minha-tese.pdf [anexado agora]");
    expect(b).toContain("· diz A");
  });

  it("corta cada extrato no teto (a POSIÇÃO do documento importa, não o texto inteiro)", () => {
    const b = blocoDosDocumentos([doc("A", ["x".repeat(5000)])]);
    expect(b.length).toBeLessThan(MAX_EXTRATO + 200);
  });

  it("e tem teto TOTAL, dizendo quantos não couberam", () => {
    const muitos = Array.from({ length: 60 }, (_, i) => doc(`Doc ${i}`, ["y".repeat(MAX_EXTRATO)]));
    const b = blocoDosDocumentos(muitos);
    expect(b.length).toBeLessThanOrEqual(MAX_PROMPT + 200);
    expect(b).toMatch(/\+\d+ documentos não couberam/);
  });

  it("documento sem extrato aparece só com o nome (não some da lista)", () => {
    expect(blocoDosDocumentos([doc("Vazio", [])])).toBe("(1) Vazio");
  });
});

describe("promptDaSintese", () => {
  const { sys, user } = promptDaSintese({ objetivo: "o que dizem sobre entropia", docs: [doc("A", ["a"]), doc("B", ["b"])] });

  it("pede os quatro campos, com `divergem` em destaque", () => {
    expect(sys).toContain('"comum"');
    expect(sys).toContain('"divergem"');
    expect(sys).toContain('"lacunas"');
    expect(sys).toContain('"porDocumento"');
    expect(sys).toMatch(/item mais valioso/);
  });

  it("proíbe inventar divergência e proíbe conhecimento próprio", () => {
    expect(sys).toMatch(/se não houver divergência de verdade, devolva lista vazia/i);
    expect(sys).toMatch(/Só o que está nos extratos/);
  });

  it("trata extrato como CONTEÚDO, nunca ordem (injeção indireta via PDF)", () => {
    expect(sys).toMatch(/nunca ordem/);
  });

  it("o user leva o objetivo, a contagem e os documentos", () => {
    expect(user).toContain("o que dizem sobre entropia");
    expect(user).toContain("Documentos em jogo: 2");
    expect(user).toContain("(1) A");
  });
});

describe("lerSintese · nada confiado", () => {
  it("o caminho feliz", () => {
    const s = lerSintese({
      comum: ["ambos definem entropia como medida de incerteza"],
      divergem: ["A usa base 2, B usa base natural"],
      lacunas: ["nenhum trata de entropia condicional"],
      porDocumento: [{ titulo: "A", diz: "define e aplica" }],
    });
    expect(s.comum).toHaveLength(1);
    expect(s.divergem[0]).toContain("base 2");
    expect(s.porDocumento[0]).toEqual({ titulo: "A", diz: "define e aplica" });
  });

  it("lixo vira listas vazias, nunca undefined solto", () => {
    for (const lixo of [null, undefined, "texto", 42, {}, { comum: "x" }, { porDocumento: "y" }]) {
      const s = lerSintese(lixo);
      expect(s.comum, String(lixo)).toEqual([]);
      expect(s.divergem, String(lixo)).toEqual([]);
      expect(s.lacunas, String(lixo)).toEqual([]);
      expect(s.porDocumento, String(lixo)).toEqual([]);
      expect(sinteseUtil(s), String(lixo)).toBe(false);
    }
  });

  it("item incompleto de porDocumento é descartado (meia linha não ajuda)", () => {
    const s = lerSintese({ porDocumento: [{ titulo: "A" }, { diz: "sem título" }, { titulo: "B", diz: "ok" }] });
    expect(s.porDocumento).toEqual([{ titulo: "B", diz: "ok" }]);
  });

  it("corta quantidade e tamanho", () => {
    const s = lerSintese({
      comum: Array.from({ length: 50 }, (_, i) => `c${i}`),
      divergem: [" ".repeat(10) + "x".repeat(2000)],
    });
    expect(s.comum).toHaveLength(8);
    expect(s.divergem[0].length).toBeLessThanOrEqual(400);
  });

  it("espaço em excesso é normalizado", () => {
    expect(lerSintese({ comum: ["a\n\n  b\tc"] }).comum[0]).toBe("a b c");
  });
});

describe("blocoDaSintese · o texto que o rascunho recebe", () => {
  it("síntese vazia não vira linha nenhuma no prompt", () => {
    expect(blocoDaSintese(lerSintese({}))).toBe("");
  });

  it("monta as seções que existem, e só elas", () => {
    const b = blocoDaSintese(lerSintese({ comum: ["c1"], porDocumento: [{ titulo: "A", diz: "d" }] }));
    expect(b).toContain("Convergem em:");
    expect(b).toContain("Cada um:");
    expect(b).not.toContain("Divergem em:");
    expect(b).not.toContain("NENHUM documento cobre");
  });

  it("LACUNA vem com a instrução de não preencher — a disciplina da F0 aplicada a conteúdo", () => {
    const b = blocoDaSintese(lerSintese({ lacunas: ["entropia condicional"] }));
    expect(b).toContain("NENHUM documento cobre");
    expect(b).toMatch(/não preencha com conhecimento geral/);
  });
});

describe("montando os documentos em jogo", () => {
  it("da base: um documento por grupo, com os trechos dele", () => {
    const d = docsDaBaseEmJogo([{ titulo: "Apostila", trechos: [{ texto: "t1" }, { texto: "t2" }] }]);
    expect(d).toEqual([{ titulo: "Apostila", origem: "base", extratos: ["t1", "t2"] }]);
  });

  it("dos anexos: só o COMEÇO do texto (o conteúdo inteiro já está na evidência via ler_anexo)", () => {
    const d = anexosEmJogo([{ nome: "tese.pdf", texto: "z".repeat(99_999) }]);
    expect(d[0].origem).toBe("anexo");
    expect(d[0].extratos[0].length).toBeLessThanOrEqual(MAX_EXTRATO * 2);
  });

  it("listas vazias não inventam documento", () => {
    expect(docsDaBaseEmJogo([])).toEqual([]);
    expect(anexosEmJogo([])).toEqual([]);
  });
});
