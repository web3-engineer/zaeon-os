"use client";
import { useEffect, useRef, useState } from "react";
import { useSavedCitations } from "@/lib/useSavedCitations";
import SpeakButton from "@/components/voice/SpeakButton";

interface CitationPopoverProps {
  /** Position relative to the containing element (the sheet wrapper). */
  pos: { x: number; y: number };
  onClose: () => void;
}

export default function CitationPopover({ pos, onClose }: CitationPopoverProps) {
  const { citations } = useSavedCitations();
  const ref = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Close on Escape or click outside
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const onMouse = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onMouse);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onMouse);
    };
  }, [onClose]);

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        top: pos.y,
        left: pos.x + 10,
        transform: "translateY(-50%)",
        zIndex: 40,
        width: 280,
        borderRadius: 14,
        padding: "12px 14px",
        background: "rgba(15,15,28,0.92)",
        border: "1px solid rgba(139,92,246,0.55)",
        backdropFilter: "blur(24px) saturate(160%)",
        boxShadow:
          "0 16px 48px -12px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.12)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[9px] font-black uppercase tracking-[0.14em] text-cyan-300">
          🔖 Citações salvas
        </span>
        <button
          onClick={onClose}
          className="text-white/30 hover:text-white/70 text-base leading-none"
        >
          ×
        </button>
      </div>

      {/* Empty state */}
      {citations.length === 0 && (
        <p className="text-[10px] text-white/40 italic text-center py-2">
          Nenhuma citação salva ainda.
        </p>
      )}

      {/* Citation list */}
      <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
        {citations.map((cit) => {
          const draggable = !cit.incomplete && !!(cit.quote || cit.abnt);
          return (
          <div
            key={cit.id}
            draggable={draggable}
            onDragStart={
              draggable
                ? (e) => {
                    const payload = JSON.stringify({ quote: cit.quote || cit.abnt, abnt: cit.abnt });
                    e.dataTransfer.setData("text/zaeon-citation", payload);
                    e.dataTransfer.setData("text/plain", cit.quote || cit.abnt);
                    e.dataTransfer.effectAllowed = "copy";
                  }
                : undefined
            }
            title={draggable ? "Arraste para o seu texto" : "Credite a fonte no painel de citações para usar"}
            className={`rounded-[9px] p-2 transition-colors ${draggable ? "cursor-grab active:cursor-grabbing hover:bg-white/10" : ""}`}
            style={{
              background: cit.incomplete ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.06)",
              border: cit.incomplete ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(255,255,255,0.10)",
            }}
          >
            {cit.incomplete ? (
              <p className="text-[9px] text-red-400 leading-snug">
                🔴 Sem fonte válida — credite no painel de citações.
              </p>
            ) : (
            <>
            <div className="flex items-start gap-2">
              <span className="text-white/25 text-[11px] leading-none mt-0.5 select-none">⠿</span>
              <p className="text-[10px] text-white/85 leading-snug flex-1 line-clamp-3">
                {cit.abnt}
              </p>
              <SpeakButton text={cit.quote || cit.abnt} size={12} title="Ouvir a citação" />
              <button
                onClick={() => copy(cit.abnt, cit.id)}
                className="shrink-0 text-[8.5px] font-bold text-cyan-300 px-1.5 py-0.5 rounded-[6px] transition-colors whitespace-nowrap"
                style={{
                  background: "rgba(34,211,238,0.12)",
                  border: "1px solid rgba(34,211,238,0.28)",
                }}
              >
                {copied === cit.id ? "✓" : "copiar"}
              </button>
            </div>
            {(cit.authors?.length || cit.year) && (
              <p className="text-[8.5px] text-white/35 mt-1">
                {cit.authors?.slice(0, 2).join("; ")}
                {cit.year ? ` (${cit.year})` : ""}
              </p>
            )}
            </>
            )}
          </div>
          );
        })}
      </div>

      {citations.length > 0 && (
        <p className="text-[8.5px] text-white/30 text-center mt-2 leading-snug">
          ⠿ arraste uma citação para o seu texto — a frase entra no cursor, a referência vai pras Referências.
        </p>
      )}
    </div>
  );
}
