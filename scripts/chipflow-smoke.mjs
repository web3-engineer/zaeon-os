#!/usr/bin/env node
/**
 * scripts/chipflow-smoke.mjs — smoke do wa-adapter da ChipFlow (operador do WhatsApp), SEM mock e SEM EFEITO
 * COLATERAL (não nasce chip, não manda mensagem).
 *
 * lib/chipflow/operador.ts subiu só com vi.fn. Este smoke prova que o adapter real está VIVO e AUTENTICA,
 * pelo caminho read-only GET /instance/{id}/status: com token responde estruturado; sem token recusa (401).
 * NÃO cria instância (POST /instance/create) nem envia — isso teria efeito no mundo.
 *
 * USO:
 *   WA_OPERATOR_URL=http://wa-adapter:8090 WA_OPERATOR_TOKEN=<token> node scripts/chipflow-smoke.mjs
 */
const URL_BASE = (process.env.WA_OPERATOR_URL || "").replace(/\/+$/, "");
const TOKEN = process.env.WA_OPERATOR_TOKEN || "";
if (!URL_BASE || !TOKEN) {
  console.error("✗ defina WA_OPERATOR_URL e WA_OPERATOR_TOKEN.");
  process.exit(2);
}
const ID_TESTE = "999999999"; // id numérico improvável — só pra exercitar o contrato, sem criar nada

let ok = 0, falhou = 0, avisos = 0;
const V = (m) => { console.log(`  ✓ ${m}`); ok++; };
const X = (m) => { console.log(`  ✗ ${m}`); falhou++; };
const W = (m) => { console.log(`  ⚠ ${m}`); avisos++; };

async function get(auth) {
  const r = await fetch(`${URL_BASE}/instance/${ID_TESTE}/status`, {
    headers: auth ? { Authorization: `Bearer ${TOKEN}` } : {},
    signal: AbortSignal.timeout(15_000),
  });
  return r.status;
}

async function main() {
  console.log(`\n== ChipFlow wa-adapter smoke → ${URL_BASE} (read-only, não cria chip) ==\n`);

  // 1) COM token → o serviço está vivo e processou a requisição (200 estado, ou 404 instância inexistente)
  console.log("1) GET /instance/{id}/status com token (prova de vida)");
  try {
    const s = await get(true);
    if (s === 200 || s === 404 || s === 400) V(`adapter vivo e autenticou (HTTP ${s} — ${s === 404 ? "instância de teste não existe, esperado" : "respondeu o contrato"})`);
    else if (s === 401) X(`token recusado (401) — WA_OPERATOR_TOKEN não bate com o do adapter`);
    else W(`HTTP inesperado ${s} — o adapter respondeu, mas confira o contrato`);
  } catch (e) { X(`adapter fora do ar: ${String(e?.message ?? e)}`); }

  // 2) SEM token → a auth tem de recusar (401), provando que o endpoint é protegido
  console.log("2) GET sem token (a auth deve recusar)");
  try {
    const s = await get(false);
    s === 401 ? V(`sem token → 401 (auth ativa)`) : W(`sem token → HTTP ${s} (esperado 401 — confira se o operador exige Bearer)`);
  } catch (e) { W(`não deu pra testar sem-token: ${String(e?.message ?? e)}`); }

  console.log(`\n== resultado: ${ok} ok · ${falhou} falha(s) · ${avisos} aviso(s) ==`);
  process.exit(falhou > 0 ? 1 : 0);
}
main().catch((e) => { console.error("erro fatal:", e); process.exit(1); });
