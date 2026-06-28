"use client";
import { useState } from "react";
import { useSavedCitations, type SavedCitation } from "@/lib/useSavedCitations";
import MetadataModal from "./MetadataModal";

/**
 * Citações no PAINEL DIREITO (não vazam pro editor). Notinhas arrastáveis pro texto.
 * - Rascunho incompleto (sem metadados) → botão "Completar referência" abre o modal.
 * - Sugestão da Aura → botão "Aplicar" recita com o recorte melhor e atualiza a nota.
 */
export default function CitationsPanel() {
  const { citations, save, remove } = useSavedCitations();
  const [completing, setCompleting] = useState<SavedCitation | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const applySuggestion = async (cit: SavedCitation) => {
    if (!cit.suggestedText) return;
    setApplyingId(cit.id);
    try {
      const r = await fetch("/api/ai/cite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: cit.suggestedText,
          page: cit.page,
          source: { title: cit.title, authors: cit.authors, year: cit.year, venue: cit.venue, doi: cit.doi, url: cit.url },
        }),
      }).then((res) => res.json());
      if (r?.ok && r.abnt) {
        save({ ...cit, abnt: r.abnt, quote: r.inline, sourceText: cit.suggestedText, suggestion: undefined, suggestedText: undefined });
      }
    } catch { /* mantém a citação como está */ }
    setApplyingId(null);
  };

  // Apagar no painel direito → some também do trabalho (frase + referência). Correlação total.
  const handleDelete = (cit: SavedCitation) => {
    window.dispatchEvent(
      new CustomEvent("zaeon:citationRemove", { detail: { id: cit.id, quote: cit.quote, abnt: cit.abnt } }),
    );
    remove(cit.id);
  };

  return (
    <div className="flex flex-col gap-3 pb-1">
      {citations.length === 0 && (
        <p className="text-[10px] text-white/35 italic text-center py-4">Nenhuma citação salva ainda.</p>
      )}

      {citations.map((cit) => {
        const draggable = !cit.incomplete && !!cit.quote;
        return (
          <div
            key={cit.id}
            draggable={draggable}
            onDragStart={(e) => {
              if (!draggable) return;
              const payload = JSON.stringify({ id: cit.id, quote: cit.quote || cit.abnt, abnt: cit.abnt });
              e.dataTransfer.setData("text/zaeon-citation", payload);
              e.dataTransfer.setData("text/plain", cit.quote || cit.abnt);
              e.dataTransfer.effectAllowed = "copy";
            }}
            title={draggable ? "Arraste para o seu texto" : "Complete a referência para poder arrastar"}
            className={`group relative rounded-[10px] p-2.5 transition-colors ${draggable ? "cursor-grab active:cursor-grabbing hover:bg-white/[0.09]" : ""}`}
            style={{ background: cit.incomplete ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.05)", border: cit.incomplete ? "1px solid rgba(239,68,68,0.55)" : "1px solid rgba(255,255,255,0.10)" }}
          >
            {/* STATUS (canto inferior ESQUERDO): ＋ = ainda não usada · ✓ = já colada no trabalho */}
            {!cit.incomplete && (
              <span
                title={cit.used ? "Em uso no seu trabalho" : "Ainda não usada — arraste pro texto"}
                className="absolute -bottom-1.5 -left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[12px] leading-none text-white z-10"
                style={{
                  background: cit.used ? "rgba(34,197,94,0.95)" : "rgba(34,197,94,0.55)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  boxShadow: cit.used ? "0 4px 10px -4px rgba(34,197,94,0.8)" : "none",
                }}
              >
                {cit.used ? "✓" : "+"}
              </span>
            )}

            {/* excluir (canto inferior DIREITO, no hover) — apaga aqui E no trabalho */}
            <button
              onClick={() => handleDelete(cit)}
              title="Excluir citação (some também do trabalho)"
              className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[11px] text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
              style={{ background: "rgba(239,68,68,0.92)", border: "1px solid rgba(255,255,255,0.3)" }}
            >
              ×
            </button>

            {cit.incomplete ? (
              <>
                <p className="text-[8.5px] font-black uppercase tracking-widest text-red-400 mb-1">🔴 Sem fonte válida — não está sendo creditada</p>
                <p className="text-[10px] text-white/70 italic leading-snug line-clamp-3">"{(cit.sourceText || cit.quote || "").slice(0, 140)}"</p>
                <button
                  onClick={() => setCompleting(cit)}
                  className="mt-2 text-[9px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full text-white"
                  style={{ background: "linear-gradient(180deg,#ef4444,#b91c1c)" }}
                >
                  Creditar fonte
                </button>
              </>
            ) : (
              <>
                <div className="flex items-start gap-1.5">
                  <span className="text-white/25 text-[11px] leading-none mt-0.5 select-none">⠿</span>
                  <p className="text-[10px] text-white/85 leading-snug flex-1 line-clamp-4">{cit.abnt}</p>
                </div>
                {cit.page && cit.pdfUrl && (
                  <button
                    onClick={() =>
                      window.dispatchEvent(
                        new CustomEvent("zaeon:gotoSource", {
                          detail: { pdfUrl: cit.pdfUrl, page: cit.page },
                        }),
                      )
                    }
                    title="Ir à fonte no PDF (precisa estar aberto)"
                    className="mt-1.5 text-[9px] font-bold text-cyan-300/90 hover:text-cyan-200 inline-flex items-center gap-1"
                  >
                    ↗ ir à fonte (p. {cit.page})
                  </button>
                )}
                {cit.suggestion && cit.suggestedText && (
                  <div className="mt-2 pt-2 border-t border-white/10">
                    <p className="text-[9px] text-violet-300/90 leading-snug mb-1">✦ {cit.suggestion}</p>
                    <button
                      onClick={() => applySuggestion(cit)}
                      disabled={applyingId === cit.id}
                      className="text-[9px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full text-white disabled:opacity-50"
                      style={{ background: "linear-gradient(180deg,#8b5cf6,#6d28d9)" }}
                    >
                      {applyingId === cit.id ? "Aplicando…" : "Aplicar sugestão"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      {citations.some((c) => !c.incomplete && c.quote) && (
        <p className="text-[8.5px] text-white/30 text-center mt-1 leading-snug">
          ⠿ arraste uma citação pro texto — a frase entra no cursor, a referência vai pras Referências.
        </p>
      )}

      {completing && (
        <MetadataModal
          sourceText={completing.sourceText || completing.quote || ""}
          page={completing.page}
          existingId={completing.id}
          initial={{
            title: completing.have?.title || completing.title,
            authors: completing.have?.authors || completing.authors,
            year: completing.have?.year || completing.year,
            container: completing.have?.container || completing.venue,
            doi: completing.have?.doi || completing.doi,
            url: completing.have?.url || completing.url,
          }}
          fileMeta={{ title: completing.title, pdfUrl: completing.pdfUrl, url: completing.url }}
          onResolved={(c) => { save(c); setCompleting(null); }}
          onCancel={() => setCompleting(null)}
        />
      )}
    </div>
  );
}
