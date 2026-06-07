"use client";
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
}

export default function DocIcon({ file, onPlay, processingId }: DocIconProps) {
  const busy = processingId === file.id;
  const emoji = docEmoji(file);

  return (
    <div
      className="group relative rounded-[14px] p-3 pb-2 text-center cursor-default transition-all duration-200 bg-white/5 border border-white/[0.11] hover:-translate-y-0.5 hover:border-cyan-400/40"
      style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14)" }}
    >
      {/* Icon wrapper with play overlay on hover */}
      <div
        className="relative w-12 h-12 mx-auto mb-2 cursor-pointer"
        onClick={() => !busy && onPlay(file)}
        title={`▶ Conversar com ${file.title}`}
      >
        {/* Icon background */}
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

        {/* Play badge — always visible at top-center */}
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

        {/* Hover overlay — darker fill + bigger play */}
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
