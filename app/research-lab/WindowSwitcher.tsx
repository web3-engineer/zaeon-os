"use client";
import type { WindowEntry } from "@/lib/useWindowStore";

interface WindowSwitcherProps {
  windows: WindowEntry[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}

export default function WindowSwitcher({
  windows,
  activeId,
  onSelect,
  onClose,
}: WindowSwitcherProps) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-2.5 overflow-x-auto"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      {windows.map((w) => {
        const isActive = w.id === activeId;
        return (
          <button
            key={w.id}
            onClick={() => onSelect(w.id)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-[11px] text-[11px] whitespace-nowrap shrink-0 transition-all duration-150"
            style={
              isActive
                ? {
                    color: "#fff",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.06))",
                    border: "1px solid rgba(255,255,255,0.28)",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.45), 0 8px 20px -8px rgba(139,92,246,0.85)",
                  }
                : {
                    color: "#b8b8d0",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.10)",
                  }
            }
          >
            <span>{w.emoji}</span>
            <span>{w.label}</span>
            {/* Only document windows can be closed */}
            {w.type === "document" && (
              <span
                role="button"
                aria-label={`Fechar ${w.label}`}
                className="ml-1 opacity-50 hover:opacity-100 text-[10px] leading-none"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(w.id);
                }}
              >
                ×
              </span>
            )}
          </button>
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
