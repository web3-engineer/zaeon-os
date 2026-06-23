"use client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { LibraryFile } from "@/lib/useLibraryFiles";

/** Returns a document emoji based on rough file/source heuristic. */
function docEmoji(file: LibraryFile): string {
  const title = file.title.toLowerCase();
  const source = (file.source ?? "").toLowerCase();
  if (source.includes("news") || title.includes("notícia") || title.includes("news")) return "📰";
  if (title.includes("livro") || title.includes("book") || title.includes("cap.")) return "📘";
  if (title.includes("tese") || title.includes("dissertação")) return "📑";
  return "📄";
}

interface DocIconProps {
  file: LibraryFile;
  onPlay: (file: LibraryFile) => void;
  processingId?: string | null;
  /** Arrastar um doc sobre outro → relacionar as duas pesquisas. */
  onRelate?: (sourceId: string, targetId: string) => void;
  /** Mover para a lixeira (✕ no hover). */
  onDelete?: (file: LibraryFile) => void;
  /** Abrir o PDF na folha (＋ verde no hover, ou soltar na folha). */
  onView?: (file: LibraryFile) => void;
}

export default function DocIcon({ file, onPlay, processingId, onDelete, onView }: DocIconProps) {
  const busy = processingId === file.id;
  const emoji = docEmoji(file);
  const [dragging, setDragging] = useState(false);
  // ＋ verde só aparece se o doc é REALMENTE visualizável (blob morto / sem PDF → não mostra).
  const [viewable, setViewable] = useState<boolean>(/^https?:/i.test(file.pdfUrl));
  useEffect(() => {
    let on = true;
    if (!file.pdfUrl) { setViewable(false); return; }
    if (file.pdfUrl.startsWith("blob:")) {
      fetch(file.pdfUrl).then((r) => { if (on) setViewable(r.ok); }).catch(() => { if (on) setViewable(false); });
    } else {
      setViewable(true); // http(s) (via proxy) / data: / relativo
    }
    return () => { on = false; };
  }, [file.pdfUrl]);

  return (
    <div
      // Arraste nativo: segura e move pra levar o doc pra folha (ver o PDF).
      draggable={!busy}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/zaeon-file", file.id);
        // copy = ver na folha · move = arquivar numa pasta (ambos os destinos permitidos).
        e.dataTransfer.effectAllowed = "copyMove";
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      title="Arraste pra folha para ver o PDF · ▶ para conversar"
      className={`group relative rounded-[14px] p-3 pb-2 text-center transition-all duration-200 bg-white/5 border hover:-translate-y-0.5 ${
        dragging
          ? "border-emerald-400 ring-2 ring-emerald-400/60 scale-[1.04] cursor-grabbing"
          : "border-white/[0.11] hover:border-emerald-400/40 cursor-grab active:cursor-grabbing"
      }`}
      style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14)" }}
    >
      {/* ＋ — ver o PDF na folha (verde, canto INFERIOR esquerdo). Só se o doc é visualizável. */}
      {onView && !busy && viewable && (
        <button
          onClick={(e) => { e.stopPropagation(); onView(file); }}
          title="Ver o documento na folha"
          className={`absolute -bottom-1.5 -left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[13px] leading-none text-white transition-opacity z-10 ${
            dragging ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
          style={{ background: "rgba(34,197,94,0.95)", border: "1px solid rgba(255,255,255,0.3)", boxShadow: "0 4px 10px -4px rgba(34,197,94,0.8)" }}
        >
          +
        </button>
      )}

      {/* ✕ — move pra lixeira (canto INFERIOR direito, no hover) */}
      {onDelete && !busy && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(file); }}
          title="Mover para a lixeira"
          className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[11px] text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
          style={{ background: "rgba(239,68,68,0.92)", border: "1px solid rgba(255,255,255,0.3)" }}
        >
          ×
        </button>
      )}

      {/* Icon wrapper with play overlay on hover */}
      <div
        className="relative w-12 h-12 mx-auto mb-2 cursor-pointer"
        onClick={() => !busy && onPlay(file)}
        title={`▶ Conversar com ${file.title}`}
      >
        <div
          className="w-full h-full rounded-[14px] flex items-center justify-center text-[22px]"
          style={{
            background: "linear-gradient(180deg, rgba(139,92,246,0.34), rgba(34,211,238,0.16))",
            border: "1px solid rgba(255,255,255,0.24)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), 0 8px 18px -10px rgba(0,0,0,0.7)",
          }}
        >
          {busy ? <Loader2 size={18} className="animate-spin text-cyan-300" /> : emoji}
        </div>

        {!busy && (
          <div
            className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center text-[9px] text-white pointer-events-none"
            style={{
              background: "linear-gradient(180deg,#8b5cf6,#6d28d9)",
              border: "1.5px solid rgba(255,255,255,0.3)",
              boxShadow: "0 4px 10px -4px rgba(139,92,246,0.8)",
            }}
          >
            ▶
          </div>
        )}

        {!busy && (
          <div className="absolute inset-0 rounded-[14px] bg-black/50 flex items-center justify-center text-white text-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
            ▶
          </div>
        )}
      </div>

      {/* Filename */}
      <p className="text-[9px] text-white/80 leading-tight line-clamp-2 px-1">{file.title}</p>
    </div>
  );
}
