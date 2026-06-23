"use client";
import { useLibraryFiles, type LibraryFile } from "@/lib/useLibraryFiles";
import { useFolders } from "@/lib/useFolders";
import DocIcon from "./DocIcon";
import CitationsPanel from "./CitationsPanel";
import DraggableDock from "./DraggableDock";
import type { DockItem } from "./DraggableDock";
import { useTrash } from "@/lib/useTrash";
import { useState } from "react";

interface DocumentDesktopProps {
  processingFileId: string | null;
  /** Two-stage progress: "pdf" → "ai" → null (done). */
  processingStage?: "pdf" | "ai" | null;
  onPlayFile: (file: LibraryFile) => void;
  /** Wire to the hidden file input in page.tsx */
  onAdd?: () => void;
  openPopover: "citations" | "quiz" | null;
  onTogglePopover: (id: "citations" | "quiz" | null) => void;
  citationCount: number;
  showFolder: boolean;
  onToggleFolder: () => void;
  sessions: { id: string; title: string; updatedAt?: string }[];
  onOpenSession: (id: string) => void;
  /** "Minhas coisas": novo trabalho / excluir trabalho. */
  onNewWork?: () => void;
  onDeleteWork?: (id: string) => void;
  /** Arrastar um doc sobre outro → relacionar as pesquisas. */
  onRelate?: (sourceId: string, targetId: string) => void;
  /** Abrir o PDF na folha (＋ verde / soltar na folha). */
  onView?: (file: LibraryFile) => void;
  /** Layout espelhado (canhoto) — o painel de documentos vai pra esquerda. */
  flipped?: boolean;
}

