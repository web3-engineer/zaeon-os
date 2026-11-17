/**
 * infra/rea-engine/web-bundle.mjs — o caminho WEB do REA no motor: `analyze-web-bundle <url>`.
 *
 * O comando do REA não recebe uma URL: ele exige um navegador com CDP no loopback (`<endpoint> <targetId>`). O app
 * (lib/rea-blueprint/alvoReal.ts) manda só a URL — então é aqui que o navegador nasce, carrega a página, o REA analisa
 * e o navegador morre. Um Chromium por pedido, num diretório temporário, um pedido por vez (o motor divide os
 * núcleos 0–3 com a ChipFlow).
 *
 * SSRF — o motor mora na tailnet (LiteLLM :4000, pgvector :5432, a própria ponte). Dar um navegador a ele = ele abre
 * o que a página mandar. Por isso TODA saída (Chromium e o fetch de source maps do próprio REA) passa por um PROXY
 * DE SAÍDA aqui dentro, que resolve o DNS ele mesmo e só conecta em IP PÚBLICO nas portas 80/443 — rebinding de DNS
 * não passa (quem conecta é o proxy, no IP que ele conferiu). WebRTC fora do proxy fica desligado no Chromium.
 */
import { createServer, request as httpRequest } from "node:http";
import { connect as netConnect, isIP } from "node:net";
import { lookup as dnsLookup } from "node:dns/promises";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const PORTAS_SAIDA = new Set([80, 443]);

// ─── IP público? ──────────────────────────────────────────────────────────────────────────────────────────────────
const v4 = (ip) => ip.split(".").map(Number);
function v4Bloqueado(ip) {
  const [a, b] = v4(ip);
  return a === 0 || a === 10 || a === 127 || a >= 224                     // "esta rede", privada, loopback, multicast/reservado
    || (a === 100 && b >= 64 && b <= 127)                                 // CGNAT — a TAILNET mora aqui (100.64/10)
    || (a === 169 && b === 254)                                           // link-local / metadata de nuvem
    || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)      // privadas
    || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19))    // IETF / benchmark
    || (a === 192 && b === 88) || (a === 198 && b === 51) || (a === 203 && b === 0); // relay / documentação
}
/** o IP é alcançável só por dentro (privado, loopback, tailnet, link-local…)? IPv6 mapeado em v4 conta como v4. */
export function ipBloqueado(ip) {
  const t = isIP(ip);
  if (t === 4) return v4Bloqueado(ip);
  if (t !== 6) return true;
  const s = ip.toLowerCase();
  const mapeado = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapeado) return v4Bloqueado(mapeado[1]);
  if (s === "::" || s === "::1") return true;
  return /^(fc|fd)/.test(s)          // ULA (a tailnet também tem fd7a:115c:a1e0::/48)
    || /^fe[89ab]/.test(s)           // link-local
    || /^ff/.test(s)                 // multicast
    || /^64:ff9b:/.test(s)           // NAT64 (pode apontar pra v4 privado)
    || /^2001:db8:/.test(s)          // documentação
    || /^::ffff:/.test(s);           // mapeado em formato que não casou acima: na dúvida, fora
}

/** a URL que o pedido pode abrir: http(s), sem usuário/senha, porta 80/443, host que não é IP interno. */
export function validarUrlWeb(bruta) {
  let u;
  try { u = new URL(String(bruta || "")); } catch { throw new Error("url_invalida"); }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("url_protocolo");
  if (u.username || u.password) throw new Error("url_credenciais");
  const porta = Number(u.port || (u.protocol === "https:" ? 443 : 80));
  if (!PORTAS_SAIDA.has(porta)) throw new Error("url_porta");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) && ipBloqueado(host)) throw new Error("url_interna");
  if (!host.includes(".") || /\.(local|internal|localhost|ts\.net)$/i.test(host) || host === "localhost") throw new Error("url_interna");
  return u;
}

/** resolve e devolve UM endereço público (todos os resolvidos precisam ser públicos — resposta mista é suspeita). */
export async function resolverPublico(host, lookup = dnsLookup) {
  const limpo = host.replace(/^\[|\]$/g, "");
  if (isIP(limpo)) { if (ipBloqueado(limpo)) throw new Error("destino_interno"); return limpo; }
  const r = await lookup(limpo, { all: true, verbatim: true });
  const ips = r.map((x) => x.address);
  if (!ips.length) throw new Error("dns_vazio");
  if (ips.some(ipBloqueado)) throw new Error("destino_interno");
  return ips[0];
}

