/**
 * services/agente-navegador/server.mjs — O CONTAINER DO AGENTE DE NAVEGADOR (F9).
 *
 * POR QUE ELE EXISTE. Na F8 o Chromium do agente subia DENTRO do `zaeon_web`, e isso custava duas
 * coisas: (1) a memória era disputada com o processo que serve o site — por isso os tetos apertados
 * de 12 passos / 3 min / um run por vez; (2) o navegador que abre páginas de terceiro vivia no
 * container que tem as credenciais (mitigado por `envChromium`, mas mitigado, não eliminado). Aqui
 * as duas somem: o container tem memória própria e NÃO TEM CREDENCIAL NENHUMA — sem `env_file`,
 * sem segredo, sem volume do app. É o mesmo argumento que criou o `leitor-proxy`, agora estendido
 * pra quem precisa EXECUTAR JAVASCRIPT (que o Leitor, de propósito, não faz).
 *
 * A POLÍTICA DE REDE NÃO É NOVA. `urlPermitida`/`ipBloqueado` vêm de `../leitor-proxy/guarda.mjs` —
 * as MESMAS funções que o Leitor roda em produção e que o web usa na F8. Três consumidores, uma
 * definição. Reescrevê-la aqui seria criar a terceira versão de "que domínio pode", e a que ficasse
 * velha seria a que concede.
 *
 * SEM AUTENTICAÇÃO, e isto é escolha consciente, igual à do `leitor-proxy`: o serviço é `expose`
 * (rede interna do compose, sem porta publicada), não guarda credencial e não alcança nada além da
 * allowlist — não há o que roubar aqui. Se um dia essa rede passar a ser compartilhada com algo
 * que não seja da casa, o caminho é um token no cabeçalho, e a nota fica registrada no doc.
 *
 * AS TRAVAS SÃO AS DA F8, e continuam sendo código: não existe rota de clicar, digitar ou esperar
 * humano. Não é "o cliente não pede" — é que o verbo não está implementado do lado do servidor.
 */
import http from "node:http";
import dns from "node:dns";
import { timingSafeEqual } from "node:crypto";
import { urlPermitida, ipBloqueado, parseAllow, extrairTexto } from "../leitor-proxy/guarda.mjs";
import { criarRegistro, MAX_SESSOES, TTL_MS, VIDA_MAX_MS } from "./sessoes.mjs";

const PORT = Number(process.env.PORT || 8788);
// A QUEDA PRO LEITOR É PELA LISTA VAZIA, não pela env ausente (achado do Sourcery na #716).
// Com `??` só `null`/`undefined` caíam pro LEITOR_ALLOW — então um `AGENTE_ALLOW` com só espaços
// (que o compose NÃO substitui, porque `:-` só troca vazio/ausente) deixava este servidor com lista
// VAZIA negando tudo, enquanto o recibo do web, que usa `allowDoAgente`, listava os domínios do
// Leitor. Recibo e realidade discordando em silêncio. Agora os dois lados caem pelo mesmo critério.
const ALLOW_PROPRIA = parseAllow(process.env.AGENTE_ALLOW);
const ALLOW = ALLOW_PROPRIA.length ? ALLOW_PROPRIA : parseAllow(process.env.LEITOR_ALLOW);
const MAX_TEXTO = Number(process.env.AGENTE_MAX_TEXTO || 20_000);
const TIMEOUT_MS = Number(process.env.AGENTE_TIMEOUT_MS || 20_000);
const CAMINHO = process.env.AGENTE_CHROMIUM_PATH || "/usr/bin/chromium";
const CORPO_MAX = 16 * 1024;
/**
 * F10 · TOKEN. Vazio = sem autenticação, que é o modo da rede interna do compose (a fronteira do
 * compose é o controle, como no leitor-proxy). Preenchido = `Authorization: Bearer <token>`
 * OBRIGATÓRIO em toda rota menos o /health — é o modo de quem roda isto em OUTRO servidor, onde a
 * porta atravessa internet e "é interno" deixa de ser verdade.
 *
 * Comparação em TEMPO CONSTANTE: `a === b` em string vazamento de tempo é o jeito clássico de um
 * token ser adivinhado byte a byte. Custa uma linha.
 */
