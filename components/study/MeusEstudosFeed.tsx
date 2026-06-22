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
  PanelRightClose, PanelRightOpen, Image as ImageIcon, Music, Paperclip, UploadCloud, Play, Square,
} from "lucide-react";
import VoiceModeSwitch from "@/components/voice/VoiceModeSwitch";
import SpeakButton from "@/components/voice/SpeakButton";
import VoicePlayButton from "@/components/voice/VoicePlayButton";
import StudioDock from "@/components/studio/StudioDock";
import StudioBlock, { type StudioBlockData } from "@/components/studio/StudioBlock";
import { detectHeadingShortcut } from "@/lib/study/blockMarkdown";
import { prevEditableId } from "@/lib/study/blockOrder";
import { useTTS } from "@/lib/voice/useTTS";
import { takeHandoff } from "@/lib/agents/handoff";
import { missionDone } from "@/lib/agents/mission";

type Item = { id: string; type: string; title: string; payload: any; summary: string | null; placement: string; order?: number; createdAt?: string };
type Space = { id: string; title: string };

const GRAD = "linear-gradient(135deg,#0ea5e9,#22d3ee)";
const LAST_KEY = "zaeon.study.lastSpace";
const DT = "application/x-zaeon-item";
const MEDIA = new Set(["ref", "insight", "synthesis", "base", "suggestion", "pdf", "video", "link", "image", "audio", "file"]);

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
  t === "video" ? Youtube : t === "link" ? Link2 : t === "image" ? ImageIcon : t === "audio" ? Music : t === "file" ? Paperclip : t === "pdf" || t === "ref" ? FileText : StickyNote;

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

