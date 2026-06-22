"use client";
import { useCallback, useState, useEffect } from "react";
import type { WindowEntry } from "@/lib/useWindowStore";
import RichText from "@/components/research/RichText";
import { useCursorPos } from "@/lib/useCursorPos";
import { useSavedCitations } from "@/lib/useSavedCitations";
import type { LibraryFile } from "@/lib/useLibraryFiles";
import WindowSwitcher from "./WindowSwitcher";
import DocumentDesktop from "./DocumentDesktop";
import PdfViewer from "./PdfViewer";
import type { SavedCitation } from "@/lib/useSavedCitations";

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
  /** "Minhas coisas": criar um trabalho novo e excluir um trabalho salvo. */
  onNewWork?: () => void;
  onDeleteWork?: (id: string) => void;
  /** Tipo de trabalho atual + setter — o pill "Minha pesquisa" reage a isto. */
  workType?: string | null;
  onWorkType?: (t: string) => void;
  /** Arrastar um doc sobre outro → relacionar as pesquisas. */
  onRelate?: (sourceId: string, targetId: string) => void;
  /** Ler a pesquisa (texto do editor) em voz — botão play/stop na aba da pesquisa. */
  onReadResearch?: () => void;
  isReadingResearch?: boolean;
  /** Window store (subido pro page.tsx) — abas de play E de merge. */
  windows: WindowEntry[];
  activeId: string;
  onSelectWindow: (id: string) => void;
  addWindow: (entry: WindowEntry) => void;
  removeWindow: (id: string) => void;
  /** Resumos de relação por aba (merge): id da janela → conteúdo. */
  relSummaries?: Record<string, { title: string; text: string; loading?: boolean }>;
  /** Arrastar um doc PRA folha → ver o PDF real. Recebe o id do arquivo. */
  onViewDoc?: (fileId: string) => void;
  /** Arquivos abertos como visualizador de PDF: id da janela (pdf-…) → arquivo. */
  pdfDocs?: Record<string, LibraryFile>;
  /** Salvar uma citação gerada pela seleção no PDF. */
  onCite?: (c: SavedCitation) => void;
  /** Nível do engine de citação: "vercel" (rápido) ou "gemini" (robusto). */
  citeMode?: "vercel" | "gemini";
  /** Espelhar o layout (canhoto): documentos à esquerda, folha à direita. */
  flipped?: boolean;
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
  onNewWork,
  onDeleteWork,
  workType,
  onWorkType,
  onRelate,
  onReadResearch,
  isReadingResearch,
  windows,
  activeId,
  onSelectWindow,
  addWindow,
  removeWindow,
  relSummaries,
  onViewDoc,
  pdfDocs,
  onCite,
  citeMode,
  flipped,
}: ResearchShellProps) {
  const { containerRef, posRef } = useCursorPos();
  const { citations } = useSavedCitations();
  const [openPopover, setOpenPopover] = useState<"citations" | "quiz" | null>(null);
  const [showFolder, setShowFolder] = useState(false);
  const [fileDragOver, setFileDragOver] = useState(false);
  // Mobile (<640px): empilha em coluna única (conversa em cima, documentos abaixo).
  const [vw, setVw] = useState(0);
  useEffect(() => {
    const f = () => setVw(window.innerWidth);
    f();
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);
  const mobile = vw > 0 && vw < 640;

  const handlePlayFile = useCallback(
    (file: LibraryFile) => {
      addWindow({
        id: file.id,
        label: file.title.slice(0, 22),
        emoji: "📄",
        type: "document",
      });
      onSelectWindow(file.id);
      onPlayFile(file);
    },
    [addWindow, onSelectWindow, onPlayFile],
  );

  return (
    <div
      style={{
        display: mobile ? "flex" : "grid",
        flexDirection: mobile ? "column" : undefined,
        gridTemplateColumns: mobile ? undefined : (flipped ? "1fr 3.2fr" : "3.2fr 1fr"),
        gap: mobile ? 10 : 14,
        height: mobile ? "auto" : "100%",
        minHeight: mobile ? "78vh" : 600,
        maxHeight: "none",
        borderRadius: 22,
        background: "rgba(22,22,34,0.55)",
        border: "1px solid rgba(255,255,255,0.12)",
        backdropFilter: "blur(40px) saturate(180%)",
        WebkitBackdropFilter: "blur(40px) saturate(180%)",
        boxShadow:
          "0 40px 100px -30px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.10)",
        padding: mobile ? 10 : 14,
        overflow: mobile ? "visible" : "hidden",
      }}
    >
      {/* ──────── LEFT PANEL (70%) ──────── */}
      <div
        className="relative flex flex-col min-h-0 overflow-hidden rounded-[18px] transition-all"
        style={{
          order: flipped ? 2 : 0,
          minHeight: mobile ? "60vh" : undefined,
          flex: mobile ? "1 1 auto" : undefined,
          background: "rgba(255,255,255,0.045)",
          border: fileDragOver ? "1px solid rgba(34,197,94,0.75)" : "1px solid rgba(255,255,255,0.10)",
          boxShadow: fileDragOver
            ? "inset 0 0 0 2px rgba(34,197,94,0.45), inset 0 1px 0 rgba(255,255,255,0.12)"
            : "inset 0 1px 0 rgba(255,255,255,0.12)",
        }}
        // Arrastar um documento PRA folha → abre o PDF real (não confundir com citação: mime diferente).
        onDragOver={(e) => {
          if (onViewDoc && e.dataTransfer.types.includes("text/zaeon-file")) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            setFileDragOver(true);
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setFileDragOver(false);
        }}
        onDrop={(e) => {
          const id = e.dataTransfer.getData("text/zaeon-file");
          if (id && onViewDoc) {
            e.preventDefault();
            onViewDoc(id);
          }
          setFileDragOver(false);
        }}
      >
        {/* Confirmação verde ao arrastar um doc PRA folha — "soltar para ver" */}
        {fileDragOver && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none" style={{ background: "rgba(16,185,129,0.10)", backdropFilter: "blur(2px)" }}>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: "rgba(6,78,59,0.92)", border: "1px solid rgba(34,197,94,0.7)", boxShadow: "0 10px 30px -10px rgba(34,197,94,0.8)" }}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[14px] leading-none" style={{ background: "rgba(34,197,94,0.95)" }}>+</span>
              <span className="text-[11px] font-black uppercase tracking-wide text-emerald-100">Soltar para ver o documento</span>
            </div>
          </div>
        )}

        <WindowSwitcher
          windows={windows}
          activeId={activeId}
          onSelect={onSelectWindow}
          onClose={removeWindow}
          workType={workType}
          onWorkType={onWorkType}
          onReadResearch={onReadResearch}
          isReadingResearch={isReadingResearch}
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

          {/* PDF viewer windows — o documento real, selecionável (arrastado pra folha) */}
          {windows
            .filter((w) => w.type === "pdfview")
            .map((w) => (
              <div
                key={w.id}
                className="h-full"
                style={{ display: activeId === w.id ? undefined : "none" }}
              >
                {pdfDocs?.[w.id] && (
                  <PdfViewer
                    file={pdfDocs[w.id]}
                    mode={citeMode ?? "vercel"}
                    onCite={(c) => onCite?.(c)}
                  />
                )}
              </div>
            ))}

          {/* Document windows — one per open doc, each hidden when not active */}
          {windows
            .filter((w) => w.type === "document")
            .map((w) => (
              <div
                key={w.id}
                className="h-full overflow-y-auto"
                style={{ display: activeId === w.id ? undefined : "none" }}
              >
                {relSummaries?.[w.id] ? (
                  <div className="h-full overflow-y-auto custom-scrollbar p-7 bg-white dark:bg-[#0f172a]">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-500 mb-3">🔗 {relSummaries[w.id].title}</p>
                    {relSummaries[w.id].loading ? (
                      <div className="mt-1">
                        <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(120,120,150,0.18)" }}>
                          <div className="h-full rounded-full animate-pulse" style={{ width: "55%", background: "linear-gradient(90deg,#8b5cf6,#22d3ee)" }} />
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-white/40 mt-2 italic">Relacionando os dois trabalhos…</p>
                      </div>
                    ) : (
                      <div className="text-[14px] leading-relaxed text-slate-800 dark:text-white/90"><RichText text={relSummaries[w.id].text} reveal /></div>
                    )}
                  </div>
                ) : (
                  documentWindowContent
                )}
              </div>
            ))}

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

      </div>

      {/* ──────── RIGHT PANEL (30%) — no mobile vira bloco abaixo, limitado e rolável ──────── */}
      <div style={mobile ? { maxHeight: "40vh", minHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column" } : { display: "contents" }}>
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
        onNewWork={onNewWork}
        onDeleteWork={onDeleteWork}
        onRelate={onRelate}
        onView={(f) => onViewDoc?.(f.id)}
        flipped={flipped}
      />
      </div>
    </div>
  );
}
