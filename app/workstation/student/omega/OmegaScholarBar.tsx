"use client";
import { useState, useEffect, useRef } from "react";
import { ArrowUp, Loader2, CheckCircle2, AlertCircle, Brain } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useOmegaScholar } from "./OmegaScholarContext";

interface OmegaScholarBarProps {
  flushTop?: boolean;
  onOpenResults?: () => void;
}

export default function OmegaScholarBar({ flushTop = false, onOpenResults }: OmegaScholarBarProps) {
  const { runQuery, status, error, draft, setDraft } = useOmegaScholar();
  const busy = status === "running";

  // ── Elapsed timer ──────────────────────────────────────────────────────────
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);
  useEffect(() => {
    if (status === "running") {
      startRef.current = Date.now();
      setElapsed(0);
      const id = setInterval(() => setElapsed(Math.floor((Date.now() - (startRef.current ?? Date.now())) / 1000)), 1000);
      return () => clearInterval(id);
    }
    startRef.current = null;
  }, [status]);

  // ── Contador de "tokens" (estilo Claude Code) enquanto pesquisa ──────────────
  const [tokens, setTokens] = useState(0);
  useEffect(() => {
    if (status !== "running") return;
    setTokens(0);
    const id = setInterval(() => setTokens((t) => t + 28 + Math.floor(Math.random() * 34)), 90);
    return () => clearInterval(id);
  }, [status]);

  const [deep, setDeep] = useState(false); // pensamento profundo: pesquisa mais longa e completa
  const submit = () => {
    if (draft.trim() && !busy) {
      runQuery(draft, deep);
      setDraft("");
    }
  };

  return (
    <div
      className={`${flushTop ? "mt-0 mx-0" : "mt-6 mx-6"} px-3.5 py-2.5 rounded-[1.6rem] bg-gradient-to-r from-violet-500/15 to-purple-500/5 border border-white/30 dark:border-white/10 relative overflow-hidden`}
    >
      <div className="absolute -top-8 -right-8 w-40 h-40 bg-violet-400/10 rounded-full blur-[50px] pointer-events-none" />

      {/* linha única, fina — ⟁ animado no lugar da lupa, input, enviar */}
      <div className="relative z-10 flex items-center gap-2.5">
        <span className="relative inline-flex items-center justify-center w-5 h-5 shrink-0 ml-0.5" aria-hidden>
          {busy && <span className="absolute inset-0 rounded-full border border-cyan-400/40 animate-ping motion-reduce:animate-none" />}
          <span
            className={`text-cyan-500 dark:text-cyan-400 text-sm leading-none motion-reduce:animate-none ${busy ? "animate-[spin_4s_linear_infinite]" : "animate-[spin_14s_linear_infinite]"}`}
            style={{ filter: "drop-shadow(0 0 3px rgba(34,211,238,0.5))" }}
          >
            ⟁
          </span>
        </span>

        <input
          data-academic-input="true"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          disabled={busy}
          placeholder="Pesquise, revise a literatura, peça citações…"
          className="flex-1 min-w-0 bg-transparent border-none px-1 py-1.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-white/30 outline-none disabled:opacity-60"
        />

        <button
          onClick={() => setDeep((v) => !v)}
          disabled={busy}
          title={deep ? "Pensamento profundo ligado — pesquisa mais completa (e mais demorada)" : "Pensamento profundo — pesquisa mais completa, porém mais longa"}
          aria-pressed={deep}
          className={`shrink-0 inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-[10px] font-bold transition-all disabled:opacity-60 ${deep ? "text-white" : "text-slate-500 dark:text-white/45 bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10"}`}
          style={deep ? { background: "linear-gradient(135deg,#7c3aed,#06b6d4)" } : undefined}
        >
          <Brain size={13} /> {deep ? "Profundo" : "Rápido"}
        </button>

        <button
          onClick={submit}
          disabled={busy}
          aria-label="Pesquisar"
          className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-white flex items-center justify-center shadow-md shadow-violet-600/30 disabled:opacity-60 transition-transform hover:scale-105"
        >
          {busy ? <Loader2 className="animate-spin" size={15} /> : <ArrowUp size={15} />}
        </button>
      </div>

      {/* status strip — compacto, abaixo (alinhado sob o input) */}
      <AnimatePresence mode="wait">
        {status === "running" && (
          <motion.div key="running" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="flex items-center gap-2 pl-8 pt-1.5">
              <span className="text-xs font-mono text-cyan-600 dark:text-cyan-300/90 tabular-nums">
                {tokens.toLocaleString("pt-BR")} <span className="text-slate-400 dark:text-white/30 font-sans">tokens</span>
              </span>
              <span className="text-xs text-slate-400 dark:text-white/40 tabular-nums">· {elapsed}s</span>
            </div>
          </motion.div>
        )}

        {status === "done" && (
          <motion.div key="done" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="flex items-center gap-2 pl-8 pt-1.5">
              <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
              <span className="text-xs text-slate-500 dark:text-white/50 tabular-nums">
                Pesquisa feita em {elapsed}s · {tokens.toLocaleString("pt-BR")} tokens
              </span>
            </div>
          </motion.div>
        )}

        {status === "error" && error && (
          <motion.div key="error" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="flex items-center gap-2 pl-8 pt-1.5">
              <AlertCircle size={14} className="text-red-400 shrink-0" />
              <span className="text-xs text-red-400 truncate">{error}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
