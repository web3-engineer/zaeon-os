import { describe, it, expect } from "vitest";
import {
  montarArquivo, normalizar, validarDigitado, estaCompleto, programaDeTeste, snippetsDoCard,
  type CardDeArquivo,
} from "./tutorialArquivo";

// Card JS de exemplo: a função soma, quebrada em 3 snippets que, concatenados, = o arquivo real.
const cardJS: CardDeArquivo = {
  arquivo: "soma.js",
  funcao: "Soma dois números — a função mais simples, pra provar a mecânica.",
  ordem: 0,
  linguagem: "javascript",
  abas: [
    {
      titulo: "A função",
      snippets: [
        { explicacao: "A assinatura: nome e parâmetros.", codigo: "function soma(a, b) {" },
        { explicacao: "O corpo: devolve a soma.", codigo: "  return a + b;" },
        { explicacao: "Fecha o bloco.", codigo: "}" },
      ],
    },
  ],
  teste: "if (soma(2, 3) !== 5) throw new Error('esperava 5');\nif (soma(-1, 1) !== 0) throw new Error('esperava 0');",
};

const snips = snippetsDoCard(cardJS);
const certos = snips.map((s) => s.codigo);

describe("tutorialArquivo — a harmonia: snippets concatenados = o arquivo real", () => {
  it("montarArquivo concatena os snippets no arquivo completo", () => {
    expect(montarArquivo(cardJS)).toBe("function soma(a, b) {\n  return a + b;\n}");
  });

  it("validarDigitado aceita o trecho exato e tolera espaço no fim; recusa o errado", () => {
    expect(validarDigitado(snips[1], "  return a + b;")).toBe(true);
    expect(validarDigitado(snips[1], "  return a + b;   ")).toBe(true); // espaço no fim, ok
    expect(validarDigitado(snips[1], "return a + b;")).toBe(false);     // indentação importa
    expect(validarDigitado(snips[1], "  return a - b;")).toBe(false);   // código errado
    expect(validarDigitado(snips[1], "")).toBe(false);                  // vazio (ex.: colou nada)
  });

  it("estaCompleto só é true quando TODOS os snippets batem", () => {
    expect(estaCompleto(cardJS, certos)).toBe(true);
    const faltando = [...certos]; faltando[1] = "";                      // faltou um trecho
    expect(estaCompleto(cardJS, faltando)).toBe(false);
  });

  it("normalizar: CRLF→LF, tira espaço no fim de linha e linhas vazias finais", () => {
    expect(normalizar("a \r\nb\t\n\n")).toBe("a\nb");
  });
});

describe("tutorialArquivo — PONTA A PONTA: o programa do aluno realmente roda (card JS executado)", () => {
  const rodar = (programa: string): { passou: boolean; erro?: string } => {
    try { new Function(programa)(); return { passou: true }; }
    catch (e) { return { passou: false, erro: (e as Error).message }; }
  };

  it("com o arquivo digitado CERTO, o teste passa", () => {
    const r = rodar(programaDeTeste(cardJS, certos));
    expect(r.passou, r.erro).toBe(true);
  });

  it("faltando/errando um trecho, o teste FALHA (tutorial não é parcial — é real)", () => {
    const errado = [...certos]; errado[1] = "  return a - b;";           // corpo errado
    const r = rodar(programaDeTeste(cardJS, errado));
    expect(r.passou).toBe(false);
    expect(r.erro).toContain("esperava");
  });

  it("programaDeTeste sem digitados usa o arquivo de referência (também passa)", () => {
    expect(rodar(programaDeTeste(cardJS)).passou).toBe(true);
  });
});
