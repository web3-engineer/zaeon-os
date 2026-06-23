"use client";
import { useState } from "react";
import { CheckCircle2, FileText, Download, Library } from "lucide-react";
import PdfViewerModal from "../PdfViewerModal";
import type { EvidenceRecord, Paper } from "@/lib/scholar/types";
import { useLibraryFiles } from "@/lib/useLibraryFiles";

function locatorLabel(l?: EvidenceRecord["locator"]) {
  if (!l) return "";
  if (l.kind === "pdf") return `Página ${l.page}`;
  if (l.kind === "fulltext") return l.section ? `Seção ${l.section}` : `Parágrafo ${l.paragraph}`;
  return "Resumo";
}

function PaperCard({ p, evidence, onOpenViewer }: {
  p: Paper;
  evidence: EvidenceRecord[];
  onOpenViewer: (url: string, page: number, quote: string) => void;
}) {
  const { save, files } = useLibraryFiles();
  const [savedFeedback, setSavedFeedback] = useState(false);

  const paperId = p.doi ? `doi:${p.doi}` : p.id;
  const isSaved = files.some((f) => f.id === paperId);

  // Salva o ARQUIVO (só quando há pdfUrl) na biblioteca → aba "pesquisa".
  function handleSave() {
    if (!p.pdfUrl) return;
    save({
      id: paperId,
      title: p.title,
      pdfUrl: p.pdfUrl,
      source: p.sources?.[0],
      venue: p.venue,
      doi: p.doi,
      url: p.url,
      authors: p.authors,
      year: p.year,
      savedAt: Date.now(),
    });
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 1800);
  }

  // Determine the primary download/open link
  const downloadLink = p.pdfUrl
    ? { href: `/api/ai/scholar/pdf?url=${encodeURIComponent(p.pdfUrl)}`, label: "Baixar PDF" }
    : p.doi
    ? { href: `https://doi.org/${p.doi}`, label: "Abrir DOI" }
    : p.url
    ? { href: p.url, label: "Abrir fonte" }
    : null;

  const verifiedEvidence = evidence.filter((e) => e.paperId === p.id && e.verified);

  return (
    <div className="rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-black/8 dark:border-white/12 p-5 space-y-3">
      {/* Trecho verificado — agora NO TOPO (o trecho da referência vem primeiro) */}
      {verifiedEvidence.length > 0 && (
        <div className="space-y-2">
          {verifiedEvidence.map((e, i) => (
            <div key={i} className="rounded-xl bg-black/[0.03] dark:bg-black/30 border-l-2 border-violet-500 p-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2 py-0.5">
                  <CheckCircle2 size={10} /> VERIFICADO
                </span>
                <span className="text-[9px] text-slate-400">{locatorLabel(e.locator)} · confiança {e.confidence}</span>
              </div>
              <p className="text-base md:text-lg leading-relaxed text-slate-700 dark:text-white/70 mt-1.5">{e.claim}</p>
              <p className="text-[11px] italic text-slate-500 dark:text-white/50 mt-1 bg-violet-500/5 rounded-lg px-2 py-1.5">&quot;{e.quote}&quot;</p>
              {p.pdfUrl && e.locator?.kind === "pdf" && (
                <button
                  onClick={() => onOpenViewer(p.pdfUrl!, (e.locator as any).page, e.quote)}
                  className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-blue-500 hover:underline"
                >
                  <FileText size={11} /> ver no paper (pág. {(e.locator as any).page})
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* A referência em si — título/autores + botões (a "forma de escrita" vem ABAIXO do trecho) */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-slate-800 dark:text-white leading-snug">{p.title}</p>
          {/* Authors — prominent */}
          {p.authors.length > 0 && (
            <p className="text-xs text-violet-700 dark:text-violet-300 mt-1 font-medium">
              {p.authors.slice(0, 5).join(", ")}{p.authors.length > 5 ? " et al." : ""}
            </p>
          )}
          <p className="text-[11px] text-slate-500 dark:text-white/40 mt-0.5">
            {p.venue ? `${p.venue} · ` : ""}{p.year ?? ""}
            {p.doi ? ` · doi:${p.doi}` : p.arxivId ? ` · arXiv:${p.arxivId}` : ""}
          </p>
        </div>
        {/* Action buttons */}
        <div className="shrink-0 flex items-center gap-1.5">
          {downloadLink && (
            <a
              href={downloadLink.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-600 dark:text-violet-400 border border-violet-300/50 rounded-full px-3 py-1.5 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
            >
              <Download size={11} /> {downloadLink.label}
            </a>
          )}
          {/* Salvar arquivo na biblioteca — só quando há arquivo (pdfUrl) */}
          {p.pdfUrl && (
            <button
              onClick={handleSave}
              disabled={savedFeedback}
              title={isSaved ? "Arquivo na biblioteca" : "Salvar arquivo na biblioteca"}
              className={`inline-flex items-center gap-1 text-[10px] font-bold border rounded-full px-3 py-1.5 transition-colors ${
                isSaved || savedFeedback
                  ? "text-emerald-600 dark:text-emerald-400 border-emerald-300/50 bg-emerald-50 dark:bg-emerald-900/20"
                  : "text-slate-500 dark:text-white/40 border-slate-300/40 hover:text-violet-600 hover:border-violet-300/50 hover:bg-violet-50 dark:hover:bg-violet-900/20"
              }`}
            >
              <Library size={11} /> {isSaved || savedFeedback ? "Na biblioteca ✓" : "Salvar na biblioteca"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReferencesModule({ references, evidence }:
  { references: Paper[]; evidence: EvidenceRecord[] }) {
  const [viewer, setViewer] = useState<{ url: string; page: number; quote: string } | null>(null);

  return (
    <div className="space-y-4">
      {references.map((p) => (
        <PaperCard
          key={p.id}
          p={p}
          evidence={evidence}
          onOpenViewer={(url, page, quote) => setViewer({ url, page, quote })}
        />
      ))}
      {viewer && (
        <PdfViewerModal
          pdfUrl={viewer.url}
          page={viewer.page}
          quote={viewer.quote}
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  );
}
