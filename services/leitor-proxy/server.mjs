/**
 * services/leitor-proxy/server.mjs — o Leitor (Fatia 7, G6). Node 20, ZERO dependência.
 *
 * O ÚNICO processo que sai para a internet a serviço de chore. Não tem credencial nenhuma (o
 * container não tem env_file nem volume do app): se for comprometido, consegue… ler a web.
 *
 *   POST /fetch {url, maxBytes?, timeoutMs?} → 200 {ok, status, finalUrl, contentType, texto, truncado, bytes, lidoEm}
 *        (ok = a página respondeu 2xx; recusa do PROXY = 4xx/5xx dele com {ok:false, erro})
 *   GET  /health → {ok, allow}
 *
 * Fluxo: allowlist (LEITOR_ALLOW; vazia = nega tudo) → DNS resolvido AQUI → TODOS os IPs passam
 * no ipBloqueado (senão 403 ip_bloqueado) → conecta PELO IP com SNI/Host do nome (fecha DNS-rebinding)
 * → ≤3 redirects no MESMO host (re-resolve a cada salto) → corpo em stream cortado em maxBytes →
 * timeout duro → só texto/HTML/JSON/XML/RSS (senão 415). Sem JS, sem cookie, sem Authorization.
 */
import http from "node:http";
import https from "node:https";
import dns from "node:dns";
import { fileURLToPath } from "node:url";
import { urlPermitida, ipBloqueado, extrairTexto, tipoAceito, parseAllow, TIPOS_ACEITOS } from "./guarda.mjs";

const UA = "ZaeonLeitor/1.0 (+https://zaeon.com.br/leitor)";
const TETO_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 3;

class Recusa extends Error {
  constructor(status, erro) { super(erro); this.status = status; this.erro = erro; }
}

/**
 * opts: { allow: string[], maxBytes, maxInflight, lookup?, bloqueado?, portaUpstream? }
 * `lookup`/`bloqueado`/`portaUpstream` são injetáveis SÓ para teste (servidor local em porta efêmera).
 */
