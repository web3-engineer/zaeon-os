#!/usr/bin/env node
/**
 * scripts/gateway-sonda.mjs — sonda do pool grátis atrás do gateway (Fatia 7, gate do PR-G3).
 *
 *   node scripts/gateway-sonda.mjs                      # 3 chamadas a zaeon-pool-lite
 *   node scripts/gateway-sonda.mjs --n 5 --model zaeon-pool-groq
 *   node scripts/gateway-sonda.mjs --agente aura        # usa GATEWAY_KEY_AURA (a key do agente, com --pool)
 *   npx tsx scripts/gateway-sonda.mjs --como-job        # G4: cada falha passa pela decidir() da fila e imprime
 *                                                       # adiar(até) | expirar | falhar — sem tocar fila nem banco
 *
 * Imprime, por chamada: status · `model` do corpo · header x-litellm-model-id (= o alvo: gemini-free,
 * cloudflare, groq) · ms. Derrubar o primário (key do AI Studio inválida) deve mostrar `cloudflare`.
 * Lê GATEWAY_URL e a key do ambiente/.env. Nunca imprime key. Zero dependências.
 *   npx tsx scripts/gateway-sonda.mjs --agente aura --via-envelope   # G8: chama pelo envelope do app (grava ledger)
 *                                                       # e compara o alvo do ledger com o header do gateway
 * Imprime também x-litellm-call-id.
 */
import { readFileSync, existsSync } from "node:fs";

for (const f of [".env", ".env.secrets", ".env.local"]) {
  if (!existsSync(f)) continue;
  for (const linha of readFileSync(f, "utf8").split("\n")) {
    const m = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(linha);
    if (!m || m[1] in process.env) continue;
    process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}
const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const nomeEnvDaChave = (k) => "GATEWAY_KEY_" + String(k).trim().replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").toUpperCase();

const URL_GW = (flag("--url") ?? process.env.GATEWAY_URL ?? "").replace(/\/+$/, "");
const AGENTE = flag("--agente");
const KEY = flag("--key") ?? (AGENTE ? process.env[nomeEnvDaChave(AGENTE)] : null) ?? process.env.GATEWAY_KEY_DEFAULT ?? process.env.GATEWAY_MASTER_KEY ?? "";
const N = Math.max(1, Math.min(20, Number(flag("--n") ?? 3)));
const MODEL = flag("--model") ?? "zaeon-pool-lite";
const COMO_JOB = args.includes("--como-job");
const VIA_ENVELOPE = args.includes("--via-envelope");
// --como-job importa a decidir() REAL (TS) — por isso roda com tsx (resolve o alias @/ do tsconfig).
const decidir = COMO_JOB ? (await import("../lib/queue/reenfileirar.ts").catch((e) => { console.error("gateway-sonda: --como-job precisa de tsx (npx tsx scripts/gateway-sonda.mjs --como-job):", e?.message); process.exit(2); })).decidir : null;
const expiraEm = new Date(Date.now() + 24 * 60 * 60_000);

if (!URL_GW || !KEY) { console.error("gateway-sonda: preciso de GATEWAY_URL e uma key (GATEWAY_KEY_<AGENTE>, GATEWAY_KEY_DEFAULT ou GATEWAY_MASTER_KEY)."); process.exit(2); }

let falhas = 0;
console.log(`# sonda ${MODEL} × ${N} em ${URL_GW}`);
for (let i = 1; i <= N; i++) {
  const ini = Date.now();
  try {
    const r = await fetch(`${URL_GW}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: "Responda só: ok" }], max_tokens: 8, temperature: 0 }),
      signal: AbortSignal.timeout(45_000),
    });
    const texto = await r.text();
    let j = null; try { j = JSON.parse(texto); } catch { /* não-JSON */ }
    const alvo = r.headers.get("x-litellm-model-id") ?? "—";
    const callId = r.headers.get("x-litellm-call-id") ?? "—";
    const modelo = j?.model ?? "—";
    if (!r.ok) falhas++;
    const erro = r.ok ? "" : `  erro: ${String(j?.error?.message ?? texto).replace(/\s+/g, " ").slice(0, 140)}`;
    console.log(`${String(i).padStart(2)}  HTTP ${r.status}  alvo=${alvo.padEnd(12)} model=${String(modelo).padEnd(34)} call=${callId.slice(0, 12)} ${Date.now() - ini}ms${erro}`);
    if (decidir && !r.ok) {
      const e = Object.assign(new Error(j?.error?.message ?? texto), { status: r.status, body: texto, retryAfter: r.headers.get("retry-after") });
      const d = decidir(e, new Date(), expiraEm, i - 1);
      console.log(`    job → ${d.acao}${d.acao === "adiar" ? " até " + d.ate.toISOString() : d.acao === "falhar" ? " (" + d.classe + ")" : ""}`);
    }
  } catch (e) {
    falhas++;
    console.log(`${String(i).padStart(2)}  FALHOU  ${e?.cause?.code ?? e?.name ?? e?.message}  ${Date.now() - ini}ms`);
  }
}
// G8: a mesma sonda pelo ENVELOPE do app (o caminho real da chore) — o ledger precisa gravar o alvo que o gateway disse.
if (VIA_ENVELOPE) {
  const { gerar } = await import("../lib/llm/envelope.ts").catch((e) => { console.error("gateway-sonda: --via-envelope precisa de tsx:", e?.message); process.exit(2); });
  const linhas = [];
  console.log(`\n# via envelope (${N}×) — ledger × header`);
  for (let i = 1; i <= N; i++) {
    const registrar = async (l) => { linhas.push(l); return true; };
    let header = null;
    const f = async (u, init) => { const r = await fetch(u, init); header = r.headers.get("x-litellm-model-id"); return r; };
    try {
      const r = await gerar({ user: "Responda só: ok", model: MODEL, rota: "gateway", maxOutputTokens: 8, ctx: { agentKey: AGENTE ?? "sistema", surface: "chore" } }, { fetchImpl: f, registrar });
      await new Promise((x) => setTimeout(x, 0));
      const l = linhas[linhas.length - 1];
      const bate = Boolean(l) && l.alvo === header;   // model_info.id do deployment = nome do alvo
      if (!bate) falhas++;
      console.log(`${String(i).padStart(2)}  header=${header ?? "—"}  ledger alvo=${l?.alvo ?? "—"}  ${bate ? "BATE" : "NÃO BATE"}`);
    } catch (e) { falhas++; console.log(`${String(i).padStart(2)}  FALHOU ${e?.classe ?? ""} ${String(e?.message ?? e).slice(0, 120)}`); }
  }
}
process.exit(falhas ? 1 : 0);
