import { describe, expect, it } from "vitest";
import { SINTESE_CORRIDA } from "./somCorrida";
import { SINTESE, SONS } from "./audio";

describe("sons da corrida (sintetizados)", () => {
  it("todos geram áudio finito, normalizado, terminam em silêncio e estão registrados como 2D sintéticos", () => {
    for (const [nome, gerar] of Object.entries(SINTESE_CORRIDA)) {
      const x = gerar(22050); let pk = 0; for (const v of x) pk = Math.max(pk, Math.abs(v));
      expect(x.every(Number.isFinite), nome).toBe(true); expect(pk, nome).toBeGreaterThan(0.5); expect(pk, nome).toBeLessThanOrEqual(0.9);
      expect(Math.abs(x[x.length - 1]!), nome).toBeLessThan(0.01);
      const n = nome as keyof typeof SINTESE_CORRIDA; expect(SONS[n].sintetico).toBe(true); expect(SONS[n].modo).toBe("2d"); expect(SINTESE[n]).toBe(gerar);
    }
  });
});
