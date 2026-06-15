"use client";

/**
 * MeusEstudosFeed — a Sala de Estudos como um grande CADERNO editável.
 *
 *  - CENTRO: o caderno. Tudo é editável direto na página: títulos, subtítulos e
 *    texto corrido. Você escreve como num Notion/Google Docs. Blocos da biblioteca
 *    (referências, vídeos, links) podem ser arrastados pra dentro e ficam no meio
 *    do texto. Link do YouTube colado num bloco vira player.
 *  - DIREITA: a BIBLIOTECA — itens salvos, arrastáveis pro caderno.
 *
 * Persistência por conta (MongoDB via /api/study/*). `placement` separa
 * biblioteca ("library") do caderno ("feed"). Cada bloco salva sozinho (debounce).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus, Trash2, Sparkles, Youtube, Loader2, ChevronDown, NotebookPen,
  X, GripVertical, ArrowLeftToLine, FileText, StickyNote, Link2, Heading1, Heading2, Pilcrow, Pencil,
  PanelRightClose, PanelRightOpen,
} from "lucide-react";

type Item = { id: string; type: string; title: string; payload: any; summary: string | null; placement: string; order?: number; createdAt?: string };
type Space = { id: string; title: string };

const GRAD = "linear-gradient(135deg,#0ea5e9,#22d3ee)";
const LAST_KEY = "zaeon.study.lastSpace";
const DT = "application/x-zaeon-item";
const MEDIA = new Set(["ref", "insight", "synthesis", "base", "suggestion", "pdf", "video", "link"]);

/** Extrai o ID de um vídeo do YouTube de qualquer formato de link (ou null). */
function ytId(input: string): string | null {
  const s = (input || "").trim();
  const m = s.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
/** Bloco é "só um vídeo" quando o texto, sem espaços ao redor, é um único link do YouTube. */
const soloYt = (t: string): string | null => {
  const s = (t || "").trim();
  if (!s || /\s/.test(s)) return null; // tem mais que o link → é texto normal
  return ytId(s);
};
const typeIcon = (t: string) =>
  t === "video" ? Youtube : t === "link" ? Link2 : t === "pdf" || t === "ref" ? FileText : StickyNote;

/** Textarea que cresce com o conteúdo (sem barra de rolagem por bloco). */
function AutoGrow({ value, onChange, onKeyDown, placeholder, className, autoFocus }: {
  value: string; onChange: (v: string) => void; onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string; className?: string; autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { const el = ref.current; if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }, [value]);
  useEffect(() => { if (autoFocus && ref.current) { ref.current.focus(); const v = ref.current.value; ref.current.setSelectionRange(v.length, v.length); } }, [autoFocus]);
  return (
    <textarea ref={ref} value={value} rows={1} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown}
      className={`w-full resize-none overflow-hidden bg-transparent outline-none placeholder:text-slate-300 dark:placeholder:text-white/20 ${className || ""}`} />
  );
}

