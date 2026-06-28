"use client";
/**
 * GenerateResearchPanel — mesmo VISUAL do antigo "Gerar sugestão" (botão premium estilo
 * about-us), mas agora gera uma PESQUISA de verdade (esboço com intro/objetivos/metodologia)
 * via /api/ai/research-draft. Mostra só o título (glitch) + um trecho do resumo; o botão
 * "Iniciar pesquisa" abre o esboço completo na aba Pesquisa.
 */
import { useEffect, useState } from "react";
import GlitchReveal from "./GlitchReveal";
import { getDraftState, subscribeDraft, runDraft, hydrateDraft, type DraftState } from "@/lib/research/draftRun";

interface Props {
  topic: string;
  references?: string[];
}

export default function GenerateResearchPanel({ topic, references = [] }: Props) {
  // Estado vem do STORE singleton (lib/research/draftRun) → sobrevive a trocar de aba.
  const [st, setSt] = useState<DraftState>(getDraftState());
  useEffect(() => { hydrateDraft(); return subscribeDraft(setSt); }, []);
  const loading = st.status === "loading";
  const result = st.result;
  const error = st.status === "error" ? st.error : null;

  async function generate() {
    await runDraft(topic, references);
  }

  function start() {
    if (!result) return;
    try {
      // Manda os CAMPOS — a aba Pesquisa encaixa no framework do tipo ativo (TCC/Artigo/Relatório).
      window.dispatchEvent(new CustomEvent("zaeon:research:newdoc", { detail: { title: result.title, fields: result.fields } }));
      window.dispatchEvent(new CustomEvent("zaeon:set-tab", { detail: "pesquisa" }));
    } catch { /* ignore */ }
  }

  return (
    <div className="mt-8 pt-6 border-t border-dashed border-black/10 dark:border-white/10 flex flex-col gap-3">
      {/* BOTÃO (mesmo estilo do antigo "Gerar sugestão") */}
      <div className="flex justify-center">
        {!result || loading ? (
          <button
            data-tour="gerar"
            onClick={generate}
            disabled={loading || !topic.trim()}
            className="group relative inline-block px-9 py-3 rounded-2xl overflow-hidden bg-black/40 border border-cyan-500/30 text-white font-black text-[11px] uppercase tracking-[0.28em] shadow-2xl backdrop-blur-md transition-all duration-500 hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
          >
            <span className={`absolute inset-0 w-full h-full bg-gradient-to-r from-blue-600/40 via-cyan-500/40 to-blue-600/40 ${loading ? "zaeon-sweeping" : "-translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"}`} />
            <span className="relative z-10 group-hover:text-cyan-100 group-hover:drop-shadow-[0_0_10px_white] transition-all">
              {loading ? "Gerando…" : "Gerar pesquisa ✦"}
            </span>
          </button>
        ) : (
          <button
            onClick={start}
            className="group relative inline-block px-9 py-3 rounded-2xl overflow-hidden border text-white font-black text-[11px] uppercase tracking-[0.24em] shadow-[0_0_24px_rgba(34,211,238,0.25)] backdrop-blur-md transition-all duration-500 hover:scale-105 animate-pulse hover:animate-none"
            style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.55), rgba(6,182,212,0.55))", borderColor: "rgba(34,211,238,0.45)" }}
            title="Abrir o esboço completo na aba Pesquisa"
          >
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
            <span className="relative z-10">Iniciar pesquisa →</span>
          </button>
        )}
      </div>

      {error && <p className="text-center text-[11px] text-rose-500">{error}</p>}

      {/* PRÉVIA: só título (glitch) + um trecho do resumo */}
      {result && !loading && (
        <div className="p-4 rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.05]">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <p className="text-[14px] font-extrabold leading-[1.4] text-slate-900 dark:text-white">
              <GlitchReveal text={result.title} />
            </p>
            <button onClick={generate} className="shrink-0 rounded-lg px-2.5 py-1 text-[8px] font-black uppercase tracking-[.1em] text-cyan-600 dark:text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/10">↻ outra</button>
          </div>
          {result.fields.resumo && <p className="text-[11px] leading-[1.55] text-slate-600 dark:text-white/55 line-clamp-3">{result.fields.resumo}</p>}
        </div>
      )}

      <style jsx global>{`
        @keyframes zaeon-sweep { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
        .zaeon-sweeping { animation: zaeon-sweep 1.1s ease-in-out infinite alternate; }
      `}</style>
    </div>
  );
}
