/** #819 · o corpo da avatar tenta de novo quando a rede corta no meio */
import { describe, it, expect } from "vitest";
import { baixarBytes, comTentativas, ErroHttp, ErroParado, vale } from "./tentarDeNovo";

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

/** uma resposta cujo corpo manda os pedaços e depois, se `paraNoFim`, fica em silêncio pra sempre */
function resposta(pedacos: number[], paraNoFim = false, status = 200) {
  let i = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(c) {
      if (i < pedacos.length) { c.enqueue(new Uint8Array(pedacos[i++]!)); return; }
      if (paraNoFim) return new Promise<void>(() => {});   // (a conexão parou: nada chega, nada fecha)
      c.close();
    },
  });
  return new Response(body, { status });
}

describe("baixarBytes", () => {
  it("junta os pedaços inteiros", async () => {
    const b = await baixarBytes("/a.vrm", { fetchImpl: (async () => resposta([3, 4])) as typeof fetch });
    expect(b.byteLength).toBe(7);
  });

  it("conexão que PAROU de mandar bytes vira ErroParado (e vale repetir), em vez de ficar pendurada", async () => {
    const f = (async () => resposta([5], true)) as typeof fetch;
    const e = await baixarBytes("/a.vrm", { paradoMs: 20, fetchImpl: f }).catch((x) => x);
    expect(e).toBeInstanceOf(ErroParado);
    expect(vale(e)).toBe(true);
  });

  it("parada na 1ª vez, inteiro na 2ª: o comTentativas segura", async () => {
    let vezes = 0;
    const f = (async () => { vezes++; return vezes === 1 ? resposta([5], true) : resposta([5, 5]); }) as typeof fetch;
    const b = await comTentativas(() => baixarBytes("/a.vrm", { paradoMs: 20, fetchImpl: f }), semEspera);
    expect(b.byteLength).toBe(10);
    expect(vezes).toBe(2);
  });

  it("HTTP de erro vira ErroHttp", async () => {
    const e = await baixarBytes("/x.vrm", { fetchImpl: (async () => resposta([], false, 404)) as typeof fetch }).catch((x) => x);
    expect(e).toBeInstanceOf(ErroHttp);
    expect(e.status).toBe(404);
  });
});