export function criarServidor(opts = {}) {
  const allow = opts.allow ?? parseAllow(process.env.LEITOR_ALLOW);
  const tetoBytes = Math.max(1, Number(opts.maxBytes ?? process.env.LEITOR_MAX_BYTES ?? 1_048_576) || 1_048_576);
  const maxInflight = Math.max(1, Number(opts.maxInflight ?? process.env.LEITOR_MAX_INFLIGHT ?? 8) || 8);
  const lookup = opts.lookup ?? ((host) => dns.promises.lookup(host, { all: true, verbatim: true }));
  const bloqueado = opts.bloqueado ?? ipBloqueado;
  let emVoo = 0;

  async function resolver(host) {
    let ips;
    try { ips = await lookup(host); } catch { throw new Recusa(502, "dns_falhou"); }
    const lista = (Array.isArray(ips) ? ips : [ips]).map((x) => (typeof x === "string" ? x : x?.address)).filter(Boolean);
    if (!lista.length) throw new Recusa(502, "dns_vazio");
    if (lista.some((ip) => bloqueado(ip))) throw new Recusa(403, "ip_bloqueado");   // TODOS precisam passar
    return lista[0];
  }

  function pedir(url, ip, maxBytes, signal) {
    return new Promise((resolve, reject) => {
      const tls = url.protocol === "https:";
      const lib = tls ? https : http;
      const req = lib.request({
        host: ip, port: opts.portaUpstream ?? (url.port || (tls ? 443 : 80)), method: "GET",
        path: url.pathname + url.search, servername: tls ? url.hostname : undefined,
        headers: { Host: url.host, "User-Agent": UA, Accept: TIPOS_ACEITOS.join(", "), "Accept-Encoding": "identity", Connection: "close" },
        signal,
      }, (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) { res.resume(); resolve({ redirect: res.headers.location, status }); return; }
        const tipo = tipoAceito(res.headers["content-type"]);
        if (status >= 200 && status < 300 && !tipo) { res.destroy(); reject(new Recusa(415, "tipo_nao_suportado")); return; }
        const pedacos = []; let bytes = 0, truncado = false;
        res.on("data", (c) => {
          if (truncado) return;
          const resta = maxBytes - bytes;
          if (c.length > resta) { pedacos.push(c.subarray(0, resta)); bytes += resta; truncado = true; res.destroy(); finalizar(); return; }
          pedacos.push(c); bytes += c.length;
        });
        let feito = false;
        const finalizar = () => {
          if (feito) return; feito = true;
          const ct = String(res.headers["content-type"] ?? "");
          const charset = /charset=([\w-]+)/i.exec(ct)?.[1]?.toLowerCase();
          let bruto;
          try { bruto = new TextDecoder(charset && charset !== "utf8" ? charset : "utf-8").decode(Buffer.concat(pedacos)); } catch { bruto = Buffer.concat(pedacos).toString("utf8"); }
          const texto = tipo === "application/json" || tipo === "text/plain" ? bruto.replace(/[ \t]+/g, " ").trim() : extrairTexto(bruto);
          resolve({ status, contentType: tipo ?? ct.split(";")[0], texto, truncado, bytes });
        };
        res.on("end", finalizar);
        res.on("close", finalizar);
        res.on("error", (e) => (truncado ? finalizar() : reject(e)));
      });
      req.on("error", reject);
      req.end();
    });
  }

  async function ler(entrada, maxBytes, timeoutMs) {
    const signal = AbortSignal.timeout(timeoutMs);
    const p = urlPermitida(entrada, allow);
    if (!p.ok) throw new Recusa(p.status, p.erro);
    let url = p.url;
    const host0 = url.hostname.toLowerCase();
    for (let salto = 0; salto <= MAX_REDIRECTS; salto++) {
      const ip = await resolver(url.hostname);
      let r;
      try { r = await pedir(url, ip, maxBytes, signal); }
      catch (e) {
        if (e instanceof Recusa) throw e;
        if (signal.aborted || e?.name === "AbortError") throw new Recusa(504, "timeout");
        throw new Recusa(502, "falha_upstream");
      }
      if (!r.redirect) return { ok: r.status >= 200 && r.status < 300, status: r.status, finalUrl: url.toString(), contentType: r.contentType, texto: r.texto, truncado: r.truncado, bytes: r.bytes, lidoEm: new Date().toISOString() };
      let prox;
      try { prox = new URL(r.redirect, url); } catch { throw new Recusa(502, "redirect_invalido"); }
      if (prox.hostname.toLowerCase() !== host0) throw new Recusa(400, "redirect_cross_host");
      const q = urlPermitida(prox.toString(), allow);
      if (!q.ok) throw new Recusa(q.status, q.erro);
      url = q.url;
    }
    throw new Recusa(400, "redirects_demais");
  }

  const responder = (res, status, corpo) => { res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(JSON.stringify(corpo)); };

  return http.createServer((req, res) => {
    if (req.method === "GET" && req.url === "/health") return responder(res, 200, { ok: true, allow: allow.length });
    if (req.method !== "POST" || req.url !== "/fetch") return responder(res, 404, { ok: false, erro: "rota" });
    if (emVoo >= maxInflight) return responder(res, 429, { ok: false, erro: "ocupado" });
    // Nada do pedido de entrada é repassado (nem Authorization, nem Cookie): os headers de saída são fixos.
    let corpo = ""; let grande = false;
    req.on("data", (c) => { corpo += c; if (corpo.length > 8_192) { grande = true; req.destroy(); } });
    req.on("end", async () => {
      if (grande) return;
      let j;
      try { j = JSON.parse(corpo || "{}"); } catch { return responder(res, 400, { ok: false, erro: "json_invalido" }); }
      const maxBytes = Math.min(Math.max(1, Number(j.maxBytes) || tetoBytes), tetoBytes);
      const timeoutMs = Math.min(Math.max(1_000, Number(j.timeoutMs) || TETO_TIMEOUT_MS), TETO_TIMEOUT_MS);
      emVoo++;
      try { responder(res, 200, await ler(j.url, maxBytes, timeoutMs)); }
      catch (e) { responder(res, e instanceof Recusa ? e.status : 500, { ok: false, erro: e instanceof Recusa ? e.erro : "erro_interno" }); }
      finally { emVoo--; }
    });
  });
}

// Executado direto (container): sobe na 8787.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const porta = Number(process.env.PORT || 8787);
  const allow = parseAllow(process.env.LEITOR_ALLOW);
  criarServidor({ allow }).listen(porta, "0.0.0.0", () => console.log(`[leitor-proxy] :${porta} · allowlist com ${allow.length} padrão(ões)${allow.length ? "" : " — VAZIA: nega tudo"}`));
}
