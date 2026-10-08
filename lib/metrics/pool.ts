/**
 * lib/metrics/pool.ts — telemetria do pool grátis (Fatia 7, G8). PURO (fixture em pool.test.ts).
 * Fonte: TokenLedger (alvo, erro, ms, jsonValido) + AgentChore (status, tipo, LLM, ms, resultado.alvo).
 * Linha sem `alvo` = anterior à Fatia 7 → conta como "vertex". Cooldown e 429 vêm do ledger
 * (o /metrics do LiteLLM é enterprise — §5.11). Provedor que não declara cota = null, nunca 0.
 */
import { TETOS_DIA, type Alvo } from "@/lib/llm/pool";

export type RangePool = "24h" | "7d" | "30d";
export const RANGES_POOL: readonly RangePool[] = ["24h", "7d", "30d"];
export const rangePoolValido = (r: unknown): r is RangePool => (RANGES_POOL as readonly string[]).includes(String(r));
const H = 3_600_000;
export const desdePool = (r: RangePool, agora = new Date()) => new Date(agora.getTime() - (r === "24h" ? 24 : r === "7d" ? 168 : 720) * H);

export type LinhaLedgerPool = {
  at: Date | string; agentKey: string; surface: string; model: string; alvo?: string | null; ok: boolean; erro?: string | null;
  promptTokens: number; completionTokens: number; totalTokens: number; estimatedCostUsd: number; ms?: number | null; jsonValido?: boolean | null;
};
export type LinhaChore = {
  tipo: string; status: string; motivo?: string | null; chamadasLlm: number; ms: number; origemConteudo: string;
  resultado?: { alvo?: string | null; postado?: boolean | null } | null;
};

export type Erros = { rate_limit: number; esgotado: number; timeout: number; auth: number; outro: number };
export type PorAlvo = {
  alvo: Alvo; chamadas: number; ok: number; erros: Erros; promptTokens: number; completionTokens: number; totalTokens: number;
  custoEstimadoUsd: number; p50Ms: number | null; p95Ms: number | null; jsonValidoPct: number | null;
};

const ALVOS: readonly Alvo[] = ["gemini-free", "cloudflare", "groq", "glm", "vertex"];
export const alvoDaLinha = (r: { alvo?: string | null }): Alvo => ((ALVOS as readonly string[]).includes(String(r.alvo)) ? (r.alvo as Alvo) : "vertex");
const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** Percentil (nearest-rank) de uma lista numérica; vazia → null. */
export function percentil(xs: number[], p: number): number | null {
  const v = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  return v[Math.min(v.length - 1, Math.max(0, Math.ceil((p / 100) * v.length) - 1))];
}

function bucketErro(e: string | null | undefined): keyof Erros {
  if (e === "rate_limit" || e === "cota_esgotada") return "rate_limit";
  if (e === "pool_esgotado") return "esgotado";
  if (e === "timeout") return "timeout";
  if (e === "auth" || e === "credito") return "auth";
  return "outro";
}
const ehLimite = (e: string | null | undefined) => e === "rate_limit" || e === "cota_esgotada" || e === "pool_esgotado";

export function porAlvo(rows: LinhaLedgerPool[]): PorAlvo[] {
  const map = new Map<Alvo, { g: PorAlvo; ms: number[]; json: boolean[] }>();
  for (const r of rows) {
    const alvo = alvoDaLinha(r);
    const e = map.get(alvo) ?? { g: { alvo, chamadas: 0, ok: 0, erros: { rate_limit: 0, esgotado: 0, timeout: 0, auth: 0, outro: 0 }, promptTokens: 0, completionTokens: 0, totalTokens: 0, custoEstimadoUsd: 0, p50Ms: null, p95Ms: null, jsonValidoPct: null }, ms: [], json: [] };
    e.g.chamadas++;
    if (r.ok) { e.g.ok++; if (typeof r.ms === "number") e.ms.push(r.ms); } else e.g.erros[bucketErro(r.erro)]++;
    e.g.promptTokens += r.promptTokens; e.g.completionTokens += r.completionTokens; e.g.totalTokens += r.totalTokens;
    e.g.custoEstimadoUsd += r.estimatedCostUsd || 0;
    if (r.ok && typeof r.jsonValido === "boolean") e.json.push(r.jsonValido);
    map.set(alvo, e);
  }
  return [...map.values()].map(({ g, ms, json }) => ({
    ...g, custoEstimadoUsd: r6(g.custoEstimadoUsd), p50Ms: percentil(ms, 50), p95Ms: percentil(ms, 95),
    jsonValidoPct: json.length ? Math.round((json.filter(Boolean).length / json.length) * 1000) / 10 : null,
  })).sort((a, b) => ALVOS.indexOf(a.alvo) - ALVOS.indexOf(b.alvo));
}

