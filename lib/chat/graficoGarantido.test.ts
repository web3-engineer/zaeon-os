/** #764 · pedido de gráfico: o desenho vem SEMPRE (o modelo às vezes pulava o ```grafico) */
import { describe, it, expect } from "vitest";
import { blocoDoCampoGrafico } from "./graficoDados";
import { normalizeAnswer } from "@/lib/agent/aura-harness";

const CAMPO = {
  titulo: "População por região (milhões)",
  barras: [{ rotulo: "Sudeste", valor: 84.8 }, { rotulo: "Nordeste", valor: 54.6 }, { rotulo: "Sul", valor: 29.9 }],
  unidade: "mi",
  fonte: "Censo 2022 (IBGE)",
};
const st = (objective: string) => ({ objective, intent: "explicar_conceito" }) as any;

describe("blocoDoCampoGrafico", () => {
  it("monta o bloco a partir do campo", () => {
    const b = blocoDoCampoGrafico(CAMPO, "texto sem gráfico")!;
    expect(b.startsWith("```grafico\n")).toBe(true);
    expect(JSON.parse(b.split("\n")[1]!).barras).toHaveLength(3);
  });
  it("não duplica quando o texto já tem o bloco; não monta sem fonte nem com 1 barra", () => {
    expect(blocoDoCampoGrafico(CAMPO, "x\n```grafico\n" + JSON.stringify(CAMPO) + "\n```")).toBeNull();
    expect(blocoDoCampoGrafico(CAMPO, 'x\n```grafico\n{"fn":"x^2","xmin":-2,"xmax":2}\n```')).toBeNull();
    expect(blocoDoCampoGrafico({ ...CAMPO, fonte: "" }, "x")).toBeNull();
    expect(blocoDoCampoGrafico({ ...CAMPO, barras: [CAMPO.barras[0]] }, "x")).toBeNull();
    expect(blocoDoCampoGrafico(undefined, "x")).toBeNull();
  });
  it("bloco quebrado no texto não esconde o gráfico bom do campo", () => {
    expect(blocoDoCampoGrafico(CAMPO, "x\n```grafico\n{barras: quebrado\n```")).toMatch(/^```grafico\n/);
    expect(blocoDoCampoGrafico(CAMPO, 'x\n```grafico\n{"barras":[]}\n```')).toMatch(/^```grafico\n/);
    expect(blocoDoCampoGrafico(CAMPO, "x\n```grafico\n{}\n```")).toMatch(/^```grafico\n/);
  });
});

describe("normalizeAnswer · o caso do ar", () => {
  const pedido = "faça um gráfico da população de cada região do Brasil";
  it("veio só o texto com os números + o campo: o bloco entra no fim do desenvolvimento", () => {
    const a = normalizeAnswer({ nucleo: "A população se concentra no Sudeste.", desenvolvimento: "Sudeste 84,8 mi…", grafico: CAMPO } as any, st(pedido));
    expect(a.desenvolvimento).toMatch(/Sudeste 84,8 mi…\n\n```grafico\n/);
  });
  it("sem desenvolvimento, vai no núcleo; com o bloco no texto, nada muda", () => {
    expect(normalizeAnswer({ nucleo: "Números do Censo.", grafico: CAMPO } as any, st(pedido)).nucleo).toContain("```grafico");
    const jaTem = "Veja:\n```grafico\n" + JSON.stringify(CAMPO) + "\n```";
    expect(normalizeAnswer({ nucleo: jaTem, grafico: CAMPO } as any, st(pedido)).nucleo).toBe(jaTem);
  });
  it("sem pedido de gráfico, o campo é ignorado", () => {
    expect(normalizeAnswer({ nucleo: "A fotossíntese…", grafico: CAMPO } as any, st("o que é fotossíntese")).nucleo).not.toContain("```grafico");
  });
});
