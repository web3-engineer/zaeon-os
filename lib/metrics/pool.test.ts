import { describe, it, expect } from "vitest";
import { porAlvo, taxa429, cooldown, chores, tokensPorChore, custoZero, alertaJson, percentil, type LinhaLedgerPool, type LinhaChore } from "./pool";

const T0 = new Date("2026-10-08T12:00:00Z").getTime();
const L = (min: number, alvo: string | null, ok: boolean, extra: Partial<LinhaLedgerPool> = {}): LinhaLedgerPool => ({
  at: new Date(T0 + min * 60_000 + 1000), agentKey: "aura", surface: "chore", model: "m", alvo, ok, erro: ok ? null : "rate_limit",
  promptTokens: 100, completionTokens: 20, totalTokens: 120, estimatedCostUsd: 0, ms: 500 + min, jsonValido: null, ...extra,
});
// fixture: 4 alvos — gemini-free (2 janelas inteiras em limite), cloudflare ok, groq ok, vertex (linha antiga sem alvo, paga)
const ROWS: LinhaLedgerPool[] = [
  L(0, "gemini-free", false), L(0, "gemini-free", false, { erro: "pool_esgotado" }),
  L(1, "gemini-free", false),
  L(2, "gemini-free", true, { jsonValido: true }), L(2, "gemini-free", false), // janela mista → não conta
  L(3, "gemini-free", true, { jsonValido: false }),
  L(0, "cloudflare", true, { jsonValido: true }), L(1, "cloudflare", true),
  L(0, "groq", true, { totalTokens: 900 }),
  L(0, null, true, { surface: "canal", estimatedCostUsd: 0.01 }),
];

describe("lib/metrics/pool", () => {
  it("porAlvo agrega, ordena e conta linha sem alvo como vertex", () => {
    const a = porAlvo(ROWS);
    expect(a.map((x) => x.alvo)).toEqual(["gemini-free", "cloudflare", "groq", "vertex"]);
    const g = a[0];
    expect(g).toMatchObject({ chamadas: 6, ok: 2, erros: { rate_limit: 3, esgotado: 1, timeout: 0, auth: 0, outro: 0 }, jsonValidoPct: 50 });
    expect(a[3].custoEstimadoUsd).toBe(0.01);
    expect(a[1].jsonValidoPct).toBe(100);
    expect(a[2].jsonValidoPct).toBeNull();
  });
  it("taxa429 por alvo", () => {
    expect(taxa429(ROWS)).toMatchObject({ "gemini-free": 66.7, cloudflare: 0, groq: 0 });
  });
  it("cooldown detecta as 2 janelas inteiras em limite (a mista não conta)", () => {
    expect(cooldown(ROWS)).toMatchObject({ "gemini-free": 2, cloudflare: 0 });
  });
  it("chores por tipo + esgotadas + posts no fio", () => {
    const C: LinhaChore[] = [
      { tipo: "checar_pagina", status: "skipped", chamadasLlm: 0, ms: 300, origemConteudo: "web" },
      { tipo: "checar_pagina", status: "done", chamadasLlm: 1, ms: 2000, origemConteudo: "web", resultado: { alvo: "gemini-free", postado: true } },
      { tipo: "resumir_link", status: "delayed", chamadasLlm: 0, ms: 0, origemConteudo: "web" },
      { tipo: "resumir_link", status: "expired", motivo: "pool_esgotado_expirado", chamadasLlm: 0, ms: 0, origemConteudo: "web" },
    ];
    const r = chores(C);
    expect(r.porTipo.checar_pagina).toMatchObject({ rodadas: 2, done: 1, skipped: 1, llmMedio: 0.5, msP50: 300, msP95: 2000 });
    expect(r.esgotadas).toBe(2); expect(r.postsNoFio).toBe(1);
  });
  it("custoZero: falso quando há chore web servida pelo Vertex (vazou)", () => {
    const alvos = porAlvo(ROWS);
    expect(custoZero(alvos, [{ tipo: "resumir_link", status: "done", chamadasLlm: 1, ms: 1, origemConteudo: "web", resultado: { alvo: "groq" } }])).toEqual({ zero: true, vazamentos: 0, custoPoolUsd: 0 });
    expect(custoZero(alvos, [{ tipo: "resumir_link", status: "done", chamadasLlm: 1, ms: 1, origemConteudo: "web", resultado: { alvo: "vertex" } }]).zero).toBe(false);
    // anexo no Vertex é o CERTO (§8.10) — não é vazamento
    expect(custoZero(alvos, [{ tipo: "classificar_anexo", status: "done", chamadasLlm: 1, ms: 1, origemConteudo: "anexo", resultado: { alvo: "vertex" } }]).zero).toBe(true);
    expect(custoZero(porAlvo([L(0, "groq", true, { estimatedCostUsd: 0.5 })]), []).zero).toBe(false);
  });
  it("tokensPorChore vs 8K TPM e alerta de JSON do primário", () => {
    expect(tokensPorChore(ROWS)).toMatchObject({ tetoTpm: 8000, p95: 900 });
    expect(alertaJson(porAlvo(ROWS))).toMatch(/50% de JSON válido/);
    expect(alertaJson(porAlvo([L(0, "gemini-free", true, { jsonValido: true })]))).toBeNull();
  });
  it("percentil", () => {
    expect(percentil([], 50)).toBeNull();
    expect(percentil([5, 1, 3], 50)).toBe(3);
  });
});
