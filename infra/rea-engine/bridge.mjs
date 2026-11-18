/**
 * infra/rea-engine/bridge.mjs — a PONTE fina entre o Octa (no VPS) e o REA (aqui, na Contabo). HTTP → CLI do REA.
 * Só na Tailscale (bind 0.0.0.0 dentro do container; o compose publica só na IP da Tailscale), token obrigatório.
 * NÃO é um shell remoto: só comandos do REA, da allowlist; o artefato vem no corpo e é escrito num diretório
 * temporário; nada de caminho do host. REA já recusa DRM/anti-cheat/auth/pirataria (DISCLAIMER do REA).
 *
 *   POST /rea  { token, command, args?: string[], artifactBase64?, artifactName?, json?: true }
 *     → { ok, code, stdout, stderr, evidence? }   (evidence = stdout parseado quando --json)
 *   POST /rea  { token, command: "analyze-web-bundle", args: [url], view?: "endpoints"|"inferences"|"summary" }
 *     → o caminho WEB (web-bundle.mjs): um Chromium isolado por pedido, saída só por um proxy que barra IP interno.
 *   POST /sessao            { token, dono: sha256hex, dominios?: string[] } → { ok, sessao, dominios, ferramentas }
 *   POST /sessao/ferramenta { token, dono, sessao, nome, argumentos, salvar? } → { ok, resultado | erro }  (resposta longa;
 *                           `salvar: "x.json"` grava o resultado bruto na pasta da sessão e devolve só o resumo)
 *   POST /sessao/fechar     { token, dono, sessao }                          → { ok }
 *     → SESSÕES do REA (sessoes.mjs): um `rea mcp` vivo por sessão, como o REA local. `dominios` = os que a pessoa
 *       declarou sob o Termo de Uso no app (lib/rea/termo.ts); sem eles, as ferramentas web não aparecem.
 *   GET  /health → { ok, rea, ghidra, chromium, sessoes }
 */
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, writeFile, readFile, rm, stat } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { androidArgs } from "./android-request.mjs";
import { analisarSite, CHROMIUM, PRAZO_WEB_MS } from "./web-bundle.mjs";
import { criarGerente } from "./sessoes.mjs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

const PORT = Number(process.env.REA_BRIDGE_PORT || 8799);
const TOKEN = process.env.REA_BRIDGE_TOKEN || "";
const MAX_BYTES = Number(process.env.REA_MAX_ARTIFACT_BYTES || 256 * 1024 * 1024); // 256 MB
const TIMEOUT_MS = Number(process.env.REA_CMD_TIMEOUT_MS || 10 * 60_000);
const CACHE_DIR = process.env.REA_CACHE_DIR || "/work/cache";
let androidActive = false;
let webActive = false;   // um navegador por vez: o motor divide os núcleos 0–3 com a ChipFlow
const CACHE_TTL_MS = Number(process.env.REA_CACHE_TTL_MS || 2 * 3600_000);
const handleOk = (h) => /^[0-9a-f]{32}$/.test(String(h || ""));
const nomeSeguro = (n) => (String(n || "artifact").replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120) || "artifact");

// A superfície: o REA (rea-agents 6.9.0, skill v62) tem ~255 tools. Esta fatia libera a ANÁLISE ESTÁTICA/leitura (1:1 com o catálogo do REA)
// e NEGA as famílias com efeito colateral — rodar/observar/tracejar programas, controlar device (adb), debug
// interativo, e mudar o host (setup/update/uninstall/import/annotate). Essas pedem autorização por-ação (fatia
// futura). O catálogo vem do próprio `rea --help` no boot: nada de lista decorada que envelhece.
const DENY_PREFIXOS = ["frida", "spawn", "attach", "launch", "instrument", "interact", "run-", "extract-", "environment-", "agent-env", "list-adb", "install-adb", "list-frida", "list-javascript-runtime", "capture-", "observe-", "trace", "debug-", "start-adb", "stop-adb", "push-", "pull-", "read-adb", "resolve-adb", "inspect-adb", "uninstall", "collect-adb", "import-", "open-jeb", "execute-", "cutter-", "annotate-", "decompile-jeb", "inspect-jeb", "discover-webmcp", "reconcile-javascript-runtime"];
const DENY_EXATOS = new Set(["setup", "update", "completions", "evidence-import"]);
const permitido = (cmd) => CATALOGO.has(cmd) && !DENY_EXATOS.has(cmd) && !DENY_PREFIXOS.some((p) => cmd.startsWith(p));

