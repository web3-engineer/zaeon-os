/**
 * infra/rea-engine/bridge.mjs — a PONTE fina entre o Octa (no VPS) e o REA (aqui, na Contabo). HTTP → CLI do REA.
 * Só na Tailscale (bind 0.0.0.0 dentro do container; o compose publica só na IP da Tailscale), token obrigatório.
 * NÃO é um shell remoto: só comandos do REA, da allowlist; o artefato vem no corpo e é escrito num diretório
 * temporário; nada de caminho do host. REA já recusa DRM/anti-cheat/auth/pirataria (DISCLAIMER do REA).
 *
 *   POST /rea  { token, command, args?: string[], artifactBase64?, artifactName?, json?: true }
 *     → { ok, code, stdout, stderr, evidence? }   (evidence = stdout parseado quando --json)
 *   GET  /health → { ok, rea, ghidra }
 */
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PORT = Number(process.env.REA_BRIDGE_PORT || 8799);
const TOKEN = process.env.REA_BRIDGE_TOKEN || "";
const MAX_BYTES = Number(process.env.REA_MAX_ARTIFACT_BYTES || 256 * 1024 * 1024); // 256 MB
const TIMEOUT_MS = Number(process.env.REA_CMD_TIMEOUT_MS || 10 * 60_000);

// A superfície: o REA tem ~155 comandos. Esta fatia libera a ANÁLISE ESTÁTICA/leitura (1:1 com o catálogo do REA)
// e NEGA as famílias com efeito colateral — rodar/observar/tracejar programas, controlar device (adb), debug
// interativo, e mudar o host (setup/update/uninstall/import/annotate). Essas pedem autorização por-ação (fatia
// futura). O catálogo vem do próprio `rea --help` no boot: nada de lista decorada que envelhece.
const DENY_PREFIXOS = ["capture-", "observe-", "trace", "debug-", "start-adb", "stop-adb", "push-", "pull-", "read-adb", "resolve-adb", "inspect-adb", "uninstall", "collect-adb", "import-", "open-jeb", "execute-", "cutter-", "annotate-", "decompile-jeb", "inspect-jeb", "discover-webmcp", "reconcile-javascript-runtime"];
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
  req.on("data", (c) => { n += c.length; if (n > MAX_BYTES + 1_000_000) { req.destroy(); erro(new Error("corpo grande demais")); } else pedacos.push(c); });
  req.on("end", () => ok(Buffer.concat(pedacos)));
  req.on("error", erro);
});

function rodarRea(args, cwd) {
  return new Promise((ok) => {
    const p = spawn("rea", args, { cwd, env: process.env });
    let out = "", err = ""; const to = setTimeout(() => p.kill("SIGKILL"), TIMEOUT_MS);
    p.stdout.on("data", (d) => { out += d; if (out.length > 32 * 1024 * 1024) p.kill("SIGKILL"); });
    p.stderr.on("data", (d) => { err += d; });
    p.on("close", (code) => { clearTimeout(to); ok({ code: code ?? -1, stdout: out, stderr: err.slice(0, 20_000) }); });
    p.on("error", (e) => { clearTimeout(to); ok({ code: -1, stdout: "", stderr: String(e?.message ?? e) }); });
  });
}

const server = createServer(async (req, res) => {
  const responder = (status, obj) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); };
  try {
    if (req.method === "GET" && req.url === "/health") {
      const r = await rodarRea(["--version"], "/work");
      return responder(200, { ok: r.code === 0, rea: r.stdout.trim(), ghidra: !!process.env.GHIDRA_INSTALL_DIR });
    }
    if (req.method !== "POST" || req.url !== "/rea") return responder(404, { ok: false, erro: "use POST /rea ou GET /health" });
    const corpo = JSON.parse((await lerCorpo(req)).toString("utf8") || "{}");
    if (!TOKEN || corpo.token !== TOKEN) return responder(401, { ok: false, erro: "token" });
    const command = String(corpo.command || "");
    if (!permitido(command)) return responder(400, { ok: false, erro: CATALOGO.has(command) ? `comando com efeito colateral desligado nesta ponte: ${command}` : `comando não é do REA: ${command}` });
    const extra = Array.isArray(corpo.args) ? corpo.args.map(String).filter((a) => a.length < 4096) : [];
    const dir = await mkdtemp(join(tmpdir(), "rea-"));
    try {
      let alvo = [];
      if (corpo.artifactBase64) {
        const bytes = Buffer.from(corpo.artifactBase64, "base64");
        if (bytes.length > MAX_BYTES) return responder(413, { ok: false, erro: "artefato grande demais" });
        const nome = String(corpo.artifactName || "artifact").replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120) || "artifact";
        const caminho = join(dir, nome);
        await writeFile(caminho, bytes);
        alvo = [caminho];
      }
      const args = [command, ...alvo, ...extra, ...(corpo.json !== false ? ["--json"] : [])];
      const r = await rodarRea(args, dir);
      let evidence; if (corpo.json !== false) { try { evidence = JSON.parse(r.stdout); } catch { /* não-JSON */ } }
      return responder(200, { ok: r.code === 0, code: r.code, stdout: evidence ? undefined : r.stdout.slice(0, 2_000_000), stderr: r.stderr, evidence });
    } finally { await rm(dir, { recursive: true, force: true }).catch(() => {}); }
  } catch (e) { return responder(500, { ok: false, erro: String(e?.message ?? e).slice(0, 300) }); }
});
await carregarCatalogo();
server.listen(PORT, "0.0.0.0", () => console.log(`[rea-bridge] ouvindo :${PORT} (token ${TOKEN ? "ON" : "AUSENTE!"}, ghidra ${process.env.GHIDRA_INSTALL_DIR ? "ON" : "off"}, ${CATALOGO.size} comandos no catálogo)`));
