"use client";
import { useState } from "react";
import type { WindowEntry } from "@/lib/useWindowStore";

interface WindowSwitcherProps {
  windows: WindowEntry[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  /** Tipo de trabalho — o pill "Minha pesquisa" vira "Meu TCC/Artigo/Relatório". */
  workType?: string | null;
  onWorkType?: (t: string) => void;
}

export default function WindowSwitcher({
  windows,
  activeId,
  onSelect,
  onClose,
  workType,
  onWorkType,
}: WindowSwitcherProps) {
  const [typeOpen, setTypeOpen] = useState(false);
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-2.5 overflow-x-auto"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      {windows.map((w) => {
        const isActive = w.id === activeId;
        const isResearch = w.id === "research";
        const btn = (
          <button
            onClick={() => { onSelect(w.id); if (isResearch && onWorkType) setTypeOpen((v) => !v); }}
            className="flex items-center gap-1.5 h-8 px-3 rounded-[11px] text-[11px] whitespace-nowrap shrink-0 transition-all duration-150"
            style={
              isActive
                ? {
                    color: "#fff",
                    background: "linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.06))",
                    border: "1px solid rgba(255,255,255,0.28)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45), 0 8px 20px -8px rgba(139,92,246,0.85)",
                  }
                : { color: "#b8b8d0", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }
            }
          >
            <span>{w.emoji}</span>
            <span>{isResearch && workType ? `Meu ${workType}` : w.label}</span>
            {isResearch && onWorkType && <span className="text-[8px] opacity-60 ml-0.5">▾</span>}
            {/* Só janelas de documento podem ser fechadas — a do trabalho é permanente */}
            {w.type === "document" && (
              <span
                role="button"
                aria-label={`Fechar ${w.label}`}
                className="ml-1 opacity-50 hover:opacity-100 text-[10px] leading-none"
                onClick={(e) => { e.stopPropagation(); onClose(w.id); }}
              >
                ×
              </span>
            )}
          </button>
        );
        if (!isResearch) return <div key={w.id} className="shrink-0">{btn}</div>;
        // O pill do trabalho É TAMBÉM o seletor de tipo (uma coisa só). Clica → Artigo/Relatório/TCC.
        return (
          <div key={w.id} className="relative shrink-0">
            {btn}
            {typeOpen && onWorkType && (
              <>
                <div className="fixed inset-0 z-[190]" onClick={() => setTypeOpen(false)} />
                <div
                  className="absolute left-0 top-full mt-1.5 z-[200] rounded-[12px] overflow-hidden min-w-[160px]"
                  style={{
                    background: "rgba(15,15,28,0.96)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    backdropFilter: "blur(24px) saturate(160%)",
                    boxShadow: "0 16px 48px -12px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.12)",
                  }}
                >
                  <p className="px-4 pt-2.5 pb-1 text-[8px] font-black uppercase tracking-[0.18em] text-white/30">Tipo de trabalho</p>
                  {["Artigo", "Relatório", "TCC"].map((type) => {
                    const active = workType === type;
                    return (
                      <button
                        key={type}
                        onClick={(e) => { e.stopPropagation(); onWorkType(type); setTypeOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-wide transition-colors hover:bg-white/10"
                        style={{ color: active ? "#22d3ee" : "#cfcfe6", background: active ? "rgba(34,211,238,0.10)" : "transparent" }}
                      >
                        {active ? "● " : ""}{type}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* ＋ placeholder — opens a doc from library (sub-project #2) */}
      <button
        disabled
        title="Adicionar documento (em breve)"
        className="ml-auto w-7 h-7 rounded-[9px] flex items-center justify-center text-[13px] shrink-0 opacity-40 cursor-default"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.10)",
          color: "#9a9ab8",
        }}
      >
        ＋
      </button>
    </div>
  );
}