/** % de chamadas que bateram em limite (429/cota/esgotado), por alvo. */
export function taxa429(rows: LinhaLedgerPool[]): Partial<Record<Alvo, number>> {
  const out: Partial<Record<Alvo, number>> = {};
  for (const g of porAlvo(rows)) {
    const lim = rows.filter((r) => alvoDaLinha(r) === g.alvo && !r.ok && ehLimite(r.erro)).length;
    out[g.alvo] = g.chamadas ? Math.round((lim / g.chamadas) * 1000) / 10 : 0;
  }
  return out;
}

/** Minutos (janelas de 60s) em que TODAS as chamadas do alvo bateram em limite. */
export function cooldown(rows: LinhaLedgerPool[]): Partial<Record<Alvo, number>> {
  const janelas = new Map<string, { total: number; limite: number }>();
  for (const r of rows) {
    const k = `${alvoDaLinha(r)}|${Math.floor(new Date(r.at).getTime() / 60_000)}`;
    const j = janelas.get(k) ?? { total: 0, limite: 0 };
    j.total++; if (!r.ok && ehLimite(r.erro)) j.limite++;
    janelas.set(k, j);
  }
  const out: Partial<Record<Alvo, number>> = {};
  for (const [k, j] of janelas) {
    const alvo = k.split("|")[0] as Alvo;
    out[alvo] = (out[alvo] ?? 0) + (j.total > 0 && j.limite === j.total ? 1 : 0);
  }
  return out;
}

export type PorTipo = { rodadas: number; done: number; skipped: number; failed: number; delayed: number; expired: number; llmMedio: number; msP50: number | null; msP95: number | null };
export function chores(rows: LinhaChore[]): { porTipo: Record<string, PorTipo>; esgotadas: number; postsNoFio: number } {
  const porTipo: Record<string, PorTipo> = {};
  const ms: Record<string, number[]> = {}, llm: Record<string, number[]> = {};
  let esgotadas = 0, postsNoFio = 0;
  for (const c of rows) {
    const t = (porTipo[c.tipo] ??= { rodadas: 0, done: 0, skipped: 0, failed: 0, delayed: 0, expired: 0, llmMedio: 0, msP50: null, msP95: null });
    t.rodadas++;
    if (c.status in t && c.status !== "rodadas") (t as any)[c.status]++;
    if (c.status === "done" || c.status === "skipped") { (ms[c.tipo] ??= []).push(c.ms); (llm[c.tipo] ??= []).push(c.chamadasLlm); }
    if (c.status === "delayed" || (c.status === "expired" && /pool_esgotado/.test(String(c.motivo ?? "")))) esgotadas++;
    if (c.resultado?.postado) postsNoFio++;
  }
  for (const [tipo, t] of Object.entries(porTipo)) {
    const l = llm[tipo] ?? [];
    t.llmMedio = l.length ? Math.round((l.reduce((s, x) => s + x, 0) / l.length) * 100) / 100 : 0;
    t.msP50 = percentil(ms[tipo] ?? [], 50); t.msP95 = percentil(ms[tipo] ?? [], 95);
  }
  return { porTipo, esgotadas, postsNoFio };
}

/** Tokens por chamada de chore (p50/p95) contra o TPM do Groq — uma chamada precisa caber nele. */
export function tokensPorChore(rows: LinhaLedgerPool[]): { p50: number | null; p95: number | null; tetoTpm: number } {
  const xs = rows.filter((r) => r.surface === "chore" && r.ok).map((r) => r.totalTokens);
  return { p50: percentil(xs, 50), p95: percentil(xs, 95), tetoTpm: TETOS_DIA.groq.teto };
}

/**
 * "Custo R$ 0 comprovado": Σ custo dos alvos grátis = 0 E nenhuma chore de conteúdo WEB foi servida
 * pelo Vertex (vazou para o pago). Devolve os vazamentos para o chip vermelho.
 */
export function custoZero(alvos: PorAlvo[], rowsChore: LinhaChore[]): { zero: boolean; vazamentos: number; custoPoolUsd: number } {
  const custoPoolUsd = r6(alvos.filter((a) => a.alvo !== "vertex").reduce((s, a) => s + a.custoEstimadoUsd, 0));
  const vazamentos = rowsChore.filter((c) => c.origemConteudo === "web" && c.resultado?.alvo === "vertex").length;
  return { zero: custoPoolUsd === 0 && vazamentos === 0, vazamentos, custoPoolUsd };
}

/** §9.1: modelo PRIMÁRIO do pool abaixo de 90% de JSON válido → considerar promover o fallback. */
export function alertaJson(alvos: PorAlvo[]): string | null {
  const prim = alvos.find((a) => a.alvo === "gemini-free");
  return prim && prim.jsonValidoPct != null && prim.jsonValidoPct < 90 ? `modelo primário com ${prim.jsonValidoPct}% de JSON válido (< 90%): considere promover o fallback` : null;
}
