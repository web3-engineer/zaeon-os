/**
 * services/leitor-proxy/server.mjs — o Leitor (Fatia 7, G6). Node 20, ZERO dependência.
 *
 * O ÚNICO processo que sai para a internet a serviço de chore. Não tem credencial nenhuma (o
 * container não tem env_file nem volume do app): se for comprometido, consegue… ler a web.
 *
 *   POST /fetch {url, maxBytes?, timeoutMs?} → 200 {ok, status, finalUrl, contentType, texto, truncado, bytes, ocultosRemovidos, untrusted, lidoEm}
 *        (ok = a página respondeu 2xx; recusa do PROXY = 4xx/5xx dele com {ok:false, erro})
 *   POST /bytes {url, maxBytes?, timeoutMs?} → 200 {ok, status, finalUrl, contentType, bytesB64, bytes, untrusted, lidoEm}
 *   GET  /health → {ok, allow}
 *
 * Fluxo: allowlist (LEITOR_ALLOW; vazia = nega tudo) → DNS resolvido AQUI → TODOS os IPs passam
 * no ipBloqueado (senão 403 ip_bloqueado) → conecta PELO IP com SNI/Host do nome (fecha DNS-rebinding)
 * → ≤3 redirects (re-resolve a cada salto) → corpo em stream cortado em maxBytes → timeout duro →
 * tipo na lista (senão 415). Sem JS, sem cookie, sem Authorization.
 *
 * ────────── /bytes (F1b) e as TRÊS políticas em que ele é MAIS DURO que /fetch ──────────
 * Os bytes vão parar na base de conhecimento da pessoa, onde ficam e são citados depois; uma página
 * é lida uma vez. Isso justifica apertar, não afrouxar:
 *   1. HTTPS OBRIGATÓRIO (o /fetch aceita http). Arquivo adulterado em trânsito fica guardado;
 *      página adulterada é um turno ruim. É também a regra do harness da Rovinos (issue #98).
 *   2. ESTOURAR O TETO É ERRO (413 grande_demais), não truncar. Meio PDF não é um PDF menor: é um
 *      arquivo corrompido, e ingerir isso cria documento lixo que a pessoa só descobre citando.
 *   3. TIPO por `tipoBaixavel` (lista curta, sem octet-stream) — ver guarda.mjs.
 * E UMA em que é mais frouxo, de propósito: redirect pode trocar de host se o host novo estiver NA
 * ALLOWLIST (o /fetch exige mesmo host). É o modelo da Rovinos — cada salto re-checado na allowlist,
 * com DNS e IP conferidos de novo — e sem ele quase nenhum link real de PDF funciona (doi.org e
 * repositórios institucionais redirecionam pra outro domínio).
 */
import http from "node:http";
import https from "node:https";
import dns from "node:dns";
import { fileURLToPath } from "node:url";
import { urlPermitida, ipBloqueado, extrairTexto, semTextoOculto, tipoAceito, tipoBaixavel, parseAllow, TIPOS_ACEITOS, TIPOS_BAIXAVEIS } from "./guarda.mjs";

const UA = "ZaeonLeitor/1.0 (+https://zaeon.com.br/leitor)";
const TETO_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 3;

/**
 * OS TETOS, e de onde vem cada número (o dono pediu pra fundamentar, não chutar):
 *
 *  - TEXTO = 2 MiB. Era 1 MiB. O harness da Rovinos (issue #98, `web.fetch` pelo proxy de egresso)
 *    usa "a response cap of 2 MiB" — é a referência mais próxima do nosso desenho que achamos em
 *    produção, então adotamos o mesmo número em vez de inventar um.
 *  - BYTES = 25 MB, que é EXATAMENTE `lib/rag/ingerir.MAX_BYTES` (e `MAX_BYTES_PDF` de
 *    lib/rag/minhaBase). Esse é o teto do único lugar onde os bytes podem acabar: a ingestão. Baixar
 *    mais do que ela aceita é gastar banda do VPS pra falhar depois — o teto não é uma política
 *    nova, é o que já existe, deixado de ser contradito.
 *
 * Ambos ajustáveis por env, e o pedido pode pedir MENOS (nunca mais).
 */
const TETO_TEXTO_PADRAO = 2 * 1024 * 1024;
const TETO_BYTES_PADRAO = 25 * 1024 * 1024;

class Recusa extends Error {
  constructor(status, erro) { super(erro); this.status = status; this.erro = erro; }
}