const TOKEN = (process.env.AGENTE_TOKEN ?? "").trim();
/**
 * O OPT-IN EXPLÍCITO ao modo sem autenticação (achado do Sourcery na #716, 🟠 alto — e correto).
 *
 * `autorizado()` devolvia `true` quando não havia token, com o argumento de que "a fronteira do
 * compose é o controle". O argumento vale pra rede interna; o problema é que NADA verificava que
 * estávamos nela. Publicada a porta, ou movido o serviço pra outro servidor sem token, o servidor
 * aceitava QUALQUER chamador — criar sessão, navegar, ler página. A defesa existia só no CLIENTE
 * (lib/agent/navegadorRemoto recusa externo sem token), e o cliente não é quem está exposto.
 *
 * Agora falha FECHADO: sem token, só passa quem DECLAROU o modo. Quem declara é o compose, no
 * serviço `agente-navegador`, onde a afirmação "estou na rede interna" é verdadeira por construção.
 * Um deploy em outro servidor não tem esta env e portanto EXIGE token, que é o que a F10 queria.
 */
const SEM_TOKEN_OK = /^(1|true|on|sim)$/i.test((process.env.AGENTE_SEM_TOKEN ?? "").trim());
/** `*` na allowlist = QUALQUER DOMÍNIO (pedido do dono). IP privado/loopback segue barrado. */
const ABERTO = ALLOW.includes("*");

/** `extrairTexto` já tira script/style e TEXTO OCULTO (vetor de injeção indireta) — ver guarda.mjs. */
const limitar = (s) => String(s ?? "").slice(0, MAX_TEXTO);

/**
 * Em modo ABERTO não reescrevo as regras: chamo `urlPermitida` com a allowlist `[host da própria
 * URL]`. Assim esquema, porta, credencial-na-URL e IP-literal continuam sendo checados pelas MESMAS
 * funções que o leitor-proxy roda em produção, e o único predicado que cede é o do domínio.
 */
function urlDoAgente(entrada) {
  if (!ABERTO) return urlPermitida(entrada, ALLOW);
  let host = "";
  try { host = new URL(String(entrada ?? "").trim()).hostname.replace(/^\[|\]$/g, "").toLowerCase(); } catch { host = ""; }
  return urlPermitida(entrada, host ? [host] : []);
}

/** Igualdade em tempo constante (tokens de tamanhos diferentes também não vazam por tempo). */
function mesmoSegredo(a, b) {
  const A = Buffer.from(String(a ?? ""), "utf8");
  const B = Buffer.from(String(b ?? ""), "utf8");
  if (A.length !== B.length) { timingSafeEqual(A, A); return false; }
  return timingSafeEqual(A, B);
}

function autorizado(req) {
  if (!TOKEN) return SEM_TOKEN_OK; // sem token: só com o opt-in explícito (ver SEM_TOKEN_OK)
  const h = String(req.headers["authorization"] ?? "");
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return !!m && mesmoSegredo(m[1].trim(), TOKEN);
}

class Recusa extends Error {
  constructor(status, erro) { super(erro); this.status = status; this.erro = erro; }
}

// ───────────────────────────── regras de rede (as mesmas do web) ─────────────────────────────

/**
 * `MAP * ~NOTFOUND` + um EXCLUDE por padrão: fora da allowlist NADA resolve, nem subrecurso. `*.x`
 * da nossa lista vale pro domínio pelado também (é o que `hostNaLista` faz), mas o padrão do
 * Chromium `*.x` não casa `x` — então vira DOIS EXCLUDE. Lista vazia = só o MAP: falha FECHADO.
 */
export function regrasDeResolucao(allow) {
  // Em modo aberto esta camada SAI (não há EXCLUDE que signifique "tudo"). Quem segura passa a ser
  // a interceptação de cada pedido + o `ipsAceitos` do `ir`. Uma camada menos, as outras intactas.
  if (allow.includes("*")) return "";
  const excl = [];
  for (const p of allow) {
    if (p.startsWith("*.")) { const base = p.slice(2); if (base) excl.push(`EXCLUDE ${base}`, `EXCLUDE ${p}`); }
    else if (p) excl.push(`EXCLUDE ${p}`);
  }
  return ["MAP * ~NOTFOUND", ...excl].join(", ");
}

/** Só GET. Um agente somente-leitura não emite POST, e um formulário auto-disparado seria escrita. */
export function decidirPedido(p, allow) {
  if (String(p.metodo ?? "").toUpperCase() !== "GET") return { ok: false, erro: "metodo_proibido" };
  const v = urlDoAgente(p.url);
  return v.ok ? { ok: true } : { ok: false, erro: v.erro };
}

/**
 * TODOS os IPs resolvidos precisam passar. O Leitor pode aceitar "basta um bom" porque ELE escolhe
 * em qual conectar; o Chromium escolhe sozinho, então um nome que resolve pra [público, loopback]
 * poderia ir no loopback.
 */
