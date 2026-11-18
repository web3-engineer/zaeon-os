"use client";
import { registroDuravel, useLibraryFiles, type LibraryFile } from "@/lib/useLibraryFiles";
import DocIcon from "./DocIcon";
import CitationsPanel from "./CitationsPanel";
import DraggableDock from "./DraggableDock";
import type { DockItem } from "./DraggableDock";
import { useTrash } from "@/lib/useTrash";
import { useEffect, useState, type DragEvent } from "react";
import dynamic from "next/dynamic";

import { usePersona } from "@/components/research/usePersona";

/** a AVATAR da IA no lugar dos documentos (components/research/ZaeonDocumentos — three + o VRM: só no computador). Os
 *  arquivos ficam na PASTA (📁, como sempre); a avatar só reage a um arquivo jogado nela */
const ZaeonDocumentos = dynamic(() => import("@/components/research/ZaeonDocumentos"), { ssr: false });
const naoCelular = () => typeof window !== "undefined" && (window.matchMedia?.("(pointer: fine)").matches ?? false) && window.innerWidth >= 768;

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
  /** PUBLICAR um trabalho na vitrine como PASTA de pesquisa (lib/estudos/pesquisas) — só a Sala de Pesquisa liga. */
  onPublishWork?: (id: string) => void;
  /** o status de cada trabalho já mandado pra vitrine (workId → pendente/publicada/recusada) */
  publicacoes?: Record<string, { status: string; motivo?: string | null }>;
  /** Arrastar um doc sobre outro → relacionar as pesquisas. */
  onRelate?: (sourceId: string, targetId: string) => void;
  /** Abrir o PDF na folha (＋ verde / soltar na folha). */
  onView?: (file: LibraryFile) => void;
  /** PDFs soltos no painel (do computador) → guardar, abrir no leitor e anexar ao chat */
  onDropFiles?: (files: File[]) => void;
  /** Layout espelhado (canhoto) — o painel de documentos vai pra esquerda. */
  flipped?: boolean;
  /** Itens da pasta arrastáveis (mime do dataTransfer = este; valor = o id) — ex.: estudo → foco na conversa. */
  sessionDragMime?: string;
  /** Nome da pasta (padrão "📁 Minhas coisas"). */
  rotuloPasta?: string;
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
  onPublishWork,
  publicacoes,
  onRelate,
  onView,
  onDropFiles,
  flipped,
  sessionDragMime,
  rotuloPasta = "📁 Minhas coisas",
}: DocumentDesktopProps) {
  const { files, save: saveLibraryFile, remove: removeLibraryFile } = useLibraryFiles();
  const { items: trashItems, trash, restore, purge } = useTrash();
  const [showTrash, setShowTrash] = useState(false);
  // a vista padrão: a AVATAR do agente (no computador; o Octa Code não tem) ou a grade de sempre
  const persona = usePersona();
  const [computador, setComputador] = useState(false);
  useEffect(() => { setComputador(naoCelular()); }, []);
  const comAvatar = computador && persona !== null;
  // cada arquivo jogado NA AVATAR: ela reage (lê ou pensa)
  const [reacao, setReacao] = useState(0);
  const activeFile = processingFileId ? files.find((f) => f.id === processingFileId) : null;

  const handleDelete = (f: LibraryFile) => { removeLibraryFile(f.id); trash(registroDuravel(f)); };
  const handleRestore = (id: string) => { const it = restore(id); if (it) { const { deletedAt, ...rest } = it; saveLibraryFile(rest); } };

  // A5: arrastar um PDF pra dentro do painel → o mesmo caminho do ＋/📎: guarda, abre no leitor e o chat lê.
  const [dragOver, setDragOver] = useState(false);
  const handleDropPdf = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const pdfs = Array.from(e.dataTransfer.files || []).filter((f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name));
    if (pdfs.length) onDropFiles?.(pdfs);
    if (comAvatar && !showFolder && !showTrash && openPopover !== "citations" && (pdfs.length || e.dataTransfer.types.length)) setReacao((n) => n + 1);
  };

  // Honest two-stage progress: 25% while downloading PDF, 70% while AI analyses, 100% when done.
  const progress = processingStage === "pdf" ? 25 : processingStage === "ai" ? 70 : 100;
  const stageLabel =
    processingStage === "pdf"
      ? "Baixando PDF…"
      : processingStage === "ai"
      ? "Analisando com IA…"
      : "Concluído";

  // Fixed dock order: upload → folder → citations → trash
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
    { id: "trash", emoji: "🗑️", label: "Lixeira", badge: trashItems.length, active: showTrash },
  ];

  const handleDockAction = (id: string) => {
    if (id === "add") return onAdd?.();
    if (id === "trash") { onTogglePopover(null); return setShowTrash((v) => !v); }
    if (id === "folder") { setShowTrash(false); onTogglePopover(null); return onToggleFolder(); }
    if (id === "citations") { setShowTrash(false); return onTogglePopover(openPopover === "citations" ? null : "citations"); }
  };

  return (
    <div
      data-tour="docs-panel"
      // (com a AVATAR à vista, qualquer coisa arrastada pode cair nela — um PDF do computador ou um doc da biblioteca)
      onDragOver={(e) => { if (Array.from(e.dataTransfer.types).includes("Files") || (comAvatar && !showFolder && !showTrash && openPopover !== "citations")) { e.preventDefault(); setDragOver(true); } }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDropPdf}
      className={`rounded-[18px] flex flex-col p-3 overflow-hidden min-h-0 ${flipped ? "order-1" : ""} ${dragOver ? "ring-2 ring-cyan-400/70" : ""}`}
      style={{
        background: "rgba(255,255,255,0.045)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
      }}
    >
      {/* Sem o rótulo "Documentos" na vista padrão (pedido do dono) — o título só aparece quando diz ONDE se está. */}
      {(openPopover === "citations" || showTrash || showFolder) && (
      <h3
        className="text-[9px] font-black uppercase tracking-[0.16em] mb-2.5 flex items-center gap-1.5 shrink-0"
        style={{ color: "#9595b4" }}
      >
        {openPopover === "citations" ? "🔖 Citações salvas" : showTrash ? "🗑️ Lixeira" : rotuloPasta}
      </h3>
      )}

      {/* Content: citações / lixeira / pastas / grid de docs. A AVATAR fica sempre montada no mesmo espaço e só se
          esconde enquanto um ícone (📁 🔖 🗑️) está aberto — clicar de novo a traz de volta sem recarregar o 3D */}
      <div className="flex-1 overflow-y-auto min-h-0 relative">
        {comAvatar && (
          <div className={openPopover === "citations" || showTrash || showFolder ? "hidden" : "h-full"}>
            <ZaeonDocumentos persona={persona} lendo={!!processingFileId} reagir={reacao} />
          </div>
        )}
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
            {sessions.length === 0 && (
              <p className="text-[10px] text-white/35 italic text-center mt-4">
                Nada salvo ainda. Dê um título ao seu trabalho que ele aparece aqui.
              </p>
            )}
            {sessions.map((s) => (
              <div
                key={s.id}
                draggable={!!sessionDragMime}
                onDragStart={sessionDragMime ? (e) => { e.dataTransfer.setData(sessionDragMime, s.id); e.dataTransfer.effectAllowed = "copy"; } : undefined}
                className={`group relative rounded-[10px] hover:bg-white/[0.08] transition-colors ${sessionDragMime ? "cursor-grab active:cursor-grabbing" : ""}`}
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <button onClick={() => onOpenSession(s.id)} className="text-left w-full px-3 py-2 text-[10.5px] text-white/80">
                  <p className="font-semibold line-clamp-1 pr-5">{s.title}</p>
                  {s.updatedAt && <p className="text-white/35 text-[9px] mt-0.5">{s.updatedAt}</p>}
                  {publicacoes?.[s.id] && (
                    <p
                      className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider ${publicacoes[s.id].status === "publicada" ? "bg-emerald-400/15 text-emerald-300" : publicacoes[s.id].status === "recusada" ? "bg-rose-400/15 text-rose-300" : "bg-amber-400/15 text-amber-200"}`}
                      title={publicacoes[s.id].status === "recusada" ? publicacoes[s.id].motivo || "recusada pelo admin" : undefined}
                    >
                      {publicacoes[s.id].status === "publicada" ? "▤ na vitrine" : publicacoes[s.id].status === "recusada" ? "▤ recusada" : "▤ na fila da vitrine"}
                    </p>
                  )}
                </button>
                {onPublishWork && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onPublishWork(s.id); }}
                    title={publicacoes?.[s.id] ? "Mandar de novo pra vitrine (atualiza a cópia)" : "Publicar na vitrine como pasta de pesquisa"}
                    className="absolute top-1.5 right-6 opacity-0 group-hover:opacity-100 text-white/35 hover:text-cyan-300 text-[11px] leading-none"
                  >
                    ▤
                  </button>
                )}
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
        ) : comAvatar ? null : (
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
                onRelate={onRelate}
                onDelete={handleDelete}
                onView={onView}
              />
            ))}
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
