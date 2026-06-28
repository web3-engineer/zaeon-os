"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/web/pdf_viewer.css";
import type { LibraryFile } from "@/lib/useLibraryFiles";
import type { SavedCitation } from "@/lib/useSavedCitations";
import { speakSequence, stop as ttsStop, cleanForSpeech } from "@/lib/voice/ttsController";
import ResearchReadingView from "./ResearchReadingView";

if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js";
}

interface PdfViewerProps {
  file: LibraryFile;
  mode: "vercel" | "gemini";
  onCite: (c: SavedCitation) => void;
}

function newId(): string {
  try { if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID(); } catch {}
  return `cit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function PdfViewer({ file, onCite }: PdfViewerProps) {
  const fileUrl = /^https?:\/\//i.test(file.pdfUrl)
    ? `/api/ai/scholar/pdf?url=${encodeURIComponent(file.pdfUrl)}`
    : file.pdfUrl;

  const pagesRef = useRef<HTMLDivElement>(null);
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [citing, setCiting] = useState(false);
  const [zoom, setZoom] = useState(1); // multiplicador sobre o "fit width"
  // metadados extraídos do próprio PDF (info dict)
  const pdfMeta = useRef<{ title?: string; authors?: string[] }>({});
  // hint da Aura + recorte sugerido + id da última citação (pra Aplicar atualizar a mesma nota)
  const [hint, setHint] = useState<{ msg: string; suggestedText: string; citId: string } | null>(null);
  const lastText = useRef<string>("");
  // Voz no PDF: lê o markdown estruturado (pdf-loader) com karaokê inline.
  const [readText, setReadText] = useState<string | null>(null);
  const [loadingRead, setLoadingRead] = useState(false);

  // ─────────── Render do PDF (pdf.js direto) ───────────
  useEffect(() => {
    let cancelled = false;
    const container = pagesRef.current;
    if (!container) return;
    container.innerHTML = "";
    setLoadingDoc(true);
    setLoadError(null);

    const task = pdfjsLib.getDocument({ url: fileUrl });
    (async () => {
      try {
        const pdf = await task.promise;
        if (cancelled) return;
        // extrai metadados do arquivo (Title/Author do info dict)
        try {
          const md: any = await pdf.getMetadata();
          const info = md?.info || {};
          const authors = info.Author
            ? String(info.Author).split(/\s*;\s*|\s*\/\s*/).map((s: string) => s.trim()).filter(Boolean)
            : [];
          pdfMeta.current = { title: info.Title ? String(info.Title).trim() : undefined, authors };
        } catch { /* sem metadados embutidos — tudo bem */ }

        const avail = (container.clientWidth || 700) - 24;
        for (let n = 1; n <= pdf.numPages; n++) {
          if (cancelled) break;
          const page = await pdf.getPage(n);
          const base = page.getViewport({ scale: 1 });
          const fit = Math.min(2, Math.max(0.5, avail / base.width));
          const viewport = page.getViewport({ scale: fit * zoom });
          const ratio = Math.min(2, window.devicePixelRatio || 1);

          const pageDiv = document.createElement("div");
          pageDiv.className = "zaeon-pdf-page";
          pageDiv.setAttribute("data-page", String(n));
          pageDiv.style.cssText = `position:relative;margin:0 auto 14px;width:${viewport.width}px;height:${viewport.height}px;box-shadow:0 6px 20px -8px rgba(0,0,0,.4);background:#fff;`;

          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width * ratio);
          canvas.height = Math.floor(viewport.height * ratio);
          canvas.style.cssText = `width:${viewport.width}px;height:${viewport.height}px;display:block;`;
          pageDiv.appendChild(canvas);

          const textLayerDiv = document.createElement("div");
          textLayerDiv.className = "textLayer";
          textLayerDiv.style.cssText = `width:${viewport.width}px;height:${viewport.height}px;`;
          pageDiv.appendChild(textLayerDiv);
          container.appendChild(pageDiv);

          const ctx = canvas.getContext("2d");
          if (ctx) { ctx.scale(ratio, ratio); await page.render({ canvasContext: ctx, viewport }).promise; }
          if (cancelled) break;
          const textContent = await page.getTextContent();
          if (cancelled) break;
          // @ts-expect-error — 3.4.120 aceita textContent (alias de textContentSource)
          pdfjsLib.renderTextLayer({ textContent, container: textLayerDiv, viewport, textDivs: [] });
        }
        if (!cancelled) setLoadingDoc(false);
      } catch (e: any) {
        if (!cancelled) {
          // 403/502 do proxy = a fonte saiu do ar ou recusou o download → mensagem acionável.
          const status = Number(e?.status);
          const msg = status === 403 || status === 502 || status === 404
            ? "Não consegui reabrir este arquivo — talvez a fonte tenha saído do ar. Baixe o PDF de novo e salve na biblioteca."
            : (e?.message || "Não foi possível abrir este PDF.");
          setLoadError(msg);
          setLoadingDoc(false);
        }
      }
    })();

    return () => { cancelled = true; try { task.destroy?.(); } catch {} };
  }, [fileUrl, zoom]);

  // ─────────── Citação ───────────
  function buildSource() {
    return {
      title: pdfMeta.current.title || file.title,
      authors: (pdfMeta.current.authors && pdfMeta.current.authors.length ? pdfMeta.current.authors : file.authors) ?? [],
      year: file.year,
      venue: file.venue,
      doi: file.doi,
      url: file.url || file.pdfUrl,
      source: file.source,
    };
  }

  function currentPage(): number | undefined {
    const sel = window.getSelection?.();
    const node = sel?.anchorNode as Node | null;
    let el = (node && (node.nodeType === 1 ? (node as Element) : node.parentElement)) || null;
    while (el && !el.classList?.contains("zaeon-pdf-page")) el = el.parentElement;
    const p = el?.getAttribute("data-page");
    return p ? Number(p) : undefined;
  }

  const runCite = useCallback(
    async (text: string, page?: number, presetId?: string) => {
      setCiting(true);
      setHint(null);
      try {
        const r = await fetch("/api/ai/cite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, page, source: buildSource() }),
        }).then((res) => res.json());

        if (r?.needsMetadata) {
          // NÃO bloqueia: salva como rascunho VERMELHO (incompleto) — o usuário
          // credita a fonte depois pelo painel (sinal vermelho → modal).
          onCite({
            id: presetId || newId(),
            abnt: "",
            quote: `"${text}"`,
            title: pdfMeta.current.title || file.title || "Citação",
            authors: pdfMeta.current.authors || file.authors || [],
            year: file.year,
            venue: file.venue,
            doi: file.doi,
            url: file.url,
            pdfUrl: file.pdfUrl,
            sourceText: text,
            page,
            have: r.have || undefined,
            incomplete: true,
            savedAt: Date.now(),
          });
          window.getSelection?.()?.removeAllRanges();
          setCiting(false);
          return;
        }
        const citId = presetId || newId();
        onCite({
          id: citId,
          abnt: r?.abnt || "",
          quote: r?.inline || `"${text}"`,
          title: pdfMeta.current.title || file.title,
          authors: pdfMeta.current.authors || file.authors || [],
          year: file.year,
          venue: file.venue,
          doi: file.doi,
          url: file.url,
          pdfUrl: file.pdfUrl,
          sourceText: text,
          page,
          suggestion: r?.suggestion || undefined,
          suggestedText: r?.suggestedText || undefined,
          incomplete: false,
          savedAt: Date.now(),
        });
        if (r?.suggestion && r?.suggestedText) setHint({ msg: r.suggestion, suggestedText: r.suggestedText, citId });
        window.getSelection?.()?.removeAllRanges();
      } catch {
        setHint({ msg: "Não consegui gerar a citação agora. Tente de novo.", suggestedText: "", citId: "" });
      } finally {
        setCiting(false);
      }
    },
    [file, onCite],
  );

  const onMouseUp = useCallback(() => {
    const text = (window.getSelection?.()?.toString() || "").trim().replace(/\s+/g, " ");
    if (text.length < 15) return;
    if (text === lastText.current) return;
    lastText.current = text;
    runCite(text, currentPage());
  }, [runCite]);

  // Ouvir o PDF: busca o markdown estruturado (pdf-loader) e lê em voz, com o mesmo
  // karaokê inline do resumo (ResearchReadingView). Reler/parar no mesmo botão.
  const readAloud = useCallback(async () => {
    if (readText) { ttsStop(); setReadText(null); return; }
    setLoadingRead(true);
    try {
      const r = await fetch(`/api/ai/scholar/pdf-structured?url=${encodeURIComponent(file.pdfUrl)}`);
      if (!r.ok) { setHint({ msg: "Não consegui preparar a leitura deste PDF.", suggestedText: "", citId: "" }); return; }
      const data = await r.json();
      const md = (data?.markdown || "").trim();
      if (!md) { setHint({ msg: "Este PDF não tem texto estruturado pra ler.", suggestedText: "", citId: "" }); return; }
      const speech = cleanForSpeech(md);
      setReadText(speech);            // liga o karaokê inline (mesmos pedaços da voz)
      await speakSequence([speech]);  // 1 POST /api/ai/voice por pedaço (~420 chars)
    } catch {
      setHint({ msg: "Voz indisponível agora.", suggestedText: "", citId: "" });
    } finally {
      setLoadingRead(false);
      setReadText(null);             // terminou a leitura → tira o overlay
    }
  }, [file.pdfUrl, readText]);

  // Citação clicável: outro componente dispara zaeon:gotoSource {pdfUrl, page} → rola
  // até a página da fonte e dá um flash. Só age se o PDF aberto for o da citação.
  useEffect(() => {
    const onGoto = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      if (d.pdfUrl !== file.pdfUrl) return;
      const page = Number(d.page);
      if (!page) return;
      const el = pagesRef.current?.querySelector<HTMLElement>(`.zaeon-pdf-page[data-page="${page}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.style.transition = "box-shadow .3s ease";
      el.style.boxShadow = "0 0 0 4px rgba(34,211,238,0.75)";
      setTimeout(() => { el.style.boxShadow = ""; }, 1500);
    };
    window.addEventListener("zaeon:gotoSource", onGoto as EventListener);
    return () => window.removeEventListener("zaeon:gotoSource", onGoto as EventListener);
  }, [file.pdfUrl]);

  return (
    <div className="relative h-full flex flex-col bg-[#3a3a44]">
      {(loadingDoc || citing) && (
        <div className="absolute top-0 left-0 right-0 h-[3px] overflow-hidden z-20" style={{ background: "rgba(120,120,150,0.12)" }}>
          <div className="h-full rounded-full animate-pulse" style={{ width: "100%", background: "linear-gradient(90deg,#8b5cf6,#22d3ee)" }} />
        </div>
      )}

      {/* Barra: zoom + voz (instrução removida a pedido) */}
      <div className="shrink-0 px-3 py-1.5 text-[10px] text-white/55 border-b border-white/10 flex items-center gap-2 bg-[#2c2c34]">
        {citing && <span className="text-cyan-300 animate-pulse">cruzando fonte…</span>}
        {loadingDoc && !citing && <span className="text-white/40">abrindo…</span>}
        <div className="ml-auto flex items-center gap-1 shrink-0">
          <button onClick={readAloud} disabled={loadingRead} title="Ouvir o PDF em voz" className="mr-1 px-2 h-6 rounded-[7px] text-[9px] font-black uppercase tracking-wide text-white/80 hover:bg-white/10 disabled:opacity-50">
            {readText ? "⏹ Parar" : loadingRead ? "🔊 …" : "🔊 Ouvir"}
          </button>
          <button onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.15).toFixed(2)))} className="w-6 h-6 rounded-[7px] text-white/70 hover:bg-white/10 font-black leading-none">−</button>
          <span className="text-[9px] tabular-nums text-white/50 w-9 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.15).toFixed(2)))} className="w-6 h-6 rounded-[7px] text-white/70 hover:bg-white/10 font-black leading-none">+</button>
        </div>
      </div>

      {/* Páginas (canvas + camada de texto selecionável) */}
      <div ref={pagesRef} onMouseUp={onMouseUp} className="flex-1 overflow-y-auto custom-scrollbar p-3" />

      {loadError && (
        <div className="absolute inset-x-3 top-12 z-20 rounded-[12px] px-3 py-2.5 text-center" style={{ background: "rgba(40,12,12,0.92)", border: "1px solid rgba(248,113,113,0.5)" }}>
          <p className="text-[11px] text-red-200 leading-snug">Não foi possível abrir este PDF. {/^https?:/i.test(file.pdfUrl) ? "O host pode estar bloqueando o download." : "O upload pode ter expirado — suba o arquivo de novo."}</p>
        </div>
      )}

      {/* Sugestão da Aura + Aplicar (recita com o recorte melhor e atualiza a mesma nota) */}
      {hint && (
        <div className="absolute bottom-3 left-3 right-3 z-20 rounded-[12px] px-3 py-2 flex items-start gap-2" style={{ background: "rgba(15,15,28,0.94)", border: "1px solid rgba(139,92,246,0.45)", backdropFilter: "blur(20px)" }}>
          <span className="text-[9px] font-black uppercase tracking-widest text-violet-300 mt-0.5 shrink-0">✦ Aura</span>
          <p className="text-[11px] text-white/80 leading-snug flex-1">{hint.msg}</p>
          {hint.suggestedText && (
            <button
              onClick={() => { lastText.current = hint.suggestedText; runCite(hint.suggestedText, undefined, hint.citId); }}
              className="shrink-0 text-[9px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full text-white"
              style={{ background: "linear-gradient(180deg,#8b5cf6,#6d28d9)" }}
            >
              Aplicar
            </button>
          )}
          <button onClick={() => setHint(null)} className="text-white/40 hover:text-white/80 text-sm leading-none shrink-0">×</button>
        </div>
      )}

      {/* Karaokê inline da leitura por voz (mesmo padrão do resumo). */}
      {readText && (
        <ResearchReadingView text={readText} onStop={() => { ttsStop(); setReadText(null); }} />
      )}
    </div>
  );
}
