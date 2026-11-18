#!/usr/bin/env node
/**
 * scripts/rea-smoke.mjs — SMOKE-TEST AO VIVO da camada executora do REA contra o MOTOR DE VERDADE.
 *
 * Os testes de vitest provam a orquestração contra um motor-mock (sem segredo, roda no CI). ISTO fala com o
 * motor real (Ghidra/JEB na infra) — por isso fica fora do CI, atrás das credenciais do ambiente. Rode onde o
 * motor está ligado (staging/prod, ou um ambiente com REA_BRIDGE_URL/TOKEN):
 *
 *   OCTA_REA=1 REA_BRIDGE_URL=... REA_BRIDGE_TOKEN=... node scripts/rea-smoke.mjs --apk ./meu.apk
 *   OCTA_REA=1 REA_BRIDGE_URL=... REA_BRIDGE_TOKEN=... node scripts/rea-smoke.mjs --url https://exemplo.com
 *   (sem --apk/--url usa o fixture lib/rea-blueprint/fixtures/exemplo.apk — vai bem pouco, só prova o canal)
 *
 * O token sai do ambiente — NUNCA passe em argumento nem cole no chat. Espelha chamarRea/uploadRea de lib/octa/rea.ts.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)));
const { OCTA_REA, REA_BRIDGE_URL, REA_BRIDGE_TOKEN } = process.env;

function arg(nome) { const i = process.argv.indexOf(nome); return i > -1 ? process.argv[i + 1] : null; }
const comandoDeArtefato = (n) => (/\.(apk|aab|xapk)$/i.test(n) ? "inspect-android-package" : /\.wasm$/i.test(n) ? "inspect-wasm-artifact" : /\.(pcap|pcapng)$/i.test(n) ? "inspect-packet-capture" : "analyze");

async function main() {
  if (OCTA_REA !== "1" || !REA_BRIDGE_URL?.trim() || !REA_BRIDGE_TOKEN?.trim()) {
    console.error("✗ motor do REA não configurado. Defina OCTA_REA=1 + REA_BRIDGE_URL + REA_BRIDGE_TOKEN (o token só no ambiente).");
    process.exit(2);
  }
  const base = REA_BRIDGE_URL.trim().replace(/\/+$/, "");
  const token = REA_BRIDGE_TOKEN.trim();
  const url = arg("--url");
  const apk = arg("--apk");

  let command, body;
  if (url) {
    command = "analyze-web-bundle";
    body = { token, command, args: [url], json: true };
    console.log(`→ ${command} ${url}`);
  } else {
    const caminho = apk || join(RAIZ, "lib/rea-blueprint/fixtures/exemplo.apk");
    const bytes = readFileSync(caminho);
    command = comandoDeArtefato(caminho);
    console.log(`→ upload ${caminho} (${bytes.length} bytes) → ${command}`);
    const up = await fetch(`${base}/upload`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, artifactName: caminho.split("/").pop(), artifactBase64: bytes.toString("base64") }) });
    const uj = await up.json().catch(() => ({}));
    if (!up.ok || !uj.handle) { console.error("✗ upload falhou:", uj.erro ?? up.status); process.exit(1); }
    console.log(`  handle: ${uj.handle}`);
    body = { token, command, handle: uj.handle, json: true };
  }

  const t0 = Date.now();
  const r = await fetch(`${base}/rea`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(12 * 60_000) });
  const j = await r.json().catch(() => ({}));
  const ms = Date.now() - t0;
  if (!r.ok || j.ok === false) { console.error(`✗ ${command} falhou (${ms}ms):`, j.erro ?? j.stderr ?? `HTTP ${r.status}`); process.exit(1); }
  const evid = j.evidence !== undefined ? JSON.stringify(j.evidence) : (j.stdout ?? "");
  console.log(`✓ ${command} OK em ${ms}ms — evidência: ${evid.length} chars`);
  console.log(evid.slice(0, 1200) + (evid.length > 1200 ? "\n… (truncado)" : ""));
}

main().catch((e) => { console.error("✗ erro:", e?.message ?? e); process.exit(1); });