export default function DocumentDesktop({
  processingFileId,
  processingStage,
  onPlayFile,
  onAdd,
  openPopover,
  onTogglePopover,
  citationCount,
  showFolder,
  onToggleFolder,
  sessions,
  onOpenSession,
  onNewWork,
  onDeleteWork,
  onRelate,
  onView,
  flipped,
}: DocumentDesktopProps) {
  const { files, save: saveLibraryFile, remove: removeLibraryFile, moveToFolder } = useLibraryFiles();
  const { folders, create: createFolder, remove: removeFolder } = useFolders();
  const { items: trashItems, trash, restore, purge } = useTrash();
  const [showTrash, setShowTrash] = useState(false);
  // Documentos: pasta aberta + realce de drop ("root" = soltar pra TIRAR da pasta).
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const activeFile = processingFileId ? files.find((f) => f.id === processingFileId) : null;

  const handleDelete = (f: LibraryFile) => { removeLibraryFile(f.id); trash(f); };
  const handleRestore = (id: string) => { const it = restore(id); if (it) { const { deletedAt, ...rest } = it; saveLibraryFile(rest); } };
  const handleNewFolder = () => {
    const name = window.prompt("Nome da nova pasta:");
    if (name && name.trim()) createFolder(name.trim());
  };
  const handleDeleteFolder = (id: string, name: string) => {
    if (window.confirm(`Apagar a pasta "${name}"? Os documentos dentro voltam pra "Documentos".`)) {
      removeFolder(id);
      if (openFolderId === id) setOpenFolderId(null);
    }
  };
  // Pasta aberta (se a pasta foi apagada, cai de volta pra raiz).
  const openFolder = openFolderId ? folders.find((f) => f.id === openFolderId) ?? null : null;
  // "Soltos" = sem pasta ou com pasta inexistente (ex.: pasta apagada).
  const looseFiles = files.filter((f) => !f.folderId || !folders.some((fo) => fo.id === f.folderId));
  const folderFiles = openFolder ? files.filter((f) => f.folderId === openFolder.id) : [];

  // Honest two-stage progress: 25% while downloading PDF, 70% while AI analyses, 100% when done.
  const progress = processingStage === "pdf" ? 25 : processingStage === "ai" ? 70 : 100;
  const stageLabel =
    processingStage === "pdf"
      ? "Baixando PDF…"
      : processingStage === "ai"
      ? "Analisando com IA…"
      : "Concluído";

  // Fixed dock order: upload → folder → citations → quiz
  const dockItems: DockItem[] = [
    { id: "add", emoji: "＋", label: "Enviar PDF" },
    { id: "folder", emoji: "📁", label: "Minhas coisas", active: showFolder },
    {
      id: "citations",
      emoji: "🔖",
      label: "Citações salvas",
      badge: citationCount,
      active: openPopover === "citations",
    },
    { id: "quiz", emoji: "🧠", label: "Quiz", active: openPopover === "quiz" },
    { id: "trash", emoji: "🗑️", label: "Lixeira", badge: trashItems.length, active: showTrash },
  ];

  const handleDockAction = (id: string) => {
    if (id === "add") return onAdd?.();
    if (id === "trash") { onTogglePopover(null); return setShowTrash((v) => !v); }
    if (id === "folder") { setShowTrash(false); onTogglePopover(null); return onToggleFolder(); }
    if (id === "citations") { setShowTrash(false); return onTogglePopover(openPopover === "citations" ? null : "citations"); }
    if (id === "quiz")
      return onTogglePopover(openPopover === "quiz" ? null : "quiz");
  };

  return (
    <div
      data-tour="docs-panel"
      className={`rounded-[18px] flex flex-col p-3 overflow-hidden min-h-0 ${flipped ? "order-1" : ""}`}
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
        {openPopover === "citations" ? "🔖 Citações salvas" : showTrash ? "🗑️ Lixeira" : showFolder ? "📁 Minhas coisas" : "🗂️ Documentos"}
      </h3>

      {/* Content: citações / lixeira / pastas / grid de docs */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {openPopover === "citations" ? (
          <CitationsPanel />
        ) : showTrash ? (
          <div className="flex flex-col gap-1.5">
            {trashItems.length === 0 && (
              <p className="text-[10px] text-white/35 italic text-center mt-4">Lixeira vazia.</p>
            )}
            {trashItems.map((t) => (
              <div key={t.id} className="rounded-[10px] px-3 py-2 flex items-center gap-2" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                <p className="text-[10.5px] text-white/70 line-clamp-1 flex-1">{t.title}</p>
                <button onClick={() => handleRestore(t.id)} title="Restaurar" className="text-[9px] font-black uppercase text-cyan-400 hover:text-cyan-300 shrink-0">↺</button>
                <button onClick={() => purge(t.id)} title="Apagar de vez" className="text-[13px] text-white/30 hover:text-red-400 shrink-0 leading-none">×</button>
              </div>
            ))}
          </div>
        ) : showFolder ? (
          <div className="flex flex-col gap-1.5">
            {onNewWork && (
              <button
                onClick={onNewWork}
                className="text-left rounded-[10px] px-3 py-2 text-[10.5px] font-black uppercase tracking-wide text-cyan-300 hover:bg-cyan-400/10 transition-colors flex items-center gap-1.5"
                style={{ border: "1px dashed rgba(34,211,238,0.35)" }}
              >
                ＋ Novo trabalho
              </button>
            )}
            <button
              onClick={handleNewFolder}
              className="text-left rounded-[10px] px-3 py-2 text-[10.5px] font-black uppercase tracking-wide text-violet-300 hover:bg-violet-400/10 transition-colors flex items-center gap-1.5"
              style={{ border: "1px dashed rgba(167,139,250,0.35)" }}
            >
              ＋ Nova pasta
            </button>
            {folders.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {folders.map((fo) => {
                  const count = files.filter((f) => f.folderId === fo.id).length;
                  return (
                    <div key={fo.id} className="group relative rounded-[10px] hover:bg-white/[0.08] transition-colors" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div className="px-3 py-2 text-[10.5px] text-white/80 flex items-center gap-1.5">
                        <span>📁</span>
                        <span className="font-semibold line-clamp-1 flex-1 pr-5">{fo.name}</span>
                        <span className="text-white/35 text-[9px] shrink-0">{count}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteFolder(fo.id, fo.name)}
                        title="Apagar pasta"
                        className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 text-[13px] leading-none"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {sessions.length === 0 && (
              <p className="text-[10px] text-white/35 italic text-center mt-4">
                Nada salvo ainda. Dê um título ao seu trabalho que ele aparece aqui.
              </p>
            )}
            {sessions.map((s) => (
              <div
                key={s.id}
                className="group relative rounded-[10px] hover:bg-white/[0.08] transition-colors"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <button onClick={() => onOpenSession(s.id)} className="text-left w-full px-3 py-2 text-[10.5px] text-white/80">
                  <p className="font-semibold line-clamp-1 pr-5">{s.title}</p>
                  {s.updatedAt && <p className="text-white/35 text-[9px] mt-0.5">{s.updatedAt}</p>}
                </button>
                {onDeleteWork && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteWork(s.id); }}
                    title="Excluir trabalho"
                    className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 text-[13px] leading-none"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}

            {/* Biblioteca — os PDFs salvos também moram aqui (com apagar) */}
            <div className="mt-3 pt-2.5 border-t border-white/10">
              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/30 mb-2">📚 Biblioteca</p>
              {files.length === 0 ? (
                <p className="text-[10px] text-white/35 italic text-center py-2">Nenhum documento ainda.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {files.map((f) => (
                    <DocIcon
                      key={f.id}
                      file={f}
                      onPlay={onPlayFile}
                      processingId={processingFileId}
                      onRelate={onRelate}
                      onDelete={handleDelete}
                      onView={onView}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : openFolder ? (
          // ── Dentro de uma pasta ──
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOpenFolderId(null)}
                // Soltar um doc aqui TIRA ele da pasta (volta pra "Documentos").
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverFolderId("root"); }}
                onDragLeave={() => setDragOverFolderId(null)}
                onDrop={(e) => { e.preventDefault(); setDragOverFolderId(null); const src = e.dataTransfer.getData("text/zaeon-file"); if (src) moveToFolder(src, null); }}
                title="Voltar (e solte um doc aqui pra tirar da pasta)"
                className={`text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-lg transition-colors ${dragOverFolderId === "root" ? "bg-cyan-400/20 text-cyan-200 ring-1 ring-cyan-400/50" : "text-cyan-300 hover:bg-cyan-400/10"}`}
              >
                ← Documentos
              </button>
              <span className="text-[10px] text-white/60 line-clamp-1">📁 {openFolder.name}</span>
            </div>
            {folderFiles.length === 0 ? (
              <p className="text-[10px] text-white/35 italic text-center py-4">
                Pasta vazia. Arraste um documento pra cá.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {folderFiles.map((f) => (
                  <DocIcon key={f.id} file={f} onPlay={onPlayFile} processingId={processingFileId} onRelate={onRelate} onDelete={handleDelete} onView={onView} />
                ))}
              </div>
            )}
          </div>
        ) : (
          // ── Documentos: pastas (alvo de drop) + documentos soltos ──
          <div className="flex flex-col gap-2.5">
            {folders.length > 0 && (
              <div className="grid grid-cols-2 gap-2.5">
                {folders.map((fo) => {
                  const count = files.filter((f) => f.folderId === fo.id).length;
                  const over = dragOverFolderId === fo.id;
                  return (
                    <div
                      key={fo.id}
                      onClick={() => setOpenFolderId(fo.id)}
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverFolderId(fo.id); }}
                      onDragLeave={() => setDragOverFolderId(null)}
                      onDrop={(e) => { e.preventDefault(); setDragOverFolderId(null); const src = e.dataTransfer.getData("text/zaeon-file"); if (src) moveToFolder(src, fo.id); }}
                      title={`Abrir "${fo.name}" · arraste um doc pra cá pra arquivar`}
                      className={`group relative rounded-[14px] p-3 text-center cursor-pointer transition-all duration-200 bg-white/5 border ${over ? "border-cyan-400 ring-2 ring-cyan-400/50 scale-[1.03]" : "border-white/[0.11] hover:border-cyan-400/40 hover:-translate-y-0.5"}`}
                      style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14)" }}
                    >
                      <div className="text-[26px] leading-none mb-1.5">📁</div>
                      <p className="text-[10px] font-semibold text-white/80 line-clamp-1 px-1">{fo.name}</p>
                      <p className="text-[8px] text-white/40 mt-0.5">{count} doc{count === 1 ? "" : "s"}</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteFolder(fo.id, fo.name); }}
                        title="Apagar pasta"
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[11px] text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        style={{ background: "rgba(239,68,68,0.92)", border: "1px solid rgba(255,255,255,0.3)" }}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {looseFiles.length === 0 && folders.length === 0 ? (
              <p className="col-span-2 text-[10px] text-white/35 italic text-center py-4">
                Nenhum documento ainda.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {looseFiles.map((f) => (
                  <DocIcon key={f.id} file={f} onPlay={onPlayFile} processingId={processingFileId} onRelate={onRelate} onDelete={handleDelete} onView={onView} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loading progress — two-stage, honest percentage */}
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
              className="h-full rounded-full"
              style={{
                width: `${progress}%`,
                transition: "width 0.9s ease-out",
                background: "linear-gradient(90deg,#8b5cf6,#22d3ee)",
                boxShadow: "0 0 8px rgba(34,211,238,.7)",
              }}
            />
          </div>
          <p className="text-[8px] mt-1" style={{ color: "#767692" }}>
            {stageLabel}
          </p>
        </div>
      )}

      {/* Dock — fixed order, no drag */}
      <div data-tour="dock" className="mt-auto pt-2.5 shrink-0">
        <DraggableDock items={dockItems} onAction={handleDockAction} />
      </div>
    </div>
  );
}
