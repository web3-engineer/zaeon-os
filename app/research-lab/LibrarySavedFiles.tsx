"use client";
import { BookMarked, ExternalLink, X } from "lucide-react";
import { useLibraryFiles } from "@/lib/useLibraryFiles";

// Subseção "Salvos das suas pesquisas" na aba pesquisa: arquivos (pdfUrl) salvos
// a partir das referências do Omega Scholar (useLibraryFiles / localStorage).
// O PDF é aberto/baixado sob demanda pelo proxy que já existe.
export default function LibrarySavedFiles() {
  const { files, remove } = useLibraryFiles();
  if (files.length === 0) return null;

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
          return (
            <div
              key={f.id}
              className="group relative rounded-xl bg-white/80 dark:bg-black/40 border border-slate-300/70 dark:border-white/10 p-3 pr-9 hover:border-cyan-400/50 transition-colors"
            >
              <p className="text-[12.5px] font-semibold text-black dark:text-white/90 leading-snug line-clamp-2">{f.title}</p>
              {meta && <p className="mt-0.5 text-[10px] text-slate-500 dark:text-white/40 truncate">{meta}</p>}
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-cyan-700 dark:text-cyan-300 hover:underline"
              >
                <ExternalLink size={11} /> Abrir / Baixar
              </a>
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
