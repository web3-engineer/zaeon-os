import { describe, it, expect } from "vitest";
import { MARCA_NOME, formasDoNome, ocultarNome, reporNome, vazouNome } from "./semNome";

describe("semNome · formas do nome", () => {
  it("nome inteiro e primeiro nome, do mais longo pro mais curto", () => {
    expect(formasDoNome("Ana Paula Souza")).toEqual(["Ana Paula Souza", "Ana"]);
  });

  it("nome único não duplica", () => {
    expect(formasDoNome("Marina")).toEqual(["Marina"]);
  });

  it("vazio, nulo e só espaço não geram forma nenhuma", () => {
    for (const v of ["", "   ", null, undefined]) expect(formasDoNome(v)).toEqual([]);
  });

  it("inicial de uma letra não vira forma (trocaria qualquer 'A' do texto)", () => {
    expect(formasDoNome("A Silva")).toEqual(["A Silva"]);
  });
});

describe("semNome · ocultar", () => {
  it("troca o nome na linha Nome: e no histórico — os dois lugares onde ele aparece", () => {
    const prompt = [
      "Nome: Marina",
      "Perguntou nas últimas 24 h: \"como a Marina faz pra estudar derivada?\"",
      "Últimas mensagens no WhatsApp:",
      "Zaeon: Bom dia, Marina!",
      "Aluno: oi",
    ].join("\n");
    const out = ocultarNome(prompt, "Marina");
    expect(out).not.toContain("Marina");
    expect(out.match(/\{\{NOME\}\}/g)).toHaveLength(3);
  });

  it("nome inteiro antes do primeiro: 'Ana Paula' não vira '{{NOME}} Paula'", () => {
    expect(ocultarNome("Nome: Ana Paula", "Ana Paula")).toBe(`Nome: ${MARCA_NOME}`);
  });

  it("acento não escapa da troca (o \\b do ASCII erraria aqui)", () => {
    expect(ocultarNome("Nome: José", "José")).toBe(`Nome: ${MARCA_NOME}`);
    expect(ocultarNome("fala com o José hoje", "José")).toBe(`fala com o ${MARCA_NOME} hoje`);
  });

  it("não troca o nome DENTRO de outra palavra", () => {
    expect(ocultarNome("comeu banana", "Ana")).toBe("comeu banana");
    expect(ocultarNome("Mariana estuda", "Maria")).toBe("Mariana estuda");
  });

  it("caixa não importa", () => {
    expect(ocultarNome("MARINA e marina", "Marina")).toBe(`${MARCA_NOME} e ${MARCA_NOME}`);
  });

  it("nome com pontuação não quebra a regex", () => {
    expect(ocultarNome("Nome: J. Silva", "J. Silva")).toBe(`Nome: ${MARCA_NOME}`);
  });

  it("sem nome no cadastro, o texto sai intacto", () => {
    expect(ocultarNome("Nome: ninguém", null)).toBe("Nome: ninguém");
  });
});

describe("semNome · repor", () => {
  it("a marca volta a ser o PRIMEIRO nome — é como a Zaeon fala com a pessoa", () => {
    expect(reporNome(`Bom dia, ${MARCA_NOME}! Topa revisar?`, "Ana Paula Souza")).toBe("Bom dia, Ana! Topa revisar?");
  });

  it("várias marcas, todas repostas", () => {
    expect(reporNome(`${MARCA_NOME}, oi ${MARCA_NOME}`, "Marina")).toBe("Marina, oi Marina");
  });

  it("SEM nome no cadastro a marca não chega no aluno (vírgula e espaço somem com ela)", () => {
    expect(reporNome(`Bom dia, ${MARCA_NOME}! Topa revisar?`, null)).toBe("Bom dia! Topa revisar?");
    expect(reporNome(`Oi ${MARCA_NOME}, tudo bem?`, "")).toBe("Oi, tudo bem?");
  });

  it("ida e volta devolve o nome original na mensagem", () => {
    const msg = "Bom dia, Marina! Vamos revisar cálculo?";
    const ida = ocultarNome(msg, "Marina");
    expect(ida).not.toContain("Marina");
    expect(reporNome(ida, "Marina")).toBe(msg);
  });
});

describe("semNome · vazouNome (a guarda)", () => {
  it("acusa o nome presente e absolve o texto já oculto", () => {
    expect(vazouNome("Nome: Marina", "Marina")).toBe(true);
    expect(vazouNome(ocultarNome("Nome: Marina", "Marina"), "Marina")).toBe(false);
  });

  it("não acusa por substring", () => {
    expect(vazouNome("comeu banana", "Ana")).toBe(false);
  });

  it("sem nome, nada vaza", () => {
    expect(vazouNome("qualquer texto", null)).toBe(false);
  });
});