export function ipsAceitos(ips) {
  if (!ips.length) return { ok: false, erro: "dns_vazio" };
  return ips.some((ip) => ipBloqueado(ip)) ? { ok: false, erro: "ip_bloqueado" } : { ok: true };
}

export function argsChromium(allow, extras = []) {
  return [
    "--headless=new",
    "--no-sandbox",                 // sem user namespaces no seccomp padrão; cap_drop ALL + read_only cobrem
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--user-data-dir=/tmp/perfil",  // o container é read_only; /tmp é tmpfs
    "--no-first-run", "--no-default-browser-check",
    "--disable-extensions", "--disable-component-extensions-with-background-pages",
    "--disable-background-networking", "--disable-component-update", "--disable-sync",
    "--disable-default-apps", "--disable-domain-reliability",
    "--disable-client-side-phishing-detection", "--metrics-recording-only",
    "--disable-features=Translate,MediaRouter,OptimizationHints,AutofillServerCommunication,InterestFeedContentSuggestions",
    "--mute-audio", "--hide-scrollbars", "--font-render-hinting=none",
    // string vazia = modo aberto; passar `--host-resolver-rules=` vazio confundiria o Chromium
    ...(regrasDeResolucao(allow) ? [`--host-resolver-rules=${regrasDeResolucao(allow)}`] : []),
    // NENHUM plugin stealth, NENHUM spoof de fingerprint, NENHUM solver de CAPTCHA — de propósito.
    ...extras,
  ];
}

// ───────────────────────────── navegador (um, preguiçoso) ─────────────────────────────

let navegador = null;
let abrindo = null;

async function obterNavegador() {
  if (navegador?.connected) return navegador;
  if (abrindo) return abrindo;
  abrindo = (async () => {
    const mod = await import("puppeteer-core");
    const pptr = mod.default?.launch ? mod.default : mod;
    const b = await pptr.launch({
      executablePath: CAMINHO,
      headless: true,
      pipe: true,
      args: argsChromium(ALLOW),
      // Ambiente MÍNIMO mesmo aqui. O container não tem credencial, mas o hábito é o que sobrevive
      // a alguém acrescentar um env_file depois sem pensar nisto.
      env: { PATH: "/usr/local/bin:/usr/bin:/bin", HOME: "/tmp", LANG: "C.UTF-8", TZ: "UTC" },
      handleSIGINT: false, handleSIGTERM: false, handleSIGHUP: false,
    });
    b.on("disconnected", () => { navegador = null; });
    navegador = b;
    return b;
  })().catch((e) => { abrindo = null; throw e; }).finally(() => { abrindo = null; });
  return abrindo;
}

const registro = criarRegistro();

async function abrirSessao() {
  const b = await obterNavegador();
  const ctx = await b.createBrowserContext();
  let page;
  try {
    page = await ctx.newPage();
    page.setDefaultNavigationTimeout(TIMEOUT_MS);
    page.setDefaultTimeout(TIMEOUT_MS);
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const v = decidirPedido({ url: req.url(), metodo: req.method(), tipo: req.resourceType() }, ALLOW);
      if (v.ok) req.continue().catch(() => {});
      else req.abort("blockedbyclient").catch(() => {});
    });
  } catch (e) {
    await ctx.close().catch(() => {});
    throw e;
  }
  const r = registro.abrir({ ctx, page });
  if (!r.ok) { await ctx.close().catch(() => {}); throw new Recusa(429, "lotado"); }
  return r.id;
}

async function fecharRecurso(s) {
  await s?.recurso?.ctx?.close?.().catch(() => {});
}

// reaper: sessão ociosa vira Chromium vazando memória até o container morrer
const reaper = setInterval(() => {
  for (const s of registro.expirar()) fecharRecurso(s);
}, 15_000);
reaper.unref?.();

// ───────────────────────────── HTTP ─────────────────────────────

function corpo(req) {
  return new Promise((ok, err) => {
    let n = 0; const partes = [];
    req.on("data", (c) => {
      n += c.length;
      if (n > CORPO_MAX) { err(new Recusa(413, "corpo_grande")); req.destroy(); return; }
      partes.push(c);
    });
    req.on("end", () => {
      const t = Buffer.concat(partes).toString("utf8");
      if (!t) return ok({});
      try { ok(JSON.parse(t)); } catch { err(new Recusa(400, "json_invalido")); }
    });
    req.on("error", () => err(new Recusa(400, "corpo_invalido")));
  });
}

