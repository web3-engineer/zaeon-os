/**
 * Servidor HTTP do motor isolado (Fase 2). Node puro, sem framework. Fica no
 * host de lab fechado; o app fala com ele por POST /pentest com bearer token.
 *
 * Env:
 *   PENTEST_ENGINE_PORT        porta (default 8799)
 *   PENTEST_BRIDGE_TOKEN       token bearer (obrigatório)
 *   PENTEST_SCOPE_PATH         caminho do scope.json (o .sig fica ao lado)
 *   PENTEST_SCOPE_PUBKEY_FILE  arquivo PEM da chave pública do escopo (ou PENTEST_SCOPE_PUBKEY inline)
 *   PENTEST_KILL_SWITCH        caminho do freio (conteúdo RUN libera; inacessível = fail-closed)
 *   PENTEST_AUDIT_PATH         caminho do audit JSONL confiável do motor
 *
 * Sem token, escopo, chave e kill switch válidos, o motor recusa tudo.
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { timingSafeEqual } from "node:crypto";
import { engineAuthorizeAndRun, type EngineConfig, type EngineRequest } from "./engine";

function env(name: string): string | undefined { const v = process.env[name]; return v && v.trim() ? v.trim() : undefined; }
function die(msg: string): never { console.error(`[pentagi-engine] ${msg}`); process.exit(1); }

const port = Number(env("PENTEST_ENGINE_PORT") ?? "8799");
const token = env("PENTEST_BRIDGE_TOKEN") ?? die("falta PENTEST_BRIDGE_TOKEN");
const scopePath = env("PENTEST_SCOPE_PATH") ?? die("falta PENTEST_SCOPE_PATH");
const killSwitchPath = env("PENTEST_KILL_SWITCH") ?? die("falta PENTEST_KILL_SWITCH");
const auditPath = env("PENTEST_AUDIT_PATH") ?? die("falta PENTEST_AUDIT_PATH");
const pubkey = env("PENTEST_SCOPE_PUBKEY_FILE") ? readFileSync(env("PENTEST_SCOPE_PUBKEY_FILE")!, "utf8") : env("PENTEST_SCOPE_PUBKEY");
if (!pubkey) die("falta PENTEST_SCOPE_PUBKEY_FILE (ou PENTEST_SCOPE_PUBKEY)");

const tokenBuf = Buffer.from(token);
function tokenOk(header: string | undefined): boolean {
  const presented = (header ?? "").replace(/^Bearer\s+/i, "");
  const presentedBuf = Buffer.from(presented);
  return presentedBuf.length === tokenBuf.length && timingSafeEqual(presentedBuf, tokenBuf);
}

function loadConfig(): EngineConfig {
  // relê a cada request: escopo/sig/freio podem mudar sem reiniciar o motor
  return {
    scopeJson: readFileSync(scopePath, "utf8"),
    scopeSignature: readFileSync(`${scopePath}.sig`, "utf8").trim(),
    scopePublicKey: pubkey!,
    killSwitchPath,
    auditPath,
  };
}

const server = createServer((reqHttp, res) => {
  const send = (code: number, body: unknown) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
  if (reqHttp.method === "GET" && reqHttp.url === "/health") return send(200, { ok: true, fase: 2, modo: "recon-only" });
  if (reqHttp.method !== "POST" || reqHttp.url !== "/pentest") return send(404, { ok: false, erro: "rota desconhecida" });
  if (!tokenOk(reqHttp.headers.authorization)) return send(401, { ok: false, erro: "token inválido" });

  let raw = "";
  reqHttp.on("data", (c) => { raw += c; if (raw.length > 64 * 1024) reqHttp.destroy(); });
  reqHttp.on("end", async () => {
    let body: EngineRequest;
    try { body = JSON.parse(raw); } catch { return send(400, { ok: false, erro: "JSON inválido" }); }
    try {
      const decision = await engineAuthorizeAndRun(loadConfig(), body);
      send(decision.ok ? 200 : 403, decision);
    } catch (e) {
      send(500, { ok: false, erro: `falha interna: ${String((e as Error)?.message ?? e).slice(0, 160)}` });
    }
  });
});

server.listen(port, "127.0.0.1", () => console.log(`[pentagi-engine] fase 2 (recon-only) em http://127.0.0.1:${port} — escopo ${scopePath}`));