const CATALOGO = new Set();
function carregarCatalogo() {
  return new Promise((ok) => {
    const p = spawn("rea", ["--help"]); let out = "";
    p.stdout.on("data", (d) => { out += d; });
    p.on("close", () => { for (const m of out.matchAll(/^\s{2,}([a-z][a-z0-9-]+)\s{2,}/gm)) CATALOGO.add(m[1]); ok(); });
    p.on("error", () => ok());
  });
}

const lerCorpo = (req) => new Promise((ok, erro) => {
  const pedacos = []; let n = 0;
  req.on("data", (c) => { n += c.length; if (n > 4 * Math.ceil(MAX_BYTES / 3) + 65536) { req.destroy(); erro(new Error("corpo grande demais")); } else pedacos.push(c); });
  req.on("end", () => ok(Buffer.concat(pedacos)));
  req.on("error", erro);
});

/**
 * Mata TUDO de um job: o grupo do `rea` E os workers que ele solta em sessão própria (javascriptAnalysisWorkerProcess
 * etc. viram filhos do PID 1 — matar só o grupo deixava o worker queimando CPU por mais 10+ min, nos núcleos da
 * ChipFlow). Cada job leva REA_JOB=<id> no ambiente, herdado pelos workers; aqui a gente varre o /proc por ele.
 */
async function matarJob(jobId, pgid) {
  try { if (pgid) process.kill(-pgid, "SIGKILL"); } catch { /* já saiu */ }
  const { readdir } = await import("node:fs/promises");
  for (const pid of await readdir("/proc").catch(() => [])) {
    if (!/^\d+$/.test(pid) || Number(pid) === process.pid) continue;
    const env = await readFile(`/proc/${pid}/environ`, "utf8").catch(() => "");
    if (env.split("\0").includes(`REA_JOB=${jobId}`)) { try { process.kill(Number(pid), "SIGKILL"); } catch { /* corrida: saiu */ } }
  }
}

function rodarRea(args, cwd, signal, envExtra = {}, prazoMs = TIMEOUT_MS) {
  return new Promise((ok) => {
    const jobId = randomBytes(8).toString("hex");
    const env = { ...Object.fromEntries(Object.entries(process.env).filter(([k]) => ['PATH','HOME','JAVA_HOME','TMPDIR','GHIDRA_INSTALL_DIR','REA_JADX_MCP_JAR','REA_JADX_HEAP_MIB','REA_JADX_ACTIVE_PROCESSOR_COUNT','REA_WAKARU_COMMAND'].includes(k))), ...envExtra, REA_JOB: jobId };
    const p = spawn("rea", args, { cwd, env, detached: process.platform !== "win32" });
    const kill = () => { void matarJob(jobId, p.pid); };
    signal?.addEventListener("abort",kill,{once:true}); if(signal?.aborted)kill();
    let out = "", err = ""; const to = setTimeout(kill, prazoMs);
    p.stdout.on("data", (d) => { out += d; if (out.length > 32 * 1024 * 1024) kill(); });
    p.stderr.on("data", (d) => { err = (err + d).slice(0,20000); });
    p.on("close", (code) => { clearTimeout(to); signal?.removeEventListener("abort",kill); void matarJob(jobId); ok({ code: code ?? -1, stdout: out, stderr: err }); });
    p.on("error", (e) => { clearTimeout(to); signal?.removeEventListener("abort",kill); ok({ code: -1, stdout: "", stderr: String(e?.message ?? e) }); });
  });
}

/**
 * Resposta LONGA: o fetch do Node (undici) desiste se os cabeçalhos não chegam em 5 min (headersTimeout) e se o corpo
 * fica parado 5 min (bodyTimeout) — mesmo com AbortSignal maior. Análise nativa (Ghidra) e web passam disso. Então,
 * validado o pedido, os cabeçalhos saem NA HORA (200) e um espaço em branco sai a cada 25 s; o JSON final vem no fim
 * (espaço antes de JSON é JSON válido). Erro depois disso vai como { ok: false, erro } no corpo, com 200.
 */
