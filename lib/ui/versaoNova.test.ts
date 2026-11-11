/** #756 · deploy novo com a aba aberta: recarregar quando falta pedaço do site, avisar quando o commit mudou. */
import { describe, it, expect } from "vitest";
import { ehErroDeChunk, podeRecarregar, versaoMudou, INTERVALO_RECARGA_MS } from "./versaoNova";
import { GET } from "@/app/api/versao/route";

describe("#756 · erro de pedaço do site que sumiu", () => {
  it("reconhece o ChunkLoadError do ar e as variações dos navegadores", () => {
    const e = Object.assign(new Error("Loading chunk 177 failed.\n(error: https://zaeon.com.br/_next/static/chunks/177.39b7cbb58f41ff57.js)"), { name: "ChunkLoadError" });
    expect(ehErroDeChunk(e)).toBe(true);
    expect(ehErroDeChunk(new Error("Loading CSS chunk app-layout failed"))).toBe(true);
    expect(ehErroDeChunk(new TypeError("Failed to fetch dynamically imported module: https://x/_next/a.js"))).toBe(true);
    expect(ehErroDeChunk("error loading dynamically imported module")).toBe(true);
    expect(ehErroDeChunk(new TypeError("Importing a module script failed."))).toBe(true);
  });
  it("erro comum não recarrega a página", () => {
    expect(ehErroDeChunk(new TypeError("Cannot read properties of undefined (reading 'x')"))).toBe(false);
    expect(ehErroDeChunk(new Error("Failed to fetch"))).toBe(false);
    expect(ehErroDeChunk(null)).toBe(false);
    expect(ehErroDeChunk(undefined)).toBe(false);
  });
  it("no máximo uma recarga automática por minuto (nunca laço)", () => {
    expect(podeRecarregar(1_000_000, null)).toBe(true);
    expect(podeRecarregar(1_000_000, 1_000_000 - 5_000)).toBe(false);
    expect(podeRecarregar(1_000_000, 1_000_000 - INTERVALO_RECARGA_MS)).toBe(true);
    expect(podeRecarregar(1_000_000, NaN)).toBe(true);
  });
});

describe("#756 · versão do ar", () => {
  it("avisa só quando os dois commits são conhecidos e diferentes", () => {
    expect(versaoMudou("a1de6d35", "02d89227")).toBe(true);
    expect(versaoMudou("549dcd05", "549dcd05")).toBe(false);
    expect(versaoMudou("unknown", "549dcd05")).toBe(false);
    expect(versaoMudou(null, "549dcd05")).toBe(false);
    expect(versaoMudou("549dcd05", null)).toBe(false);
  });
  it("/api/versao devolve só o commit, sem cache", async () => {
    const antes = process.env.GIT_SHA;
    process.env.GIT_SHA = "549dcd05";
    const r = GET();
    expect(await r.json()).toEqual({ commit: "549dcd05" });
    expect(r.headers.get("Cache-Control")).toBe("no-store");
    if (antes === undefined) delete process.env.GIT_SHA; else process.env.GIT_SHA = antes;
  });
});
