/**
 * infra/forja-engine/bridge.mjs — a PONTE fina entre a Zaeon (no VPS) e a Forja (aqui, na Contabo). HTTP → engine.
 * Só na Tailscale (o compose publica só na IP da Tailscale), token obrigatório. NÃO é shell remoto: só os dois
 * engines da allowlist (graphify, understand), o repo-alvo vem de uma URL git de host permitido (clone raso,
 * só-leitura) ou de um tarball no corpo — nunca um caminho do host. A lógica de segurança é PURA (vetting.mjs).
 *
 *   POST /forja  { token, engine:"graphify"|"understand", repoUrl? | tarballBase64?, tarballName?, args?:string[] }
 *     → { ok, engine, grafo? , stderr? }      (grafo = o JSON de saída do engine, parseado)
 *   GET  /health → { ok, graphify, understand }
 */
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ENGINES, resolverEngine, hostPermitido, montarComando, caminhoSaida } from "./vetting.mjs";

const PORT = Number(process.env.FORJA_BRIDGE_PORT || 8800);
const HOST = process.env.FORJA_BRIDGE_HOST || "0.0.0.0";
const TOKEN = process.env.FORJA_BRIDGE_TOKEN || "";
const MAX_TARBALL = Number(process.env.FORJA_MAX_TARBALL_BYTES || 64 * 1024 * 1024); // 64 MB
const TIMEOUT_MS = Number(process.env.FORJA_CMD_TIMEOUT_MS || 15 * 60_000);
const UNDERSTAND_CMD = process.env.FORJA_UNDERSTAND_CMD || "";     // wrapper do Claude Code headless + plugin
// obs: o graphify usa `update` (tree-sitter estático, SEM LLM) — não precisa de FORJA_GRAPHIFY_BACKEND.
// O understand É LLM: o wrapper (Claude Code headless) precisa da auth, que o rodar() genérico filtra fora.
// Só o engine 'understand' recebe este env repassado (allowlist estreita, configurável). O graphify NÃO.
const UNDERSTAND_ENV_PASS = (process.env.FORJA_UNDERSTAND_ENV_PASS ||
  "ANTHROPIC_API_KEY,ANTHROPIC_AUTH_TOKEN,ANTHROPIC_BASE_URL,ANTHROPIC_MODEL,ANTHROPIC_DEFAULT_HAIKU_MODEL," +
  "CLAUDE_CODE_USE_BEDROCK,CLAUDE_CODE_USE_VERTEX,AWS_REGION,AWS_ACCESS_KEY_ID,AWS_SECRET_ACCESS_KEY,AWS_SESSION_TOKEN," +
  "CLOUD_ML_REGION,GOOGLE_APPLICATION_CREDENTIALS,HTTPS_PROXY,HTTP_PROXY,NO_PROXY,FORJA_CLAUDE_BIN,FORJA_UNDERSTAND_PERM"
).split(",").map((s) => s.trim()).filter(Boolean);
const envDoUnderstand = () => Object.fromEntries(UNDERSTAND_ENV_PASS.filter((k) => process.env[k] !== undefined).map((k) => [k, process.env[k]]));

const lerCorpo = (req) => new Promise((ok, erro) => {
  const pedacos = []; let n = 0;
  req.on("data", (c) => { n += c.length; if (n > 4 * Math.ceil(MAX_TARBALL / 3) + 65536) { req.destroy(); erro(new Error("corpo grande demais")); } else pedacos.push(c); });
  req.on("end", () => ok(Buffer.concat(pedacos)));
  req.on("error", erro);
});

/** Roda um processo com timeout e kill de árvore, env mínimo. Devolve { code, stdout, stderr }. */
function rodar(bin, argv, cwd, extraEnv = {}) {
  return new Promise((ok) => {
    const env = { ...Object.fromEntries(Object.entries(process.env).filter(([k]) => ["PATH", "HOME", "TMPDIR", "LANG", "LC_ALL"].includes(k))), GIT_TERMINAL_PROMPT: "0", ...extraEnv };
    const p = spawn(bin, argv, { cwd, env, detached: process.platform !== "win32" });
    const kill = () => { try { process.platform === "win32" ? p.kill("SIGKILL") : process.kill(-p.pid, "SIGKILL"); } catch { /* já morreu */ } };
    let out = "", err = ""; const to = setTimeout(kill, TIMEOUT_MS);
    p.stdout.on("data", (d) => { out += d; if (out.length > 8 * 1024 * 1024) kill(); });
    p.stderr.on("data", (d) => { err = (err + d).slice(0, 20000); });
    p.on("close", (code) => { clearTimeout(to); ok({ code: code ?? -1, stdout: out, stderr: err }); });
    p.on("error", (e) => { clearTimeout(to); ok({ code: -1, stdout: "", stderr: String(e?.message ?? e) }); });
  });
}

