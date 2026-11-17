import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, request } from "node:http";
import { connect } from "node:net";
import { ipBloqueado, validarUrlWeb, resolverPublico, abrirProxySaida, argsChromium, argsReaWeb } from "./web-bundle.mjs";

test("IP interno é barrado: privado, loopback, tailnet (CGNAT), link-local/metadata, ULA, mapeado", () => {
  for (const ip of ["10.0.0.1", "127.0.0.1", "172.16.5.4", "192.168.1.1", "100.113.137.74", "100.64.0.1", "169.254.169.254", "0.0.0.0", "224.0.0.1",
    "::1", "::", "fd7a:115c:a1e0::584b:9432", "fe80::1", "::ffff:10.0.0.1", "::ffff:127.0.0.1", "64:ff9b::a00:1", "não-é-ip"]) {
    assert.equal(ipBloqueado(ip), true, ip);
  }
  for (const ip of ["8.8.8.8", "75.119.140.97", "100.128.0.1", "172.32.0.1", "2606:4700::1111", "::ffff:8.8.8.8"]) assert.equal(ipBloqueado(ip), false, ip);
});

test("URL: só http(s), sem credenciais, porta 80/443, host público", () => {
  assert.equal(validarUrlWeb("https://leonaflow.com/pt-BR/").hostname, "leonaflow.com");
  assert.equal(validarUrlWeb("http://exemplo.com.br").protocol, "http:");
  for (const [u, erro] of [["file:///etc/passwd", "url_protocolo"], ["https://user:pw@x.com", "url_credenciais"], ["https://x.com:4000/", "url_porta"],
    ["http://127.0.0.1/", "url_interna"], ["http://[::1]/", "url_interna"], ["http://100.113.137.74/", "url_interna"], ["http://localhost/", "url_interna"],
    ["http://vmi3190478.tail08b6ee.ts.net/", "url_interna"], ["http://intranet/", "url_interna"], ["nada", "url_invalida"]]) {
    assert.throws(() => validarUrlWeb(u), new RegExp(erro), u);
  }
});

test("DNS: resposta com QUALQUER endereço interno é recusada (rebinding/mista)", async () => {
  const fake = (ips) => async () => ips.map((address) => ({ address }));
  assert.equal(await resolverPublico("a.com", fake(["93.184.216.34"])), "93.184.216.34");
  await assert.rejects(resolverPublico("a.com", fake(["93.184.216.34", "10.0.0.5"])), /destino_interno/);
  await assert.rejects(resolverPublico("a.com", fake(["100.113.137.74"])), /destino_interno/);
  await assert.rejects(resolverPublico("a.com", fake([])), /dns_vazio/);
});

/** CONNECT pelo proxy; devolve a linha de status */
const connectVia = (porta, destino) => new Promise((ok, erro) => {
  const s = connect(porta, "127.0.0.1", () => s.write(`CONNECT ${destino} HTTP/1.1\r\nHost: ${destino}\r\n\r\n`));
  s.once("data", (d) => { ok(String(d).split("\r\n")[0]); s.destroy(); });
  s.on("error", erro);
});

test("proxy de saída: barra destino interno e porta fora de 80/443; deixa passar o público", async () => {
  // um "site público" de mentira no loopback: o lookup diz que ele é 93.184.216.34, o conectar leva pro loopback
  const site = createServer((_, res) => res.end("ola")); await new Promise((ok) => site.listen(0, "127.0.0.1", ok));
  const lookup = async (host) => [{ address: host === "interno.test" ? "10.1.2.3" : "93.184.216.34" }];
  const conectar = (_porta, _ip, cb) => connect(site.address().port, "127.0.0.1", cb);
  const p = await abrirProxySaida({ lookup, conectar });
  try {
    assert.match(await connectVia(p.porta, "interno.test:443"), /403/);
    assert.match(await connectVia(p.porta, "publico.test:4000"), /403/);
    assert.match(await connectVia(p.porta, "100.113.137.74:443"), /403/);
    assert.match(await connectVia(p.porta, "publico.test:443"), /200/);
    // http em texto puro também passa pela mesma régua
    const status = await new Promise((ok) => request({ host: "127.0.0.1", port: p.porta, path: "http://interno.test/x", headers: { host: "interno.test" } }, (r) => { r.resume(); ok(r.statusCode); }).end());
    assert.equal(status, 403);
    assert.ok(p.bloqueados.length >= 4);
  } finally { await p.fechar(); site.close(); }
});

test("Chromium: CDP só no loopback, toda saída pelo proxy (inclusive loopback), WebRTC sem UDP fora do proxy", () => {
  const a = argsChromium({ perfil: "/tmp/p", portaProxy: 5555 });
  assert.ok(a.includes("--proxy-server=http://127.0.0.1:5555"));
  assert.ok(a.includes("--proxy-bypass-list=<-loopback>"));
  assert.ok(a.includes("--remote-debugging-address=127.0.0.1"));
  assert.ok(a.includes("--force-webrtc-ip-handling-policy=disable_non_proxied_udp"));
});

test("REA: view obrigatória; a coleção summary vai sem limit", () => {
  const view = (v) => JSON.parse(argsReaWeb({ endpoint: "http://127.0.0.1:1", alvoId: "X", evidencia: "/tmp/e.json", visao: v }).at(-3));
  assert.deepEqual(view("endpoints"), { kind: "web-bundle", collection: "endpoints", limit: 200 });
  assert.deepEqual(view("summary"), { kind: "web-bundle", collection: "summary" });
  assert.deepEqual(view("qualquer"), { kind: "web-bundle", collection: "endpoints", limit: 200 });
  const a = argsReaWeb({ endpoint: "http://127.0.0.1:1", alvoId: "X", evidencia: "/tmp/e.json" });
  assert.deepEqual(a.slice(0, 3), ["analyze-web-bundle", "http://127.0.0.1:1", "X"]);
  assert.ok(a.includes("--fetch-source-maps"));
});
