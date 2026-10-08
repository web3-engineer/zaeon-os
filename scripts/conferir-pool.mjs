#!/usr/bin/env node
/**
 * scripts/conferir-pool.mjs — confere o painel POOL contra a soma CRUA do token_ledger (Fatia 7, G8).
 *   node scripts/conferir-pool.mjs [--range 24h|7d|30d] [--url https://zaeon.com.br --cookie "<cookie admin>"]
 * Soma por ALVO (linha sem alvo = vertex) as chamadas do pool (surface chore OU alvo grátis). Com --url+--cookie
 * baixa GET /api/admin/agents/pool e imprime a DIFERENÇA coluna a coluna (gate: 0). DATABASE_URL do .env.
 */
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
for (const f of [".env", ".env.secrets", ".env.local"]) {
  if (!existsSync(f)) continue;
  for (const l of readFileSync(f, "utf8").split("\n")) { const m = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(l); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2"); }
}
const args = process.argv.slice(2); const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const range = flag("--range") ?? "7d"; const url = flag("--url"); const cookie = flag("--cookie");
const HORAS = { "24h": 24, "7d": 168, "30d": 720 }[range];
if (!HORAS) { console.error("range: 24h | 7d | 30d"); process.exit(2); }
const desde = new Date(Date.now() - HORAS * 3_600_000);
const POOL = ["gemini-free", "cloudflare", "groq", "glm"];

const { PrismaClient } = createRequire(import.meta.url)("@prisma/client");
const prisma = new PrismaClient();
const rows = await prisma.tokenLedger.findMany({ where: { at: { gte: desde }, OR: [{ surface: "chore" }, { alvo: { in: POOL } }] }, select: { alvo: true, ok: true, totalTokens: true, estimatedCostUsd: true } });
await prisma.$disconnect();
const cru = {};
for (const r of rows) { const k = POOL.includes(r.alvo) ? r.alvo : "vertex"; const g = (cru[k] ??= { chamadas: 0, ok: 0, totalTokens: 0, custoEstimadoUsd: 0 }); g.chamadas++; if (r.ok) g.ok++; g.totalTokens += r.totalTokens; g.custoEstimadoUsd += r.estimatedCostUsd; }
for (const g of Object.values(cru)) g.custoEstimadoUsd = Math.round(g.custoEstimadoUsd * 1e6) / 1e6;
const COLS = ["chamadas", "ok", "totalTokens", "custoEstimadoUsd"];
console.log(`# soma crua token_ledger (pool) · range=${range} · ${rows.length} linhas`);
for (const [k, g] of Object.entries(cru)) console.log(k.padEnd(14) + COLS.map((c) => String(g[c]).padStart(14)).join(""));
if (!url) { console.log("\n(passe --url e --cookie pra conferir contra a rota do admin)"); process.exit(0); }
const r = await fetch(`${url.replace(/\/+$/, "")}/api/admin/agents/pool?range=${range}`, { headers: cookie ? { cookie } : {} });
if (!r.ok) { console.error(`rota devolveu HTTP ${r.status}`); process.exit(1); }
const { alvos } = await r.json();
let diffs = 0;
for (const a of alvos) { const c = cru[a.alvo] ?? {}; for (const col of COLS) { const d = Math.abs((a[col] ?? 0) - (c[col] ?? 0)); if (d > 1e-6) { diffs++; console.log(`DIFF ${a.alvo}.${col}: rota=${a[col]} cru=${c[col]}`); } } }
for (const k of Object.keys(cru)) if (!alvos.find((a) => a.alvo === k)) { diffs++; console.log(`DIFF ${k}: no cru, ausente na rota`); }
console.log(diffs ? `\n${diffs} diferença(s).` : "\nDiferença 0 em todas as colunas."); process.exit(diffs ? 1 : 0);