/** Clona um repo raso e só-leitura num subdir do job. Lança em erro (a ponte responde 400/500). */
async function clonarRepo(repoUrl, jobDir) {
  const chk = hostPermitido(repoUrl);
  if (!chk.ok) throw new Error(chk.erro);
  const repoDir = join(jobDir, "repo");
  const r = await rodar("git", ["clone", "--depth", "1", "--no-tags", "--single-branch", repoUrl, repoDir], jobDir);
  if (r.code !== 0) throw new Error(`git clone falhou: ${r.stderr.slice(0, 500)}`);
  return repoDir;
}

/** Extrai um tarball (.tar.gz) num subdir do job, sem dono do host e sem sair do diretório. */
async function extrairTarball(b64, jobDir) {
  const bytes = Buffer.from(String(b64 || ""), "base64");
  if (bytes.length < 1 || bytes.length > MAX_TARBALL) throw new Error("tarball vazio ou grande demais");
  const repoDir = join(jobDir, "repo");
  await mkdir(repoDir, { recursive: true });
  const tgz = join(jobDir, "src.tgz");
  await writeFile(tgz, bytes, { mode: 0o600 });
  const r = await rodar("tar", ["-xzf", tgz, "-C", repoDir, "--no-same-owner", "--no-same-permissions"], jobDir);
  if (r.code !== 0) throw new Error(`tar falhou: ${r.stderr.slice(0, 500)}`);
  return repoDir;
}

const server = createServer(async (req, res) => {
  const responder = (status, obj) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); };
  try {
    if (req.method === "GET" && req.url === "/health") {
      const g = await rodar("graphify", ["--version"], tmpdir());
      return responder(200, { ok: g.code === 0, graphify: g.code === 0 ? g.stdout.trim() : false, understand: !!UNDERSTAND_CMD });
    }
    if (req.method !== "POST" || req.url !== "/forja") return responder(404, { ok: false, erro: "use POST /forja ou GET /health" });

    const corpo = JSON.parse((await lerCorpo(req)).toString("utf8") || "{}");
    if (!TOKEN || corpo.token !== TOKEN) return responder(401, { ok: false, erro: "token" });

    let engine; try { engine = resolverEngine(corpo.engine); } catch (e) { return responder(400, { ok: false, erro: e.message }); }
    if (engine.bin === "__wrapper__" && !UNDERSTAND_CMD) return responder(503, { ok: false, erro: "engine 'understand' não provisionado nesta box (defina FORJA_UNDERSTAND_CMD)" });
    if (!corpo.repoUrl && !corpo.tarballBase64) return responder(400, { ok: false, erro: "informe repoUrl ou tarballBase64" });

    const jobDir = await mkdtemp(join(tmpdir(), "forja-"));
    try {
      const repoDir = corpo.repoUrl ? await clonarRepo(corpo.repoUrl, jobDir) : await extrairTarball(corpo.tarballBase64, jobDir);

      const { bin, argv } = montarComando(engine, repoDir, corpo.args);
      const ehUnderstand = engine.bin === "__wrapper__";
      const binReal = ehUnderstand ? UNDERSTAND_CMD : bin;
      const r = await rodar(binReal, argv, jobDir, ehUnderstand ? envDoUnderstand() : {});

      // o engine pode escrever a saída relativa ao alvo OU ao cwd do job — tenta os dois (robusto).
      const { base, rel } = caminhoSaida(engine, { cwd: jobDir, repoDir });
      const candidatos = [...new Set([join(base, rel), join(repoDir, rel), join(jobDir, rel)])];
      let grafo;
      for (const p of candidatos) { try { grafo = JSON.parse(await readFile(p, "utf8")); break; } catch { /* tenta o próximo */ } }
      if (!grafo) return responder(502, { ok: false, erro: `engine não produziu ${rel}`, code: r.code, stderr: r.stderr.slice(0, 2000) });
      return responder(200, { ok: r.code === 0, engine: corpo.engine, grafo, stderr: r.stderr ? r.stderr.slice(0, 2000) : undefined });
    } finally { await rm(jobDir, { recursive: true, force: true }).catch(() => {}); }
  } catch (e) { return responder(e?.message?.includes("host não permitido") || e?.message?.includes("url") ? 400 : 500, { ok: false, erro: String(e?.message ?? e).slice(0, 300) }); }
});

server.listen(PORT, HOST, () => console.log(`[forja-bridge] ouvindo ${HOST}:${PORT} (token ${TOKEN ? "ON" : "AUSENTE!"}, engines: ${Object.keys(ENGINES).join(", ")}, understand ${UNDERSTAND_CMD ? "ON" : "off"})`));
