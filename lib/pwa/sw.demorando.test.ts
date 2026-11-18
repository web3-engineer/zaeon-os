/**
 * #841 · o service worker (public/sw.js) com o servidor lento: se a navegação não responde em 6 s, aparece o aviso
 * "demorando" (página leve, 503, na língua do aparelho); resposta rápida passa direto; sem rede, a /offline.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

type Handler = (e: { request: Request; respondWith: (p: Promise<Response>) => void; waitUntil: (p: Promise<unknown>) => void }) => void;

function carregarSW(fetchFalso: (req: Request) => Promise<Response>) {
  const ouvintes: Record<string, Handler> = {};
  const contexto = {
    self: { addEventListener: (tipo: string, fn: Handler) => { ouvintes[tipo] = fn; }, location: { origin: "https://zaeon.com.br" } },
    caches: { match: async () => new Response("pagina offline", { status: 200 }), open: async () => ({}) },
    fetch: fetchFalso, Response, Request, URL, Promise, Symbol, setTimeout, clearTimeout, console,
  };
  vm.runInNewContext(readFileSync(path.resolve(__dirname, "../../public/sw.js"), "utf8"), contexto);
  return async (url: string, lingua = "pt-BR") => {
    const request = new Request(url, { headers: { "accept-language": lingua } });
    Object.defineProperty(request, "mode", { value: "navigate" });
    let resposta: Promise<Response> | undefined;
    ouvintes.fetch({ request, respondWith: (p) => { resposta = p; }, waitUntil: () => {} });
    return resposta!;
  };
}

describe("sw.js · servidor lento (#841)", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("resposta antes de 6 s passa direto", async () => {
    const navegar = carregarSW(async () => new Response("laboratorio", { status: 200 }));
    const r = await navegar("https://zaeon.com.br/research-lab");
    expect(await r.text()).toBe("laboratorio");
  });

  it("servidor mudo por 6 s: aviso 'demorando' com 'tentar de novo', na língua do aparelho", async () => {
    const navegar = carregarSW(() => new Promise<Response>(() => {}));
    const p = navegar("https://zaeon.com.br/research-lab");
    await vi.advanceTimersByTimeAsync(6000);
    const r = await p;
    expect(r.status).toBe(503);
    const html = await r.text();
    expect(html).toContain("A Zaeon está demorando para responder");
    expect(html).toContain("Tentar de novo");

    const em = carregarSW(() => new Promise<Response>(() => {}))("https://zaeon.com.br/", "en-US,en;q=0.9");
    await vi.advanceTimersByTimeAsync(6000);
    expect(await (await em).text()).toContain("Try again");
  });

  it("sem rede: a página /offline guardada", async () => {
    const navegar = carregarSW(async () => { throw new TypeError("Failed to fetch"); });
    const r = await navegar("https://zaeon.com.br/research-lab");
    expect(await r.text()).toBe("pagina offline");
  });
});
