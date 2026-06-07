"use client";
import { useState } from "react";
import { BookMarked, ExternalLink, X, Play, Pencil, Check, Loader2 } from "lucide-react";
import { useLibraryFiles, type LibraryFile } from "@/lib/useLibraryFiles";

// Subseção "Salvos das suas pesquisas" na aba pesquisa.
// Interativo: renomear o título (inline, minimalista) e dar play (conversar com o doc).
export default function LibrarySavedFiles({ onPlay, processingId }: {
  onPlay?: (file: LibraryFile) => void;
  processingId?: string | null;
}) {
  const { files, rename, remove } = useLibraryFiles();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  if (files.length === 0) return null;

  const startEdit = (f: LibraryFile) => { setEditingId(f.id); setDraft(f.title); };
  const commit = (id: string) => { rename(id, draft); setEditingId(null); };

  return (
    <div className="bg-slate-100 dark:bg-white/5 rounded-2xl p-4 mb-6 border border-slate-300 dark:border-white/10">
      <div className="flex items-center gap-2 mb-3">
        <BookMarked className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
        <span className="text-[11px] font-black uppercase tracking-widest text-black dark:text-white">
          Salvos das suas pesquisas <span className="text-cyan-600 dark:text-cyan-400">({files.length})</span>
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {files.map((f) => {
          const meta = [f.source, f.venue, f.year].filter(Boolean).join(" · ");
          const href = `/api/ai/scholar/pdf?url=${encodeURIComponent(f.pdfUrl)}`;
          const busy = processingId === f.id;
          const editing = editingId === f.id;
          return (
            <div
              key={f.id}
              className="group relative rounded-xl bg-white/80 dark:bg-black/40 border border-slate-300/70 dark:border-white/10 p-3 pr-9 hover:border-cyan-400/50 transition-colors"
            >
              {/* Título — clicável para renomear (inline) */}
              {editing ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") commit(f.id); if (e.key === "Escape") setEditingId(null); }}
                    onBlur={() => commit(f.id)}
                    className="flex-1 min-w-0 text-[12.5px] font-semibold bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-300/60 dark:border-cyan-400/30 rounded-md px-2 py-1 text-black dark:text-white outline-none"
                  />
                  <button onMouseDown={(e) => { e.preventDefault(); commit(f.id); }} title="Salvar título" className="shrink-0 p-1 text-emerald-600 dark:text-emerald-400">
                    <Check size={13} />
                  </button>
                </div>
              ) : (
                <button onClick={() => startEdit(f)} title="Clique para renomear" className="flex items-start gap-1 text-left w-full">
                  <span className="text-[12.5px] font-semibold text-black dark:text-white/90 leading-snug line-clamp-2">{f.title}</span>
                  <Pencil size={10} className="shrink-0 mt-1 text-slate-300 dark:text-white/25 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}

              {meta && <p className="mt-0.5 text-[10px] text-slate-500 dark:text-white/40 truncate">{meta}</p>}

              <div className="mt-2 flex items-center gap-3">
                {/* Play — conversar com o documento */}
                {onPlay && (
                  <button
                    onClick={() => onPlay(f)}
                    disabled={busy}
                    title="Conversar com este documento"
                    className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full bg-cyan-600 text-white hover:bg-cyan-500 disabled:opacity-60 transition-colors"
                  >
                    {busy ? <><Loader2 size={11} className="animate-spin" /> abrindo…</> : <><Play size={11} /> conversar</>}
                  </button>
                )}
                {/* Abrir/Baixar — secundário */}
                <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-white/45 hover:text-cyan-700 dark:hover:text-cyan-300">
                  <ExternalLink size={11} /> abrir
                </a>
              </div>

              <button
                onClick={() => remove(f.id)}
                title="Remover da biblioteca"
                className="absolute top-2 right-2 p-1 rounded-md text-slate-400 dark:text-white/30 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
