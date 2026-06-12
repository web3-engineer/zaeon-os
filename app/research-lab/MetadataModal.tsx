"use client";
import { useState } from "react";
import type { SavedCitation } from "@/lib/useSavedCitations";

function newId(): string {
  try { if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID(); } catch {}
  return `cit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface MetaInitial {
  title?: string;
  authors?: string[];
  year?: string | number;
  container?: string;
  doi?: string;
  url?: string;
}

interface MetadataModalProps {
  /** Trecho cru a citar (a referência é montada a partir dos campos abaixo). */
  sourceText: string;
  page?: number;
  /** Pré-preenchimento (o que o motor conseguiu cruzar). */
  initial?: MetaInitial;
  /** Dados do arquivo de origem (pra completar a notinha salva). */
  fileMeta?: { title?: string; pdfUrl?: string; url?: string };
  /** Se for completar um rascunho existente, mantém o mesmo id. */
  existingId?: string;
  onResolved: (c: SavedCitation) => void;
  onCancel: () => void;
}

export default function MetadataModal({
  sourceText,
  page,
  initial,
  fileMeta,
  existingId,
  onResolved,
  onCancel,
}: MetadataModalProps) {
  const [authors, setAuthors] = useState((initial?.authors || []).join("\n"));
  const [title, setTitle] = useState(initial?.title || fileMeta?.title || "");
  const [year, setYear] = useState(initial?.year ? String(initial.year) : "");
  const [container, setContainer] = useState(initial?.container || "");
  const [doi, setDoi] = useState(initial?.doi || "");
  const [url, setUrl] = useState(initial?.url || fileMeta?.url || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const authorList = authors.split(/[\n;]/).map((a) => a.trim()).filter(Boolean);
  const canSubmit = authorList.length > 0 && title.trim() && year.trim();

  const submit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/ai/cite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sourceText,
          page,
          manual: { authors: authorList, title: title.trim(), year: year.trim(), container: container.trim(), doi: doi.trim(), url: url.trim() },
        }),
      }).then((res) => res.json());
      if (!r?.ok || !r.abnt) { setErr("Não consegui montar a referência. Confira os campos."); setBusy(false); return; }
      onResolved({
        id: existingId || newId(),
        abnt: r.abnt,
        quote: r.inline,
        title: title.trim() || fileMeta?.title || "Citação",
        authors: authorList,
        year: year.trim() ? Number(year.trim()) || undefined : undefined,
        venue: container.trim() || undefined,
        doi: doi.trim() || undefined,
        url: url.trim() || fileMeta?.url || undefined,
        pdfUrl: fileMeta?.pdfUrl,
        sourceText,
        page,
        suggestion: r.suggestion || undefined,
        suggestedText: r.suggestedText || undefined,
        incomplete: false,
        savedAt: Date.now(),
      });
    } catch {
      setErr("Falha ao montar a referência. Tente de novo.");
      setBusy(false);
    }
  };

  const field = "w-full rounded-[10px] px-3 py-2 text-[12px] text-white/90 outline-none";
  const fieldStyle = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)" } as const;
  const label = "text-[9px] font-black uppercase tracking-[0.14em] text-white/40 mb-1 block";

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div
        className="relative w-full max-w-md rounded-[18px] p-5 max-h-[88vh] overflow-y-auto custom-scrollbar"
        style={{
          background: "rgba(18,18,30,0.96)",
          border: "1px solid rgba(139,92,246,0.4)",
          backdropFilter: "blur(40px) saturate(160%)",
          boxShadow: "0 40px 100px -30px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.10)",
        }}
      >
        <div className="flex items-start justify-between mb-1">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-violet-300">✦ Faltam dados pra referência</p>
          <button onClick={onCancel} className="text-white/40 hover:text-white/80 text-lg leading-none">×</button>
        </div>
        <p className="text-[11px] text-white/55 leading-snug mb-4">
          Não deu pra cruzar os metadados deste material automaticamente. Preencha o essencial que a Aura monta a referência ABNT.
        </p>

        <div className="mb-3">
          <span className={label}>Autores (um por linha) *</span>
          <textarea value={authors} onChange={(e) => setAuthors(e.target.value)} rows={2} placeholder={"Sobrenome, Nome\nSobrenome, Nome"} className={field + " resize-none leading-snug"} style={fieldStyle} />
        </div>
        <div className="mb-3">
          <span className={label}>Título *</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={field} style={fieldStyle} />
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <span className={label}>Ano *</span>
            <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="2024" className={field} style={fieldStyle} />
          </div>
          <div>
            <span className={label}>Veículo / Periódico</span>
            <input value={container} onChange={(e) => setContainer(e.target.value)} className={field} style={fieldStyle} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div>
            <span className={label}>DOI</span>
            <input value={doi} onChange={(e) => setDoi(e.target.value)} className={field} style={fieldStyle} />
          </div>
          <div>
            <span className={label}>Link</span>
            <input value={url} onChange={(e) => setUrl(e.target.value)} className={field} style={fieldStyle} />
          </div>
        </div>

        {err && <p className="text-[11px] text-red-300 mb-3">{err}</p>}

        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-full text-[11px] font-black uppercase tracking-wide text-white/60 border border-white/15 hover:bg-white/5">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit || busy}
            className="flex-1 py-2.5 rounded-full text-[11px] font-black uppercase tracking-wide text-white transition-all disabled:opacity-40"
            style={{ background: "linear-gradient(180deg,#8b5cf6,#6d28d9)", boxShadow: "0 8px 20px -8px rgba(139,92,246,0.85)" }}
          >
            {busy ? "Montando…" : "Montar referência"}
          </button>
        </div>
      </div>
    </div>
  );
}
