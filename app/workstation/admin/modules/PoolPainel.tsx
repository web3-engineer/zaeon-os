"use client";

/**
 * PoolPainel — bloco POOL do admin de Agents (Fatia 7, G8). Prova o "custo R$ 0" do pool grátis:
 * tabela por alvo (chamadas · ok% · 429% · esgotado · cooldown · tokens · JSON válido · p95 · custo),
 * chores por tipo, tokens por chamada vs 8K TPM do Groq, estado do Leitor e "medindo desde".
 * Leitura → visível por default (como o A3). Vidro claro === escuro. Rota: GET /api/admin/agents/pool.
 */
import { useCallback, useEffect, useState } from "react";
import { VIDRO_BOLHA, VIDRO_CHIP, TXT, TXT_2, TXT_MUDO } from "@/lib/canal/vidro";

type Erros = { rate_limit: number; esgotado: number; timeout: number; auth: number; outro: number };
type Alvo = { alvo: string; chamadas: number; ok: number; erros: Erros; totalTokens: number; custoEstimadoUsd: number; p95Ms: number | null; jsonValidoPct: number | null };
type PorTipo = { rodadas: number; done: number; skipped: number; failed: number; delayed: number; expired: number; llmMedio: number; msP95: number | null };
type Dados = {
  range: string; alvos: Alvo[]; taxa429: Record<string, number>; cooldown: Record<string, number>;
  chores: { porTipo: Record<string, PorTipo>; esgotadas: number; postsNoFio: number };
  tokensPorChore: { p50: number | null; p95: number | null; tetoTpm: number };
  custoZero: { zero: boolean; vazamentos: number; custoPoolUsd: number }; alertaJson: string | null;
  configurados: string[]; medindoDesde: string | null;
};
type Range = "24h" | "7d" | "30d";

/** PURO: % com 1 casa, ou "—" quando não há base. */
export const formatPct = (v: number | null | undefined): string => (v == null || !Number.isFinite(v) ? "—" : `${Math.round(v * 10) / 10}%`);
/** PURO: cor por alvo (grátis = verde/ciano/violeta; vertex = âmbar — é o pago). */
export function corDoAlvo(alvo: string): string {
  return alvo === "gemini-free" ? "bg-emerald-500" : alvo === "cloudflare" ? "bg-cyan-500" : alvo === "groq" ? "bg-violet-500" : alvo === "glm" ? "bg-slate-400" : "bg-amber-500";
}
const NOME: Record<string, string> = { "gemini-free": "Gemini (AI Studio)", cloudflare: "Cloudflare", groq: "Groq", glm: "GLM", vertex: "Vertex (pago)" };
const n = (v: number | null | undefined) => (v == null ? "—" : new Intl.NumberFormat("pt-BR").format(v));

