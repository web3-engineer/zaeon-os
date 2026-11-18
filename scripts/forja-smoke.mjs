#!/usr/bin/env node
/**
 * scripts/forja-smoke.mjs — smoke END-TO-END do motor Forja (graphify), SEM mock.
 *
 * O engineClient (lib/forja/engineClient.ts) é o gêmeo do REA, mas subiu só com fetch mockado
 * (engineClient.test.ts). Este smoke prova a ponte real: /health + /forja (graphify) num repo golden,
 * conferindo que sai o grafo no shape que os adaptadores (lib/forja/adaptadores) esperam.
 *
 * USO (no app server, que roda a ponte em 127.0.0.1:8800):
 *   FORJA_BRIDGE_URL=http://127.0.0.1:8800 FORJA_BRIDGE_TOKEN=<token do motor> \
 *     node scripts/forja-smoke.mjs [owner/repo]
 *   • sem repo → usa o golden WebDevSimplified/react-todo-list (grafo real já provado: App(), addTodo()).
 */
const URL_BASE = (process.env.FORJA_BRIDGE_URL || "").replace(/\/+$/, "");
const TOKEN = process.env.FORJA_BRIDGE_TOKEN || "";
const REPO = process.argv[2] || "WebDevSimplified/react-todo-list";

if (!URL_BASE || !TOKEN) {
  console.error("✗ defina FORJA_BRIDGE_URL e FORJA_BRIDGE_TOKEN.");
  console.error("  ex.: FORJA_BRIDGE_URL=http://127.0.0.1:8800 FORJA_BRIDGE_TOKEN=... node scripts/forja-smoke.mjs");
  process.exit(2);
}
if (!/^[\w.-]+\/[\w.-]+$/.test(REPO)) { console.error(`✗ repo inválido: ${REPO} (use owner/nome)`); process.exit(2); }

let ok = 0, falhou = 0, avisos = 0;
const V = (m) => { console.log(`  ✓ ${m}`); ok++; };
const X = (m) => { console.log(`  ✗ ${m}`); falhou++; };
const W = (m) => { console.log(`  ⚠ ${m}`); avisos++; };

async function main() {
  console.log(`\n== Forja smoke → ${URL_BASE} (repo: ${REPO}) ==\n`);

  // 1) HEALTH
  console.log("1) /health");
  try {
    const r = await fetch(`${URL_BASE}/health`, { signal: AbortSignal.timeout(15_000) });
    const h = await r.json().catch(() => ({}));
    h?.ok ? V(`motor vivo (graphify=${h.graphify ?? "?"}, understand=${h.understand ?? "?"})`) : X(`/health não ok: ${JSON.stringify(h)}`);
  } catch (e) { X(`/health inacessível: ${String(e?.message ?? e)}`); }

  // 2) /forja graphify no repo golden → grafo real
  console.log(`2) /forja graphify ← ${REPO}`);
  try {
    const r = await fetch(`${URL_BASE}/forja`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: TOKEN, engine: "graphify", repoUrl: `https://github.com/${REPO}` }),
      signal: AbortSignal.timeout(180_000),
    });
    const j = await r.json().catch(() => ({}));
    if (r.status !== 200 || !j?.ok) {
      X(`análise falhou: HTTP ${r.status} ${(j?.erro || j?.stderr || "").toString().slice(0, 200)}`);
    } else {
      V(`motor rodou e devolveu ok`);
      const g = j.grafo || {};
      const nos = g.nodes?.length ?? g.nos?.length ?? 0;
      nos > 0 ? V(`grafo com ${nos} nós (${(g.links?.length ?? g.arestas?.length ?? 0)} conexões)`) : X("grafo vazio — o motor rodou mas não mapeou nada");
      // shape que os adaptadores esperam (graphifyParaGrafo lê nodes[].id)
      const n0 = (g.nodes || g.nos || [])[0];
      n0 && typeof n0.id === "string"
        ? V(`shape ok: cada nó tem id string (ex.: "${String(n0.id).slice(0, 40)}")`)
        : W(`nó sem campo id string — o adaptador graphifyParaGrafo descartaria (shape: ${JSON.stringify(Object.keys(n0 || {}))})`);
    }
  } catch (e) { X(`erro na análise: ${String(e?.message ?? e)}`); }

  console.log(`\n== resultado: ${ok} ok · ${falhou} falha(s) · ${avisos} aviso(s) ==`);
  process.exit(falhou > 0 ? 1 : 0);
}
main().catch((e) => { console.error("erro fatal:", e); process.exit(1); });
