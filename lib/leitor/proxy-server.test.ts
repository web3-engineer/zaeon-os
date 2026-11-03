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
    if (req.url === "/doc.pdf") { res.writeHead(200, { "content-type": "application/pdf" }); res.end("%PDF-1.7 conteudo"); return; }
    if (req.url === "/dados.csv") { res.writeHead(200, { "content-type": "text/csv" }); res.end("a,b\n1,2\n"); return; }
    // sem content-length: força o corte pelo STREAM, não pelo cabeçalho anunciado
    if (req.url === "/fluxo") { res.writeHead(200, { "content-type": "text/plain", "transfer-encoding": "chunked" }); for (let i = 0; i < 40; i++) res.write("y".repeat(10_000)); res.end(); return; }
    if (req.url === "/pra-outro") { res.writeHead(302, { location: "http://outro.gov.br/doc.pdf" }); res.end(); return; }
    if (req.url === "/pra-fora") { res.writeHead(302, { location: "http://evil.com/doc.pdf" }); res.end(); return; }
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
    allow: ["*.gov.br"], maxBytes: 1_048_576, portaUpstream: sitePorta, httpNosBytes: true,
    lookup: async (h: string) => (h === "misto.gov.br" ? [{ address: "8.8.8.8" }, { address: "10.0.0.5" }] : [{ address: mapa[h] ?? "203.0.113.9" }]),
    bloqueado: (ip: string) => (ip === "127.0.0.1" ? false : ipBloqueado(ip)),
    ...over,
  });
  await new Promise<void>((r) => srv.listen(0, "127.0.0.1", () => r()));
  const porta = (srv.address() as AddressInfo).port;
  const chamar = (rota: string) => async (body: unknown, headers: Record<string, string> = {}) => {
    const r = await fetch(`http://127.0.0.1:${porta}${rota}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
    return { status: r.status, j: await r.json() as any };
  };
  return { srv, post: chamar("/fetch"), postBytes: chamar("/bytes"), porta };
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
  it("redirect segue no mesmo host E pra outro host da allowlist (apex→www é o caso comum)", async () => {
    const { srv, post } = await proxy();
    const a = await post({ url: "http://a.gov.br/fora" });
    const b = await post({ url: "http://a.gov.br/salto" });
    srv.close();
    // ANTES isto era 400 `redirect_cross_host`, e quebrava a leitura NORMAL: a comparação é de
    // hostname exato, então `who.int` → `www.who.int` já caía, e `doi.org` — que só existe pra
    // redirecionar — nunca funcionou. Chegava ao aluno como "o site recusou a leitura".
    expect(a.j).toMatchObject({ ok: true, finalUrl: "http://outro.gov.br/x" });
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

/**
 * F1b · /bytes — o mesmo pipeline (allowlist → DNS → ipBloqueado → conecta pelo IP), com TRÊS
 * políticas mais duras que o /fetch e UMA mais frouxa, todas de propósito. Ver server.mjs.
 */
describe("leitor-proxy · /bytes (F1b)", () => {
  const b64 = (j: any) => Buffer.from(String(j.bytesB64), "base64").toString("utf8");

  it("baixa um PDF da allowlist e devolve os BYTES, marcados como não-confiáveis", async () => {
    const { srv, postBytes } = await proxy();
    const { status, j } = await postBytes({ url: "http://a.gov.br/doc.pdf" });
    srv.close();
    expect(status).toBe(200);
    expect(j).toMatchObject({ ok: true, status: 200, contentType: "application/pdf", untrusted: true });
    expect(b64(j)).toBe("%PDF-1.7 conteudo");
    expect(j.bytes).toBe(17);
    expect(j.texto).toBeUndefined();   // /bytes não transforma nada
  });

  it("CSV também (a ingestão lê como texto)", async () => {
    const { srv, postBytes } = await proxy();
    const { j } = await postBytes({ url: "http://a.gov.br/dados.csv" });
    srv.close();
    expect(j.contentType).toBe("text/csv");
    expect(b64(j)).toBe("a,b\n1,2\n");
  });

  it("HTML não é baixável: /bytes é lista curta de tipos (415), e octet-stream NÃO está nela", async () => {
    const { srv, postBytes } = await proxy();
    const r = await postBytes({ url: "http://a.gov.br/boletim" });
    srv.close();
    expect(r).toEqual({ status: 415, j: { ok: false, erro: "tipo_nao_baixavel" } });
  });

  it("ESTOURAR O TETO É ERRO, não truncagem — meio PDF iria pra base da pessoa", async () => {
    const { srv, postBytes } = await proxy();
    // content-length anunciado acima do teto: nega sem baixar o corpo
    const anunciado = await postBytes({ url: "http://a.gov.br/grande", maxBytes: 50_000 });
    // sem content-length (chunked): o corte acontece no stream, e também vira erro
    const fluxo = await postBytes({ url: "http://a.gov.br/fluxo", maxBytes: 50_000 });
    srv.close();
    expect(anunciado).toEqual({ status: 413, j: { ok: false, erro: "grande_demais" } });
    expect(fluxo).toEqual({ status: 413, j: { ok: false, erro: "grande_demais" } });
  });

  it("o /fetch continua TRUNCANDO o mesmo corpo — a diferença de política é só no /bytes", async () => {
    const { srv, post } = await proxy();
    const { j } = await post({ url: "http://a.gov.br/fluxo", maxBytes: 50_000 });
    srv.close();
    expect(j).toMatchObject({ ok: true, truncado: true });
  });

  it("http é recusado quando o HTTPS é exigido (produção)", async () => {
    const { srv, postBytes } = await proxy({ httpNosBytes: false });
    const r = await postBytes({ url: "http://a.gov.br/doc.pdf" });
    srv.close();
    expect(r).toEqual({ status: 400, j: { ok: false, erro: "https_obrigatorio" } });
  });

  it("redirect pode TROCAR DE HOST se o novo estiver na allowlist — bytes E texto", async () => {
    const { srv, post, postBytes } = await proxy();
    const bytes = await postBytes({ url: "http://a.gov.br/pra-outro" });
    const texto = await post({ url: "http://a.gov.br/fora" });
    srv.close();
    // sem isto, doi.org e repositório institucional (que redirecionam pra outro domínio) nunca funcionariam
    expect(bytes.j).toMatchObject({ ok: true, finalUrl: "http://outro.gov.br/doc.pdf", contentType: "application/pdf" });
    // o texto seguia a regra mais apertada, e era justamente o caminho que o aluno usa
    expect(texto.j).toMatchObject({ ok: true, finalUrl: "http://outro.gov.br/x" });
  });

  it("…e trocar pra host FORA da allowlist continua 403 NO TEXTO também (o salto é re-checado)", async () => {
    // é esta linha que garante que afrouxar o mesmo-host não afrouxou a allowlist
    const { srv, post } = await proxy();
    const r = await post({ url: "http://a.gov.br/pra-fora" });
    srv.close();
    expect(r).toEqual({ status: 403, j: { ok: false, erro: "dominio_fora_da_lista" } });
  });

  it("…mas trocar pra host FORA da allowlist continua 403 (o salto é re-checado)", async () => {
    const { srv, postBytes } = await proxy();
    const r = await postBytes({ url: "http://a.gov.br/pra-fora" });
    srv.close();
    expect(r).toEqual({ status: 403, j: { ok: false, erro: "dominio_fora_da_lista" } });
  });

  it("as barreiras de SSRF valem igual no /bytes (é o furo do advisory do DeepSeek Harness)", async () => {
    const { srv, postBytes } = await proxy();
    const meta = await postBytes({ url: "http://meta.gov.br/latest/meta-data/" });
    const literal = await postBytes({ url: "http://169.254.169.254/x.pdf" });
    const misto = await postBytes({ url: "http://misto.gov.br/doc.pdf" });
    const fora = await postBytes({ url: "https://evil.com/doc.pdf" });
    srv.close();
    expect(meta).toEqual({ status: 403, j: { ok: false, erro: "ip_bloqueado" } });
    expect(literal.j.erro).toBe("ip_literal");
    expect(misto.status).toBe(403);
    expect(fora.j.erro).toBe("dominio_fora_da_lista");
  });

  it("Authorization/Cookie também não passam pelo /bytes", async () => {
    const { srv, postBytes } = await proxy();
    vistos.length = 0;
    await postBytes({ url: "http://a.gov.br/doc.pdf" }, { authorization: "Bearer segredo", cookie: "s=1" });
    srv.close();
    expect(vistos[0].authorization).toBeUndefined();
    expect(vistos[0].cookie).toBeUndefined();
    expect(vistos[0]["user-agent"]).toMatch(/^ZaeonLeitor\/1\.0/);
  });

  it("rota desconhecida continua 404 (não abrimos superfície nova sem querer)", async () => {
    const { srv, porta } = await proxy();
    const r = await fetch(`http://127.0.0.1:${porta}/qualquer`, { method: "POST", body: "{}" });
    srv.close();
    expect(r.status).toBe(404);
  });
});
