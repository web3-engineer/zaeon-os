/** Sobe o Leitor de verdade (porta efêmera) contra um "site" local; DNS mockado. */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { criarServidor } from "../../services/leitor-proxy/server.mjs";
import { ipBloqueado } from "../../services/leitor-proxy/guarda.mjs";

let site: http.Server, sitePorta = 0;
const vistos: http.IncomingHttpHeaders[] = [];
beforeAll(async () => {
  site = http.createServer((req, res) => {
    vistos.push(req.headers);
    if (req.url === "/grande") { res.writeHead(200, { "content-type": "text/plain" }); res.end("x".repeat(2 * 1024 * 1024)); return; }
    if (req.url === "/fora") { res.writeHead(302, { location: "http://outro.gov.br/x" }); res.end(); return; }
    if (req.url === "/salto") { res.writeHead(301, { location: "/fim" }); res.end(); return; }
    if (req.url === "/pdf") { res.writeHead(200, { "content-type": "application/pdf" }); res.end("%PDF"); return; }
    if (req.url === "/morto") { res.writeHead(404, { "content-type": "text/html" }); res.end("<p>não achei</p>"); return; }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end("<h1>Boletim</h1><script>x()</script><p>vacinação</p>");
  });
  await new Promise<void>((r) => site.listen(0, "127.0.0.1", () => r()));
  sitePorta = (site.address() as AddressInfo).port;
});
afterAll(() => { site.close(); });

/** proxy: allowlist *.gov.br; "a.gov.br" resolve pro site local (127.0.0.1 liberado SÓ neste teste); "meta.gov.br" → metadata. */
async function proxy(over: Parameters<typeof criarServidor>[0] = {}) {
  const mapa: Record<string, string> = { "a.gov.br": "127.0.0.1", "outro.gov.br": "127.0.0.1", "meta.gov.br": "169.254.169.254", "misto.gov.br": "8.8.8.8" };
  const srv = criarServidor({
    allow: ["*.gov.br"], maxBytes: 1_048_576, portaUpstream: sitePorta,
    lookup: async (h: string) => (h === "misto.gov.br" ? [{ address: "8.8.8.8" }, { address: "10.0.0.5" }] : [{ address: mapa[h] ?? "203.0.113.9" }]),
    bloqueado: (ip: string) => (ip === "127.0.0.1" ? false : ipBloqueado(ip)),
    ...over,
  });
  await new Promise<void>((r) => srv.listen(0, "127.0.0.1", () => r()));
  const porta = (srv.address() as AddressInfo).port;
  const post = async (body: unknown, headers: Record<string, string> = {}) => {
    const r = await fetch(`http://127.0.0.1:${porta}/fetch`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
    return { status: r.status, j: await r.json() as any };
  };
  return { srv, post, porta };
}

describe("leitor-proxy (servidor real)", () => {
  it("lê página da allowlist e devolve só texto", async () => {
    const { srv, post } = await proxy();
    const { status, j } = await post({ url: "http://a.gov.br/boletim" });
    srv.close();
    expect(status).toBe(200);
    expect(j).toMatchObject({ ok: true, status: 200, finalUrl: "http://a.gov.br/boletim", contentType: "text/html", truncado: false });
    expect(j.texto).toBe("Boletim\nvacinação");
  });
  it("host que resolve para 169.254.169.254 → 403 ip_bloqueado", async () => {
    const { srv, post } = await proxy();
    const r = await post({ url: "http://meta.gov.br/latest/meta-data/" });
    srv.close();
    expect(r).toEqual({ status: 403, j: { ok: false, erro: "ip_bloqueado" } });
  });
  it("basta UM IP privado entre os resolvidos → 403", async () => {
    const { srv, post } = await proxy();
    const r = await post({ url: "https://misto.gov.br/" });
    srv.close();
    expect(r.status).toBe(403);
  });
  it("IP literal da metadata → 400 (nem resolve)", async () => {
    const { srv, post } = await proxy();
    const r = await post({ url: "http://169.254.169.254/latest/meta-data/" });
    srv.close();
    expect(r.status).toBe(400); expect(r.j.erro).toBe("ip_literal");
  });
  it("redirect para outro host → 400; mesmo host → segue", async () => {
    const { srv, post } = await proxy();
    const a = await post({ url: "http://a.gov.br/fora" });
    const b = await post({ url: "http://a.gov.br/salto" });
    srv.close();
    expect(a).toEqual({ status: 400, j: { ok: false, erro: "redirect_cross_host" } });
    expect(b.j).toMatchObject({ ok: true, finalUrl: "http://a.gov.br/fim" });
  });
  it("corpo de 2 MB → truncado:true e bytes ≤ maxBytes", async () => {
    const { srv, post } = await proxy();
    const { j } = await post({ url: "http://a.gov.br/grande", maxBytes: 50_000 });
    srv.close();
    expect(j.truncado).toBe(true); expect(j.bytes).toBeLessThanOrEqual(50_000);
  });
  it("file:///etc/passwd → 400; fora da lista → 403; PDF → 415; 404 da página = 200 do proxy com ok:false", async () => {
    const { srv, post } = await proxy();
    const f = await post({ url: "file:///etc/passwd" });
    const fora = await post({ url: "https://evil.com/" });
    const pdf = await post({ url: "http://a.gov.br/pdf" });
    const morto = await post({ url: "http://a.gov.br/morto" });
    srv.close();
    expect(f.status).toBe(400);
    expect(fora).toEqual({ status: 403, j: { ok: false, erro: "dominio_fora_da_lista" } });
    expect(pdf.status).toBe(415);
    expect(morto).toMatchObject({ status: 200, j: { ok: false, status: 404 } });
  });
  it("Authorization/Cookie do pedido NUNCA são repassados; UA próprio", async () => {
    const { srv, post } = await proxy();
    vistos.length = 0;
    await post({ url: "http://a.gov.br/x" }, { authorization: "Bearer segredo", cookie: "s=1" });
    srv.close();
    expect(vistos[0].authorization).toBeUndefined(); expect(vistos[0].cookie).toBeUndefined();
    expect(vistos[0]["user-agent"]).toMatch(/^ZaeonLeitor\/1\.0/);
    expect(vistos[0].host).toBe("a.gov.br");
  });
  it("allowlist vazia nega tudo; /health diz quantos padrões", async () => {
    const { srv, post, porta } = await proxy({ allow: [] });
    const r = await post({ url: "http://a.gov.br/x" });
    const h = await (await fetch(`http://127.0.0.1:${porta}/health`)).json();
    srv.close();
    expect(r.status).toBe(403); expect(h).toEqual({ ok: true, allow: 0 });
  });
});
