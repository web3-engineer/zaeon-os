#!/usr/bin/env node
/**
 * scripts/gateway-keys.mjs — virtual keys por agente no LiteLLM (contrato C6, PR-G2).
 *
 *   node scripts/gateway-keys.mjs                        # roster (personas + MENTOR_SEED) → 1 key por agente
 *   node scripts/gateway-keys.mjs --agents aura,medicina # só estes
 *   node scripts/gateway-keys.mjs --budget 0.01          # USD/dia (default 0.50)
 *   node scripts/gateway-keys.mjs --revoke medicina      # POST /key/delete
 *   node scripts/gateway-keys.mjs --ambiente prod        # key_alias = agent:<agentKey>:<ambiente> (default: NODE_ENV|dev)
 *   node scripts/gateway-keys.mjs --models zaeon-flash,zaeon-pro   # allowlist (default: + zaeon-hf-* e zaeon-reserva-google)
 *   node scripts/gateway-keys.mjs --pool aura,medicina   # Fatia 7: acrescenta zaeon-pool-lite/-cerebras/-cf/-groq + zaeon-reserva-google à allowlist
 *                                                        # da key EXISTENTE (ou cria) desses agentes. Nunca 2ª key.
 *
 * Lê GATEWAY_URL e GATEWAY_MASTER_KEY do ambiente/.env. IDEMPOTENTE por key_alias: existe → /key/update,
 * senão → /key/generate. Saída = tabela `GATEWAY_KEY_<NOME>=<key>` para COLAR no .env do VPS.
 * NUNCA grava o .env sozinho. NUNCA imprime a master key. Uma key por agente e por ambiente (handoff §8.11).
 */
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

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
const URL_GW = (flag("--url") ?? process.env.GATEWAY_URL ?? "").replace(/\/+$/, "");
const MASTER = flag("--key") ?? process.env.GATEWAY_MASTER_KEY ?? "";
const BUDGET = Number(flag("--budget") ?? 0.5);
const AMBIENTE = flag("--ambiente") ?? process.env.NODE_ENV ?? "dev";
const DURATION = flag("--duration") ?? "90d";
// Grupos do pool grátis (= GRUPOS_POOL em lib/llm/pool.ts). zaeon-pool-glm fica fora: off por padrão (§5.2).
// zaeon-reserva-google: o fallback do pool (Vertex flash-lite) — a key precisa enxergar o grupo do fallback.
export const GRUPOS_POOL = ["zaeon-pool-lite", "zaeon-pool-cerebras", "zaeon-pool-cf", "zaeon-pool-groq", "zaeon-reserva-google"];
const POOL = flag("--pool");
// zaeon-hf-* (LLM_PRIMARIO=hf, 2026-11-21) + os grupos da cadeia de fallback deles: a key precisa enxergar o fallback.
const MODELS_BASE = (flag("--models") ?? "zaeon-flash,zaeon-pro,zaeon-hf-flash,zaeon-hf-flash-groq,zaeon-hf-pro,zaeon-reserva-google").split(",").map((s) => s.trim()).filter(Boolean);
const MODELS = POOL ? [...new Set([...MODELS_BASE, ...GRUPOS_POOL])] : MODELS_BASE;
const REVOKE = flag("--revoke");
const JSON_OUT = args.includes("--json");

if (!URL_GW || !MASTER) { console.error("gateway-keys: preciso de GATEWAY_URL e GATEWAY_MASTER_KEY (env/.env ou --url/--key)."); process.exit(2); }

export const nomeEnvDaChave = (agentKey) => "GATEWAY_KEY_" + String(agentKey).trim().replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").toUpperCase();
const alias = (agentKey) => `agent:${agentKey}:${AMBIENTE}`;