const BATIMENTO_MS = 25_000;
function respostaLonga(res) {
  res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
  res.write(" ");
  const t = setInterval(() => { if (!res.writableEnded && !res.destroyed) res.write(" \n"); }, BATIMENTO_MS);
  return (obj) => { clearInterval(t); if (!res.writableEnded && !res.destroyed) res.end(JSON.stringify(obj)); };
}

const server = createServer(async (req, res) => {
  let longa = null;   // depois que a resposta longa começou, o status já foi: tudo vai no corpo
  const responder = (status, obj) => { if (longa) return longa(status >= 400 && obj?.ok !== false ? { ok: false, ...obj } : obj); res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); };
  try {
    if (req.method === "GET" && req.url === "/health") {
      const r = await rodarRea(["--version"], "/work");
      return responder(200, { ok: r.code === 0, rea: r.stdout.trim(), ghidra: !!process.env.GHIDRA_INSTALL_DIR, chromium: TEM_CHROMIUM, sessoes: gerente.ativas() });
    }
    if (req.method === "POST" && req.url?.startsWith("/sessao")) {
      const corpo = JSON.parse((await lerCorpo(req)).toString("utf8") || "{}");
      if (!TOKEN || corpo.token !== TOKEN) return responder(401, { ok: false, erro: "token" });
      const dono = String(corpo.dono || "");
      try {
        if (req.url === "/sessao") {
          if (corpo.dominios?.length && !TEM_CHROMIUM) return responder(503, { ok: false, erro: "motor sem navegador (Chromium)" });
          return responder(200, { ok: true, ...(await gerente.criar({ dono, dominios: Array.isArray(corpo.dominios) ? corpo.dominios.map(String) : [] })) });
        }
        if (req.url === "/sessao/fechar") return responder(200, { ok: await gerente.fechar(String(corpo.sessao || ""), dono) });
        if (req.url === "/sessao/ferramenta") {
          longa = respostaLonga(res);
          const abort = new AbortController();
          res.once("close", () => { if (!res.writableEnded) abort.abort(); });
          const r = await gerente.chamar({ sessao: String(corpo.sessao || ""), dono, nome: String(corpo.nome || ""), argumentos: corpo.argumentos, salvar: corpo.salvar, signal: abort.signal });
          return responder(200, r);
        }
        return responder(404, { ok: false, erro: "rota de sessão desconhecida" });
      } catch (e) {
        const m = String(e?.message ?? e);
        return responder(/cheias/.test(m) ? 429 : /^(dono|dominio|caminho|handle|url|ferramenta|sessao|allowed|start_url|capture)/.test(m) ? 400 : 500, { ok: false, erro: m.slice(0, 400) });
      }
    }
    if (req.method === "POST" && req.url === "/upload") {
      const corpo = JSON.parse((await lerCorpo(req)).toString("utf8") || "{}");
      if (!TOKEN || corpo.token !== TOKEN) return responder(401, { ok: false, erro: "token" });
      const bytes = Buffer.from(String(corpo.artifactBase64 || ""), "base64");
      if (bytes.length < 1 || bytes.length > MAX_BYTES) return responder(413, { ok: false, erro: "artefato vazio ou grande demais" });
      const handle = randomBytes(16).toString("hex");
      const dir = join(CACHE_DIR, handle);
      await mkdir(dir, { recursive: true });
      const name = corpo.scopeKey ? "artifact.apk" : nomeSeguro(corpo.artifactName);
      if(name === "." || name === ".." || name === ".scope.json") { await rm(dir,{recursive:true,force:true}); return responder(400,{ok:false,erro:"invalid_name"}); }
      await writeFile(join(dir, name), bytes, {mode:0o600});
      if (corpo.scopeKey) {
        if (!/^[a-f0-9]{64}$/.test(corpo.scopeKey) || bytes.length > 64*1024*1024) { await rm(dir,{recursive:true,force:true}); return responder(400,{ok:false,erro:"invalid_scoped_upload"}); }
        await writeFile(join(dir,".scope.json"),JSON.stringify({scopeKey:corpo.scopeKey,createdAt:Date.now(),name}),{mode:0o600});
      }
      return responder(200, { ok: true, handle, name: nomeSeguro(corpo.artifactName), bytes: bytes.length });
    }
    if (req.method === "POST" && req.url === "/android") {
      const body=JSON.parse((await lerCorpo(req)).toString("utf8")||"{}");
      if(!TOKEN||body.token!==TOKEN)return responder(401,{ok:false,erro:"token"});
      if(!handleOk(body.handle))return responder(404,{ok:false,erro:"not_found"});
      const dir=join(CACHE_DIR,body.handle);
      const meta=await readFile(join(dir,".scope.json"),"utf8").then(JSON.parse).catch(()=>null);
      let args;try{args=androidArgs(body,meta);}catch(e){return responder(400,{ok:false,erro:e.message});}
      if(androidActive)return responder(429,{ok:false,erro:"android_busy"});
      androidActive=true;
      longa=respostaLonga(res);
      const abort=new AbortController();res.on("close",()=>{if(!res.writableEnded)abort.abort();});
      let work;
      try{
        work=await mkdtemp(join(tmpdir(),"rea-android-job-"));
        const result=await rodarRea([args[0],join(dir,meta.name),...args.slice(1),"--json"],work,abort.signal);
        let evidence;try{evidence=JSON.parse(result.stdout);}catch{}
        return responder(200,{ok:result.code===0,code:result.code,evidence,stderr:result.stderr});
      }finally{androidActive=false;if(work)await rm(work,{recursive:true,force:true});}
    }
    if (req.method !== "POST" || req.url !== "/rea") return responder(404, { ok: false, erro: "use POST /rea, POST /upload ou GET /health" });
    const corpo = JSON.parse((await lerCorpo(req)).toString("utf8") || "{}");
    if (!TOKEN || corpo.token !== TOKEN) return responder(401, { ok: false, erro: "token" });
    const command = String(corpo.command || "");
    if (!permitido(command)) return responder(400, { ok: false, erro: CATALOGO.has(command) ? `comando com efeito colateral desligado nesta ponte: ${command}` : `comando não é do REA: ${command}` });
    const extra = Array.isArray(corpo.args) ? corpo.args.map(String).filter((a) => a.length < 4096) : [];
    // nenhum comando aponta pro loopback do motor (o CDP do navegador de outro pedido, a própria ponte…)
    if (extra.some((a) => /^(?:https?|wss?):\/\/(?:127\.|localhost|\[::1\]|0\.0\.0\.0)/i.test(a))) return responder(400, { ok: false, erro: "alvo no loopback do motor não é permitido" });
    // o caminho WEB: o REA quer `<endpoint CDP> <targetId>`, o app manda a URL — o navegador nasce aqui (web-bundle.mjs)
    if (command === "analyze-web-bundle") {
      if (!TEM_CHROMIUM) return responder(503, { ok: false, erro: "motor sem navegador (Chromium) — reconstrua a imagem" });
      if (extra.length !== 1) return responder(400, { ok: false, erro: "analyze-web-bundle: mande só a URL em args[0]" });
      if (webActive) return responder(429, { ok: false, erro: "web_busy: já há uma análise web rodando, tente em alguns minutos" });
      webActive = true;
      longa = respostaLonga(res);
      const abort = new AbortController();
      res.once("close", () => { if (!res.writableEnded) abort.abort(); });
      try {
        const r = await analisarSite(extra[0], { rodarRea: (a, c, sg, env) => rodarRea(a, c, sg, env, PRAZO_WEB_MS), signal: abort.signal, visao: String(corpo.view || "endpoints") });
        if (res.destroyed) return;
        return responder(200, r);
      } catch (e) {
        const m = String(e?.message ?? e);
        return responder(/^url_/.test(m) ? 400 : 500, { ok: false, erro: m.slice(0, 300) });
      } finally { webActive = false; }
    }
    const dir = await mkdtemp(join(tmpdir(), "rea-"));
    try {
      let alvo = [];
      if (handleOk(corpo.handle)) {
        const base = join(CACHE_DIR, corpo.handle);
        if(await stat(join(base,".scope.json")).catch(()=>null))return responder(400,{ok:false,erro:"scoped_handle_requires_android_route"});
        const { readdir } = await import("node:fs/promises");
        const arquivos = await readdir(base).catch(() => []);
        if (!arquivos.length) return responder(404, { ok: false, erro: "handle não existe (expirou?)" });
        alvo = [join(base, arquivos[0])];
      } else if (corpo.artifactBase64) {
        const bytes = Buffer.from(corpo.artifactBase64, "base64");
        if (bytes.length > MAX_BYTES) return responder(413, { ok: false, erro: "artefato grande demais" });
        const nome = String(corpo.artifactName || "artifact").replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120) || "artifact";
        const caminho = join(dir, nome);
        await writeFile(caminho, bytes);
        alvo = [caminho];
      }
      // O analisador JavaScript recebe uma aplicação (diretório ou ASAR).
      // Um arquivo avulso vira uma aplicação de um arquivo, isolada por requisição.
      if (command === "analyze-javascript-application" && alvo[0] && /\.(?:cjs|mjs|js)$/i.test(alvo[0])) {
        const { copyFile } = await import("node:fs/promises");
        const appDir = join(dir, "application");
        await mkdir(appDir);
        await copyFile(alvo[0], join(appDir, basename(alvo[0])));
        alvo = [appDir];
      }
      const args = [command, ...alvo, ...extra, ...(corpo.json !== false ? ["--json"] : [])];
      if (res.destroyed) return;
      longa = respostaLonga(res);
      const abort = new AbortController();
      res.once("close", () => { if (!res.writableEnded) abort.abort(); });
      // prazo por pedido (bundle/binário grande): 1–30 min; padrão REA_CMD_TIMEOUT_MS
      const prazo = Number(corpo.prazoMin) >= 1 && Number(corpo.prazoMin) <= 30 ? Number(corpo.prazoMin) * 60_000 : TIMEOUT_MS;
      const r = await rodarRea(args, dir, abort.signal, {}, prazo);
      if (res.destroyed) return;
      let evidence; if (corpo.json !== false) { try { evidence = JSON.parse(r.stdout); } catch { /* não-JSON */ } }
      return responder(200, { ok: r.code === 0, code: r.code, stdout: evidence ? undefined : r.stdout.slice(0, 2_000_000), stderr: r.stderr, evidence });
    } finally { await rm(dir, { recursive: true, force: true }).catch(() => {}); }
  } catch (e) { return responder(500, { ok: false, erro: String(e?.message ?? e).slice(0, 300) }); }
});
await mkdir(CACHE_DIR, { recursive: true }).catch(() => {});
async function limparCacheVelho() {
  try {
    const { readdir } = await import("node:fs/promises");
    for (const h of await readdir(CACHE_DIR).catch(() => [])) {
      const st = await stat(join(CACHE_DIR, h)).catch(() => null);
      if (st && Date.now() - st.mtimeMs > CACHE_TTL_MS) await rm(join(CACHE_DIR, h), { recursive: true, force: true }).catch(() => {});
    }
  } catch { /* nada */ }
}
setInterval(limparCacheVelho, 30 * 60_000).unref();
await carregarCatalogo();
const ENV_REA = Object.fromEntries(Object.entries(process.env).filter(([k]) => ['PATH','HOME','JAVA_HOME','TMPDIR','GHIDRA_INSTALL_DIR','REA_JADX_MCP_JAR','REA_JADX_HEAP_MIB','REA_JADX_ACTIVE_PROCESSOR_COUNT','REA_WAKARU_COMMAND'].includes(k)));
const gerente = criarGerente({ cacheDir: CACHE_DIR, matarJob, envBase: ENV_REA });
const TEM_CHROMIUM = await new Promise((ok) => { const p = spawn(CHROMIUM, ["--version"]); p.on("close", (c) => ok(c === 0)); p.on("error", () => ok(false)); });
server.listen(PORT, process.env.REA_BRIDGE_HOST || "0.0.0.0", () => console.log(`[rea-bridge] ouvindo :${PORT} (token ${TOKEN ? "ON" : "AUSENTE!"}, ghidra ${process.env.GHIDRA_INSTALL_DIR ? "ON" : "off"}, ${CATALOGO.size} comandos no catálogo, chromium ${TEM_CHROMIUM ? "ON" : "off"})`));
