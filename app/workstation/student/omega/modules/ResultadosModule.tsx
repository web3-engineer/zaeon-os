"use client";

/**
 * ResultadosModule — TODOS os artigos descobertos na pesquisa (deduplicados nas 5 fontes),
 * não só os que a IA citou no resumo (esses ficam em "Referências"). Aqui o usuário navega
 * a lista ampla e salva o que quiser na biblioteca. Cada card: título, autoria, ano, fonte,
 * links (PDF/DOI/fonte) e "Salvar na biblioteca".
 */
import { useState } from "react";
import { Library, Download, ExternalLink, Search } from "lucide-react";
import type { Paper } from "@/lib/scholar/types";
import { useLibraryFiles } from "@/lib/useLibraryFiles";

function ResultCard({ p }: { p: Paper }) {
  const { save, files } = useLibraryFiles();
  const [flash, setFlash] = useState(false);
  const paperId = p.doi ? `doi:${p.doi}` : p.id;
  const isSaved = files.some((f) => f.id === paperId);

  const handleSave = () => {
    save({
      id: paperId, title: p.title, pdfUrl: p.pdfUrl || "", source: p.sources?.[0],
      venue: p.venue, doi: p.doi, url: p.url, authors: p.authors, year: p.year, savedAt: Date.now(),
    });
    setFlash(true); setTimeout(() => setFlash(false), 1800);
  };

  const link = p.pdfUrl
    ? { href: `/api/ai/scholar/pdf?url=${encodeURIComponent(p.pdfUrl)}`, label: "PDF", icon: Download }
    : p.doi
    ? { href: `https://doi.org/${p.doi}`, label: "DOI", icon: ExternalLink }
    : p.url
    ? { href: p.url, label: "Fonte", icon: ExternalLink }
    : null;

  const meta = [p.authors?.slice(0, 3).join(", ") + (p.authors?.length > 3 ? " et al." : ""), p.year, p.venue]
    .filter(Boolean).join(" · ");

  return (
    <div className="rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-black/8 dark:border-white/12 p-4 space-y-2">
      <p className="font-bold text-sm md:text-base text-slate-800 dark:text-white leading-snug">{p.title}</p>
      {meta && <p className="text-[12px] text-slate-500 dark:text-white/50">{meta}</p>}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {p.openAccess && (
          <span className="text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">Acesso aberto</span>
        )}
        {typeof p.citationCount === "number" && p.citationCount > 0 && (
          <span className="text-[10px] text-slate-400 dark:text-white/40">{p.citationCount} citações</span>
        )}
        <span className="flex-1" />
        {link && (
          <a href={link.href} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-700 dark:text-cyan-300 hover:underline">
            <link.icon size={12} /> {link.label}
          </a>
        )}
        <button
          onClick={handleSave}
          disabled={isSaved}
          className={`inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full transition-colors ${
            isSaved || flash ? "bg-emerald-600 text-white" : "bg-cyan-600 hover:bg-cyan-500 text-white"
          }`}
        >
          <Library size={12} /> {isSaved || flash ? "Salvo ✓" : "Salvar"}
        </button>
      </div>
    </div>
  );
}

export default function ResultadosModule({ results }: { results: Paper[] }) {
  if (!results || results.length === 0) {
    return (
      <div className="text-center text-slate-400 dark:text-white/30 text-sm py-12">
        <Search size={20} className="mx-auto mb-2 opacity-50" />
        Faça uma pesquisa — aqui aparecem TODOS os artigos encontrados (não só os citados no resumo).
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-bold text-slate-500 dark:text-white/50">
        {results.length} artigos encontrados nas bases científicas — salve os que quiser na sua biblioteca.
      </p>
      {results.map((p, i) => <ResultCard key={p.id || i} p={p} />)}
    </div>
  );
}