export default function MeusEstudosFeed({ collabSpaceId }: { collabSpaceId?: string } = {}) {
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
  const tts = useTTS(); // controlador global de voz (modo leitura do estudo inteiro)

  // biblioteca: adicionar nota/link
  const [showAdd, setShowAdd] = useState(false);
  const [note, setNote] = useState("");

  // Studio: preview isolado (biblioteca) + marca de "salvo" por bloco
  const [studioPreview, setStudioPreview] = useState<Item | null>(null);
  const [savedStudio, setSavedStudio] = useState<Record<string, boolean>>({});

  // Zaeon generativa: "estude sobre…" → escreve o estudo no feed em tempo real
  const [zaeonCmd, setZaeonCmd] = useState("");
  const [zaeonBusy, setZaeonBusy] = useState(false);
  const [zaeonStatus, setZaeonStatus] = useState("");
  // Título sendo "digitado" pela Zaeon com glitch (substitui o input enquanto cria)
  const [genTitle, setGenTitle] = useState<string | null>(null);
  // A barra-agente só aparece ao clicar no ⟁ ao lado do título
  const [barOpen, setBarOpen] = useState(false);
  const [navRight, setNavRight] = useState(false); // navbar do lado direito (canhoto) -> espelha o layout
  // Frases com emoção que rotacionam enquanto a Zaeon trabalha (são muitas etapas)
  const ZAEON_PHRASES = [
    "Mergulhando no assunto 🤿", "Garimpando as melhores ideias ✨", "Lendo nas entrelinhas 📚",
    "Conectando os pontos 🧩", "Separando o que realmente importa", "Pensando como te explicar melhor 🧠",
    "Dando forma ao seu estudo ✍️", "Caprichando nos detalhes", "Quase lá, montando tudo…",
  ];
  const [phraseIdx, setPhraseIdx] = useState(0);
  useEffect(() => {
    if (!zaeonBusy) return;
    setPhraseIdx(0);
    const id = setInterval(() => setPhraseIdx((p) => (p + 1) % ZAEON_PHRASES.length), 2200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zaeonBusy]);

  const itemsRef = useRef<Item[]>([]);
  itemsRef.current = items;
  const saveTimers = useRef<Record<string, any>>({});

  // Compatibilidade canhoto/destro: espelha o feed quando a navbar vai pro lado direito.
  useEffect(() => {
    const read = () => setNavRight((document.documentElement.dataset.navSide || "left") === "right");
    read();
    const h = () => read();
    window.addEventListener("zaeon:navside", h);
    return () => window.removeEventListener("zaeon:navside", h);
  }, []);

  const loadSpaces = useCallback(async () => {
    setError(null);
    try {
      const r = await fetch("/api/study/spaces");
      if (!r.ok) throw new Error(`status ${r.status}`);
      const data: Space[] = await r.json();
      setSpaces(data);
      // Deep-link do menu inicial: ?space=<id> abre direto aquele estudo.
      let fromUrl = "";
      try { fromUrl = new URLSearchParams(window.location.search).get("space") || ""; } catch { /* ignore */ }
      const last = (typeof window !== "undefined" && localStorage.getItem(LAST_KEY)) || "";
      // Modo collab: TRAVA no espaço compartilhado (ignora url/last).
      const sid = (collabSpaceId && data.find((s) => s.id === collabSpaceId)?.id) || (collabSpaceId || "") ||
        data.find((s) => s.id === fromUrl)?.id || data.find((s) => s.id === last)?.id || data[0]?.id || "";
      setSpaceId(sid);
      if (!sid) setLoading(false);
    } catch {
      setError("Não consegui carregar seus estudos. Se você acabou de atualizar, reinicie o servidor (next dev).");
      setLoading(false);
    }
  }, [collabSpaceId]);

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

  // CO-EDIÇÃO EM GRUPO (Lounge): poll dos itens do espaço compartilhado. Não aplica
  // enquanto alguém está digitando aqui (foco num textarea) pra não atropelar a edição.
  useEffect(() => {
    if (!collabSpaceId || !spaceId) return;
    const iv = setInterval(async () => {
      try {
        const ae = typeof document !== "undefined" ? document.activeElement : null;
        if (ae && ae.tagName === "TEXTAREA") return;
        const r = await fetch(`/api/study/items?spaceId=${spaceId}`);
        if (!r.ok) return;
        const fresh = await r.json();
        setItems((prev) => (JSON.stringify(prev) === JSON.stringify(fresh) ? prev : fresh));
      } catch { /* ignore */ }
    }, 3500);
    return () => clearInterval(iv);
  }, [collabSpaceId, spaceId]);

  // Handoff da Zaeon (chat/voz): se ela mandou ESTUDAR um tópico, executa quando o espaço estiver pronto.
  const handoffDoneRef = useRef(false);
  useEffect(() => {
    if (handoffDoneRef.current || !spaceId) return;
    const ho = takeHandoff(["study"]);
    if (ho?.topic) { handoffDoneRef.current = true; typeIntoBarAndRun(ho.topic).then(() => missionDone()).catch(() => missionDone("error")); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId]);

  useEffect(() => { setTitleDraft(spaces.find((s) => s.id === spaceId)?.title || ""); }, [spaceId, spaces]);

  const ord = (i: Item) => (typeof i.order === "number" ? i.order : 0);
  const library = items.filter((i) => i.placement !== "feed");
  const feed = items.filter((i) => i.placement === "feed")
    .sort((a, b) => (ord(a) - ord(b)) || String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  const nextOrder = () => (feed.length ? Math.max(...feed.map(ord)) + 1 : 0);

  // MODO LEITURA: lê o estudo INTEIRO em voz, bloco a bloco, na ordem. Clicar
  // de novo (ou em qualquer lugar que pare a voz) interrompe. Usa a sequência do
  // controlador global (chunking automático p/ textos longos).
  const readWholeStudy = () => {
    if (tts.speaking) { tts.stop(); return; }
    const parts: string[] = [];
    const title = spaces.find((s) => s.id === spaceId)?.title?.trim();
    if (title && title !== "Novo estudo" && title !== "Meus Estudos") parts.push(title);
    for (const it of feed) {
      if (it.type === "studio") continue; // módulos do Studio não entram na leitura do estudo
      if (it.type === "note") { const t = (it.payload?.text || "").trim(); if (t) parts.push(t); }
      else if (it.title) parts.push(it.title);
    }
    if (parts.length) {
      // Passa a voz/gênero escolhidos (Options → VoicePicker) explicitamente, pra
      // leitura usar SEMPRE a voz selecionada — e, no fallback do navegador, casar o gênero.
      let voice: string | undefined; let gender: "f" | "m" | undefined;
      try {
        voice = localStorage.getItem("zaeon.voice.id") || undefined;
        gender = (localStorage.getItem("zaeon.voice.gender") as "f" | "m") || undefined;
      } catch { /* ignore */ }
      tts.speakSequence(parts, { voice, gender });
    }
  };

  // ── criar item ────────────────────────────────────────────────────────────
  const addItem = useCallback(async (p: { type: string; title: string; payload?: any; placement?: string; order?: number }, sid?: string) => {
    const useId = sid || spaceId;
    if (!useId) return null;
    const r = await fetch("/api/study/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spaceId: useId, ...p }) });
    if (r.ok) { const it = await r.json(); setItems((prev) => [it, ...prev]); return it as Item; }
    return null;
  }, [spaceId]);

  // novo bloco de texto no caderno (h1 / h2 / texto)
  const addBlock = async (variant: "h1" | "h2" | "text") => {
    const it = await addItem({ type: "note", title: "", payload: { text: "", variant }, placement: "feed", order: nextOrder() });
    if (it) setFocusId(it.id);
  };

  // Enter (B1.2): cria um bloco de texto LOGO DEPOIS do atual e foca nele.
  // Mesma `order` do atual → o desempate por createdAt coloca o novo logo abaixo
  // (sem reindex; 1 escrita). Continuar digitando top-down funciona naturalmente.
  const addBlockAfter = async (it: Item) => {
    const n = await addItem({ type: "note", title: "", payload: { text: "", variant: "text" }, placement: "feed", order: ord(it) });
    if (n) setFocusId(n.id);
  };

  // Caractere CJK aleatório (glitch do título)
  const cjk = () => String.fromCharCode(0x4e00 + Math.floor(Math.random() * 0x3000));
  // Revela o nome do estudo aos poucos, com glitch chinês na ponta que está "nascendo".
  const revealTitle = (target: string) => new Promise<void>((resolve) => {
    const chars = [...target];
    let i = 0;
    const tick = () => {
      i++;
      const shown = chars.slice(0, i).join("");
      setGenTitle(i < chars.length ? shown + cjk() : shown);
      if (i >= chars.length) { setGenTitle(target); resolve(); return; }
      setTimeout(tick, 65 + Math.random() * 70);
    };
    tick();
  });
  // Persiste o título do espaço (sem depender do setState async)
  const persistTitle = async (t: string, sid?: string) => {
    const useId = sid || spaceId;
    setTitleDraft(t);
    setSpaces((prev) => prev.map((s) => (s.id === useId ? { ...s, title: t } : s)));
    try { await fetch("/api/study/spaces", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: useId, title: t }) }); } catch { /* ignore */ }
  };

  // ── ZAEON GENERATIVA: comando em linguagem natural → blocos no feed (ao vivo) ──
  const zaeonStudy = async (override?: string) => {
    const cmd = (override ?? zaeonCmd).trim();
    if (!cmd || zaeonBusy || !spaceId) return;
    setZaeonBusy(true); setZaeonCmd(""); setZaeonStatus("Zaeon está pensando…"); setGenTitle(cmd); setBarOpen(false);

    // Cada pedido à Zaeon = um NOVO estudo. Só escreve no atual se ele estiver VAZIO
    // (ex.: estudo recém-criado pelo "+"). Assim não sobrescreve nem empilha no aberto.
    let targetId = spaceId;
    let freshBase = false;
    const currentHasContent = itemsRef.current.some((i) => i.placement === "feed");
    if (currentHasContent && !collabSpaceId) {
      try {
        const rs = await fetch("/api/study/spaces", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: cmd.slice(0, 80) }) });
        if (rs.ok) {
          const s = await rs.json();
          targetId = s.id; freshBase = true;
          setSpaces((prev) => [...prev, s]);
          setSpaceId(s.id);
          setItems([]);
        }
      } catch { /* se falhar, escreve no atual mesmo */ }
    }

    try {
      const r = await fetch("/api/study/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ command: cmd, spaceId: targetId }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !Array.isArray(d.blocks) || d.blocks.length === 0) {
        setZaeonStatus("Não consegui montar agora. Tente reformular o comando.");
        setTimeout(() => setZaeonStatus(""), 4000);
        return;
      }
      // O nome do estudo (framework "Meus Estudos") muda pro tema, com glitch cadenciado.
      const studyName = String(d.title || cmd).slice(0, 80);
      await revealTitle(studyName);
      await persistTitle(studyName, targetId);
      const base = freshBase ? 0 : nextOrder();
      setZaeonStatus("Zaeon está escrevendo no seu caderno…");
      // O título já vive no cabeçalho (fonte grande) — não repetir como bloco de texto.
      const norm = (s: string) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
      for (let i = 0; i < d.blocks.length; i++) {
        const b = d.blocks[i];
        if (b.kind === "heading" && norm(b.text) === norm(studyName)) continue;
        const order = base + i;
        if (b.kind === "link" && b.url) {
          await addItem({ type: "link", title: String(b.text).slice(0, 80), payload: { url: b.url, text: b.text }, placement: "feed", order }, targetId);
        } else {
          const variant = b.kind === "heading" ? "h1" : b.kind === "subheading" ? "h2" : "text";
          await addItem({ type: "note", title: String(b.text).slice(0, 80), payload: { text: b.text, variant }, placement: "feed", order }, targetId);
        }
        await new Promise((res) => setTimeout(res, 420)); // efeito "escrevendo ao vivo"
      }
      setZaeonStatus("Pronto! ✨");
      setTimeout(() => setZaeonStatus(""), 2500);
    } catch {
      setZaeonStatus("Falha ao falar com a Zaeon.");
      setTimeout(() => setZaeonStatus(""), 4000);
    } finally { setZaeonBusy(false); setGenTitle(null); }
  };

  // Fase 2.1 — DIGITA o tema na barra de comando real (efeito "agente digitando"),
  // e só então executa. Usado pelo handoff de voz/chat: o usuário VÊ o texto sendo
  // digitado no campo, igual ele faria. Funciona idêntico em texto, áudio e ligação.
  const typeIntoBarAndRun = async (topic: string) => {
    setBarOpen(true);
    setZaeonCmd("");
    const chars = [...topic];
    for (let i = 0; i < chars.length; i++) {
      setZaeonCmd(chars.slice(0, i + 1).join(""));
      await new Promise((r) => setTimeout(r, 45 + Math.random() * 55));
    }
    await new Promise((r) => setTimeout(r, 350)); // respira antes de "enviar"
    await zaeonStudy(topic);
  };

  // colar de outras abas (refs/insights/etc.) → cai na biblioteca
  useEffect(() => {
    const onAdd = (e: any) => { const d = e?.detail; if (d?.type) addItem({ type: d.type, title: d.title || "", payload: d.payload ?? null }); };
    window.addEventListener("zaeon:study:add", onAdd);
    return () => window.removeEventListener("zaeon:study:add", onAdd);
  }, [addItem]);

  // Studio → ENCAIXA no caderno: cada geração vira um bloco colapsável no feed.
  useEffect(() => {
    const onEmbed = (e: any) => {
      const d = e?.detail;
      if (!d?.studioKind) return;
      const feedNow = itemsRef.current.filter((i) => i.placement === "feed");
      const order = feedNow.length ? Math.max(...feedNow.map((i) => (typeof i.order === "number" ? i.order : 0))) + 1 : 0;
      addItem({
        type: "studio",
        title: d.title || "",
        payload: { studioKind: d.studioKind, data: d.data ?? null, artifactId: d.artifactId, dataUrl: d.dataUrl, collapsed: false },
        placement: "feed",
        order,
      });
    };
    window.addEventListener("zaeon:study:embed", onEmbed);
    return () => window.removeEventListener("zaeon:study:embed", onEmbed);
  }, [addItem]);

  // "Estudar esse tema" (botão da pesquisa): gera um estudo a partir do tema, mesmo
  // já estando no research-lab (o feed fica sempre montado, só escondido → handoff
  // de mount não basta). O StudyThisButton dispara este evento.
  useEffect(() => {
    const onRun = (e: any) => {
      const t = e?.detail?.topic;
      if (t && spaceId && !zaeonBusy) void typeIntoBarAndRun(String(t)).catch(() => { /* ignore */ });
    };
    window.addEventListener("zaeon:study:run", onRun);
    return () => window.removeEventListener("zaeon:study:run", onRun);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId, zaeonBusy]);

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
    setItems((prev) => prev.map((i) => {
      if (i.id !== id) return i;
      // Markdown (B1): "# "/"## " no início de um bloco de TEXTO vira título/subtítulo.
      const head = (i.payload?.variant ?? "text") === "text" ? detectHeadingShortcut(text) : null;
      const finalText = head ? head.text : text;
      const variant = head ? head.variant : i.payload?.variant;
      return {
        ...i,
        title: finalText.slice(0, 80),
        payload: { ...i.payload, text: finalText, ...(variant ? { variant } : {}), ...(vid ? { videoId: vid, url: text.trim() } : { videoId: undefined }) },
      };
    }));
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

  // Studio: abre/fecha o bloco (persiste) e salva uma cópia isolada na biblioteca.
  const toggleStudioCollapsed = (it: Item) => {
    const payload = { ...it.payload, collapsed: !it.payload?.collapsed };
    setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, payload } : x)));
    fetch("/api/study/items", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: it.id, payload }) });
  };
  const saveStudioToLibrary = async (it: Item) => {
    await addItem({ type: "studio", title: it.title, payload: { ...it.payload, collapsed: true }, placement: "library" });
    setSavedStudio((prev) => ({ ...prev, [it.id]: true }));
  };
  // Joga um registro na lixeira da sala de pesquisa (localStorage zaeon.trash + evento de sync).
  const trashPush = (id: string, title: string) => {
    try {
      const KEY = "zaeon.trash";
      const list = JSON.parse(localStorage.getItem(KEY) || "[]");
      const rec = { id: `study-${id}`, title: title || "Item de estudo", pdfUrl: "", source: "Sala de Estudos", savedAt: Date.now(), deletedAt: Date.now() };
      localStorage.setItem(KEY, JSON.stringify([rec, ...list.filter((x: any) => x.id !== rec.id)]));
      window.dispatchEvent(new CustomEvent("zaeon:trash"));
    } catch { /* ignore */ }
  };
  const removeItem = async (id: string) => {
    const it = itemsRef.current.find((x) => x.id === id);
    trashPush(id, it?.title || it?.payload?.name || it?.type || "Item");
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
      setBarOpen(true); // novo estudo já abre a Zaeon pra começar com uma pesquisa inicial
    } catch { setError("Não consegui criar um novo estudo agora. Reinicie o servidor (next dev) e tente de novo."); }
  };
  const delSpace = async (id: string) => {
    if (spaces.length <= 1) return;
    const sp = spaces.find((s) => s.id === id);
    trashPush(id, sp?.title || "Estudo"); // direto pra lixeira, sem modal
    await fetch(`/api/study/spaces?id=${id}`, { method: "DELETE" });
    const rest = spaces.filter((s) => s.id !== id);
    setSpaces(rest); setSpaceId(rest[0]?.id || ""); setSpaceMenu(false);
  };

  // Qualquer arquivo (imagem, áudio, pdf, etc.) -> bloco no caderno/biblioteca (data URL).
  const fileToItem = (file: File, placement: "feed" | "library", order?: number) => new Promise<void>((resolve) => {
    if (file.size > 6 * 1024 * 1024) { setError(`"${file.name}" é grande demais por enquanto (máx ~6MB).`); setTimeout(() => setError(null), 4000); resolve(); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || "");
      const kind = file.type.startsWith("image/") ? "image" : file.type.startsWith("audio/") ? "audio" : file.type === "application/pdf" ? "pdf" : "file";
      await addItem({ type: kind, title: file.name, payload: { dataUrl, name: file.name, mime: file.type, size: file.size }, placement, order });
      resolve();
    };
    reader.readAsDataURL(file);
  });
  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((f) => fileToItem(f, "library"));
    e.target.value = "";
  };
  // Colar imagem (Ctrl+V) cai direto no caderno como um bloco.
  const onPaste = (e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData?.files || []).filter((f) => f.type.startsWith("image/") || f.type.startsWith("audio/"));
    if (files.length) { e.preventDefault(); const base = nextOrder(); files.forEach((f, i) => fileToItem(f, "feed", base + i)); }
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) { const base = nextOrder(); files.forEach((f, i) => fileToItem(f, "feed", base + i)); return; }
    const id = e.dataTransfer.getData(DT);
    if (id) toFeed(id);
  };

  // ── render de um bloco do caderno ──────────────────────────────────────────
  const renderBlock = (it: Item, idx?: number) => {
    // BLOCO DO STUDIO (guia/mapa/podcast/vídeo…) → cartão colapsável inline.
    if (it.type === "studio") {
      const p = it.payload || {};
      const block: StudioBlockData = { studioKind: p.studioKind, title: it.title, data: p.data, artifactId: p.artifactId, dataUrl: p.dataUrl };
      return (
        <StudioBlock
          block={block}
          collapsed={!!p.collapsed}
          saved={!!savedStudio[it.id]}
          onToggle={() => toggleStudioCollapsed(it)}
          onRemove={() => removeItem(it.id)}
          onSaveLibrary={() => saveStudioToLibrary(it)}
        />
      );
    }
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

    // IMAGEM (colada/enviada) → preview no mural
    if (it.type === "image" && it.payload?.dataUrl) {
      return (
        <div className="group relative my-3">
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100">
            <button onClick={() => toLibrary(it.id)} title="Voltar p/ biblioteca" className="p-1 rounded bg-black/40 text-white hover:bg-black/60"><ArrowLeftToLine size={11} /></button>
            <button onClick={() => removeItem(it.id)} title="Remover" className="p-1 rounded bg-black/40 text-white hover:bg-black/60"><X size={12} /></button>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={it.payload.dataUrl} alt={it.title || "imagem"} className="max-h-[420px] w-auto rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm" />
        </div>
      );
    }
    // ÁUDIO → player
    if (it.type === "audio" && it.payload?.dataUrl) {
      return (
        <div className="group relative my-3 rounded-2xl border p-3 bg-slate-50 border-slate-200 dark:bg-white/[0.04] dark:border-white/10">
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100">
            <button onClick={() => toLibrary(it.id)} title="Voltar p/ biblioteca" className="text-slate-400 hover:text-cyan-500"><ArrowLeftToLine size={13} /></button>
            <button onClick={() => removeItem(it.id)} title="Remover" className="text-slate-400 hover:text-rose-400"><X size={14} /></button>
          </div>
          <div className="flex items-center gap-1.5 mb-2"><Music size={13} className="text-cyan-600 dark:text-cyan-300" /><span className="text-[12px] font-bold text-slate-800 dark:text-white truncate">{it.title || "áudio"}</span></div>
          <audio controls src={it.payload.dataUrl} className="w-full" />
        </div>
      );
    }
    // ARQUIVO / PDF enviado → link de download
    if ((it.type === "file" || it.type === "pdf") && it.payload?.dataUrl) {
      return (
        <div className="group relative my-3 rounded-2xl border p-3.5 bg-slate-50 border-slate-200 dark:bg-white/[0.04] dark:border-white/10 flex items-center gap-2">
          <Paperclip size={15} className="text-cyan-600 dark:text-cyan-300 shrink-0" />
          <a href={it.payload.dataUrl} download={it.payload?.name || it.title || "arquivo"} className="text-[12px] font-semibold text-slate-800 dark:text-white truncate hover:underline">{it.title || it.payload?.name || "arquivo"}</a>
          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100">
            <button onClick={() => toLibrary(it.id)} title="Voltar p/ biblioteca" className="text-slate-400 hover:text-cyan-500"><ArrowLeftToLine size={13} /></button>
            <button onClick={() => removeItem(it.id)} title="Remover" className="text-slate-400 hover:text-rose-400"><X size={14} /></button>
          </div>
        </div>
      );
    }

    // OUTRAS MÍDIAS da biblioteca (ref/link/pdf/insight…) → cartão enxuto
    if (isMedia) {
      const url = it.payload?.url || it.payload?.text;
      return (
        <div className="group relative my-3 rounded-2xl border p-3.5 bg-slate-50 border-slate-200 shadow-sm dark:bg-white/[0.04] dark:border-white/10 dark:shadow-none">
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100">
            <SpeakButton text={it.payload?.text || it.summary || it.title || ""} size={13} />
            <button onClick={() => toLibrary(it.id)} title="Voltar p/ biblioteca" className="text-slate-400 hover:text-cyan-500"><ArrowLeftToLine size={13} /></button>
            <button onClick={() => removeItem(it.id)} title="Remover" className="text-slate-400 hover:text-rose-400"><X size={14} /></button>
          </div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300">{it.type}</span>
            <span className="text-[12px] font-bold text-slate-800 dark:text-white truncate">{it.title || "(sem título)"}</span>
          </div>
          {it.type === "link" && url
            ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-[12px] text-cyan-600 dark:text-cyan-400 underline break-all">{url}</a>
            : <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{it.payload?.text || ""}</p>}
          {it.summary && <div className="mt-2 rounded-xl bg-cyan-500/[0.07] border border-cyan-500/15 p-2 text-[13px] text-slate-700 dark:text-cyan-100/90 leading-relaxed"><span className="font-black text-cyan-700 dark:text-cyan-300">Resumo · </span>{it.summary}</div>}
          {(it.payload?.text || it.title) && (
            <button onClick={() => summarize(it)} disabled={busyId === it.id} className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-cyan-600 dark:text-cyan-300 hover:underline disabled:opacity-50">
              {busyId === it.id ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />} {it.summary ? "Resumir de novo" : "Resumir"}
            </button>
          )}
        </div>
      );
    }

    // BLOCO DE TEXTO editável (título / subtítulo / parágrafo)
    // Tipografia editorial (estilo Claude): títulos grandes, texto generoso e legível.
    // O 1º bloco (logo abaixo do título) vira um SUBTÍTULO destacado, um pouco maior.
    const isLead = idx === 0 && variant === "text";
    const cls = variant === "h1" ? "font-ornament text-3xl sm:text-4xl font-black tracking-tight leading-tight text-slate-900 dark:text-white"
      : variant === "h2" ? "text-xl sm:text-2xl font-bold tracking-tight leading-snug text-slate-800 dark:text-white/95"
      : isLead ? "text-xl sm:text-2xl font-semibold leading-snug text-slate-700 dark:text-white/90"
      : "text-[16px] sm:text-[17px] leading-[1.7] text-slate-700 dark:text-slate-200/90";
    const ph = variant === "h1" ? "Título" : variant === "h2" ? "Subtítulo" : "Escreva…";
    const onKey = (e: React.KeyboardEvent) => {
      // Enter = novo bloco abaixo; Shift+Enter = quebra de linha no mesmo bloco.
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void addBlockAfter(it); return; }
      // Backspace em bloco vazio = remove e foca o bloco editável anterior (fusão).
      if (e.key === "Backspace" && text === "") {
        e.preventDefault();
        const prev = prevEditableId(feed, it.id);
        removeItem(it.id);
        if (prev) setFocusId(prev);
      }
    };
    return (
      <div className="group relative -mx-2 px-2 py-0.5 rounded-lg hover:bg-black/[0.015] dark:hover:bg-white/[0.02]">
        <button onClick={() => removeItem(it.id)} title="Remover bloco" className="absolute -left-3 top-1.5 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-400"><X size={12} /></button>
        {text.trim() && <div className="absolute -right-1 top-0.5 opacity-0 group-hover:opacity-100"><SpeakButton text={text} /></div>}
        <AutoGrow value={text} onChange={(v) => editText(it.id, v)} onKeyDown={onKey} placeholder={ph} className={cls} autoFocus={focusId === it.id} />
        {it.type === "note" && soloYt(text) && editingYt === it.id && (
          <button onClick={() => setEditingYt(null)} className="text-[12px] font-bold text-cyan-600 dark:text-cyan-300 hover:underline">▶ ver vídeo</button>
        )}
      </div>
    );
  };

  const pillCls = "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[13px] font-semibold border bg-white text-slate-600 border-slate-200 hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-300 dark:bg-white/[0.06] dark:text-white/55 dark:border-white/10 dark:hover:bg-cyan-500/15 dark:hover:text-cyan-300 dark:hover:border-cyan-400/30 transition-colors";
  const AddBar = ({ center }: { center?: boolean }) => (
    <div className={`flex items-center gap-1.5 ${center ? "justify-center" : ""}`}>
      <button onClick={() => addBlock("h1")} className={pillCls}><Heading1 size={13} /> Título</button>
      <button onClick={() => addBlock("h2")} className={pillCls}><Heading2 size={13} /> Subtítulo</button>
      <button onClick={() => addBlock("text")} className={pillCls}><Pilcrow size={13} /> Texto</button>
    </div>
  );

  return (
    <div onPaste={onPaste} className={`h-full flex flex-col ${navRight ? "lg:flex-row-reverse" : "lg:flex-row"}`}>
      {/* ── CADERNO (centro) ── */}
      <div className="flex-1 min-w-0 flex flex-col p-5 sm:p-6 relative">
        {/* BOTÃO FLUTUANTE "Estudar esse tema" — surge quando há algo digitado na barra ⟁
            (e a Zaeon não está ocupada). Estilo about-us. Gera o estudo a partir do tema. */}
        {zaeonCmd.trim() && !zaeonBusy && (
          <button
            onClick={() => zaeonStudy()}
            title="Estudar esse tema"
            className="group absolute bottom-6 right-6 z-30 inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-white font-black text-[14px] tracking-tight transition-transform hover:scale-[1.04] active:scale-95"
            style={{ background: "linear-gradient(135deg,#2563eb,#06b6d4)", boxShadow: "0 18px 44px -14px rgba(34,211,238,0.65)" }}
          >
            <Sparkles size={18} /> Estudar esse tema
          </button>
        )}
        {/* ── CABEÇALHO: pílula liquid-glass (⟁ + título grande) + Play funcional ── */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="flex-1 min-w-0 rounded-[28px] p-[1.5px] bg-gradient-to-r from-blue-500/40 via-cyan-400/40 to-violet-500/40 dark:from-blue-400/40 dark:via-cyan-400/40 dark:to-violet-400/40 shadow-[0_12px_36px_-16px_rgba(37,99,235,0.45)]">
            <div className="rounded-[27px] flex items-center gap-2.5 px-2 py-2 bg-white/70 dark:bg-white/[0.05] backdrop-blur-2xl border border-white/70 dark:border-white/10">
              {/* ⟁ da Zaeon: abre/fecha a barra de novo estudo */}
              <button
                onClick={() => setBarOpen((v) => !v)}
                title={barOpen ? "Fechar a Zaeon" : "Pedir um estudo à Zaeon"}
                aria-pressed={barOpen}
                className={`shrink-0 self-center w-11 h-11 rounded-full flex items-center justify-center text-lg leading-none transition-all ${barOpen ? "text-white shadow-md" : "text-cyan-600 dark:text-cyan-300 hover:bg-cyan-500/10"}`}
                style={barOpen ? { background: "linear-gradient(135deg,#2563eb,#06b6d4)" } : undefined}
              >
                <span className={`${zaeonBusy ? "animate-[spin_4s_linear_infinite]" : "animate-[spin_16s_linear_infinite]"} motion-reduce:animate-none`} style={{ filter: "drop-shadow(0 0 4px rgba(34,211,238,0.55))" }}>⟁</span>
              </button>
              {genTitle !== null ? (
                // Zaeon "digitando" o nome do estudo (glitch + gradiente) — pode quebrar linha
                <span
                  style={{ fontFamily: `"Noto Sans SC","Microsoft YaHei",sans-serif` }}
                  className="flex-1 min-w-0 text-[26px] leading-tight font-black tracking-tight bg-gradient-to-r from-blue-500 via-cyan-400 to-violet-500 bg-clip-text text-transparent break-words"
                >
                  {genTitle || "…"}
                </span>
              ) : (
                // Título SEMPRE completo: textarea que cresce em altura (sem corte/ellipsis)
                <textarea
                  ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); } }}
                  rows={1}
                  placeholder="Meus Estudos"
                  className="flex-1 min-w-0 resize-none overflow-hidden bg-transparent border-0 outline-none py-0.5 text-[26px] leading-tight font-black tracking-tight text-[#0b3a66] dark:text-white placeholder:text-[#0b3a66]/35 dark:placeholder:text-white/30"
                />
              )}
            </div>
          </div>
          {/* PLAY: lê o estudo INTEIRO (clica de novo = parar). Liquid-glass + ondas do chat widget. */}
          <VoicePlayButton
            playing={tts.speaking}
            loading={tts.loading}
            onClick={readWholeStudy}
            disabled={feed.length === 0 && !tts.speaking}
            size={48}
            label={tts.speaking ? "Parar a leitura" : "Ouvir o estudo inteiro"}
          />
        </div>

        {/* ── STUDIO DA ZAEON: transforma o estudo em guia/FAQ/flashcards/mapa/linha do tempo ── */}
        <StudioDock spaceId={spaceId} />

        {/* ── BARRINHA-AGENTE: só aparece ao clicar no ⟁ (some enquanto a Zaeon pensa). ── */}
        {barOpen && !zaeonBusy && (
        <div className="mb-3 rounded-full p-[1.5px] bg-gradient-to-r from-blue-500/70 via-cyan-400/70 to-sky-500/70 dark:from-blue-400/80 dark:via-cyan-400/80 dark:to-sky-400/80 dark:shadow-[0_0_22px_-6px_rgba(56,189,248,0.4)]">
          <div className="rounded-full bg-white dark:bg-[#0a1020] pl-3.5 pr-1.5 py-1 flex items-center gap-2">
            <input
              autoFocus
              value={zaeonCmd}
              onChange={(e) => setZaeonCmd(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") zaeonStudy(); if (e.key === "Escape") setBarOpen(false); }}
              disabled={zaeonBusy}
              placeholder="Zaeon, estude sobre…"
              className="flex-1 min-w-0 bg-transparent text-[12.5px] text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/35 focus:outline-none disabled:opacity-60 py-1"
            />
            <VoiceModeSwitch onTranscript={(t) => setZaeonCmd(t)} title="Falar para a Zaeon" size={14} />
            <button onClick={() => zaeonStudy()} disabled={zaeonBusy || !zaeonCmd.trim()}
              className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white disabled:opacity-40 shadow-sm"
              style={{ background: "linear-gradient(135deg,#2563eb,#06b6d4)" }} title="Criar estudo">
              {zaeonBusy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            </button>
          </div>
        </div>
        )}

        {/* Status com EMOÇÃO — frases que rotacionam (são muitas etapas) */}
        {(zaeonBusy || zaeonStatus) && (
          <p className="mb-3 pl-9 text-[13px] text-cyan-600 dark:text-cyan-300 flex items-center gap-1.5">
            {zaeonBusy && <span className="inline-flex gap-0.5">
              <span className="w-1 h-1 rounded-full bg-cyan-400 animate-bounce" />
              <span className="w-1 h-1 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1 h-1 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>}
            {zaeonBusy ? ZAEON_PHRASES[phraseIdx] : zaeonStatus}
          </p>
        )}

        {/* Barra de loading enquanto a Zaeon monta o estudo */}
        {zaeonBusy && (
          <div className="mb-3 mx-0.5 h-1 rounded-full overflow-hidden bg-slate-200/70 dark:bg-white/10">
            <div className="zaeon-loadbar h-full rounded-full" style={{ background: "linear-gradient(90deg,#2563eb,#22d3ee,#7c3aed)" }} />
          </div>
        )}

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
            <div className={`p-6 sm:p-8 max-w-2xl flex flex-col ${libOpen ? "mx-auto" : "lg:pl-10"}`}>
              {feed.map((it, idx) => <div key={it.id}>{renderBlock(it, idx)}</div>)}
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
          <span className="text-[12px] font-black uppercase tracking-[0.16em] lg:[writing-mode:vertical-rl] lg:rotate-180">Biblioteca</span>
          <span className="text-[11px] font-mono">{library.length + spaces.length}</span>
        </button>
      )}

      {/* ── BIBLIOTECA (direita) — painel destacado do fundo (claro e escuro) ── */}
      {libOpen && (
      <div className="lg:w-64 shrink-0 flex flex-col min-h-0 lg:m-3 lg:rounded-2xl border-t lg:border border-slate-200 dark:border-white/12 bg-slate-100/80 dark:bg-[#0a0f1c] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] dark:shadow-[0_8px_30px_-10px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.03]">
          <span className="text-[12px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-white/50">Biblioteca</span>
          <span className="text-[11px] font-mono text-slate-400">{library.length + spaces.length}</span>
          <button onClick={() => setShowAdd((v) => !v)} className="ml-auto p-1 rounded-lg text-slate-400 hover:text-cyan-500" title="Adicionar à biblioteca"><Plus size={15} /></button>
          <button onClick={() => setLibOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-cyan-500" title="Recolher biblioteca"><PanelRightClose size={15} /></button>
        </div>

        {showAdd && (
          <div className="px-3 py-3 border-b border-slate-200 dark:border-white/10 flex flex-col gap-2">
            <div className="flex gap-1.5">
              <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveNote()} placeholder="nota ou link…" className="flex-1 min-w-0 rounded-xl px-2.5 py-1.5 text-[13px] bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none" />
              <button onClick={saveNote} disabled={!note.trim()} className="px-2 rounded-xl text-white disabled:opacity-40" style={{ background: GRAD }}><Plus size={13} /></button>
            </div>
            <label className="flex items-center justify-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[13px] font-bold text-white cursor-pointer" style={{ background: GRAD }}><UploadCloud size={13} /> Enviar arquivo<input type="file" multiple className="hidden" onChange={onPickFiles} /></label>
            <p className="text-[12px] text-slate-400 dark:text-white/30 leading-relaxed">Imagem, áudio, PDF, qualquer arquivo. Você também pode colar (Ctrl+V) ou arrastar pro caderno.</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2.5 flex flex-col gap-2 min-h-[120px]">
          {/* ── ESTUDOS como arquivos de texto (oculto no modo collab: o espaço é fixo) ── */}
          {!collabSpaceId && spaces.length > 0 && (
            <>
              <div className="flex items-center gap-1 px-1 pt-0.5">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-white/30">Estudos</p>
                <button onClick={newSpace} title="Novo estudo (abre a Zaeon pra começar)" className="ml-auto text-slate-400 hover:text-cyan-500"><Plus size={13} /></button>
              </div>
              {spaces.map((sp) => (
                <div key={`sp-${sp.id}`}
                  className={`group flex items-center gap-2 rounded-xl border p-2 transition-colors ${sp.id === spaceId
                    ? "border-cyan-400/60 bg-cyan-500/5 dark:bg-cyan-500/10"
                    : "bg-white border-slate-200 shadow-sm hover:border-cyan-400/50 dark:bg-white/[0.04] dark:border-white/10 dark:shadow-none"}`}
                >
                  <button onClick={() => setSpaceId(sp.id)} title="Abrir este estudo" className="flex items-center gap-2 flex-1 min-w-0 text-left">
                    <FileText size={14} className="text-violet-500 dark:text-violet-300 shrink-0" />
                    <span className="flex-1 min-w-0 text-[13px] font-medium text-slate-700 dark:text-white/90 truncate">{sp.title || "Estudo"}</span>
                  </button>
                  {sp.id === spaceId && <span className="text-[10px] font-black uppercase tracking-wide text-cyan-500 shrink-0">ativo</span>}
                  {spaces.length > 1 && (
                    <button onClick={() => delSpace(sp.id)} title="Apagar este estudo (vai pra lixeira)"
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-400 shrink-0">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </>
          )}

          {/* ── REFERÊNCIAS / itens salvos ── */}
          {library.length > 0 && (
            <>
              <p className="px-1 pt-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-white/30">Salvos</p>
              {library.map((it) => {
                const Icon = typeIcon(it.type);
                const isStudio = it.type === "studio";
                return (
                  <div key={it.id}
                    draggable={!isStudio}
                    onDragStart={isStudio ? undefined : (e) => { e.dataTransfer.setData(DT, it.id); e.dataTransfer.effectAllowed = "move"; }}
                    onClick={isStudio ? () => setStudioPreview(it) : undefined}
                    className={`group flex items-center gap-2 rounded-xl border p-2 bg-white border-slate-200 shadow-sm hover:border-cyan-400/50 dark:bg-white/[0.04] dark:border-white/10 dark:shadow-none ${isStudio ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"}`}
                    title={isStudio ? "Ver isolado" : "Arraste para o caderno"}
                  >
                    {isStudio
                      ? <span className="text-cyan-600 dark:text-cyan-300 shrink-0 text-[13px] leading-none">⟁</span>
                      : <GripVertical size={13} className="text-slate-300 dark:text-white/20 shrink-0" />}
                    <Icon size={14} className="text-cyan-600 dark:text-cyan-300 shrink-0" />
                    <span className="flex-1 min-w-0 text-[13px] font-medium text-slate-700 dark:text-white/90 truncate">{it.title || it.payload?.text?.slice(0, 40) || it.type}</span>
                    <button onClick={(e) => { e.stopPropagation(); removeItem(it.id); }} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-400 shrink-0"><Trash2 size={12} /></button>
                  </div>
                );
              })}
            </>
          )}

          {loading || library.length > 0 ? null : (
            <p className="text-[13px] text-slate-400 dark:text-white/30 p-2 leading-relaxed">Salve referências, vídeos e trabalhos aqui (pelo "+" ou pela pesquisa). Depois arraste pro caderno.</p>
          )}
        </div>
      </div>
      )}

      {/* Preview isolado de um módulo do Studio salvo na biblioteca */}
      {studioPreview && (
        <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setStudioPreview(null)}>
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto custom-scrollbar" onClick={(e) => e.stopPropagation()}>
            <StudioBlock
              block={{ studioKind: studioPreview.payload?.studioKind, title: studioPreview.title, data: studioPreview.payload?.data, artifactId: studioPreview.payload?.artifactId, dataUrl: studioPreview.payload?.dataUrl }}
              collapsed={false}
            />
            <button onClick={() => setStudioPreview(null)} className="mx-auto mt-1 block text-[12px] font-bold text-white/85 hover:text-white">fechar</button>
          </div>
        </div>
      )}

      {/* barra de loading indeterminada (segmento que vai e volta) */}
      <style jsx global>{`
        @keyframes zaeon-load { 0% { transform: translateX(-100%); width: 40%; } 50% { width: 60%; } 100% { transform: translateX(250%); width: 40%; } }
        .zaeon-loadbar { animation: zaeon-load 1.3s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
