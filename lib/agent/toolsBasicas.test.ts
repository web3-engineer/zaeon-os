import { describe, it, expect } from "vitest";
import {
  avaliar, converter, agoraEm,
  calcularDef, converterDef, dataHoraDef, TOOLS_BASICAS,
} from "@/lib/agent/toolsBasicas";

describe("avaliar · aritmética correta", () => {
  it("precedência, parênteses, módulo", () => {
    expect(avaliar("2 + 3 * 4")).toEqual({ ok: true, valor: 14 });
    expect(avaliar("(2 + 3) * 4")).toEqual({ ok: true, valor: 20 });
    expect(avaliar("10 % 3")).toEqual({ ok: true, valor: 1 });
    expect(avaliar("(1234*56.7)/3")).toMatchObject({ ok: true });
  });
  it("potência é associativa à direita; unário abaixo da potência", () => {
    expect(avaliar("2^3^2")).toEqual({ ok: true, valor: 512 }); // 2^(3^2), não (2^3)^2=64
    expect(avaliar("-2^2")).toEqual({ ok: true, valor: -4 });    // -(2^2)
    expect(avaliar("2^-1")).toEqual({ ok: true, valor: 0.5 });
  });
  it("funções e constantes da tabela fechada", () => {
    expect(avaliar("sqrt(16)")).toEqual({ ok: true, valor: 4 });
    expect(avaliar("max(1, 2, 3)")).toEqual({ ok: true, valor: 3 });
    expect(avaliar("abs(-5)")).toEqual({ ok: true, valor: 5 });
    expect(avaliar("round(2.7)")).toEqual({ ok: true, valor: 3 });
    expect(avaliar("ln(e)")).toMatchObject({ ok: true });
    expect((avaliar("log(100)") as any).valor).toBeCloseTo(2, 9);
    expect((avaliar("2 * pi") as any).valor).toBeCloseTo(Math.PI * 2, 9);
  });
  it("notação científica e decimais", () => {
    expect(avaliar("1.5e3")).toEqual({ ok: true, valor: 1500 });
    expect(avaliar(".5 + .25")).toEqual({ ok: true, valor: 0.75 });
  });
});

describe("avaliar · erros honestos", () => {
  it("divisão/módulo por zero", () => {
    expect(avaliar("1/0")).toMatchObject({ ok: false, erro: "divisao_por_zero" });
    expect(avaliar("5 % 0")).toMatchObject({ ok: false, erro: "divisao_por_zero" });
  });
  it("vazio, incompleto, sobra", () => {
    expect(avaliar("")).toMatchObject({ ok: false });
    expect(avaliar("2 +")).toMatchObject({ ok: false });
    expect(avaliar("(2")).toMatchObject({ ok: false });
    expect(avaliar("2 2")).toMatchObject({ ok: false });
  });
});

describe("avaliar · SEGURANÇA: nada além de aritmética passa", () => {
  it("nenhuma injeção de código vira execução — vira erro", () => {
    for (const mal of [
      "process.exit(1)", "globalThis", "constructor", "require('fs')", "this",
      "[].constructor", "1;2", "alert(1)", "eval('2')", "__proto__", "import('x')",
      "window", "0x10 && 1", "`${1}`", "a=1",
    ]) {
      expect(avaliar(mal).ok, mal).toBe(false);
    }
  });
  it("função fora da tabela é erro, não propriedade de objeto", () => {
    expect(avaliar("hasOwnProperty(1)")).toMatchObject({ ok: false });
    expect(avaliar("valueOf()")).toMatchObject({ ok: false });
    expect(avaliar("foo(2)")).toMatchObject({ ok: false, erro: "funcao_desconhecida:foo" });
  });
});

describe("converter", () => {
  it("comprimento, massa, dados, volume", () => {
    expect((converter(10, "km", "mi") as any).valor).toBeCloseTo(6.2137, 3);
    expect(converter(1, "kg", "g")).toEqual({ ok: true, valor: 1000 });
    expect(converter(2, "GB", "MB")).toEqual({ ok: true, valor: 2000 });
    expect((converter(1, "gal", "l") as any).valor).toBeCloseTo(3.7854, 3);
  });
  it("temperatura (fórmula, não fator)", () => {
    expect(converter(100, "C", "F")).toEqual({ ok: true, valor: 212 });
    expect(converter(32, "F", "C")).toEqual({ ok: true, valor: 0 });
    expect(converter(0, "C", "K")).toEqual({ ok: true, valor: 273.15 });
  });
  it("dimensões incompatíveis e unidade desconhecida", () => {
    expect(converter(1, "km", "kg")).toMatchObject({ ok: false, erro: "dimensoes_incompativeis" });
    expect(converter(1, "C", "kg")).toMatchObject({ ok: false, erro: "dimensoes_incompativeis" });
    expect(converter(1, "xpto", "m")).toMatchObject({ ok: false, erro: "unidade_desconhecida" });
  });
});

describe("agoraEm", () => {
  it("fuso válido devolve texto com ISO UTC", () => {
    const r = agoraEm("America/Sao_Paulo");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.texto).toMatch(/ISO UTC \d{4}-\d{2}-\d{2}T/);
  });
  it("fuso inválido falha fechado", () => {
    expect(agoraEm("Marte/Olympus")).toMatchObject({ ok: false, erro: "fuso_invalido" });
  });
});

describe("as ToolDef", () => {
  it("são puras, read, free e entram no pacote base", () => {
    expect(TOOLS_BASICAS.map((t) => t.name)).toEqual(["calcular", "converter", "data_hora"]);
    for (const d of TOOLS_BASICAS) {
      expect(d.runtime).toBe("ts");
      expect(d.risk).toBe("read");
      expect(d.minPlan).toBe("free");
    }
  });
  it("calcularDef.run devolve o resultado; argumento ruim é bad_args", async () => {
    expect(await calcularDef.run({ expressao: "6*7" }, {} as any)).toMatchObject({ ok: true });
    expect(await calcularDef.run({ expressao: "" }, {} as any)).toMatchObject({ ok: false, code: "bad_args" });
    expect(await calcularDef.run({ expressao: "process.exit(1)" }, {} as any)).toMatchObject({ ok: false, code: "calc_error" });
  });
  it("converterDef e dataHoraDef.run", async () => {
    expect(await converterDef.run({ valor: 100, de: "C", para: "F" }, {} as any)).toMatchObject({ ok: true });
    expect(await converterDef.run({ valor: 1, de: "km", para: "kg" }, {} as any)).toMatchObject({ ok: false, code: "convert_error" });
    expect(await dataHoraDef.run({ fuso: "Europe/Lisbon" }, {} as any)).toMatchObject({ ok: true });
    expect(await dataHoraDef.run({ fuso: "Nao/Existe" }, {} as any)).toMatchObject({ ok: false, code: "bad_args" });
  });
});
