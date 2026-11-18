#!/usr/bin/env node
/**
 * scripts/quality-smoke.mjs — smoke END-TO-END do quality-engine (Termômetro Acadêmico), SEM mock.
 *
 * lib/quality/scoreClient.ts subiu só com vi.fn (scoreClient.test.ts). Este smoke bate no motor Python real
 * (POST /score) com um ScoreRequest golden e confere que volta um ScoreResponse coerente (banda + score).
 *
 * USO:
 *   QUALITY_ENGINE_URL=http://localhost:8003 node scripts/quality-smoke.mjs
 */
const URL_BASE = (process.env.QUALITY_ENGINE_URL || "").replace(/\/+$/, "");
if (!URL_BASE) {
  console.error("✗ defina QUALITY_ENGINE_URL (ex.: http://localhost:8003).");
  process.exit(2);
}
const BANDAS = ["ruim", "aceitavel", "bom", "muito_bom", "excepcional"];

// ScoreRequest golden (lib/quality/types.ts): um mini-artigo plausível.
const GOLDEN = {
  title: "Impacto de redes neurais em diagnóstico por imagem",
  work_type: "Artigo",
  academic_level: "grad",
  sections: [
    { type: "introducao", title: "Introdução", content: "Este trabalho investiga como redes neurais convolucionais melhoram a acurácia de diagnósticos por imagem médica. A hipótese central é que a arquitetura profunda captura padrões sutis que escapam ao olho humano." },
    { type: "metodologia", title: "Metodologia", content: "Treinamos uma CNN com 10 mil imagens rotuladas, divididas em 80% treino e 20% teste, medindo acurácia, sensibilidade e especificidade." },
  ],
};

let ok = 0, falhou = 0;
const V = (m) => { console.log(`  ✓ ${m}`); ok++; };
const X = (m) => { console.log(`  ✗ ${m}`); falhou++; };

async function main() {
  console.log(`\n== Quality smoke → ${URL_BASE} ==\n`);
  console.log("1) POST /score ← artigo golden");
  try {
    const r = await fetch(`${URL_BASE}/score`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(GOLDEN), signal: AbortSignal.timeout(60_000),
    });
    if (!r.ok) { X(`motor respondeu HTTP ${r.status}: ${(await r.text().catch(() => "")).slice(0, 200)}`); }
    else {
      const j = await r.json().catch(() => ({}));
      V(`motor vivo e respondeu 200`);
      BANDAS.includes(j?.overall?.band) ? V(`overall.band válido: "${j.overall.band}"`) : X(`overall.band ausente/inválido: ${JSON.stringify(j?.overall)}`);
      typeof j?.overall?.score === "number" ? V(`overall.score numérico: ${j.overall.score}`) : X(`overall.score não-numérico`);
      Array.isArray(j?.sections) ? V(`${j.sections.length} seção(ões) pontuada(s)`) : X(`sections ausente`);
    }
  } catch (e) { X(`motor fora do ar: ${String(e?.message ?? e)}`); }

  console.log(`\n== resultado: ${ok} ok · ${falhou} falha(s) ==`);
  process.exit(falhou > 0 ? 1 : 0);
}
main().catch((e) => { console.error("erro fatal:", e); process.exit(1); });
