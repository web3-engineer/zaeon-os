// components/research/ResearchSuggestionPanel.tsx
"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { Termometro } from "@/lib/scholar/termometro";
import AuthGateNotice from "./AuthGateNotice";
import ThinkingStream from "./ThinkingStream";
import GlitchOnce from "./GlitchOnce";

type Level = "grad" | "msc" | "phd" | "postdoc";

interface RefItem {
  source: "PubMed" | "arXiv" | "DOI" | "Scholar";
  title: string;
  authors: string;
  year: string;
  venue: string;
  doi?: string | null;
}

interface Suggestion {
  type: "Exploratória" | "Experimental" | "Pioneira";
  title: string;
  rationale: string;
  novelty_angle: string;
  gap_score: number;
}

interface EngineResponse {
  suggestion: Suggestion;
  references: RefItem[];
  termometro?: Termometro;
  inline_citation?: { quote: string; source: string; doi?: string } | null;
}

interface Props {
  docTitle?: string;
  onSelectTitle?: (title: string) => void;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

const LEVELS: { id: Level; icon: string; name: string; tag: string; tagClass: string }[] = [
  { id: "grad",    icon: "🎓", name: "Graduando",  tag: "Exploratória", tagClass: "bg-cyan-500/10 text-cyan-400/50" },
  { id: "msc",     icon: "🔬", name: "Mestrando",  tag: "Experimental", tagClass: "bg-teal-500/10 text-teal-400/60" },
  { id: "phd",     icon: "⚗️", name: "Doutorando", tag: "Pioneira",     tagClass: "bg-cyan-500/[0.12] text-cyan-300/70" },
  { id: "postdoc", icon: "🚀", name: "Pós-Doc",    tag: "Ultra",        tagClass: "bg-cyan-400/15 text-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.15)]" },
];

const LEVEL_DESCRIPTIONS: Record<Level, string> = {
  grad:    'Modo <strong class="text-cyan-400">EXPLORATÓRIA</strong> — mapeia o território, organiza literatura existente. Ideal para TCC e Iniciação Científica.',
  msc:     'Modo <strong class="text-cyan-400">EXPERIMENTAL</strong> — hipótese clara, metodologia controlada. Mira Qualis A2/B1 e periódicos Scopus.',
  phd:     'Modo <strong class="text-cyan-400">PIONEIRA</strong> — contribuição original, gap real na literatura. Mira Tese sólida e journals Q1.',
  postdoc: 'Modo <strong class="text-cyan-400">PIONEIRA ULTRA</strong> — cruza disciplinas, identifica lacunas sem precedente, mira Q1 internacional e publicações de alto impacto.',
};

const SOURCE_STYLES: Record<string, string> = {
  PubMed: "bg-teal-500/8 text-teal-400/70 border border-teal-500/15",
  arXiv:  "bg-cyan-500/8 text-cyan-400/60 border border-cyan-400/13",
  DOI:    "bg-sky-500/7 text-sky-400/60 border border-sky-500/13",
  Scholar:"bg-cyan-400/6 text-cyan-300/50 border border-cyan-400/10",
};

const TYPE_LABEL_STYLES: Record<string, string> = {
  Exploratória: "bg-cyan-400/10 text-cyan-300/60 border border-cyan-400/15",
  Experimental: "bg-teal-400/10 text-teal-300/60 border border-teal-400/15",
  Pioneira:     "bg-cyan-400/12 text-cyan-300/70 border border-cyan-400/20",
};

export default function ResearchSuggestionPanel({ docTitle = "", onSelectTitle, collapsible = false, defaultCollapsed = false }: Props) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [level, setLevel] = useState<Level>("postdoc");
  const [topic, setTopic] = useState(docTitle || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EngineResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [excludeTitles, setExcludeTitles] = useState<string[]>([]);

  // Keep topic in sync if docTitle changes from outside
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (docTitle && !topic) setTopic(docTitle);
  }, [docTitle]);

  async function fetchSuggestion(isRefresh = false) {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    setAuthRequired(false);

    // Build exclude list from accumulated state + current suggestion (if refreshing)
    const currentTitle = result?.suggestion.title;
    const exclude =
      isRefresh && currentTitle
        ? [...excludeTitles, currentTitle]
        : excludeTitles;

    try {
      const res = await fetch("/api/ai/research-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), level, exclude_titles: exclude }),
      });

      if (res.status === 401) {
        setAuthRequired(true);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || `Erro ${res.status}`);
      }

      const data = await res.json() as EngineResponse;
      // Persist the title we just excluded so future refreshes keep avoiding it
      if (isRefresh && currentTitle) {
        setExcludeTitles(prev =>
          prev.includes(currentTitle) ? prev : [...prev, currentTitle]
        );
      }
      setResult(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const currentLevel = LEVELS.find(l => l.id === level)!;

  const brl = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  return (
    <div
      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      className="w-full bg-white/[0.03] border border-white/[0.07] rounded-[2rem] backdrop-blur-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
    >
      {/* ── HEADER ── */}
      <div
        className={`px-5 py-4 border-b border-white/[0.05] flex items-center justify-between ${collapsible ? "cursor-pointer select-none" : ""}`}
        onClick={collapsible ? () => setCollapsed((c) => !c) : undefined}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-cyan-400/10 border border-cyan-400/20 rounded-[9px] flex items-center justify-center text-sm">
            🧭
          </div>
          <span className="text-[11px] font-black uppercase tracking-[.15em] text-cyan-400">
            Sugestão de Pesquisa
          </span>
          {collapsible && collapsed && (
            <span className="text-[7px] font-bold uppercase tracking-[.12em] text-white/25 border border-white/10 px-2 py-0.5 rounded-full">
              standby
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-bold uppercase tracking-[.1em] text-cyan-400/50 border border-cyan-400/15 px-2.5 py-1 rounded-full bg-cyan-400/[0.05]">
            IA · Gemini
          </span>
          {collapsible && (
            <span className={`text-cyan-400/60 text-[11px] leading-none transition-transform duration-200 ${collapsed ? "" : "rotate-90"}`}>
              ▸
            </span>
          )}
        </div>
      </div>

      {(!collapsible || !collapsed) && (
      <>
      {/* ── LEVEL SELECTOR ── */}
      <div className="px-5 py-3.5 border-b border-white/[0.05]">
        <p className="text-[8px] font-black uppercase tracking-[.18em] text-white/20 mb-2.5">
          Nível acadêmico
        </p>
        <div className="grid grid-cols-4 gap-1.5">
          {LEVELS.map(l => (
            <button
              key={l.id}
              onClick={() => setLevel(l.id)}
              className={`relative border rounded-xl py-2 px-1.5 flex flex-col items-center gap-1 transition-all duration-150
                ${level === l.id
                  ? "bg-cyan-400/[0.08] border-cyan-400/35 shadow-[0_0_14px_rgba(34,211,238,0.1)]"
                  : "bg-white/[0.02] border-white/[0.08] hover:bg-cyan-400/[0.05] hover:border-cyan-400/20"
                }`}
            >
              {level === l.id && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
              )}
              <span className="text-base leading-none">{l.icon}</span>
              <span className={`text-[8px] font-black uppercase tracking-[.06em] text-center leading-tight
                ${level === l.id ? "text-cyan-400" : "text-white/35"}`}>
                {l.name}
              </span>
              <span className={`text-[7px] font-bold uppercase tracking-[.06em] px-1.5 py-0.5 rounded-lg text-center leading-tight ${l.tagClass}`}>
                {l.tag}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── TYPE INDICATOR ── */}
      <div className="mx-5 mt-3.5 mb-0 p-2 rounded-xl bg-cyan-400/[0.04] border border-cyan-400/10 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)] shrink-0" />
        <p
          className="text-[9px] font-bold text-white/40 leading-snug"
          dangerouslySetInnerHTML={{ __html: LEVEL_DESCRIPTIONS[level] }}
        />
      </div>

      {/* ── INPUT ── */}
      <div className="px-5 py-3.5 flex gap-2 items-center">
        <input
          type="text"
          value={topic}
          onChange={e => setTopic(e.target.value)}
          onKeyDown={e => e.key === "Enter" && fetchSuggestion(false)}
          placeholder="Tema da pesquisa..."
          className="flex-1 bg-cyan-400/[0.04] border border-cyan-400/12 rounded-[13px] px-3 py-2.5 text-[12px] font-medium text-white outline-none transition-all focus:border-cyan-400/40 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.06)] placeholder:text-white/20"
        />
        <button
          onClick={() => fetchSuggestion(false)}
          disabled={loading || !topic.trim()}
          className="bg-[#06b6d4] hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed border-none rounded-[13px] px-4 py-2.5 text-[10px] font-black uppercase tracking-[.1em] text-[#030014] cursor-pointer whitespace-nowrap shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:shadow-[0_0_28px_rgba(34,211,238,0.35)] transition-all"
        >
          {loading ? "..." : "Gerar ✦"}
        </button>
      </div>

      {/* ── ERROR + retry ── */}
      {error && (
        <div className="mx-5 mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[10px] text-red-300 flex items-center justify-between gap-2">
          <span className="min-w-0">{error}</span>
          <button
            onClick={() => fetchSuggestion(false)}
            disabled={loading}
            className="shrink-0 px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-red-200 font-black uppercase tracking-[.08em] hover:bg-red-500/25 disabled:opacity-40 transition-colors cursor-pointer"
          >
            ↻ tentar de novo
          </button>
        </div>
      )}

      {/* ── AUTH GATE (401) ── */}
      {authRequired && <AuthGateNotice className="mx-5 mb-4" />}

      {/* ── LOADING: a IA pensando (interpolando dados…) ── */}
      {loading && (
        <div className="mx-5 mb-3.5 p-4 rounded-2xl border border-cyan-400/12 bg-cyan-400/[0.04]">
          <ThinkingStream running label="forjando uma proposta relevante" />
        </div>
      )}

      {/* ── SUGGESTION CARD ── */}
      {result && !loading && (
        <div className="mx-5 mb-3.5 p-4 rounded-2xl border border-cyan-400/12 bg-cyan-400/[0.04]">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-[8px] font-black uppercase tracking-[.15em] text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-2.5 py-0.5 rounded-full">
              ✦ Sugestão
            </span>
            <span className={`text-[8px] font-bold uppercase tracking-[.08em] px-2 py-0.5 rounded-full ${TYPE_LABEL_STYLES[result.suggestion.type] ?? ""}`}>
              {currentLevel.icon} {result.suggestion.type}
            </span>
            <button
              onClick={() => fetchSuggestion(true)}
              disabled={loading}
              className="ml-auto bg-transparent border border-cyan-400/15 rounded-[9px] px-2.5 py-1 text-[8px] font-black uppercase tracking-[.1em] text-cyan-400/40 hover:border-cyan-400/40 hover:text-cyan-400 hover:bg-cyan-400/[0.06] transition-all cursor-pointer disabled:opacity-40"
            >
              ↻ outra
            </button>
          </div>

          <p className="text-[12px] font-extrabold text-white/90 leading-[1.45] mb-1.5">
            <GlitchOnce text={result.suggestion.title} />
          </p>
          <p className="text-[10px] text-white/35 leading-[1.55] mb-2.5">
            {result.suggestion.rationale}
          </p>

          {onSelectTitle && (
            <button
              onClick={() => onSelectTitle(result.suggestion.title)}
              className="text-[9px] font-bold uppercase tracking-[.1em] text-cyan-400/40 hover:text-cyan-400 transition-colors cursor-pointer bg-transparent border-none"
            >
              Usar como título no editor →
            </button>
          )}
        </div>
      )}

      {/* ── TERMÔMETRO ── */}
      {result?.termometro && !loading && (
        <div className="mx-5 mb-3.5 grid grid-cols-2 gap-2">
          {/* Tempo médio */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.07]">
            <p className="text-[7px] font-black uppercase tracking-[.18em] text-white/25 mb-1">Tempo médio</p>
            <p className="text-[13px] font-extrabold text-cyan-300/90">{result.termometro.researchTime.label}</p>
          </div>
          {/* Bolsa */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.07]">
            <p className="text-[7px] font-black uppercase tracking-[.18em] text-white/25 mb-1">Bolsa · {result.termometro.scholarship.probability}</p>
            <p className="text-[13px] font-extrabold text-emerald-300/90">{brl(result.termometro.scholarship.monthlyValueBRL)}<span className="text-[8px] font-bold text-white/30">/mês</span></p>
            <p className="text-[7px] text-white/30 mt-0.5">até {brl(result.termometro.scholarship.monthlyValueRangeBRL[1])} · {result.termometro.scholarship.agencies.join(" · ")}</p>
          </div>
          {/* Gap / originalidade */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.07]">
            <p className="text-[7px] font-black uppercase tracking-[.18em] text-white/25 mb-1.5">Originalidade</p>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" style={{ width: `${Math.round(result.termometro.gapScore * 100)}%` }} />
            </div>
            <p className="text-[8px] text-white/35 mt-1">{result.termometro.gapLabel}</p>
          </div>
          {/* Alvo de publicação */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.07]">
            <p className="text-[7px] font-black uppercase tracking-[.18em] text-white/25 mb-1">Alvo publicação</p>
            <p className="text-[13px] font-extrabold text-violet-300/90">{result.termometro.publication.qualis}</p>
            <p className="text-[7px] text-white/30 mt-0.5">{result.termometro.publication.tier}</p>
          </div>
          {/* Nota do cenário */}
          <div className="col-span-2 p-2.5 rounded-xl bg-cyan-400/[0.04] border border-cyan-400/10">
            <p className="text-[8px] text-white/40 leading-snug">💡 {result.termometro.scholarship.note}</p>
          </div>
        </div>
      )}

      {/* ── REFERENCES ── */}
      {result && result.references.length > 0 && (
        <div className="mx-5 mb-5 border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-white/[0.04]">
            <span className="text-[8px] font-black uppercase tracking-[.15em] text-white/20">
              Trabalhos relacionados
            </span>
            <span className="text-[8px] font-bold text-cyan-400/40 bg-cyan-400/[0.06] border border-cyan-400/12 px-2 py-0.5 rounded-[9px]">
              {result.references.length} referências
            </span>
          </div>

          {result.references.map((ref, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(i * 0.05, 0.5) }}
              className="px-3.5 py-2.5 border-t border-white/[0.03] flex items-start gap-2"
            >
              <span className={`text-[7px] font-black uppercase tracking-[.08em] px-2 py-0.5 rounded-[8px] shrink-0 mt-0.5 ${SOURCE_STYLES[ref.source] ?? SOURCE_STYLES["DOI"]}`}>
                {ref.source}
              </span>
              <div>
                <p className="text-[10px] font-semibold text-white/65 leading-snug">{ref.title}</p>
                <p
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  className="text-[8px] text-white/20 mt-0.5"
                >
                  {ref.authors} · {ref.year} · {ref.venue}
                </p>
              </div>
            </motion.div>
          ))}

          <div className="px-3.5 py-2">
            <p className="text-[8px] font-bold uppercase tracking-[.12em] text-white/12 text-center">
              exportar ABNT
            </p>
          </div>
        </div>
      )}

      {/* ── EMPTY STATE ── */}
      {!result && !loading && !error && !authRequired && (
        <div className="px-5 pb-6 pt-2 text-center">
          <p className="text-[10px] text-white/20 leading-relaxed">
            Selecione o nível, confirme o tema e clique em <strong className="text-white/30">Gerar ✦</strong>
          </p>
        </div>
      )}
      </>
      )}
    </div>
  );
}