/** Player compacto: thumbnail + botão de play; clicou → carrega o iframe e toca. */
function VideoCard({ id, title }: { id: string; title?: string }) {
  const [playing, setPlaying] = useState(false);
  if (playing) {
    return (
      <div className="w-full max-w-sm aspect-video rounded-xl overflow-hidden bg-black shadow-sm">
        <iframe className="w-full h-full" src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`} title={title || "vídeo"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
      </div>
    );
  }
  return (
    <button onClick={() => setPlaying(true)} className="group/v relative block w-full max-w-sm aspect-video rounded-xl overflow-hidden bg-black shadow-sm" title="Tocar">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt={title || "vídeo"} className="w-full h-full object-cover opacity-90 group-hover/v:opacity-100 transition-opacity" />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="w-12 h-12 rounded-full bg-black/55 backdrop-blur flex items-center justify-center text-white text-lg group-hover/v:scale-110 transition-transform">▶</span>
      </span>
    </button>
  );
}

export default function MeusEstudosFeed() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [spaceId, setSpaceId] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spaceMenu, setSpaceMenu] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [editingYt, setEditingYt] = useState<string | null>(null); // bloco-vídeo em modo edição do link
  const [libOpen, setLibOpen] = useState(true); // biblioteca retraída/expandida

  // biblioteca: adicionar nota/link
  const [showAdd, setShowAdd] = useState(false);
  const [note, setNote] = useState("");

  const itemsRef = useRef<Item[]>([]);
  itemsRef.current = items;
  const saveTimers = useRef<Record<string, any>>({});

  const loadSpaces = useCallback(async () => {
    setError(null);
    try {
      const r = await fetch("/api/study/spaces");
      if (!r.ok) throw new Error(`status ${r.status}`);
      const data: Space[] = await r.json();
      setSpaces(data);
      const last = (typeof window !== "undefined" && localStorage.getItem(LAST_KEY)) || "";
      const sid = data.find((s) => s.id === last)?.id || data[0]?.id || "";
      setSpaceId(sid);
      if (!sid) setLoading(false);
    } catch {
      setError("Não consegui carregar seus estudos. Se você acabou de atualizar, reinicie o servidor (next dev).");
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadSpaces(); }, [loadSpaces]);

  const loadItems = useCallback(async (sid: string) => {
    if (!sid) return;
    setLoading(true);
    try { const r = await fetch(`/api/study/items?spaceId=${sid}`); setItems(r.ok ? await r.json() : []); setError(null); }
    catch { setItems([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!spaceId) return;
    try { localStorage.setItem(LAST_KEY, spaceId); } catch { /* ignore */ }
    loadItems(spaceId);
  }, [spaceId, loadItems]);

  useEffect(() => { setTitleDraft(spaces.find((s) => s.id === spaceId)?.title || ""); }, [spaceId, spaces]);

  const ord = (i: Item) => (typeof i.order === "number" ? i.order : 0);
  const library = items.filter((i) => i.placement !== "feed");
  const feed = items.filter((i) => i.placement === "feed")
    .sort((a, b) => (ord(a) - ord(b)) || String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  const nextOrder = () => (feed.length ? Math.max(...feed.map(ord)) + 1 : 0);

  // ── criar item ────────────────────────────────────────────────────────────
  const addItem = useCallback(async (p: { type: string; title: string; payload?: any; placement?: string; order?: number }) => {
    if (!spaceId) return null;
    const r = await fetch("/api/study/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spaceId, ...p }) });
    if (r.ok) { const it = await r.json(); setItems((prev) => [it, ...prev]); return it as Item; }
    return null;
  }, [spaceId]);

  // novo bloco de texto no caderno (h1 / h2 / texto)
  const addBlock = async (variant: "h1" | "h2" | "text") => {
    const it = await addItem({ type: "note", title: "", payload: { text: "", variant }, placement: "feed", order: nextOrder() });
    if (it) setFocusId(it.id);
  };

  // colar de outras abas (refs/insights/etc.) → cai na biblioteca
  useEffect(() => {
    const onAdd = (e: any) => { const d = e?.detail; if (d?.type) addItem({ type: d.type, title: d.title || "", payload: d.payload ?? null }); };
    window.addEventListener("zaeon:study:add", onAdd);
    return () => window.removeEventListener("zaeon:study:add", onAdd);
  }, [addItem]);

  const saveNote = async () => {
    const t = note.trim(); if (!t) return;
    const isUrl = /^https?:\/\//i.test(t);
    await addItem({ type: isUrl ? "link" : "note", title: isUrl ? t : t.slice(0, 80), payload: { text: t } });
    setNote("");
  };

  // ── edição de bloco de texto (autosave) ───────────────────────────────────
  const persist = (id: string) => {
    clearTimeout(saveTimers.current[id]);
    saveTimers.current[id] = setTimeout(() => {
      const it = itemsRef.current.find((x) => x.id === id);
      if (!it) return;
      fetch("/api/study/items", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, title: it.title, payload: it.payload }) });
    }, 600);
  };
  const editText = (id: string, text: string) => {
    const vid = soloYt(text); // colou um link do YouTube sozinho → já vira vídeo
    setItems((prev) => prev.map((i) => (i.id === id
      ? { ...i, title: text.slice(0, 80), payload: { ...i.payload, text, ...(vid ? { videoId: vid, url: text.trim() } : { videoId: undefined }) } }
      : i)));
    if (vid) setEditingYt(null);
    persist(id);
  };

  // ── mover entre biblioteca/caderno + apagar ────────────────────────────────
  const toFeed = async (id: string) => {
    const o = nextOrder();
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, placement: "feed", order: o } : i)));
    await fetch("/api/study/items", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, placement: "feed", order: o }) });
  };
  const toLibrary = async (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, placement: "library" } : i)));
    await fetch("/api/study/items", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, placement: "library" }) });
  };
  const removeItem = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/study/items?id=${id}`, { method: "DELETE" });
  };
  const summarize = async (it: Item) => {
    const text = it.payload?.text || it.title || ""; if (!text) return;
    setBusyId(it.id);
    try {
      const r = await fetch("/api/study/summarize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, title: it.title }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.summary) {
        setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, summary: d.summary } : x)));
        await fetch("/api/study/items", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: it.id, summary: d.summary }) });
      }
    } finally { setBusyId(null); }
  };

  // ── espaços + título ───────────────────────────────────────────────────────
  const saveTitle = async () => {
    const t = titleDraft.trim(); if (!t || !spaceId) return;
    setSpaces((prev) => prev.map((s) => (s.id === spaceId ? { ...s, title: t } : s)));
    await fetch("/api/study/spaces", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: spaceId, title: t }) });
  };
  const newSpace = async () => {
    setError(null);
    try {
      const r = await fetch("/api/study/spaces", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Novo estudo" }) });
      if (!r.ok) throw new Error();
      const s = await r.json();
      setSpaces((p) => [...p, s]); setSpaceId(s.id); setSpaceMenu(false); setTitleDraft(s.title); setLoading(true);
    } catch { setError("Não consegui criar um novo estudo agora. Reinicie o servidor (next dev) e tente de novo."); }
  };
  const delSpace = async (id: string) => {
    if (spaces.length <= 1) return;
    if (typeof window !== "undefined" && !window.confirm("Excluir este espaço e tudo dentro?")) return;
    await fetch(`/api/study/spaces?id=${id}`, { method: "DELETE" });
    const rest = spaces.filter((s) => s.id !== id);
    setSpaces(rest); setSpaceId(rest[0]?.id || ""); setSpaceMenu(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const id = e.dataTransfer.getData(DT);
    if (id) toFeed(id);
  };

  // ── render de um bloco do caderno ──────────────────────────────────────────
  const renderBlock = (it: Item) => {
    const variant: "h1" | "h2" | "text" = it.payload?.variant || "text";
    const text: string = it.payload?.text ?? "";
    const isMedia = MEDIA.has(it.type);
    const vid = it.payload?.videoId || ytId(it.payload?.url || "") || (it.type === "note" ? soloYt(text) : null);

    // VÍDEO: da biblioteca, ou bloco de texto que é só um link do YouTube → player compacto
    if (vid && editingYt !== it.id) {
      return (
        <div className="group relative my-3">
          <div className="absolute -top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100">
            {it.type === "note" && <button onClick={() => setEditingYt(it.id)} title="Trocar link" className="p-1 rounded bg-black/40 text-white hover:bg-black/60"><Pencil size={11} /></button>}
            {it.type === "video" && <button onClick={() => toLibrary(it.id)} title="Voltar p/ biblioteca" className="p-1 rounded bg-black/40 text-white hover:bg-black/60"><ArrowLeftToLine size={11} /></button>}
            <button onClick={() => removeItem(it.id)} title="Remover" className="p-1 rounded bg-black/40 text-white hover:bg-black/60"><X size={12} /></button>
          </div>
          <VideoCard id={vid} title={it.title} />
        </div>
      );
    }

    // OUTRAS MÍDIAS da biblioteca (ref/link/pdf/insight…) → cartão enxuto
    if (isMedia) {
      const url = it.payload?.url || it.payload?.text;
      return (
        <div className="group relative my-3 rounded-2xl border p-3.5 bg-slate-50 border-slate-200 shadow-sm dark:bg-white/[0.04] dark:border-white/10 dark:shadow-none">
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100">
            <button onClick={() => toLibrary(it.id)} title="Voltar p/ biblioteca" className="text-slate-400 hover:text-cyan-500"><ArrowLeftToLine size={13} /></button>
            <button onClick={() => removeItem(it.id)} title="Remover" className="text-slate-400 hover:text-rose-400"><X size={14} /></button>
          </div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300">{it.type}</span>
            <span className="text-[12px] font-bold text-slate-800 dark:text-white truncate">{it.title || "(sem título)"}</span>
          </div>
          {it.type === "link" && url
            ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-[12px] text-cyan-600 dark:text-cyan-400 underline break-all">{url}</a>
            : <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{it.payload?.text || ""}</p>}
          {it.summary && <div className="mt-2 rounded-xl bg-cyan-500/[0.07] border border-cyan-500/15 p-2 text-[11px] text-slate-700 dark:text-cyan-100/90 leading-relaxed"><span className="font-black text-cyan-700 dark:text-cyan-300">Resumo · </span>{it.summary}</div>}
          {(it.payload?.text || it.title) && (
            <button onClick={() => summarize(it)} disabled={busyId === it.id} className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-cyan-600 dark:text-cyan-300 hover:underline disabled:opacity-50">
              {busyId === it.id ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />} {it.summary ? "Resumir de novo" : "Resumir"}
            </button>
          )}
        </div>
      );
    }

    // BLOCO DE TEXTO editável (título / subtítulo / parágrafo)
    const cls = variant === "h1" ? "text-2xl font-black tracking-tight text-slate-900 dark:text-white"
      : variant === "h2" ? "text-lg font-bold text-slate-800 dark:text-white/95"
      : "text-[13px] leading-relaxed text-slate-700 dark:text-slate-200";
    const ph = variant === "h1" ? "Título" : variant === "h2" ? "Subtítulo" : "Escreva…";
    const onKey = (e: React.KeyboardEvent) => {
      if (e.key === "Backspace" && text === "") { e.preventDefault(); removeItem(it.id); }
    };
    return (
      <div className="group relative -mx-2 px-2 py-0.5 rounded-lg hover:bg-black/[0.015] dark:hover:bg-white/[0.02]">
        <button onClick={() => removeItem(it.id)} title="Remover bloco" className="absolute -left-3 top-1.5 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-400"><X size={12} /></button>
        <AutoGrow value={text} onChange={(v) => editText(it.id, v)} onKeyDown={onKey} placeholder={ph} className={cls} autoFocus={focusId === it.id} />
        {it.type === "note" && soloYt(text) && editingYt === it.id && (
          <button onClick={() => setEditingYt(null)} className="text-[10px] font-bold text-cyan-600 dark:text-cyan-300 hover:underline">▶ ver vídeo</button>
        )}
      </div>
    );
  };

  const pillCls = "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-white text-slate-600 border-slate-200 hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-300 dark:bg-white/[0.06] dark:text-white/55 dark:border-white/10 dark:hover:bg-cyan-500/15 dark:hover:text-cyan-300 dark:hover:border-cyan-400/30 transition-colors";
  const AddBar = ({ center }: { center?: boolean }) => (
    <div className={`flex items-center gap-1.5 ${center ? "justify-center" : ""}`}>
      <button onClick={() => addBlock("h1")} className={pillCls}><Heading1 size={13} /> Título</button>
      <button onClick={() => addBlock("h2")} className={pillCls}><Heading2 size={13} /> Subtítulo</button>
      <button onClick={() => addBlock("text")} className={pillCls}><Pilcrow size={13} /> Texto</button>
    </div>
  );

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* ── CADERNO (centro) ── */}
      <div className="flex-1 min-w-0 flex flex-col p-5 sm:p-6">
        {/* título do estudo + espaços */}
        <div className="flex items-center gap-2 mb-3">
          <NotebookPen size={18} className="text-cyan-600 dark:text-cyan-300 shrink-0" />
          <input
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            placeholder="Meus Estudos"
            className="text-lg font-black tracking-tight bg-transparent text-slate-900 dark:text-white focus:outline-none focus:border-b focus:border-cyan-400/50 min-w-0 flex-1 max-w-xs"
          />
          <button onClick={newSpace} title="Novo estudo" className="p-1.5 rounded-lg text-white" style={{ background: GRAD }}><Plus size={14} /></button>
          <div className="relative">
            <button onClick={() => setSpaceMenu((v) => !v)} title="Trocar de estudo" className="p-1 text-slate-400 hover:text-cyan-500"><ChevronDown size={16} className={spaceMenu ? "rotate-180 transition-transform" : "transition-transform"} /></button>
            {spaceMenu && (
              <div className="absolute z-30 mt-1 w-60 right-0 rounded-2xl border p-1.5 shadow-xl bg-white border-slate-200 dark:bg-[#0c0b1a] dark:border-white/10">
                {spaces.map((s) => (
                  <div key={s.id} className={`group flex items-center gap-1 rounded-xl ${s.id === spaceId ? "bg-cyan-500/10" : ""}`}>
                    <button onClick={() => { setSpaceId(s.id); setSpaceMenu(false); }} className="flex-1 text-left px-3 py-2 text-[13px] text-slate-700 dark:text-slate-200 truncate">{s.title}</button>
                    {spaces.length > 1 && <button onClick={() => delSpace(s.id)} className="opacity-0 group-hover:opacity-100 px-2 text-slate-400 hover:text-rose-400"><Trash2 size={13} /></button>}
                  </div>
                ))}
                <button onClick={newSpace} className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-bold text-cyan-600 dark:text-cyan-300 hover:bg-cyan-500/10 rounded-xl"><Plus size={14} /> Novo espaço</button>
              </div>
            )}
          </div>
        </div>

        {/* a folha do caderno (também é drop target da biblioteca) */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar rounded-[1.5rem] border transition-colors ${dragOver ? "border-cyan-400/50 bg-cyan-500/[0.04]" : "border-slate-200 dark:border-white/10"}`}
        >
          {error ? (
            <div className="p-6 text-[12px] text-rose-600 dark:text-rose-300 leading-relaxed">
              {error}
              <button onClick={() => { setLoading(true); void loadSpaces(); }} className="mt-2 block font-bold text-cyan-600 dark:text-cyan-300 hover:underline">↻ tentar de novo</button>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 gap-2"><Loader2 size={16} className="animate-spin" /></div>
          ) : feed.length === 0 ? (
            <div className="h-full min-h-[280px] flex flex-col items-center justify-center text-center px-8 gap-4 text-slate-400 dark:text-white/30">
              <NotebookPen size={26} className="opacity-50" />
              <p className="text-[12px] leading-relaxed max-w-xs">Folha em branco. Comece a escrever — adicione um título ou um parágrafo — e arraste itens da <span className="font-bold">biblioteca</span> pra dentro.</p>
              <AddBar center />
            </div>
          ) : (
            <div className="p-6 sm:p-8 max-w-2xl mx-auto flex flex-col">
              {feed.map((it) => <div key={it.id}>{renderBlock(it)}</div>)}
              <div className="mt-4 pt-2"><AddBar /></div>
            </div>
          )}
        </div>
      </div>

      {/* ── BIBLIOTECA recolhida: trilho fino com botão de expandir ── */}
      {!libOpen && (
        <button onClick={() => setLibOpen(true)} title="Mostrar biblioteca"
          className="shrink-0 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-white/10 flex lg:flex-col items-center justify-center gap-2 px-3 py-2 lg:py-3 text-slate-400 hover:text-cyan-500 hover:bg-cyan-500/5">
          <PanelRightOpen size={16} />
          <span className="text-[10px] font-black uppercase tracking-[0.16em] lg:[writing-mode:vertical-rl] lg:rotate-180">Biblioteca</span>
          <span className="text-[9px] font-mono">{library.length}</span>
        </button>
      )}

      {/* ── BIBLIOTECA (direita) ── */}
      {libOpen && (
      <div className="lg:w-60 shrink-0 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-white/10 flex flex-col min-h-0">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-white/10">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-white/50">Biblioteca</span>
          <span className="text-[9px] font-mono text-slate-400">{library.length}</span>
          <button onClick={() => setShowAdd((v) => !v)} className="ml-auto p-1 rounded-lg text-slate-400 hover:text-cyan-500" title="Adicionar à biblioteca"><Plus size={15} /></button>
          <button onClick={() => setLibOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-cyan-500" title="Recolher biblioteca"><PanelRightClose size={15} /></button>
        </div>

        {showAdd && (
          <div className="px-3 py-3 border-b border-slate-200 dark:border-white/10 flex flex-col gap-2">
            <div className="flex gap-1.5">
              <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveNote()} placeholder="nota ou link…" className="flex-1 min-w-0 rounded-xl px-2.5 py-1.5 text-[11px] bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none" />
              <button onClick={saveNote} disabled={!note.trim()} className="px-2 rounded-xl text-white disabled:opacity-40" style={{ background: GRAD }}><Plus size={13} /></button>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-white/30 leading-relaxed">Cole um link do YouTube direto num parágrafo do caderno pra assistir lá dentro.</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2.5 flex flex-col gap-2 min-h-[120px]">
          {loading ? null : library.length === 0 ? (
            <p className="text-[11px] text-slate-400 dark:text-white/30 p-2 leading-relaxed">Salve referências, vídeos e trabalhos aqui (pelo "+" ou pela pesquisa). Depois arraste pro caderno.</p>
          ) : (
            library.map((it) => {
              const Icon = typeIcon(it.type);
              return (
                <div key={it.id}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData(DT, it.id); e.dataTransfer.effectAllowed = "move"; }}
                  className="group flex items-center gap-2 rounded-xl border p-2 cursor-grab active:cursor-grabbing bg-white border-slate-200 shadow-sm hover:border-cyan-400/50 dark:bg-white/[0.04] dark:border-white/10 dark:shadow-none"
                  title="Arraste para o caderno"
                >
                  <GripVertical size={13} className="text-slate-300 dark:text-white/20 shrink-0" />
                  <Icon size={14} className="text-cyan-600 dark:text-cyan-300 shrink-0" />
                  <span className="flex-1 min-w-0 text-[11px] font-medium text-slate-700 dark:text-white/90 truncate">{it.title || it.payload?.text?.slice(0, 40) || it.type}</span>
                  <button onClick={() => removeItem(it.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-400 shrink-0"><Trash2 size={12} /></button>
                </div>
              );
            })
          )}
        </div>
      </div>
      )}
    </div>
  );
}
