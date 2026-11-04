/**
 * lib/tcc/gerar.secao.test.ts — F7 · rota, modelo e PRAZO de cada seção do documento.
 *
 * É aqui que a qualidade do documento se decide, e era o ponto que nenhuma flag do harness
 * alcançava: antes da F7, toda seção de todo documento saía do `zaeon-pool-lite` (provedores
 * GRÁTIS de terceiros) quando o gateway estava de pé — não do Flash, como o nome no código sugeria.
 */
import { describe, it, expect } from "vitest";
import { planoDaSecao } from "@/lib/tcc/gerar";

const M = { pro: "gemini-2.5-pro", flash: "gemini-2.5-flash", pool: "zaeon-pool-lite" };

describe("F7 · o plano de cada seção", () => {
  it("conta COM direito: Pro pelo Vertex, e o prazo DOBRA", () => {
    // o prazo é a parte que importa: Pro com 60 s estouraria e a seção viraria marca de falha —
    // ligar o Pro deixaria o documento PIOR do que estava.
    expect(planoDaSecao({ comPro: true, gateway: true, ...M })).toEqual({ rota: "vertex", model: M.pro, timeoutMs: 120_000 });
  });

  it("o Pro ignora o gateway: pool não serve Pro, então a rota é vertex com ou sem gateway", () => {
    expect(planoDaSecao({ comPro: true, gateway: false, ...M }).rota).toBe("vertex");
    expect(planoDaSecao({ comPro: true, gateway: true, ...M }).rota).toBe("vertex");
  });

  it("conta SEM direito e gateway de pé: segue no pool GRÁTIS, 60 s — o padrão de antes, intacto", () => {
    expect(planoDaSecao({ comPro: false, gateway: true, ...M })).toEqual({ rota: "gateway", model: M.pool, timeoutMs: 60_000 });
  });

  it("conta SEM direito e gateway FORA: Flash pelo Vertex, 60 s — também o de antes", () => {
    expect(planoDaSecao({ comPro: false, gateway: false, ...M })).toEqual({ rota: "vertex", model: M.flash, timeoutMs: 60_000 });
  });

  it("sem direito, o Pro NUNCA aparece — nem por acidente de rota", () => {
    for (const gateway of [true, false]) {
      expect(planoDaSecao({ comPro: false, gateway, ...M }).model, String(gateway)).not.toBe(M.pro);
      expect(planoDaSecao({ comPro: false, gateway, ...M }).timeoutMs, String(gateway)).toBe(60_000);
    }
  });
});
