import { describe, expect, it } from "vitest";
import { CASAS, MOEDA_DE, exibicao, fmtMoeda, montarCobranca } from "./cobranca";

describe("moeda por finalidade", () => {
  it("apoio = USDC, compra = SOL", () => {
    expect(MOEDA_DE.apoio).toBe("USDC");
    expect(MOEDA_DE.compra).toBe("SOL");
  });
});

describe("montarCobranca — a taxa entra por cima, o beneficiário recebe o cheio", () => {
  it("apoio em USDC: recebe o valor escolhido, total = valor + (0,45 + 0,3%)", () => {
    const { cobranca } = montarCobranca("apoio", 10);
    expect(cobranca).toEqual({ finalidade: "apoio", moeda: "USDC", recebe: 10, taxa: 0.48, total: 10.48 });
  });

  it("compra em SOL: fixo 0,005 + 0,3%", () => {
    const { cobranca } = montarCobranca("compra", 2);
    // taxa = 0,005 + 0,006 = 0,011 ; total = 2,011
    expect(cobranca).toMatchObject({ moeda: "SOL", recebe: 2, taxa: 0.011, total: 2.011 });
  });

  it("a taxa arredonda PRA CIMA (o beneficiário nunca recebe a menos)", () => {
    const { cobranca } = montarCobranca("apoio", 3.33); // 0,45 + 0,00999 = 0,45999 → 0,46
    expect(cobranca?.taxa).toBe(0.46);
    expect(cobranca?.recebe).toBe(3.33);
    expect(cobranca?.total).toBe(3.79);
  });

  it("abaixo do mínimo da moeda: erro, sem cobrança", () => {
    expect(montarCobranca("apoio", 0.5).erro).toMatch(/mínimo/);
    expect(montarCobranca("compra", 0.001).erro).toMatch(/mínimo/);
    expect(montarCobranca("apoio", 0).erro).toMatch(/valor/i);
    expect(montarCobranca("apoio", 1).cobranca).toBeTruthy(); // 1 USDC é o mínimo
  });
});

describe("exibição — 'sem ele perceber' = um total só, taxa embutida, sem linha de taxa no fluxo", () => {
  it("mostra o TOTAL e um rótulo discreto de taxas incluídas", () => {
    const { cobranca } = montarCobranca("apoio", 25);
    const e = exibicao(cobranca!);
    expect(e.total).toBe("25,53 USDC"); // 25 + 0,45 + 0,075 = 25,525 → total 25,53
    expect(e.nota).toBe("taxas de rede incluídas");
    // o detalhe (recibo) separa, mas não aparece no fluxo de escolher
    expect(e.recebeDetalhe).toContain("25 USDC pra pesquisa");
  });

  it("fmtMoeda respeita as casas da moeda", () => {
    expect(fmtMoeda(10, "USDC")).toBe("10 USDC");
    expect(fmtMoeda(0.5, "SOL")).toBe("0,5 SOL");
    expect(CASAS.USDC).toBe(2);
    expect(CASAS.SOL).toBe(4);
  });
});
