import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FAIXAS_TOON, espessuraTinta, estiloDe, usaCorpoDoFundador, decidirTraje } from "./estiloAvatar";

describe("estilo do corpo do jogador (experimento anime)", () => {
  it("padrão = ser de luz; a env liga pra todos; ?anime=1 / ?anime=0 manda na env", () => {
    expect(estiloDe(undefined, "")).toBe("luz");
    expect(estiloDe("anime", "")).toBe("anime");
    expect(estiloDe(undefined, "?nascer=1&anime=1")).toBe("anime");
    expect(estiloDe("anime", "?anime=0")).toBe("luz");
    expect(estiloDe("qualquer", "?anime=talvez")).toBe("luz");
  });
  it("cel shading em 3 faixas crescentes; contorno fino", () => {
    expect(FAIXAS_TOON).toHaveLength(3);
    expect([...FAIXAS_TOON].sort((a, b) => a - b)).toEqual([...FAIXAS_TOON]);
    // o traço acompanha a escala do modelo: ~1,5 cm num corpo de 1,8 m, venha ele em metros ou em centímetros
    expect(espessuraTinta(1.85)).toBeCloseTo(0.0157, 3); expect(espessuraTinta(185)).toBeCloseTo(1.57, 1);
  });
  it("o founder tem o corpo PRÓPRIO (só ele); ?founder=0 volta pro padrão", () => {
    expect(usaCorpoDoFundador(true, "")).toBe(true); expect(usaCorpoDoFundador(false, "")).toBe(false); expect(usaCorpoDoFundador(undefined, "")).toBe(false);
    expect(usaCorpoDoFundador(true, "?founder=0")).toBe(false);
  });
});

/**
 * A REGRA DO TRAJE — e o caso 3 é a correção de nov/2026, achada medindo no navegador.
 *
 * O pedido do dono era "tirar o traje, fica só a skin". Ele supunha que toda pessoa TEM uma skin. Quem nunca
 * escolheu corpo próprio não tem nenhuma — e sem traje ficava à mostra o GLB de referência do AvatarLuz, que é o
 * `Soldier.glb` de EXEMPLO do three.js, baixado ao vivo do site deles. Era a primeira coisa que um usuário novo via
 * de si mesmo, e a tela de escolher personagem já o mostrava DE TRAJE: a prévia prometia e o mundo não entregava.
 */
describe("decidirTraje · quem veste o quê", () => {
  it("1 · o fundador veste a armadura PRETA (pedido dele, out/2026)", () => {
    expect(decidirTraje({ fundador: true, temCorpoProprio: false })).toBe("preta");
    expect(decidirTraje({ fundador: true, temCorpoProprio: true })).toBe("preta");
  });

  it("2 · quem tem corpo PRÓPRIO não veste traje — a skin manda (pedido do dono, nov/2026)", () => {
    expect(decidirTraje({ fundador: false, temCorpoProprio: true })).toBe("nenhum");
  });

  it("3 · quem NÃO tem corpo nenhum veste o traje padrão — nunca o soldado de exemplo do three.js", () => {
    expect(decidirTraje({ fundador: false, temCorpoProprio: false }), "sem isto, o usuário novo É o Soldier.glb").toBe("padrao");
  });

  it("a regra NUNCA devolve 'sem nada': todo caso tem resposta", () => {
    for (const fundador of [true, false]) {
      for (const temCorpoProprio of [true, false]) {
        const d = decidirTraje({ fundador, temCorpoProprio });
        expect(["preta", "nenhum", "padrao"]).toContain(d);
        // "nenhum" só é aceitável quando existe um corpo por baixo
        if (d === "nenhum") expect(temCorpoProprio, "traje nenhum sem corpo = o soldado de exemplo à mostra").toBe(true);
      }
    }
  });

  it("o engine USA a regra (senão ela é código morto, como o pedeGraficoMatematico)", () => {
    const eng = readFileSync(join(process.cwd(), "components/cyber/engine.ts"), "utf8");
    expect(eng).toContain("decidirTraje({ fundador: fund, temCorpoProprio })");
    expect(eng, "o caso 'padrao' precisa vestir de verdade").toMatch(/case "padrao":\s*a\.av\.traje\(true/);
  });
});