// ─── o proxy de saída ─────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Proxy HTTP no loopback: CONNECT (https/wss) e requisição absoluta (http). Só sai pra IP público nas portas 80/443.
 * `bloqueados` conta o que foi barrado (vai pro relatório). Fecha tudo no `fechar()`.
 */
export async function abrirProxySaida({ lookup = dnsLookup, conectar = netConnect } = {}) {
  const bloqueados = [];
  const sockets = new Set();
  const barrar = (destino, motivo) => { if (bloqueados.length < 50) bloqueados.push({ destino, motivo }); };
  const server = createServer(async (req, res) => {
    // http:// em texto puro: o Chromium manda a URL absoluta
    let u;
    try { u = new URL(req.url); } catch { res.writeHead(400).end(); return; }
    const porta = Number(u.port || 80);
    if (u.protocol !== "http:" || !PORTAS_SAIDA.has(porta)) { barrar(u.host, "porta/protocolo"); res.writeHead(403).end(); return; }
    let ip;
    try { ip = await resolverPublico(u.hostname, lookup); } catch (e) { barrar(u.host, e.message); res.writeHead(403).end(); return; }
    const headers = { ...req.headers, host: u.host };
    delete headers["proxy-connection"]; delete headers["proxy-authorization"];
    const sai = httpRequest({ host: ip, port: porta, method: req.method, path: u.pathname + u.search, headers, servername: u.hostname }, (r) => {
      res.writeHead(r.statusCode || 502, r.headers); r.pipe(res);
    });
    sai.on("error", () => { if (!res.headersSent) res.writeHead(502); res.end(); });
    req.pipe(sai);
  });
  server.on("connection", (s) => { sockets.add(s); s.on("close", () => sockets.delete(s)); });
  server.on("connect", async (req, cliente, cabeca) => {
    const [host, portaTxt] = String(req.url || "").split(/:(?=\d+$)/);
    const porta = Number(portaTxt);
    if (!PORTAS_SAIDA.has(porta)) { barrar(req.url, "porta"); cliente.end("HTTP/1.1 403 Forbidden\r\n\r\n"); return; }
    let ip;
    try { ip = await resolverPublico(host, lookup); } catch (e) { barrar(req.url, e.message); cliente.end("HTTP/1.1 403 Forbidden\r\n\r\n"); return; }
    const alvo = conectar(porta, ip, () => {
      cliente.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      if (cabeca?.length) alvo.write(cabeca);
      alvo.pipe(cliente); cliente.pipe(alvo);
    });
    sockets.add(alvo); alvo.on("close", () => sockets.delete(alvo));
    alvo.on("error", () => cliente.destroy());
    cliente.on("error", () => alvo.destroy());
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  return {
    porta: server.address().port,
    bloqueados,
    fechar: () => new Promise((ok) => { for (const s of sockets) s.destroy(); server.close(() => ok()); }),
  };
}

// ─── o navegador ──────────────────────────────────────────────────────────────────────────────────────────────────
const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
export const CHROMIUM = process.env.REA_CHROMIUM || "chromium";

/** os argumentos do Chromium: headless, CDP só no loopback, TODA saída pelo proxy, WebRTC sem UDP fora do proxy. */
export function argsChromium({ perfil, portaProxy }) {
  return [
    "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
    "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--disable-sync",
    "--disable-background-networking", "--disable-component-update", "--disable-domain-reliability",
    "--metrics-recording-only", "--mute-audio", "--disable-features=DnsOverHttps,MediaRouter,OptimizationHints",
    "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
    "--webrtc-ip-handling-policy=disable_non_proxied_udp",
    `--proxy-server=http://127.0.0.1:${portaProxy}`,
    "--proxy-bypass-list=<-loopback>",          // sem isto o Chromium fala DIRETO com localhost/127.x
    "--remote-debugging-address=127.0.0.1", "--remote-debugging-port=0",
    `--user-data-dir=${perfil}`, "--window-size=1366,900", "about:blank",
  ];
}

async function portaCdp(perfil, prazoMs) {
  const fim = Date.now() + prazoMs;
  while (Date.now() < fim) {
    const txt = await readFile(join(perfil, "DevToolsActivePort"), "utf8").catch(() => "");
    const porta = Number(txt.split("\n")[0]);
    if (porta > 0) return porta;
    await esperar(200);
  }
  throw new Error("chromium_nao_subiu");
}

/** espera a aba sair do about:blank e a página ficar quieta (sem trocar de URL) por um tempo. */
async function esperarPagina(endpoint, id, { prazoMs = 30_000, quietoMs = 6_000 } = {}) {
  const fim = Date.now() + prazoMs;
  let ultima = "", desde = Date.now();
  while (Date.now() < fim) {
    const lista = await fetch(`${endpoint}/json/list`).then((r) => r.json()).catch(() => []);
    const aba = lista.find((t) => t.id === id);
    const url = aba?.url || "";
    if (url !== ultima) { ultima = url; desde = Date.now(); }
    if (url && url !== "about:blank" && Date.now() - desde >= quietoMs) return url;
    await esperar(500);
  }
  return ultima;
}

/** os argumentos do REA pra uma análise web completa (endpoints do bundle, source maps, prazos que cabem no Next). */
const num = (v, padrao) => (Number(v) > 0 ? Number(v) : padrao);
export const ORCAMENTO = {
  scriptMs: num(process.env.REA_WEB_SCRIPT_MS, 420_000),
  totalMs: num(process.env.REA_WEB_TOTAL_MS, 840_000),
  heapMb: num(process.env.REA_WEB_HEAP_MB, 3072),
};
/** o prazo da análise web inteira na ponte: navegador + análise + folga */
export const PRAZO_WEB_MS = ORCAMENTO.totalMs + 3 * 60_000;
export const VISOES_WEB = new Set(["endpoints", "inferences", "summary"]);
export function argsReaWeb({ endpoint, alvoId, evidencia, visao = "endpoints" }) {
  const colecao = VISOES_WEB.has(visao) ? visao : "endpoints";
  // `view` é obrigatório com --detail summary; a coleção "summary" não aceita `limit` (provado no 6.9.0)
  const view = { kind: "web-bundle", collection: colecao, ...(colecao === "summary" ? {} : { limit: 200 }) };
  return [
    "analyze-web-bundle", endpoint, alvoId,
    "--observation-ms", "4000", "--fetch-source-maps",
    // um SPA Vite costuma ser UM bundle de vários MB (o app.leonasolutions.io tem 6 MB): 120 s por script não bastam
    // nos 4 núcleos do motor. Prazos e heap por ambiente; o total cabe no prazo da ponte (PRAZO_WEB_MS).
    "--analysis-timeout-ms", String(ORCAMENTO.scriptMs), "--total-analysis-timeout-ms", String(ORCAMENTO.totalMs),
    "--max-heap-mb", String(ORCAMENTO.heapMb),
    "--detail", "summary", "--evidence_output", evidencia, "--view", JSON.stringify(view),
    "--format", "json",
  ];
}

/**
 * Abre o navegador, carrega `url`, roda o REA e limpa tudo. `rodarRea(args, cwd, signal, envExtra)` é o da ponte.
 * Devolve { ok, code, evidence, stderr, pagina, bloqueados }.
 */
export async function analisarSite(url, { rodarRea, signal, visao } = {}) {
  const u = validarUrlWeb(url);
  const dir = await mkdtemp(join(tmpdir(), "rea-web-"));
  const perfil = join(dir, "perfil");
  const proxy = await abrirProxySaida();
  let navegador;
  try {
    navegador = spawn(CHROMIUM, argsChromium({ perfil, portaProxy: proxy.porta }), { stdio: "ignore", detached: true });
    const morto = new Promise((ok) => navegador.once("exit", ok));
    const cdp = await Promise.race([portaCdp(perfil, 20_000), morto.then(() => { throw new Error("chromium_saiu"); })]);
    const endpoint = `http://127.0.0.1:${cdp}`;
    const aba = await fetch(`${endpoint}/json/new?${encodeURIComponent(u.href)}`, { method: "PUT" }).then((r) => r.json());
    const pagina = await esperarPagina(endpoint, aba.id);
    if (signal?.aborted) throw new Error("cancelado");
    // o fetch de source maps do próprio REA também sai pelo proxy (só o CDP, no loopback, fica de fora)
    const envProxy = { NODE_USE_ENV_PROXY: "1", HTTP_PROXY: `http://127.0.0.1:${proxy.porta}`, HTTPS_PROXY: `http://127.0.0.1:${proxy.porta}`, NO_PROXY: `127.0.0.1:${cdp}` };
    const r = await rodarRea(argsReaWeb({ endpoint, alvoId: aba.id, evidencia: join(dir, "evidencia.json"), visao }), dir, signal, envProxy);
    let evidence; try { evidence = JSON.parse(r.stdout); } catch { /* não-JSON */ }
    return { ok: r.code === 0, code: r.code, evidence, stdout: evidence ? undefined : r.stdout.slice(0, 200_000), stderr: r.stderr, pagina, bloqueados: proxy.bloqueados };
  } finally {
    if (navegador?.pid) { try { process.kill(-navegador.pid, "SIGKILL"); } catch { /* já saiu */ } }
    await proxy.fechar();
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
