"use client";
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

const WORK_TYPES = ["Artigo", "Relatório", "TCC"] as const;

export default function WindowSwitcher({
  windows,
  activeId,
  onSelect,
  onClose,
  workType,
  onWorkType,
}: WindowSwitcherProps) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-2.5 overflow-x-auto"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      {windows.map((w) => {
        const isActive = w.id === activeId;
        const isResearch = w.id === "research";
        return (
          <div key={w.id} className="shrink-0">
            <button
              onClick={() => onSelect(w.id)}
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
              {/* Qualquer aba que não seja a do trabalho pode ser fechada (documento OU pdf que falhou). */}
              {w.type !== "research" && (
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
          </div>
        );
      })}

      {/* ── SELETOR DE TIPO (lado direito): três botões fixos, sempre visíveis ── */}
      {onWorkType && (
        <div className="ml-auto flex items-center gap-1 shrink-0 pl-2">
          <span className="text-[8px] font-black uppercase tracking-[0.16em] text-white/30 mr-0.5 hidden sm:inline">Tipo</span>
          {WORK_TYPES.map((type) => {
            const active = workType === type;
            return (
              <button
                key={type}
                onClick={() => onWorkType(type)}
                title={`Definir tipo: ${type}`}
                aria-pressed={active}
                className="h-8 px-2.5 rounded-[10px] text-[10px] font-black uppercase tracking-wide whitespace-nowrap shrink-0 transition-all duration-150"
                style={
                  active
                    ? {
                        color: "#06121a",
                        background: "linear-gradient(135deg, #22d3ee, #0ea5e9)",
                        border: "1px solid rgba(34,211,238,0.55)",
                        boxShadow: "0 6px 16px -8px rgba(34,211,238,0.8)",
                      }
                    : { color: "#9a9ab8", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }
                }
              >
                {type}
              </button>
            );
          })}
        </div>
      )}

      {/* ＋ placeholder — opens a doc from library (sub-project #2) */}
      <button
        disabled
        title="Adicionar documento (em breve)"
        className={`${onWorkType ? "" : "ml-auto"} w-7 h-7 rounded-[9px] flex items-center justify-center text-[13px] shrink-0 opacity-40 cursor-default`}
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
