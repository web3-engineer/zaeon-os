"use client";
import { useCallback, useState } from "react";
import { useWindowStore } from "@/lib/useWindowStore";
import { useCursorPos } from "@/lib/useCursorPos";
import { useSavedCitations } from "@/lib/useSavedCitations";
import type { LibraryFile } from "@/lib/useLibraryFiles";
import WindowSwitcher from "./WindowSwitcher";
import DocumentDesktop from "./DocumentDesktop";
import CitationPopover from "./CitationPopover";

interface ResearchShellProps {
  /**
   * Rendered inside the left panel when the "research" window is active.
   * Typically: the A4 writing area from page.tsx.
   */
  researchWindowContent: React.ReactNode;
  /**
   * Rendered inside the left panel when any document window is active.
   * Typically: the Aura PDF chat interface from page.tsx.
   */
  documentWindowContent: React.ReactNode;
  /** Called when the user clicks Play on a document icon. */
  onPlayFile: (file: LibraryFile) => void;
  processingFileId: string | null;
  /** Two-stage progress for the play flow: "pdf" → "ai" → null (done). */
  processingStage?: "pdf" | "ai" | null;
  /** Triggers the hidden file input in page.tsx for PDF uploads via ＋ dock button. */
  onAdd?: () => void;
  /** Research sessions list for the 📁 folder panel. */
  sessions: { id: string; title: string; updatedAt?: string }[];
  onOpenSession: (id: string) => void;
}

export default function ResearchShell({
  researchWindowContent,
  documentWindowContent,
  onPlayFile,
  processingFileId,
  processingStage,
  onAdd,
  sessions,
  onOpenSession,
}: ResearchShellProps) {
  const { windows, activeId, setActiveId, addWindow, removeWindow } = useWindowStore();
  const { containerRef, posRef } = useCursorPos();
  const { citations } = useSavedCitations();
  const [openPopover, setOpenPopover] = useState<"citations" | "quiz" | null>(null);
  const [showFolder, setShowFolder] = useState(false);

  const handlePlayFile = useCallback(
    (file: LibraryFile) => {
      addWindow({
        id: file.id,
        label: file.title.slice(0, 22),
        emoji: "📄",
        type: "document",
      });
      setActiveId(file.id);
      onPlayFile(file);
    },
    [addWindow, setActiveId, onPlayFile],
  );

  const isDocumentWindow = activeId !== "research";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "2.33fr 1fr",
        gap: 14,
        height: "72vh",
        minHeight: 560,
        maxHeight: 760,
        borderRadius: 22,
        background: "rgba(22,22,34,0.55)",
        border: "1px solid rgba(255,255,255,0.12)",
        backdropFilter: "blur(40px) saturate(180%)",
        WebkitBackdropFilter: "blur(40px) saturate(180%)",
        boxShadow:
          "0 40px 100px -30px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.10)",
        padding: 14,
        overflow: "hidden",
      }}
    >
      {/* ──────── LEFT PANEL (70%) ──────── */}
      <div
        className="flex flex-col min-h-0 overflow-hidden rounded-[18px]"
        style={{
          background: "rgba(255,255,255,0.045)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
        }}
      >
        <WindowSwitcher
          windows={windows}
          activeId={activeId}
          onSelect={setActiveId}
          onClose={removeWindow}
        />

        {/* Sheet area — all windows mounted, inactive ones hidden via display:none */}
        <div ref={containerRef} className="flex-1 relative min-h-0 overflow-hidden">
          {/* Research window (always mounted) */}
          <div
            className="h-full overflow-y-auto"
            style={{ display: activeId === "research" ? undefined : "none" }}
          >
            {researchWindowContent}
          </div>

          {/* Document windows — one per open doc, each hidden when not active */}
          {windows
            .filter((w) => w.type === "document")
            .map((w) => (
              <div
                key={w.id}
                className="h-full overflow-y-auto"
                style={{ display: activeId === w.id ? undefined : "none" }}
              >
                {documentWindowContent}
              </div>
            ))}

          {/* Citation popover — floats at last known cursor position */}
          {openPopover === "citations" && (
            <CitationPopover
              pos={posRef.current ?? { x: 0, y: 0 }}
              onClose={() => setOpenPopover(null)}
            />
          )}

          {/* Quiz popover — stub for sub-project #5 */}
          {openPopover === "quiz" && (
            <div
              style={{
                position: "absolute",
                top: posRef.current?.y ?? 0,
                left: (posRef.current?.x ?? 0) + 10,
                transform: "translateY(-50%)",
                zIndex: 40,
                width: 220,
                borderRadius: 14,
                padding: "14px 16px",
                background: "rgba(15,15,28,0.92)",
                border: "1px solid rgba(139,92,246,0.45)",
                backdropFilter: "blur(24px)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-[10px] text-white/60 text-center">
                🧠 Quiz — em breve
              </p>
              <button
                onClick={() => setOpenPopover(null)}
                className="absolute top-2 right-2 text-white/30 hover:text-white/70 text-base leading-none"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Prompt bar — only visible in document mode */}
        {isDocumentWindow && (
          <div
            className="mx-3.5 mb-3.5 h-10 rounded-[13px] flex items-center gap-2 px-3 text-[11px] shrink-0"
            style={{
              color: "#a7e1ee",
              background: "rgba(34,211,238,0.06)",
              border: "1px solid rgba(34,211,238,0.20)",
            }}
          >
            <span>💬 Conversar com este documento…</span>
            <span style={{ marginLeft: "auto", opacity: 0.5 }}>↑</span>
          </div>
        )}
      </div>

      {/* ──────── RIGHT PANEL (30%) ──────── */}
      <DocumentDesktop
        processingFileId={processingFileId}
        processingStage={processingStage}
        onPlayFile={handlePlayFile}
        onAdd={onAdd}
        openPopover={openPopover}
        onTogglePopover={setOpenPopover}
        citationCount={citations.length}
        showFolder={showFolder}
        onToggleFolder={() => setShowFolder((v) => !v)}
        sessions={sessions}
        onOpenSession={onOpenSession}
      />
    </div>
  );
}
