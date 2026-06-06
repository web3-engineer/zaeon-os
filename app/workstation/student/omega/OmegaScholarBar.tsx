"use client";
import { useState, useEffect, useRef } from "react";
import { GraduationCap, ArrowUp, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
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
      const id = setInterval(() => {
        setElapsed(Math.floor((Date.now() - (startRef.current ?? Date.now())) / 1000));
      }, 1000);
      return () => clearInterval(id);
    } else {
      startRef.current = null;
    }
  }, [status]);

  // ── Contador de "tokens" (estilo Claude Code) enquanto pesquisa ──────────────
  const [tokens, setTokens] = useState(0);
  useEffect(() => {
    if (status !== "running") return;
    setTokens(0);
    const id = setInterval(() => setTokens((t) => t + 28 + Math.floor(Math.random() * 34)), 90);
    return () => clearInterval(id);
  }, [status]);

  const submit = () => {
    if (draft.trim() && !busy) {
      runQuery(draft);
      setDraft("");
    }
  };

  return (
    <div
      className={`mx-6 ${flushTop ? "mt-0" : "mt-6"} p-5 rounded-[2rem] bg-gradient-to-r from-violet-500/15 to-purple-500/5 border border-white/30 dark:border-white/10 relative overflow-hidden`}
    >
      {/* ambient glow */}
      <div className="absolute -top-8 -right-8 w-40 h-40 bg-violet-400/10 rounded-full blur-[50px] pointer-events-none" />

      <div className="relative z-10 flex items-center gap-3">
        {/* beca icon */}
        <div className="w-12 h-12 rounded-2xl bg-white/30 dark:bg-white/5 flex items-center justify-center border border-white/40 dark:border-white/10 shrink-0">
          <GraduationCap className="text-violet-600 dark:text-violet-400" size={22} />
        </div>

        {/* right side */}
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.28em] text-violet-500 dark:text-violet-400">
            Omega Scholar · Pesquisa acadêmica
          </p>

          {/* input row */}
          <div className="flex items-center gap-2 mt-2">
            <input
              data-academic-input="true"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              disabled={busy}
              placeholder="Pesquise, revise a literatura, peça citações…"
              className="flex-1 bg-black/10 dark:bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:border-violet-400/50 disabled:opacity-60"
            />
            <button
              onClick={submit}
              disabled={busy}
              className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 text-white flex items-center justify-center shadow-lg shadow-violet-600/30 disabled:opacity-60"
            >
              {busy ? <Loader2 className="animate-spin" size={18} /> : <ArrowUp size={18} />}
            </button>
          </div>

          {/* ── status strip ─────────────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            {status === "running" && (
              <motion.div
                key="running"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-3 overflow-hidden"
              >
                {/* topo: experiência padrão (não duplica a barra/agentes do rodapé) —
                    triângulo ⟁ com pulso de radar + contador de tokens estilo Claude Code */}
                <div className="flex items-center gap-2.5">
                  <span className="relative inline-flex items-center justify-center w-4 h-4 shrink-0" aria-hidden>
                    <span className="absolute inset-0 rounded-full border border-cyan-400/40 animate-ping motion-reduce:animate-none" />
                    <span
                      className="text-cyan-400 text-[11px] leading-none animate-[spin_5s_linear_infinite] motion-reduce:animate-none"
                      style={{ filter: "drop-shadow(0 0 3px rgba(34,211,238,0.6))" }}
                    >
                      ⟁
                    </span>
                  </span>
                  <span className="text-xs font-mono text-cyan-600 dark:text-cyan-300/90 tabular-nums">
                    {tokens.toLocaleString("pt-BR")} <span className="text-slate-400 dark:text-white/30 font-sans">tokens</span>
                  </span>
                  <span className="text-xs text-slate-400 dark:text-white/40 tabular-nums">· {elapsed}s</span>
                </div>
              </motion.div>
            )}

            {status === "done" && (
              <motion.div
                key="done"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-3 overflow-hidden"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  <span className="text-xs text-emerald-400 font-semibold">
                    Pronto! Resultados em Estudos
                  </span>
                  <button
                    onClick={() => onOpenResults?.()}
                    className="ml-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 transition-colors"
                  >
                    Ver
                  </button>
                </div>
              </motion.div>
            )}

            {status === "error" && error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-3 overflow-hidden"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} className="text-red-400 shrink-0" />
                  <span className="text-xs text-red-400 truncate">{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