async function api(path, body, method = "POST") {
  const r = await fetch(`${URL_GW}${path}`, { method, headers: { Authorization: `Bearer ${MASTER}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20_000) });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { /* texto */ }
  return { ok: r.ok, status: r.status, json: j, texto: t };
}

/** roster: personas (lib/ai/personas.ts) + MENTOR_SEED (lib/agent/mentors.ts) via tsx — sem banco, sem segredo. */
function rosterPadrao() {
  try {
    const out = execSync(`npx tsx -e 'import {PERSONAS} from "./lib/ai/personas"; import {MENTOR_SEED} from "./lib/agent/mentors"; console.log(JSON.stringify([...Object.keys(PERSONAS), ...MENTOR_SEED.map(m=>m.slug)]))'`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    const arr = JSON.parse(out.trim().split("\n").pop());
    return [...new Set(arr)].filter((k) => /^[a-z0-9][a-z0-9_-]*$/.test(k));
  } catch (e) {
    console.error("gateway-keys: não consegui ler o roster via tsx — passe --agents a,b,c.", e?.message?.slice(0, 80));
    process.exit(2);
  }
}

async function infoPorAlias(a) {
  // /key/info aceita ?key=<alias>? Não — aceita key ou key_alias em versões recentes; tentamos as duas formas.
  let r = await api(`/key/info?key_alias=${encodeURIComponent(a)}`, null, "GET");
  if (r.ok && r.json?.info) return r.json.info;
  r = await api(`/key/list?key_alias=${encodeURIComponent(a)}&return_full_object=true`, null, "GET");
  const lista = r.json?.keys ?? r.json ?? [];
  const hit = Array.isArray(lista) ? lista.find((k) => (k?.key_alias ?? k) === a) : null;
  return hit && typeof hit === "object" ? hit : null;
}

async function garantir(agentKey) {
  const a = alias(agentKey);
  const existente = await infoPorAlias(a);
  // --pool: une à allowlist que a key JÁ tem (idempotente por alias; não perde modelo dado antes).
  const models = POOL && Array.isArray(existente?.models) ? [...new Set([...existente.models, ...MODELS])] : MODELS;
  const corpo = { key_alias: a, max_budget: BUDGET, budget_duration: "1d", models, duration: DURATION, metadata: { agentKey, ambiente: AMBIENTE, origem: "scripts/gateway-keys.mjs" } };
  if (existente) {
    const r = await api("/key/update", { key: existente.token ?? existente.key ?? existente.key_name, ...corpo });
    return { agentKey, alias: a, acao: r.ok ? "atualizada" : `erro_update_${r.status}`, key: null, detalhe: r.ok ? null : r.texto.slice(0, 160) };
  }
  const r = await api("/key/generate", corpo);
  if (!r.ok) return { agentKey, alias: a, acao: `erro_generate_${r.status}`, key: null, detalhe: r.texto.slice(0, 160) };
  return { agentKey, alias: a, acao: "criada", key: r.json?.key ?? null, detalhe: null };
}

async function revogar(agentKey) {
  const a = alias(agentKey);
  const r = await api("/key/delete", { key_aliases: [a] });
  if (r.ok) return { agentKey, alias: a, acao: "revogada" };
  const ex = await infoPorAlias(a);
  if (ex) { const r2 = await api("/key/delete", { keys: [ex.token ?? ex.key] }); if (r2.ok) return { agentKey, alias: a, acao: "revogada" }; }
  return { agentKey, alias: a, acao: `erro_delete_${r.status}`, detalhe: r.texto.slice(0, 160) };
}

async function main() {
  if (REVOKE) {
    const res = await revogar(REVOKE);
    console.log(JSON_OUT ? JSON.stringify(res) : `${res.agentKey}  ${res.alias}  ${res.acao}${res.detalhe ? "  — " + res.detalhe : ""}`);
    process.exit(res.acao === "revogada" ? 0 : 1);
  }
  const lista = POOL ?? flag("--agents");
  const agentes = (lista ? lista.split(",").map((s) => s.trim()).filter(Boolean) : rosterPadrao());
  const resultados = [];
  for (const k of agentes) resultados.push(await garantir(k));
  if (JSON_OUT) { console.log(JSON.stringify({ ambiente: AMBIENTE, budgetUsdDia: BUDGET, models: MODELS, resultados: resultados.map((r) => ({ ...r, key: r.key ? "<gerada>" : null })) }, null, 2)); }
  else {
    console.log(`# ambiente=${AMBIENTE} budget=${BUDGET} USD/dia models=${MODELS.join(",")}`);
    for (const r of resultados) console.log(`# ${r.agentKey.padEnd(20)} ${r.alias.padEnd(34)} ${r.acao}${r.detalhe ? "  — " + r.detalhe : ""}`);
    const novas = resultados.filter((r) => r.key);
    if (novas.length) { console.log("\n# COLE no .env do VPS (keys só aparecem na criação; 'atualizada' não reemite):"); for (const r of novas) console.log(`${nomeEnvDaChave(r.agentKey)}=${r.key}`); }
  }
  process.exit(resultados.some((r) => r.acao.startsWith("erro")) ? 1 : 0);
}
main().catch((e) => { console.error("gateway-keys: erro inesperado:", e?.message ?? e); process.exit(2); });
