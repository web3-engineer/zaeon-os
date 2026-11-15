/** #819 · o corpo da avatar tenta de novo quando a rede corta no meio */
import { describe, it, expect } from "vitest";
import { comTentativas, ErroHttp, vale } from "./tentarDeNovo";

const semEspera = { esperar: async () => {} };

describe("comTentativas", () => {
  it("a rede cortou no meio (o erro do ar) e na segunda vez veio inteiro", async () => {
    let vezes = 0;
    const r = await comTentativas(async () => {
      vezes++;
      if (vezes === 1) throw new TypeError("Content-Length header of network response exceeds response Body.");
      return "corpo inteiro";
    }, semEspera);
    expect(r).toBe("corpo inteiro");
    expect(vezes).toBe(2);
  });

  it("servidor reiniciando (502) também tenta de novo; desiste depois de 3", async () => {
    let vezes = 0;
    await expect(comTentativas(async () => { vezes++; throw new ErroHttp(502, "/avatars/aura/aura.vrm"); }, semEspera)).rejects.toThrow("502");
    expect(vezes).toBe(3);
  });

  it("404 não adianta repetir: falha na hora", async () => {
    let vezes = 0;
    await expect(comTentativas(async () => { vezes++; throw new ErroHttp(404, "/x.vrm"); }, semEspera)).rejects.toThrow("404");
    expect(vezes).toBe(1);
  });

  it("espera entre as tentativas (1,5 s e depois 4 s)", async () => {
    const esperas: number[] = [];
    await comTentativas(async () => { if (esperas.length < 2) throw new TypeError("network error"); return 1; }, { esperar: async (ms) => { esperas.push(ms); } });
    expect(esperas).toEqual([1500, 4000]);
  });

  it("quem vale repetir", () => {
    expect(vale(new TypeError("Failed to fetch"))).toBe(true);
    expect(vale(new ErroHttp(503, "x"))).toBe(true);
    expect(vale(new ErroHttp(429, "x"))).toBe(true);
    expect(vale(new ErroHttp(403, "x"))).toBe(false);
    expect(vale(new DOMException("cancelado", "AbortError"))).toBe(false);
  });
});