/**
 * opts: { allow: string[], maxBytes, maxInflight, lookup?, bloqueado?, portaUpstream? }
 * `lookup`/`bloqueado`/`portaUpstream` são injetáveis SÓ para teste (servidor local em porta efêmera).
 */
export function criarServidor(opts = {}) {
  const allow = opts.allow ?? parseAllow(process.env.LEITOR_ALLOW);
  const tetoBytes = Math.max(1, Number(opts.maxBytes ?? process.env.LEITOR_MAX_BYTES ?? TETO_TEXTO_PADRAO) || TETO_TEXTO_PADRAO);
  const tetoBin = Math.max(1, Number(opts.maxBytesBin ?? process.env.LEITOR_MAX_BYTES_BIN ?? TETO_BYTES_PADRAO) || TETO_BYTES_PADRAO);
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

  function pedir(url, ip, maxBytes, signal, modo = "texto") {
    const bin = modo === "bytes";
    return new Promise((resolve, reject) => {
      const tls = url.protocol === "https:";
      const lib = tls ? https : http;
      const req = lib.request({
        host: ip, port: opts.portaUpstream ?? (url.port || (tls ? 443 : 80)), method: "GET",
        path: url.pathname + url.search, servername: tls ? url.hostname : undefined,
        headers: { Host: url.host, "User-Agent": UA, Accept: (bin ? TIPOS_BAIXAVEIS : TIPOS_ACEITOS).join(", "), "Accept-Encoding": "identity", Connection: "close" },
        signal,
      }, (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) { res.resume(); resolve({ redirect: res.headers.location, status }); return; }
        const tipo = bin ? tipoBaixavel(res.headers["content-type"]) : tipoAceito(res.headers["content-type"]);
        if (status >= 200 && status < 300 && !tipo) { res.destroy(); reject(new Recusa(415, bin ? "tipo_nao_baixavel" : "tipo_nao_suportado")); return; }
        // Content-Length já conhecido e acima do teto: nega ANTES de baixar o corpo (não gasta banda).
        const anunciado = Number(res.headers["content-length"]);
        if (bin && Number.isFinite(anunciado) && anunciado > maxBytes) { res.destroy(); reject(new Recusa(413, "grande_demais")); return; }
        const pedacos = []; let bytes = 0, truncado = false;
        res.on("data", (c) => {
          if (truncado || feito) return;
          const resta = maxBytes - bytes;
          if (c.length > resta) {
            // BYTES: estourar é ERRO. Meio PDF não é um PDF menor, é um arquivo corrompido — e ele
            // iria pra base da pessoa. TEXTO: corta e avisa `truncado` (ler meia página serve).
            if (bin) { feito = true; res.destroy(); reject(new Recusa(413, "grande_demais")); return; }
            pedacos.push(c.subarray(0, resta)); bytes += resta; truncado = true; res.destroy(); finalizar(); return;
          }
          pedacos.push(c); bytes += c.length;
        });
        let feito = false;
        const finalizar = () => {
          if (feito) return; feito = true;
          const ct = String(res.headers["content-type"] ?? "");
          const buf = Buffer.concat(pedacos);
          if (bin) { resolve({ status, contentType: tipo ?? ct.split(";")[0], buf, bytes }); return; }
          const charset = /charset=([\w-]+)/i.exec(ct)?.[1]?.toLowerCase();
          let bruto;
          try { bruto = new TextDecoder(charset && charset !== "utf8" ? charset : "utf-8").decode(buf); } catch { bruto = buf.toString("utf8"); }
          // o oculto sai aqui pra podermos CONTAR (o extrairTexto remove de novo; passada idempotente)
          const { html: limpo, removidos } = semTextoOculto(bruto);
          const texto = tipo === "application/json" || tipo === "text/plain" ? limpo.replace(/[ \t]+/g, " ").trim() : extrairTexto(limpo);
          resolve({ status, contentType: tipo ?? ct.split(";")[0], texto, truncado, bytes, ocultosRemovidos: removidos });
        };
        res.on("end", finalizar);
        res.on("close", finalizar);
        res.on("error", (e) => (truncado ? finalizar() : reject(e)));
      });
      req.on("error", reject);
      req.end();
    });
  }

  async function ler(entrada, maxBytes, timeoutMs, modo = "texto") {
    const bin = modo === "bytes";
    const signal = AbortSignal.timeout(timeoutMs);
    const p = urlPermitida(entrada, allow);
    if (!p.ok) throw new Recusa(p.status, p.erro);
    // /bytes é HTTPS-only: o arquivo adulterado em trânsito FICA guardado na base da pessoa.
    // `httpNosBytes` é injeção SÓ DE TESTE (o container chama criarServidor({allow}) e nunca passa
    // isto; nem o pedido nem o env conseguem ligar). O harness da Rovinos tem a mesma saída —
    // "HTTPS only, except allowlisted local test hosts" — porque um site de teste local não tem TLS.
    const exigeHttps = bin && !opts.httpNosBytes;
    if (exigeHttps && p.url.protocol !== "https:") throw new Recusa(400, "https_obrigatorio");
    let url = p.url;
    for (let salto = 0; salto <= MAX_REDIRECTS; salto++) {
      const ip = await resolver(url.hostname);
      let r;
      try { r = await pedir(url, ip, maxBytes, signal, modo); }
      catch (e) {
        if (e instanceof Recusa) throw e;
        if (signal.aborted || e?.name === "AbortError") throw new Recusa(504, "timeout");
        throw new Recusa(502, "falha_upstream");
      }
      if (!r.redirect) {
        const comum = { ok: r.status >= 200 && r.status < 300, status: r.status, finalUrl: url.toString(), contentType: r.contentType, bytes: r.bytes, untrusted: true, lidoEm: new Date().toISOString() };
        return bin
          ? { ...comum, bytesB64: r.buf.toString("base64") }
          : { ...comum, texto: r.texto, truncado: r.truncado, ocultosRemovidos: r.ocultosRemovidos ?? 0 };
      }
      let prox;
      try { prox = new URL(r.redirect, url); } catch { throw new Recusa(502, "redirect_invalido"); }
      // REDIRECT ENTRE HOSTS vale pros DOIS, texto e bytes. Antes o texto exigia o mesmo host — e
      // isso quebrava a leitura comum, não o caso raro: a comparação é de hostname EXATO, então
      // apex→www (`who.int` → `www.who.int`, `nih.gov` → `www.nih.gov`) já caía, e `doi.org`, que
      // SÓ existe pra redirecionar, nunca funcionou. Chegava ao aluno como "o site recusou a
      // leitura", que não diz nada e não é nem verdade: quem recusou fomos nós.
      //
      // Tirar a trava não afrouxa nada, e a justificativa é a que este mesmo comentário já dava
      // pros bytes: o salto novo passa pela allowlist logo abaixo (`urlPermitida`), e volta pro
      // laço, onde o host é resolvido por DNS de novo e cada IP passa por `ipBloqueado`. Host fora
      // da lista continua recusado; IP privado continua recusado. O que muda é só deixar de exigir
      // que o destino tenha o MESMO NOME do ponto de partida — exigência que protegia zero, porque
      // o mesmo host pode servir qualquer conteúdo. É o modelo da Rovinos.
      if (exigeHttps && prox.protocol !== "https:") throw new Recusa(400, "https_obrigatorio");
      const q = urlPermitida(prox.toString(), allow);
      if (!q.ok) throw new Recusa(q.status, q.erro);
      url = q.url;
    }
    throw new Recusa(400, "redirects_demais");
  }

  const responder = (res, status, corpo) => { res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(JSON.stringify(corpo)); };

  return http.createServer((req, res) => {
    if (req.method === "GET" && req.url === "/health") return responder(res, 200, { ok: true, allow: allow.length });
    const modo = req.url === "/bytes" ? "bytes" : "texto";
    if (req.method !== "POST" || (req.url !== "/fetch" && req.url !== "/bytes")) return responder(res, 404, { ok: false, erro: "rota" });
    if (emVoo >= maxInflight) return responder(res, 429, { ok: false, erro: "ocupado" });
    // Nada do pedido de entrada é repassado (nem Authorization, nem Cookie): os headers de saída são fixos.
    let corpo = ""; let grande = false;
    req.on("data", (c) => { corpo += c; if (corpo.length > 8_192) { grande = true; req.destroy(); } });
    req.on("end", async () => {
      if (grande) return;
      let j;
      try { j = JSON.parse(corpo || "{}"); } catch { return responder(res, 400, { ok: false, erro: "json_invalido" }); }
      const teto = modo === "bytes" ? tetoBin : tetoBytes;
      const maxBytes = Math.min(Math.max(1, Number(j.maxBytes) || teto), teto);
      const timeoutMs = Math.min(Math.max(1_000, Number(j.timeoutMs) || TETO_TIMEOUT_MS), TETO_TIMEOUT_MS);
      emVoo++;
      try { responder(res, 200, await ler(j.url, maxBytes, timeoutMs, modo)); }
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
