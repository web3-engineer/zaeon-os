"use client";
import { useEffect, useRef, useState } from "react";
import { useLibraryFiles, type LibraryFile } from "@/lib/useLibraryFiles";
import DocIcon from "./DocIcon";
import DraggableDock from "./DraggableDock";
import type { DockItem } from "./DraggableDock";

interface DocumentDesktopProps {
  processingFileId: string | null;
  onPlayFile: (file: LibraryFile) => void;
  openPopover: "citations" | "quiz" | null;
  onTogglePopover: (id: "citations" | "quiz" | null) => void;
  citationCount: number;
  showFolder: boolean;
  onToggleFolder: () => void;
  sessions: { id: string; title: string; updatedAt?: string }[];
  onOpenSession: (id: string) => void;
}

/** Fake-progress ticker: 0→95% in ~8s, jumps to 100% on completion. */
function useProgress(active: boolean): number {
  const [pct, setPct] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!active) { setPct(0); return; }
    setPct(0);
    let p = 0;
    const tick = () => {
      p = Math.min(95, p + (95 - p) * 0.04 + 0.3);
      setPct(Math.round(p));
      if (p < 95) timer.current = setTimeout(tick, 200);
    };
    timer.current = setTimeout(tick, 200);
    return () => clearTimeout(timer.current);
  }, [active]);

  return active ? pct : 100;
}

export default function DocumentDesktop({
  processingFileId,
  onPlayFile,
  openPopover,
  onTogglePopover,
  citationCount,
  showFolder,
  onToggleFolder,
  sessions,
  onOpenSession,
}: DocumentDesktopProps) {
  const { files } = useLibraryFiles();
  const progress = useProgress(!!processingFileId);
  const activeFile = processingFileId ? files.find((f) => f.id === processingFileId) : null;

  const dockItems: DockItem[] = [
    { id: "folder", emoji: "📁", label: "Minhas pesquisas", active: showFolder },
    { id: "add", emoji: "＋", label: "Adicionar documento" },
    { id: "rename", emoji: "✏️", label: "Renomear" },
    {
      id: "citations",
      emoji: "🔖",
      label: "Citações salvas",
      badge: citationCount,
      active: openPopover === "citations",
    },
    { id: "quiz", emoji: "🧠", label: "Quiz", active: openPopover === "quiz" },
  ];

  const handleDockAction = (id: string) => {
    if (id === "folder") return onToggleFolder();
    if (id === "citations")
      return onTogglePopover(openPopover === "citations" ? null : "citations");
    if (id === "quiz")
      return onTogglePopover(openPopover === "quiz" ? null : "quiz");
    // "add" and "rename" — sub-project #2 stubs
  };

  return (
    <div
      className="rounded-[18px] flex flex-col p-3 overflow-hidden min-h-0"
      style={{
        background: "rgba(255,255,255,0.045)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
      }}
    >
      <h3
        className="text-[9px] font-black uppercase tracking-[0.16em] mb-2.5 flex items-center gap-1.5 shrink-0"
        style={{ color: "#9595b4" }}
      >
        {showFolder ? "📁 Minhas pesquisas" : "🗂️ Documentos"}
      </h3>

      {/* Content: folder list OR icon grid */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {showFolder ? (
          <div className="flex flex-col gap-1.5">
            {sessions.length === 0 && (
              <p className="text-[10px] text-white/35 italic text-center mt-4">
                Nenhuma pesquisa salva ainda.
              </p>
            )}
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => onOpenSession(s.id)}
                className="text-left rounded-[10px] px-3 py-2 text-[10.5px] text-white/80 hover:bg-white/[0.08] transition-colors"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <p className="font-semibold line-clamp-1">{s.title}</p>
                {s.updatedAt && (
                  <p className="text-white/35 text-[9px] mt-0.5">{s.updatedAt}</p>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {files.length === 0 && (
              <p className="col-span-2 text-[10px] text-white/35 italic text-center py-4">
                Nenhum documento ainda.
              </p>
            )}
            {files.map((f) => (
              <DocIcon
                key={f.id}
                file={f}
                onPlay={onPlayFile}
                processingId={processingFileId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Loading progress bar */}
      {processingFileId && (
        <div
          className="mt-2.5 rounded-[12px] p-2.5 shrink-0"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <div
            className="flex justify-between text-[9px] mb-1.5"
            style={{ color: "#9a9ab6" }}
          >
            <span>
              ⏳{" "}
              {activeFile
                ? `"${activeFile.title.slice(0, 18)}…"`
                : "Abrindo…"}
            </span>
            <span>{progress}%</span>
          </div>
          <div
            className="h-[5px] rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg,#8b5cf6,#22d3ee)",
                boxShadow: "0 0 8px rgba(34,211,238,.7)",
              }}
            />
          </div>
          <p className="text-[8px] mt-1" style={{ color: "#767692" }}>
            você pode sair e continuar
          </p>
        </div>
      )}

      {/* Dock */}
      <div className="mt-auto pt-2.5 shrink-0">
        <p
          className="text-[7.5px] text-center mb-1.5 uppercase tracking-[0.12em]"
          style={{ color: "#6a6a88" }}
        >
          arraste para reordenar
        </p>
        <DraggableDock items={dockItems} onAction={handleDockAction} />
      </div>
    </div>
  );
}
