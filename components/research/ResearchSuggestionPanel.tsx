// components/research/ResearchSuggestionPanel.tsx
"use client";
import { useState, useEffect } from "react";
import AuthGateNotice from "./AuthGateNotice";
import ThinkingStream from "./ThinkingStream";
import GlitchReveal from "./GlitchReveal";

type Level = "grad" | "msc" | "phd" | "postdoc";

interface Suggestion {
  type: "Exploratória" | "Experimental" | "Pioneira";
  title: string;
  rationale: string;
  novelty_angle: string;
  gap_score: number;
}

interface EngineResponse {
  suggestion: Suggestion;
  references?: unknown[];
  termometro?: unknown;
}

interface Props {
  docTitle?: string;
  /** Seed um campo externo (ex.: barra do Omega) com o título escolhido. */
  onSelectTitle?: (title: string) => void;
  /** Inicia a pesquisa de fato com o título (ex.: roda o Omega). Tem prioridade sobre onSelectTitle. */
  onStart?: (title: string) => void;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

const GRAD = "linear-gradient(135deg,#0ea5e9,#22d3ee)";
// Nível fixo internamente (sem UI): mira alto por padrão. O backend ainda recebe.
const LEVEL: Level = "postdoc";

export default function ResearchSuggestionPanel({ docTitle = "", onSelectTitle, onStart }: Props) {
  const [topic, setTopic] = useState(docTitle || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EngineResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [excludeTitles, setExcludeTitles] = useState<string[]>([]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (docTitle && !topic) setTopic(docTitle); }, [docTitle]);

  async function fetchSuggestion(isRefresh = false) {
    if (!topic.trim()) return;
    setLoading(true); setError(null); setAuthRequired(false);

    const currentTitle = result?.suggestion.title;
    const exclude = isRefresh && currentTitle ? [...excludeTitles, currentTitle] : excludeTitles;

    try {
      const res = await fetch("/api/ai/research-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), level: LEVEL, exclude_titles: exclude }),
      });
      if (res.status === 401) { setAuthRequired(true); return; }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || `Erro ${res.status}`);
      }
      const data = await res.json() as EngineResponse;
      if (isRefresh && currentTitle) setExcludeTitles((prev) => (prev.includes(currentTitle) ? prev : [...prev, currentTitle]));
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  const start = () => {
    const title = result?.suggestion.title;
    if (!title) return;
    if (onStart) onStart(title);
    else onSelectTitle?.(title);
  };

  return (
    <div className="w-full">
        <div className="flex flex-col gap-4">
          {/* ── BOTÃO: Gerar sugestão (conforme o estudo) → depois, Iniciar pesquisa ── */}
          <div className="flex justify-center pt-0.5">
            {!result || loading ? (
              <button
                onClick={() => fetchSuggestion(false)}
                disabled={loading || !topic.trim()}
                className="group relative inline-block px-9 py-3 rounded-2xl overflow-hidden bg-black/40 border border-cyan-500/30 text-white font-black text-[11px] uppercase tracking-[0.28em] shadow-2xl backdrop-blur-md transition-all duration-500 hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
              >
                <span className={`absolute inset-0 w-full h-full bg-gradient-to-r from-blue-600/40 via-cyan-500/40 to-blue-600/40 ${loading ? "zaeon-sweeping" : "-translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"}`} />
                <span className="relative z-10 group-hover:text-cyan-100 group-hover:drop-shadow-[0_0_10px_white] transition-all">
                  {loading ? "Gerando…" : "Gerar sugestão ✦"}
                </span>
              </button>
            ) : (
              <button
                onClick={start}
                className="group relative inline-block px-9 py-3 rounded-2xl overflow-hidden border text-white font-black text-[11px] uppercase tracking-[0.24em] shadow-[0_0_24px_rgba(34,211,238,0.25)] backdrop-blur-md transition-all duration-500 hover:scale-105 animate-pulse hover:animate-none"
                style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.55), rgba(6,182,212,0.55))", borderColor: "rgba(34,211,238,0.45)" }}
                title="Iniciar a pesquisa com este título"
              >
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
                <span className="relative z-10">Iniciar pesquisa →</span>
              </button>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-600 dark:text-rose-300 flex items-center justify-between gap-2">
              <span className="min-w-0">{error}</span>
              <button onClick={() => fetchSuggestion(false)} disabled={loading} className="shrink-0 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 font-black uppercase tracking-[.08em] hover:bg-rose-500/25 disabled:opacity-40">↻ de novo</button>
            </div>
          )}

          {authRequired && <AuthGateNotice />}

          {loading && (
            <div className="p-4 rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.05]">
              <ThinkingStream running label="forjando uma proposta relevante" />
            </div>
          )}

          {/* ── CARD: só título (glitch) + resumo simples + gerar outra ── */}
          {result && !loading && (
            <div className="p-4 rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.05]">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="text-[14px] font-extrabold leading-[1.4] text-slate-900 dark:text-white">
                  <GlitchReveal text={result.suggestion.title} />
                </p>
                <button onClick={() => fetchSuggestion(true)} disabled={loading} className="shrink-0 rounded-lg px-2.5 py-1 text-[8px] font-black uppercase tracking-[.1em] text-cyan-600 dark:text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/10 disabled:opacity-40">↻ outra</button>
              </div>
              <p className="text-[11px] leading-[1.55] text-slate-600 dark:text-white/55">{result.suggestion.rationale}</p>
            </div>
          )}

          {/* ── EMPTY STATE ── */}
          {!result && !loading && !error && !authRequired && (
            <p className="text-center text-[11px] text-slate-400 dark:text-white/30 leading-relaxed py-2">
              Clique em <strong className="text-slate-600 dark:text-white/50">Gerar sugestão ✦</strong> — a Aura propõe a partir do seu estudo.
            </p>
          )}
        </div>

      <style jsx global>{`
        @keyframes zaeon-sweep { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
        .zaeon-sweeping { animation: zaeon-sweep 1.1s ease-in-out infinite alternate; }
      `}</style>
    </div>
  );
}