export default function PoolPainel() {
  const [range, setRange] = useState<Range>("24h");
  const [d, setD] = useState<Dados | null>(null);
  const [leitor, setLeitor] = useState<string | null>(null);
  const [estado, setEstado] = useState<"carregando" | "ok" | "erro">("carregando");

  const carregar = useCallback(async (r: Range) => {
    try {
      const [res, h] = await Promise.all([fetch(`/api/admin/agents/pool?range=${r}`, { cache: "no-store" }), fetch("/api/health", { cache: "no-store" }).catch(() => null)]);
      if (!res.ok) { setEstado("erro"); return; }
      setD(await res.json()); setEstado("ok");
      const hj = h && h.ok ? await h.json().catch(() => null) : null;
      setLeitor(hj?.leitor ?? null);
    } catch { setEstado("erro"); }
  }, []);
  useEffect(() => { void carregar(range); }, [carregar, range]);

  if (estado === "erro") return null; // painel de leitura: se a rota não existe/não responde, some sem quebrar o módulo
  const maxCham = Math.max(1, ...(d?.alvos ?? []).map((a) => a.chamadas));
  const tipos = Object.entries(d?.chores.porTipo ?? {});

  return (
    <section aria-label="Pool grátis" className={`mb-5 p-4 rounded-2xl ${VIDRO_BOLHA}`}>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h3 className={`text-[13px] font-black uppercase tracking-widest ${TXT}`}>Pool grátis</h3>
        {d && (d.custoZero.zero
          ? <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">custo R$ 0 comprovado</span>
          : <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">{d.custoZero.vazamentos ? `vazou para o Vertex: ${d.custoZero.vazamentos} chore(s)` : `custo no pool: US$ ${d.custoZero.custoPoolUsd.toFixed(4)}`}</span>)}
        <span className={`text-[11px] ${TXT_MUDO}`}>Leitor: <b className={TXT_2}>{leitor ?? "—"}</b> · com key: <b className={TXT_2}>{d?.configurados.length ? d.configurados.join(", ") : "nenhum"}</b></span>
        <span className={`text-[11px] ${TXT_MUDO}`}>{d?.medindoDesde ? `medindo desde ${new Date(d.medindoDesde).toLocaleDateString("pt-BR")}` : "sem dados de consumo ainda"}</span>
        <div role="radiogroup" aria-label="Período do pool" className="ml-auto flex gap-1">
          {(["24h", "7d", "30d"] as Range[]).map((r) => (
            <button key={r} type="button" role="radio" aria-checked={range === r} onClick={() => setRange(r)} className={`min-h-[28px] px-2 rounded-lg text-[11px] font-bold ${VIDRO_CHIP} ${range === r ? "ring-1 ring-cyan-400/70 " + TXT : TXT_MUDO}`}>{r}</button>
          ))}
        </div>
      </div>

      {d?.alertaJson && <p role="status" className="mb-2 text-[12px] text-amber-700 dark:text-amber-300">⚠ {d.alertaJson}</p>}

      {d && d.alvos.length > 0 && (
        <div className="overflow-x-auto">
          <table className={`w-full text-[12px] ${TXT_2}`}>
            <thead><tr className={`text-left text-[10px] uppercase tracking-wider ${TXT_MUDO}`}>
              <th className="py-1 pr-3">alvo</th><th className="pr-3">chamadas</th><th className="pr-3">ok</th><th className="pr-3">429</th><th className="pr-3">esgotado</th><th className="pr-3">cooldown</th><th className="pr-3">tokens</th><th className="pr-3">json válido</th><th className="pr-3">p95</th><th>custo est.</th>
            </tr></thead>
            <tbody>
              {d.alvos.map((a) => (
                <tr key={a.alvo} className="border-t border-slate-200/60 dark:border-white/10">
                  <td className={`py-1.5 pr-3 font-semibold ${TXT}`}><span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${corDoAlvo(a.alvo)}`} />{NOME[a.alvo] ?? a.alvo}</td>
                  <td className="pr-3"><div className="flex items-center gap-1.5"><div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-white/10"><div className={`h-full rounded-full ${corDoAlvo(a.alvo)}`} style={{ width: `${(a.chamadas / maxCham) * 100}%` }} /></div>{n(a.chamadas)}</div></td>
                  <td className="pr-3">{formatPct(a.chamadas ? (a.ok / a.chamadas) * 100 : null)}</td>
                  <td className="pr-3">{formatPct(d.taxa429[a.alvo])}</td>
                  <td className="pr-3">{n(a.erros.esgotado)}</td>
                  <td className="pr-3">{n(d.cooldown[a.alvo] ?? 0)} min</td>
                  <td className="pr-3">{n(a.totalTokens)}</td>
                  <td className="pr-3">{formatPct(a.jsonValidoPct)}</td>
                  <td className="pr-3">{a.p95Ms == null ? "—" : `${n(a.p95Ms)} ms`}</td>
                  <td>US$ {a.custoEstimadoUsd.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {d && (
        <p className={`mt-2 text-[11px] ${TXT_MUDO}`}>
          tokens por chamada de chore p50/p95: <b className={TXT_2}>{n(d.tokensPorChore.p50)} / {n(d.tokensPorChore.p95)}</b> vs {n(d.tokensPorChore.tetoTpm)} TPM do Groq
          {" · "}esgotadas: <b className={TXT_2}>{n(d.chores.esgotadas)}</b> · posts no fio: <b className={TXT_2}>{n(d.chores.postsNoFio)}</b>
        </p>
      )}

      {tipos.length > 0 && (
        <div className="mt-2 overflow-x-auto">
          <table className={`w-full text-[12px] ${TXT_2}`}>
            <thead><tr className={`text-left text-[10px] uppercase tracking-wider ${TXT_MUDO}`}>
              <th className="py-1 pr-3">chore</th><th className="pr-3">rodadas</th><th className="pr-3">skipped</th><th className="pr-3">done</th><th className="pr-3">failed</th><th className="pr-3">delayed</th><th className="pr-3">llm médio</th><th>p95</th>
            </tr></thead>
            <tbody>
              {tipos.map(([tipo, t]) => (
                <tr key={tipo} className="border-t border-slate-200/60 dark:border-white/10">
                  <td className={`py-1.5 pr-3 font-semibold ${TXT}`}>{tipo}</td><td className="pr-3">{t.rodadas}</td><td className="pr-3">{t.skipped}</td><td className="pr-3">{t.done}</td><td className="pr-3">{t.failed}</td><td className="pr-3">{t.delayed}</td><td className="pr-3">{t.llmMedio}</td><td>{t.msP95 == null ? "—" : `${n(t.msP95)} ms`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