const responder = (res, status, obj) => {
  const b = Buffer.from(JSON.stringify(obj));
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "content-length": b.length });
  res.end(b);
};

const lookup = (host) => dns.promises.lookup(host, { all: true, verbatim: true });

async function rotear(req, res) {
  const url = new URL(req.url ?? "/", "http://interno");
  const p = url.pathname;

  // O /health fica FORA do portão de propósito: é ele que a sonda do recibo chama, e um health que
  // exige segredo transformaria "token errado" em "serviço morto" no recibo — dois defeitos
  // diferentes com a mesma cara. Ele não revela nada além de contadores e do MODO.
  if (p !== "/health" && !autorizado(req)) throw new Recusa(401, "nao_autorizado");

  if (p === "/health") {
    return responder(res, 200, {
      ok: true, allow: ALLOW.length, aberto: ABERTO, autenticado: !!TOKEN, semTokenPermitido: SEM_TOKEN_OK, sessoes: registro.tamanho,
      max: MAX_SESSOES, ttlMs: TTL_MS, vidaMaxMs: VIDA_MAX_MS,
      navegador: !!navegador?.connected,
    });
  }

  if (p === "/sessao" && req.method === "POST") {
    if (!ALLOW.length) throw new Recusa(503, "allowlist_vazia");
    return responder(res, 201, { id: await abrirSessao() });
  }

  const m = /^\/sessao\/([0-9a-f]{32})(\/(ir|ler|foto))?$/.exec(p);
  if (!m) throw new Recusa(404, "rota_desconhecida");
  const [, id, , verbo] = m;

  if (req.method === "DELETE" && !verbo) {
    const s = registro.fechar(id);
    await fecharRecurso(s);
    return responder(res, 200, { ok: !!s });
  }

  const s = registro.usar(id);
  if (!s) throw new Recusa(404, "sessao_desconhecida");
  const { page } = s.recurso;

  if (verbo === "ir" && req.method === "POST") {
    const { url: alvo } = await corpo(req);
    // 1ª camada: a URL pedida. Mesma função que o Leitor roda em produção.
    const v = urlDoAgente(alvo);
    if (!v.ok) throw new Recusa(v.status, v.erro);
    // 2ª: o IP, ANTES de o Chromium abrir. Não fecha DNS-rebinding (ele resolve de novo), mas pega
    // o caso comum — nome liberado que aponta pra dentro. Ver a nota no doc (F9).
    let ips;
    try { ips = await lookup(v.url.hostname); } catch { throw new Recusa(502, "dns_falhou"); }
    const ok = ipsAceitos(ips.map((x) => x.address));
    if (!ok.ok) throw new Recusa(403, ok.erro);
    await page.goto(v.url.toString(), { waitUntil: "domcontentloaded" });
    return responder(res, 200, { ok: true, url: page.url() });
  }

  if (verbo === "ler" && req.method === "POST") {
    const { selector } = await corpo(req);
    const sel = typeof selector === "string" && selector.trim() ? selector.trim() : null;
    // innerText do DOM VIVO (é por isso que existe um navegador aqui, e não o Leitor). Se o
    // seletor não casar, devolve "" em vez de estourar — plano com seletor errado não é erro 500.
    const bruto = await page.evaluate((q) => {
      const el = q ? document.querySelector(q) : document.body;
      return el ? el.innerText ?? el.textContent ?? "" : "";
    }, sel);
    return responder(res, 200, { texto: limitar(bruto) });
  }

  if (verbo === "foto" && req.method === "POST") {
    const b64 = await page.screenshot({ type: "jpeg", quality: 60, encoding: "base64" });
    return responder(res, 200, { base64: String(b64 ?? "") });
  }

  throw new Recusa(405, "metodo_nao_permitido");
}

export const servidor = http.createServer((req, res) => {
  rotear(req, res).catch((e) => {
    const status = e instanceof Recusa ? e.status : 500;
    const erro = e instanceof Recusa ? e.erro : "falha";
    // NUNCA devolve a mensagem crua de erro desconhecido: ela pode carregar caminho interno.
    responder(res, status, { erro, ...(status === 500 ? {} : {}) });
  });
});

// `extrairTexto` fica importada e disponível pra quem precisar de HTML→texto sem DOM vivo; não é
// usada no caminho atual (o `ler` usa innerText do DOM, que é o ponto deste serviço existir).
export { extrairTexto };

if (process.env.AGENTE_NAO_ESCUTAR !== "1") {
  servidor.listen(PORT, () => console.log(`[agente-navegador] :${PORT} allow=${ALLOW.length} dominio(s)`));
}
