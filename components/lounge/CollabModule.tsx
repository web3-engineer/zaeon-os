"use client";

/**
 * CollabModule — coração colaborativo do Lounge.
 *  - 3 bandejas retráteis (Estudos / Pesquisas / Projetos), só uma aberta por vez,
 *    com contagem. Projetos pede plano Pro. Pesquisas têm tag TCC/Artigo/Relatório.
 *  - ▶ cria um CollabDoc (cópia; o original na sala pessoal NÃO é afetado), recolhe as
 *    bandejas, abre o editor e mostra o link de convite.
 *  - Editor compartilhado em tempo real (Pusher): edição simultânea, presença
 *    "fulano está digitando/gerando", e botão Zaeon que gera texto NO CURSOR (não cria
 *    trabalho novo). Lixeira com confirmação pra apagar/sair da colaboração.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import Image from "next/image";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import PusherClient from "pusher-js";
import { useSavedCitations } from "@/lib/useSavedCitations";
import DocumentDesktop from "@/app/research-lab/DocumentDesktop";
import {
  Play, Link as LinkIcon, Copy, Check, Send, X, Users, ArrowLeft, ChevronDown,
  FileText, GraduationCap, Loader2, UserPlus, Trash2, Sparkles,
  Heading1, Heading2, Pilcrow, GripVertical, Save,
} from "lucide-react";

type Source = { id: string; title: string; kind: "study" | "research"; tag?: string; content?: string };
type Collab = { id: string; title: string; kind: string; updatedAt: string; isOwner: boolean; memberCount: number };
type Contact = { id: string; name: string | null; image: string | null; isInviter?: boolean };
type Member = { id: string; name: string | null; image: string | null };
type DocFull = { id: string; title: string; kind: string; sourceType: string | null; sourceId: string | null; content: string; ownerId: string; isOwner: boolean; token: string; members: Member[] };

// Sala de Estudos REAL (mesmo componente da sala), montada no Lounge sobre o espaço compartilhado.
const CollabStudyRoom = dynamic(() => import("@/components/study/MeusEstudosFeed"), { ssr: false });

const isResearchKind = (k: string) => ["research", "report", "tcc", "artigo", "relatório", "relatorio"].includes((k || "").toLowerCase());
// Mesmos ícones da sidebar: Sala de Estudos = documento, Sala de Pesquisa = capelo.
const kindIcon = (k: string) => (isResearchKind(k) ? GraduationCap : FileText);

// Pesquisas REAIS = os docs TCC/Artigo/Relatório (localStorage), cada um com sua tag única.
function readResearchDocs(): Source[] {
  try {
    const raw = localStorage.getItem("zaeon_research_docs");
    const docs = raw ? (JSON.parse(raw)?.docs || {}) : {};
    const out: Source[] = [];
    for (const type of ["TCC", "Artigo", "Relatório"]) {
      const doc = (docs as any)[type];
      if (!doc?.content) continue;
      const body = String(doc.content).split("\n").filter((l: string) => l.trim() && !l.trim().startsWith("#")).join(" ").trim();
      if (body.length < 3) continue;
      out.push({ id: type, title: doc.title && doc.title !== "minha_pesquisa.pdf" ? doc.title : type, kind: "research", tag: type, content: doc.content });
    }
    return out;
  } catch { return []; }
}

// Renderiza no document.body — escapa de ancestrais com backdrop-filter/transform
// (que quebram position:fixed). Sem isso, os popups abrem fora da tela.
function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

// ───────────────────────── Motor de BLOCOS (caderno colaborativo) ─────────────────────────
// O doc é guardado como MARKDOWN (# / ## / texto); aqui viramos blocos editáveis/arrastáveis
// e serializamos de volta — assim a co-edição ao vivo (string) e os blocos convivem.
type Block = { id: string; variant: "h1" | "h2" | "text"; text: string };
const bid = () => Math.random().toString(36).slice(2, 9);

function parseBlocks(md: string): Block[] {
  const out: Block[] = [];
  let buf: string[] = [];
  const flush = () => { const t = buf.join("\n").trim(); if (t) out.push({ id: bid(), variant: "text", text: t }); buf = []; };
  for (const ln of (md || "").split("\n")) {
    if (ln.startsWith("## ")) { flush(); out.push({ id: bid(), variant: "h2", text: ln.slice(3).trim() }); }
    else if (ln.startsWith("# ")) { flush(); out.push({ id: bid(), variant: "h1", text: ln.slice(2).trim() }); }
    else if (ln.trim() === "") flush();
    else buf.push(ln);
  }
  flush();
  return out.length ? out : [{ id: bid(), variant: "text", text: "" }];
}
function serializeBlocks(blocks: Block[]): string {
  return blocks.map((b) => (b.variant === "h1" ? `# ${b.text}` : b.variant === "h2" ? `## ${b.text}` : b.text)).join("\n\n").trim();
}

/** Textarea que cresce com o conteúdo (cópia do caderno de Meus Estudos). */
function AutoGrow({ value, onChange, onKeyDown, onFocus, onBlur, placeholder, className, autoFocus }: {
  value: string; onChange: (v: string) => void; onKeyDown?: (e: React.KeyboardEvent) => void;
  onFocus?: () => void; onBlur?: () => void; placeholder?: string; className?: string; autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { const el = ref.current; if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }, [value]);
  useEffect(() => { if (autoFocus && ref.current) { ref.current.focus(); const v = ref.current.value; ref.current.setSelectionRange(v.length, v.length); } }, [autoFocus]);
  return (
    <textarea ref={ref} value={value} rows={1} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown} onFocus={onFocus} onBlur={onBlur}
      className={`w-full resize-none overflow-hidden bg-transparent outline-none placeholder:text-slate-300 dark:placeholder:text-white/20 ${className || ""}`} />
  );
}

export default function CollabModule() {
  const { data: session } = useSession();
  const myId = (session?.user as any)?.id || "";

  // Tom suave por gênero do usuário LOGADO — tinge só os cards (Lounge é o espaço
  // mais "soft" da Zaeon). Rosa = feminino, azul = masculino, neutro = default.
  const _g = String((session?.user as any)?.gender || "").toLowerCase();
  // Estética dos cards da workstation (highlightCard + textHighlight): grandes,
  // bem coloridos por gênero (tudo rosa p/ mulher, tudo azul p/ homem), título com glow.
  const cardTheme = (_g.includes("femin") || _g === "female")
    ? { card: "bg-pink-50/80 dark:bg-pink-950/30 border-pink-300/50 dark:border-pink-500/30 shadow-[0_16px_44px_-16px_rgba(236,72,153,0.55)]", chip: "bg-pink-500/20 text-pink-600 dark:text-pink-200", title: "text-pink-900 dark:text-white dark:drop-shadow-[0_0_10px_rgba(255,182,193,0.85)]", play: "linear-gradient(135deg,#ec4899,#f472b6)", tag: "bg-pink-500" }
    : (_g.includes("mascul") || _g === "male")
    ? { card: "bg-sky-50/80 dark:bg-blue-950/35 border-sky-300/50 dark:border-blue-500/30 shadow-[0_16px_44px_-16px_rgba(56,189,248,0.55)]", chip: "bg-sky-500/20 text-sky-600 dark:text-sky-200", title: "text-blue-900 dark:text-white dark:drop-shadow-[0_0_12px_rgba(34,211,238,0.9)]", play: "linear-gradient(135deg,#2563eb,#38bdf8)", tag: "bg-sky-500" }
    : { card: "bg-white/70 dark:bg-white/[0.05] border-slate-200 dark:border-white/10 shadow-[0_16px_44px_-18px_rgba(0,0,0,0.5)]", chip: "bg-cyan-500/15 text-cyan-500 dark:text-cyan-300", title: "text-slate-900 dark:text-white", play: "linear-gradient(135deg,#0ea5e9,#22d3ee)", tag: "bg-violet-500" };

  const [sources, setSources] = useState<{ studies: Source[]; research: Source[] }>({ studies: [], research: [] });
  const [collabs, setCollabs] = useState<Collab[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [plan, setPlan] = useState<string>("free");
  // Duas colunas independentes (Estudos | Pesquisas) — cada uma abre/fecha sozinha.
  // Começam MINIMIZADAS: só expandem o conteúdo quando o usuário clica na setinha.
  const [openTrays, setOpenTrays] = useState<Record<"study" | "research", boolean>>({ study: false, research: false });
  const [creating, setCreating] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<Collab | null>(null);
  // Modo foco da sala: quando ativo, a sidebar sobe pra top-4. O painel cheio do
  // lounge precisa subir junto (antes ficava preso em top-96 → desalinhado/bugado).
  const [focusMode, setFocusMode] = useState(false);
  useEffect(() => {
    const onFocus = (e: any) => setFocusMode(!!e?.detail);
    window.addEventListener("zaeon-focus-mode", onFocus);
    return () => window.removeEventListener("zaeon-focus-mode", onFocus);
  }, []);

  const isPro = plan && plan !== "free";

  const loadCollabs = useCallback(async () => {
    try { const r = await fetch("/api/collab", { cache: "no-store" }); if (r.ok) setCollabs(await r.json()); } catch { /* */ }
  }, []);

  useEffect(() => {
    try { const id = new URLSearchParams(window.location.search).get("collab"); if (id) setOpenId(id); } catch { /* */ }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/collab/sources", { cache: "no-store" });
        const d = r.ok ? await r.json() : { studies: [] };
        setSources({ studies: d.studies || [], research: readResearchDocs() }); // pesquisas = docs TCC/Artigo/Relatório
      } catch { setSources((p) => ({ ...p, research: readResearchDocs() })); }
      loadCollabs();
      try {
        const [pr, fr] = await Promise.all([
          fetch("/api/profile", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
          fetch("/api/network/friends", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);
        if (pr?.plan) setPlan(pr.plan);
        const list: Contact[] = [];
        if (pr?.inviter?.id) list.push({ id: pr.inviter.id, name: pr.inviter.name, image: pr.inviter.image, isInviter: true });
        (fr?.friends || []).forEach((f: any) => { if (!list.some((c) => c.id === f.id)) list.push({ id: f.id, name: f.name, image: f.image }); });
        setContacts(list);
      } catch { /* */ }
    })();
  }, [loadCollabs]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 4000); };

  const createCollab = async (s: Source, tag?: string) => {
    setCreating(s.id);
    try {
      const realTag = s.tag || tag;
      const r = await fetch("/api/collab", {
        method: "POST", headers: { "Content-Type": "application/json" },
        // pesquisas do localStorage mandam o conteúdo direto (o servidor não as tem no banco)
        body: JSON.stringify({ sourceType: s.kind, sourceId: s.id, title: s.title, kind: realTag ? realTag.toLowerCase() : s.kind, content: s.content }),
      });
      if (r.ok) {
        const d = await r.json();
        await loadCollabs();
        setOpenId(d.id);   // abre o EDITOR inline (o convite agora é o botão "Convidar" dentro dele)
      } else {
        const d = await r.json().catch(() => ({}));
        flash(d.error || `Não consegui gerar o convite (${r.status}).`);
      }
    } catch { flash("Erro de conexão ao gerar o convite."); } finally { setCreating(null); }
  };

  const deleteCollab = async (c: Collab) => {
    try {
      const r = await fetch(`/api/collab/${c.id}`, { method: "DELETE" });
      if (r.ok) { setCollabs((prev) => prev.filter((x) => x.id !== c.id)); }
      else flash("Não consegui apagar agora.");
    } catch { flash("Erro de conexão."); } finally { setConfirmDel(null); }
  };

  const trayDef = [
    { key: "study" as const, label: "Estudos", icon: FileText, count: sources.studies.length, accent: "cyan" },
    { key: "research" as const, label: "Pesquisas", icon: GraduationCap, count: sources.research.length, accent: "violet" },
  ];

  // Editor aberto → TELA CHEIA (vira a sala): escapa do feed estreito do Lounge via Portal.
  // "Sair" fecha e a página do Lounge volta como estava.
  if (openId) {
    return (
      <>
        <Portal>
          {/* Tela cheia da SALA — respeita a navbar (topo) e a sidebar (esquerda), não cobre.
              No modo foco a sidebar sobe pra top-4, então o painel sobe junto (alinhado). */}
          <div className={`fixed z-[200] ${focusMode ? "top-4" : "top-[96px]"} left-[84px] right-4 bottom-4 bg-slate-100 dark:bg-[#030014] flex flex-col rounded-[20px] transition-[top] duration-500`}>
            <CollabEditor docId={openId} myId={myId} contacts={contacts} onClose={() => { setOpenId(null); loadCollabs(); }} />
          </div>
        </Portal>
        {confirmDel && <Portal><ConfirmDelete collab={confirmDel} onCancel={() => setConfirmDel(null)} onConfirm={() => deleteCollab(confirmDel)} /></Portal>}
        {toast && <Portal><div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[900] px-5 py-3 rounded-full bg-black text-white text-[12px] font-bold shadow-2xl">{toast}</div></Portal>}
      </>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-8">
      {/* ── Estudos | Pesquisas, lado a lado (duas colunas) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
        {trayDef.map((t) => {
          const expanded = openTrays[t.key];
          return (
            <div key={t.key} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/[0.03] overflow-hidden">
              <button onClick={() => setOpenTrays((p) => ({ ...p, [t.key]: !p[t.key] }))} className="w-full flex items-center gap-3 px-4 py-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-${t.accent}-500/15 text-${t.accent}-500`}><t.icon size={16} /></div>
                <span className="text-[12px] font-black uppercase tracking-widest text-slate-700 dark:text-white/80 flex-1 text-left">{t.label}</span>
                <span className="text-[12px] font-mono text-slate-400 dark:text-white/40 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5">{t.count}</span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
              </button>

              {expanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="px-4 pb-4">
                  {t.key === "study" && (
                    sources.studies.length ? (
                      <div className="flex flex-col gap-2.5">
                        {sources.studies.map((s) => <SourceCard key={s.id} s={s} creating={creating === s.id} onPlay={() => createCollab(s)} theme={cardTheme} />)}
                      </div>
                    ) : <Empty text="Nenhum estudo ainda — crie um na Sala de Estudos." />
                  )}
                  {t.key === "research" && (
                    sources.research.length ? (
                      <div className="flex flex-col gap-2.5">
                        {sources.research.map((s) => (
                          <ResearchCard key={s.id} s={s} creating={creating === s.id} onPlay={() => createCollab(s)} theme={cardTheme} />
                        ))}
                      </div>
                    ) : <Empty text="Nenhuma pesquisa ainda — comece uma na sala de Pesquisa." />
                  )}
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Colaborações ── */}
      <div>
        <h3 className="text-[13px] font-black uppercase tracking-[0.25em] text-slate-600 dark:text-white/55 mb-3 flex items-center gap-2"><Users size={13} /> Colaborações</h3>
        {collabs.length === 0 ? (
          <Empty text="Nenhuma colaboração ainda. Dê play acima ou aceite o convite de um amigo." />
        ) : (
          <div className="flex flex-col gap-2">
            {collabs.map((c) => {
              const Icon = kindIcon(c.kind);
              return (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/[0.03] hover:border-cyan-400/50 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0"><Icon size={17} /></div>
                  <button onClick={() => setOpenId(c.id)} className="min-w-0 flex-1 text-left">
                    <p className="text-[12px] font-bold text-slate-800 dark:text-white truncate">{c.title}</p>
                    <p className="text-[11px] uppercase tracking-widest text-slate-400 dark:text-white/35">{c.isOwner ? "Você criou" : "Convidado"} · {c.memberCount} {c.memberCount === 1 ? "membro" : "membros"}</p>
                  </button>
                  <button onClick={() => setOpenId(c.id)} className="text-[12px] font-bold text-cyan-600 dark:text-cyan-300 shrink-0 px-2">abrir →</button>
                  <button onClick={() => setConfirmDel(c)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0" title="Apagar"><Trash2 size={15} /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {confirmDel && <Portal><ConfirmDelete collab={confirmDel} onCancel={() => setConfirmDel(null)} onConfirm={() => deleteCollab(confirmDel)} /></Portal>}
      {toast && <Portal><div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[900] px-5 py-3 rounded-full bg-black text-white text-[12px] font-bold shadow-2xl">{toast}</div></Portal>}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-[13px] text-slate-400 dark:text-white/30 italic py-1">{text}</p>;
}

type CardTheme = { card: string; chip: string; title: string; play: string; tag: string };

function SourceCard({ s, creating, onPlay, theme }: { s: Source; creating: boolean; onPlay: () => void; theme: CardTheme }) {
  return (
    <div className={`group flex items-center gap-4 p-5 rounded-3xl border backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] ${theme.card}`}>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${theme.chip}`}><FileText size={26} /></div>
      <p className={`font-ornament text-xl font-black tracking-tight truncate min-w-0 flex-1 leading-snug ${theme.title}`}>{s.title}</p>
      <PlayBtn creating={creating} onClick={onPlay} grad={theme.play} />
    </div>
  );
}

function ResearchCard({ s, creating, onPlay, theme }: { s: Source; creating: boolean; onPlay: () => void; theme: CardTheme }) {
  return (
    <div className={`group flex items-center gap-4 p-5 rounded-3xl border backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] ${theme.card}`}>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${theme.chip}`}><GraduationCap size={26} /></div>
      <div className="min-w-0 flex-1">
        <p className={`font-ornament text-xl font-black tracking-tight truncate leading-snug ${theme.title}`}>{s.title}</p>
        {/* UMA tag só — o tipo do trabalho (TCC OU Artigo OU Relatório) */}
        {s.tag && <span className={`mt-1.5 inline-block px-2.5 py-0.5 rounded-full text-[12px] font-black uppercase tracking-wide text-white ${theme.tag}`}>{s.tag}</span>}
      </div>
      <PlayBtn creating={creating} onClick={onPlay} grad={theme.play} />
    </div>
  );
}

function PlayBtn({ creating, onClick, grad }: { creating: boolean; onClick: () => void; grad?: string }) {
  return (
    <button onClick={onClick} disabled={creating} title="Gerar convite de colaboração"
      className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 transition-transform hover:scale-105 disabled:opacity-50"
      style={{ background: grad || "linear-gradient(135deg,#0ea5e9,#22d3ee)" }}>
      {creating ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} className="ml-0.5" />}
    </button>
  );
}

// ───────────────────────── Confirmação de exclusão (estilo Zaeon) ─────────────────────────
function ConfirmDelete({ collab, onCancel, onConfirm }: { collab: Collab; onCancel: () => void; onConfirm: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[820] flex items-center justify-center p-5" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-[26px] border border-rose-300/40 dark:border-rose-400/20 bg-white dark:bg-[#0b1220] p-6 text-center shadow-2xl overflow-hidden">
        <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-rose-500/15 blur-2xl" />
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-3 bg-rose-500/15"><Trash2 size={22} className="text-rose-500" /></div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">Apagar esta colaboração?</h3>
          <p className="text-[12px] text-slate-500 dark:text-white/50 mb-5">
            {collab.isOwner ? <>“{collab.title}” será apagada para todos os membros. Não dá pra desfazer.</> : <>Você vai sair de “{collab.title}”. Ela some da sua lista.</>}
          </p>
          <div className="flex gap-2 justify-center">
            <button onClick={onCancel} className="px-5 py-2.5 rounded-full text-[12px] font-black uppercase tracking-widest border border-slate-300 dark:border-white/15 text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/5">Cancelar</button>
            <button onClick={onConfirm} className="px-5 py-2.5 rounded-full text-[12px] font-black uppercase tracking-widest text-white" style={{ background: "linear-gradient(135deg,#f43f5e,#fb7185)" }}>
              {collab.isOwner ? "Apagar" : "Sair"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ───────────────────────── Popup de convite ─────────────────────────
function SharePopup({ link, title, contacts, onClose }: { link: string; title: string; contacts: Contact[]; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState<Record<string, boolean>>({});

  const copy = async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* */ } };
  const sendTo = async (c: Contact) => {
    try {
      await fetch("/api/ai/chat/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetId: c.id, text: `🤝 Vem co-criar "${title}" comigo na Zaeon: ${link}` }) });
      setSent((p) => ({ ...p, [c.id]: true }));
    } catch { /* */ }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[840] flex items-center justify-center p-5" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-[28px] border border-cyan-300/40 dark:border-cyan-400/20 bg-white dark:bg-[#0b1220] p-6 shadow-2xl overflow-hidden">
        <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-cyan-500/15 blur-2xl" />
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white"><X size={18} /></button>
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: "linear-gradient(135deg,#0ea5e9,#22d3ee)" }}><LinkIcon size={22} className="text-white" /></div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">Convite gerado ✨</h3>
          <p className="text-[12px] text-slate-500 dark:text-white/50 mb-4">Compartilhe esse link com quem você quer fazer esse trabalho.</p>

          <div className="flex items-center gap-2 p-2 pl-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04]">
            <input readOnly value={link} className="flex-1 bg-transparent text-[12px] text-slate-700 dark:text-white/80 outline-none truncate" />
            <button onClick={copy} className="px-3 py-2 rounded-xl text-white text-[13px] font-black uppercase tracking-wide inline-flex items-center gap-1.5 shrink-0" style={{ background: copied ? "#10b981" : "linear-gradient(135deg,#0ea5e9,#22d3ee)" }}>
              {copied ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
            </button>
          </div>

          {contacts.length > 0 && (
            <div className="mt-5">
              <p className="text-[12px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40 mb-2">Enviar direto pro chat</p>
              <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto custom-scrollbar">
                {contacts.map((c) => (
                  <div key={c.id} className={`flex items-center gap-3 p-2 rounded-2xl ${c.isInviter ? "border border-cyan-300/50 dark:border-cyan-400/25 bg-cyan-50/60 dark:bg-cyan-950/15" : "hover:bg-slate-100 dark:hover:bg-white/5"}`}>
                    <span className="w-9 h-9 rounded-full overflow-hidden bg-slate-200 dark:bg-black flex items-center justify-center shrink-0 border border-slate-300 dark:border-white/10">
                      {c.image ? <Image src={c.image} alt="" width={36} height={36} className="w-full h-full object-cover" /> : <span className="text-[12px] font-black text-slate-500">{(c.name || "?").charAt(0).toUpperCase()}</span>}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-bold text-slate-800 dark:text-white truncate">{c.name || "Membro Zaeon"}</p>
                      {c.isInviter && <p className="text-[11px] uppercase tracking-widest text-cyan-600 dark:text-cyan-300">quem te convidou</p>}
                    </div>
                    <button onClick={() => sendTo(c)} disabled={!!sent[c.id]} className="px-3 py-1.5 rounded-full text-[12px] font-black uppercase tracking-wide inline-flex items-center gap-1.5 shrink-0 transition-colors disabled:opacity-60" style={{ background: sent[c.id] ? "#10b981" : "rgba(14,165,233,0.12)", color: sent[c.id] ? "#fff" : "#0ea5e9" }}>
                      {sent[c.id] ? <><Check size={12} /> Enviado</> : <><Send size={12} /> Enviar</>}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ───────────────────────── Editor colaborativo ─────────────────────────
function CollabEditor({ docId, myId, contacts, onClose }: { docId: string; myId: string; contacts: Contact[]; onClose: () => void }) {
  const [doc, setDoc] = useState<DocFull | null>(null);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [remoteFlash, setRemoteFlash] = useState(false);
  const [share, setShare] = useState<{ link: string; title: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [peer, setPeer] = useState<{ name: string; state: string } | null>(null);
  const [zoom, setZoom] = useState(1); // zoom do texto (cópia da folha de pesquisa)
  // Caderno de Estudos (cópia 1:1): biblioteca + barra de IA. Só LÊ as salas, nunca escreve nelas.
  const [libOpen, setLibOpen] = useState(true);
  const [libSpaces, setLibSpaces] = useState<{ id: string; title: string }[]>([]);
  const [barOpen, setBarOpen] = useState(false);
  const [studyCmd, setStudyCmd] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [focusBlock, setFocusBlock] = useState<string | null>(null);
  const dragId = useRef<string | null>(null);
  const { citations } = useSavedCitations(); // painel direito da Pesquisa (cópia da sala)
  const { data: ceSession } = useSession();  // p/ salvar na conta do usuário
  const [dockPopover, setDockPopover] = useState<"citations" | "quiz" | null>(null);
  const [showFolder, setShowFolder] = useState(false);
  const [pubNote, setPubNote] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const clientId = useRef(Math.random().toString(36).slice(2));
  const focusedRef = useRef(false);
  const lastEditRef = useRef(0);
  const pendingRemote = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const caretRef = useRef(0);
  const lastPingRef = useRef(0);
  const peerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const research = isResearchKind(doc?.kind || "") || doc?.sourceType === "research";

  useEffect(() => {
    let alive = true;
    (async () => {
      try { const r = await fetch(`/api/collab/${docId}`, { cache: "no-store" }); if (r.ok && alive) { const d: DocFull = await r.json(); setDoc(d); setContent(d.content || ""); setBlocks(parseBlocks(d.content || "")); } } catch { /* */ }
    })();
    return () => { alive = false; };
  }, [docId]);

  // Real-time: doc-update + presença + member-joined + doc-deleted
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_PUSHER_KEY) return;
    const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER! });
    const ch = pusher.subscribe(`collab-${docId}`);
    ch.bind("doc-update", (data: any) => {
      if (data?.clientId === clientId.current || data?.fromUserId === myId) return;
      if (typeof data?.content !== "string") return;
      if (focusedRef.current && Date.now() - lastEditRef.current < 1500) pendingRemote.current = data.content;
      else { setContent(data.content); setBlocks(parseBlocks(data.content)); setRemoteFlash(true); setTimeout(() => setRemoteFlash(false), 700); }
    });
    ch.bind("presence", (data: any) => {
      if (!data || data.userId === myId) return;
      if (peerTimer.current) clearTimeout(peerTimer.current);
      if (data.state === "idle") { setPeer(null); return; }
      setPeer({ name: data.name || "Alguém", state: data.state });
      peerTimer.current = setTimeout(() => setPeer(null), 4000);
    });
    ch.bind("doc-deleted", () => { onClose(); });
    ch.bind("member-joined", () => {
      // novo colega entrou → recarrega os membros pra a foto dele aparecer na hora.
      fetch(`/api/collab/${docId}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: DocFull | null) => { if (d?.members) setDoc((prev) => (prev ? { ...prev, members: d.members } : prev)); })
        .catch(() => { /* ignore */ });
    });
    return () => { pusher.unsubscribe(`collab-${docId}`); pusher.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, myId]);

  // Aplica remoto pendente quando ocioso
  useEffect(() => {
    const iv = setInterval(() => {
      if (pendingRemote.current !== null && (!focusedRef.current || Date.now() - lastEditRef.current > 1500)) {
        setContent(pendingRemote.current); setBlocks(parseBlocks(pendingRemote.current)); pendingRemote.current = null;
        setRemoteFlash(true); setTimeout(() => setRemoteFlash(false), 700);
      }
    }, 800);
    return () => clearInterval(iv);
  }, []);

  const ping = (state: "typing" | "generating" | "idle") => {
    const now = Date.now();
    if (state !== "idle" && now - lastPingRef.current < 1100) return;
    lastPingRef.current = now;
    fetch(`/api/collab/${docId}/ping`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state }) }).catch(() => {});
  };

  const scheduleSave = (next: string) => {
    lastEditRef.current = Date.now();
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try { await fetch(`/api/collab/${docId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: next, clientId: clientId.current }) }); }
      catch { /* */ } finally { setSaving(false); ping("idle"); }
    }, 600);
  };

  const onChange = (v: string) => { setContent(v); caretRef.current = taRef.current?.selectionStart ?? v.length; ping("typing"); scheduleSave(v); };
  const trackCaret = () => { caretRef.current = taRef.current?.selectionStart ?? caretRef.current; };

  const reinvite = () => { if (!doc) return; const origin = typeof window !== "undefined" ? window.location.origin : ""; setShare({ link: `${origin}/c/${doc.token}`, title: doc.title }); };

  // Salvar = grava o doc compartilhado E persiste uma cópia em ABNT na conta do usuário
  // (mesmo "Salvar na nuvem" da Sala de Pesquisa; o conteúdo já vem com os marcadores ABNT).
  const saveNow = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // 1) doc compartilhado (grupo)
      await fetch(`/api/collab/${docId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content, clientId: clientId.current }) });
      // 2) cópia pessoal na nuvem (workspace), em formato ABNT
      const k = (doc?.kind || "artigo").toLowerCase();
      const wt = k.includes("tcc") ? "TCC" : k.includes("relat") ? "Relatório" : "Artigo";
      const email = ceSession?.user?.email || myId;
      await fetch("/api/workspace", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: email, workTitle: doc?.title || "Pesquisa", workContent: content, workType: wt }),
      });
      setSavedFlash(true); setTimeout(() => setSavedFlash(false), 2000);
    } catch { /* */ } finally { setSaving(false); }
  };

  // Inserir no ponto do cursor da FOLHA de pesquisa (citação/documento do painel direito).
  const insertResearch = (snippet: string) => {
    const pos = caretRef.current ?? content.length;
    const before = content.slice(0, pos), after = content.slice(pos);
    const sep = before && !before.endsWith("\n") ? "\n" : "";
    const next = before + sep + snippet + after;
    setContent(next); caretRef.current = (before + sep + snippet).length;
    lastEditRef.current = Date.now(); ping("typing"); scheduleSave(next);
  };

  // Biblioteca do caderno: só LÊ os estudos do usuário (read-only) pra arrastar/inserir. Nunca escreve neles.
  useEffect(() => {
    if (!doc || research) return;
    fetch("/api/study/spaces").then((r) => (r.ok ? r.json() : [])).then((d) => setLibSpaces(Array.isArray(d) ? d : [])).catch(() => {});
  }, [doc, research]);

  // ── Operações de BLOCO (caderno) — atualizam o doc compartilhado (markdown) e salvam ──
  const blocksRef = useRef<Block[]>([]);
  blocksRef.current = blocks;
  const commitBlocks = (next: Block[]) => {
    setBlocks(next); blocksRef.current = next;
    const md = serializeBlocks(next);
    setContent(md); lastEditRef.current = Date.now(); ping("typing"); scheduleSave(md);
  };
  const editBlock = (id: string, text: string) => commitBlocks(blocksRef.current.map((b) => (b.id === id ? { ...b, text } : b)));
  const addBlock = (variant: Block["variant"], text = "", afterId?: string) => {
    const nb: Block = { id: bid(), variant, text };
    const cur = blocksRef.current;
    const idx = afterId ? cur.findIndex((b) => b.id === afterId) : cur.length - 1;
    const next = [...cur]; next.splice(idx + 1, 0, nb); commitBlocks(next); setFocusBlock(nb.id);
  };
  const removeBlock = (id: string) => {
    const next = blocksRef.current.filter((b) => b.id !== id);
    commitBlocks(next.length ? next : [{ id: bid(), variant: "text", text: "" }]);
  };
  const reorder = (overId: string) => {
    const from = dragId.current; dragId.current = null;
    if (!from || from === overId) return;
    const arr = [...blocksRef.current];
    const fi = arr.findIndex((b) => b.id === from); const ti = arr.findIndex((b) => b.id === overId);
    if (fi < 0 || ti < 0) return;
    const [m] = arr.splice(fi, 1); arr.splice(ti, 0, m); commitBlocks(arr);
  };

  // Modo IA do caderno: gera um trecho e ENTRA como bloco novo no doc compartilhado.
  const studyGenerate = async () => {
    const cmd = studyCmd.trim();
    if (!cmd || generating) return;
    setGenerating(true); ping("generating"); setStudyCmd(""); setBarOpen(false);
    try {
      const r = await fetch("/api/ai/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: `Escreva um trecho de estudo claro e didático em PT-BR sobre: ${cmd}. Texto corrido (pode ter um subtítulo curto). Sem preâmbulo.`, agent: "nina" }),
      });
      const d = await r.json().catch(() => ({}));
      const gen = (d.text || "").trim();
      if (gen) addBlock("text", gen);
    } catch { /* */ } finally { setGenerating(false); ping("idle"); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="relative w-full flex-1 min-h-0 flex flex-col rounded-[26px] border border-violet-300/30 dark:border-white/10 bg-white dark:bg-[#0b1220] shadow-[0_18px_50px_-24px_rgba(124,58,237,0.45)] overflow-hidden">

      {/* TOOLBAR fina: Sair · (fulano digitando) · membros · Convidar. Nada de frase fixa. */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.03] shrink-0">
        <button onClick={onClose} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-black uppercase tracking-wide text-slate-600 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/10">
          <ArrowLeft size={14} /> Sair
        </button>
        {peer && (
          <span className="text-[13px] font-bold inline-flex items-center gap-1.5" style={{ color: peer.state === "generating" ? "#7c3aed" : "#0ea5e9" }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: peer.state === "generating" ? "#7c3aed" : "#0ea5e9" }} />
            {peer.name} {peer.state === "generating" ? "está gerando…" : "está digitando…"}
          </span>
        )}
        <span className="text-[11px] uppercase tracking-widest text-slate-300 dark:text-white/25 ml-1">{saving ? "salvando…" : "salvo"}</span>
        <div className="flex -space-x-2 ml-auto mr-1">
          {(doc?.members || []).slice(0, 5).map((m) => (
            <span key={m.id} className="w-7 h-7 rounded-full overflow-hidden border-2 border-white dark:border-[#0b1220] bg-slate-200 dark:bg-black flex items-center justify-center" title={m.name || ""}>
              {m.image ? <Image src={m.image} alt="" width={28} height={28} className="w-full h-full object-cover" /> : <span className="text-[12px] font-black text-slate-500">{(m.name || "?").charAt(0).toUpperCase()}</span>}
            </span>
          ))}
        </div>
        <button onClick={reinvite} className="px-3 py-1.5 rounded-full text-[12px] font-black uppercase tracking-wide inline-flex items-center gap-1.5 text-white shrink-0" style={{ background: "linear-gradient(135deg,#0ea5e9,#22d3ee)" }}><UserPlus size={12} /> Convidar</button>
      </div>

      {research ? (
        /* ═══ Cópia 1:1 da Sala de Pesquisa: folha (esq) + painel de documentos/citações (dir) ═══ */
        <div className="flex-1 min-h-0 flex">
        <div className={`flex-1 min-w-0 flex flex-col bg-white dark:bg-[#0f172a] overflow-hidden transition-shadow ${remoteFlash ? "ring-2 ring-cyan-400/30" : ""}`}>
          <div className="h-14 flex items-center px-8 shrink-0 border-b border-slate-100 dark:border-white/5">
            <input value={doc?.title || ""} readOnly placeholder="Minha Pesquisa"
              className="bg-transparent text-black dark:text-white text-lg font-black focus:outline-none w-full placeholder:text-slate-300" />
          </div>
          <div className="relative flex-1 px-8 md:px-12 py-8 overflow-y-auto custom-scrollbar flex flex-col gap-4">
            <textarea
              ref={taRef} value={content}
              onChange={(e) => onChange(e.target.value)}
              onSelect={trackCaret} onClick={trackCaret} onKeyUp={trackCaret}
              onFocus={() => { focusedRef.current = true; }} onBlur={() => { focusedRef.current = false; trackCaret(); }}
              style={{ fontSize: `${Math.round(17 * zoom)}px` }}
              className="w-full flex-1 min-h-[300px] resize-none outline-none bg-transparent leading-loose text-black dark:text-white placeholder:text-slate-400 font-serif"
              placeholder="Sua pesquisa começa aqui…"
            />
          </div>
          <div className="p-4 flex justify-between items-center px-8 bg-slate-50/50 dark:bg-black/20 border-t border-slate-100 dark:border-white/5 shrink-0">
            <div className="flex items-center gap-1 p-1 rounded-[12px] bg-white/50 dark:bg-black/30 border border-slate-200 dark:border-white/10">
              <button onClick={() => setZoom((z) => Math.max(0.7, +(z - 0.1).toFixed(2)))} className="w-7 h-7 rounded-lg text-slate-600 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/10 font-black">−</button>
              <span className="text-[12px] tabular-nums text-slate-400 w-9 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom((z) => Math.min(2.2, +(z + 0.1).toFixed(2)))} className="w-7 h-7 rounded-lg text-slate-600 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/10 font-black">+</button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={saveNow} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-black uppercase tracking-wide border border-cyan-400/50 text-cyan-600 dark:text-cyan-300 hover:bg-cyan-500/10">
                {savedFlash ? <Check size={13} /> : <Save size={13} />} {savedFlash ? "Salvo" : "Salvar"}
              </button>
              <button onClick={() => { setPubNote(true); setTimeout(() => setPubNote(false), 5000); }} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-white text-[13px] font-black uppercase tracking-wide" style={{ background: "linear-gradient(135deg,#10b981,#06b6d4)" }}>
                <Send size={13} /> Publicar
              </button>
            </div>
          </div>
          {pubNote && (
            <div className="px-8 py-2 text-[13px] text-violet-700 dark:text-violet-300 bg-violet-500/10 border-t border-violet-400/20 shrink-0">
              Publicar chega já já — por enquanto seu trabalho fica salvo aqui no Lounge. A Zaeon te ensina a publicar quando for a hora. ✦
            </div>
          )}
        </div>
        {/* PAINEL DIREITO REAL (mesmo da Sala de Pesquisa): Documentos / Citações / Lixeira —
            o INVENTÁRIO PESSOAL de cada um (o que você recolhe fica disponível aqui no grupo).
            Grid 1fr×1fr faz o DocumentDesktop preencher a coluna. */}
        <aside className="hidden md:grid w-72 shrink-0 border-l border-slate-200 dark:border-white/10 p-2" style={{ gridTemplateRows: "1fr", gridTemplateColumns: "1fr" }}>
          <DocumentDesktop
            processingFileId={null}
            onPlayFile={(f) => insertResearch(f.title || "")}
            onView={(f) => insertResearch(f.title || "")}
            openPopover={dockPopover}
            onTogglePopover={setDockPopover}
            citationCount={citations.length}
            showFolder={showFolder}
            onToggleFolder={() => setShowFolder((v) => !v)}
            sessions={[]}
            onOpenSession={() => {}}
          />
        </aside>
        </div>
      ) : (doc?.sourceType === "study" && doc?.sourceId) ? (
        /* ═══ Sala de Estudos REAL (1:1) — co-edição em grupo sobre o espaço compartilhado ═══ */
        <div className="flex-1 min-h-0 overflow-hidden">
          <CollabStudyRoom collabSpaceId={doc.sourceId} />
        </div>
      ) : (
        /* ═══ Fallback: caderno reconstruído (docs antigos sem espaço vinculado) ═══ */
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
          {/* CADERNO (centro) */}
          <div className="flex-1 min-w-0 flex flex-col p-5 sm:p-6">
            {/* ⟁ pill + título grande */}
            <div className="flex items-center gap-2.5 mb-3 shrink-0">
              <div className="flex-1 min-w-0 rounded-[28px] p-[1.5px] bg-gradient-to-r from-blue-500/40 via-cyan-400/40 to-violet-500/40 shadow-[0_12px_36px_-16px_rgba(37,99,235,0.45)]">
                <div className="rounded-[27px] flex items-center gap-2.5 px-2 py-2 bg-white/70 dark:bg-white/[0.05] backdrop-blur-2xl border border-white/70 dark:border-white/10">
                  <button onClick={() => setBarOpen((v) => !v)} disabled={generating} title={barOpen ? "Fechar a Zaeon" : "Pedir um trecho à Zaeon"} aria-pressed={barOpen}
                    className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-lg leading-none transition-all disabled:opacity-60 ${barOpen ? "text-white shadow-md" : "text-cyan-600 dark:text-cyan-300 hover:bg-cyan-500/10"}`}
                    style={barOpen ? { background: "linear-gradient(135deg,#2563eb,#06b6d4)" } : undefined}>
                    <span className={`${generating ? "animate-[spin_4s_linear_infinite]" : "animate-[spin_16s_linear_infinite]"} motion-reduce:animate-none`} style={{ filter: "drop-shadow(0 0 4px rgba(34,211,238,0.55))" }}>⟁</span>
                  </button>
                  <span className="flex-1 min-w-0 text-[26px] leading-tight font-black tracking-tight text-[#0b3a66] dark:text-white truncate">{doc?.title || "Meus Estudos"}</span>
                </div>
              </div>
            </div>

            {/* BARRA-AGENTE (modo IA) — abre no ⟁; gera e insere no doc compartilhado */}
            {barOpen && (
              <div className="mb-3 rounded-full p-[1.5px] bg-gradient-to-r from-blue-500/70 via-cyan-400/70 to-sky-500/70">
                <div className="rounded-full bg-white dark:bg-[#0a1020] pl-3.5 pr-1.5 py-1 flex items-center gap-2">
                  <input autoFocus value={studyCmd} onChange={(e) => setStudyCmd(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") studyGenerate(); if (e.key === "Escape") setBarOpen(false); }}
                    placeholder="Zaeon, estude sobre…"
                    className="flex-1 min-w-0 bg-transparent text-[12.5px] text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/35 focus:outline-none py-1" />
                  <button onClick={studyGenerate} disabled={generating || !studyCmd.trim()}
                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white disabled:opacity-40 shadow-sm" style={{ background: "linear-gradient(135deg,#2563eb,#06b6d4)" }} title="Gerar trecho">
                    {generating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  </button>
                </div>
              </div>
            )}

            {/* folha do caderno — também recebe itens arrastados da biblioteca */}
            <div
              onDragOver={(e) => { if (e.dataTransfer.types.includes("application/x-zaeon-lib")) e.preventDefault(); }}
              onDrop={(e) => { const t = e.dataTransfer.getData("application/x-zaeon-lib"); if (t) { e.preventDefault(); addBlock("h2", t); } }}
              className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar rounded-[1.5rem] border transition-colors ${remoteFlash ? "border-cyan-400/50 bg-cyan-500/[0.04]" : "border-slate-200 dark:border-white/10"}`}>
              <div className={`p-6 sm:p-8 max-w-2xl flex flex-col gap-1 ${libOpen ? "mx-auto" : "lg:pl-10"}`}>
                {blocks.map((b) => {
                  const cls = b.variant === "h1" ? "text-3xl sm:text-4xl font-black tracking-tight leading-tight text-slate-900 dark:text-white"
                    : b.variant === "h2" ? "text-xl sm:text-2xl font-bold tracking-tight leading-snug text-slate-800 dark:text-white/95"
                    : "text-[16px] sm:text-[17px] leading-[1.7] text-slate-700 dark:text-slate-200/90";
                  const ph = b.variant === "h1" ? "Título" : b.variant === "h2" ? "Subtítulo" : "Escreva…";
                  return (
                    <div key={b.id}
                      className="group relative -mx-2 px-2 py-0.5 rounded-lg hover:bg-black/[0.015] dark:hover:bg-white/[0.02]"
                      onDragOver={(e) => { if (dragId.current) e.preventDefault(); }}
                      onDrop={() => reorder(b.id)}
                    >
                      <span draggable onDragStart={() => { dragId.current = b.id; }} onDragEnd={() => { dragId.current = null; }}
                        title="Arraste para reordenar"
                        className="absolute -left-4 top-1.5 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500"><GripVertical size={13} /></span>
                      <button onClick={() => removeBlock(b.id)} title="Remover bloco" className="absolute -right-1 top-1 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-400"><X size={12} /></button>
                      <AutoGrow value={b.text}
                        onChange={(v) => editBlock(b.id, v)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey && b.variant !== "text") { e.preventDefault(); addBlock("text", "", b.id); }
                          else if (e.key === "Backspace" && b.text === "") { e.preventDefault(); removeBlock(b.id); }
                        }}
                        onFocus={() => { focusedRef.current = true; }}
                        onBlur={() => { focusedRef.current = false; }}
                        placeholder={ph} className={cls} autoFocus={focusBlock === b.id} />
                    </div>
                  );
                })}
                {/* adicionar bloco (Título / Subtítulo / Texto) */}
                <div className="mt-4 flex items-center gap-1.5">
                  {([["h1", Heading1, "Título"], ["h2", Heading2, "Subtítulo"], ["text", Pilcrow, "Texto"]] as const).map(([v, Icon, lbl]) => (
                    <button key={v} onClick={() => addBlock(v)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[13px] font-semibold border bg-white text-slate-600 border-slate-200 hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-300 dark:bg-white/[0.06] dark:text-white/55 dark:border-white/10 dark:hover:bg-cyan-500/15 dark:hover:text-cyan-300">
                      <Icon size={13} /> {lbl}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* BIBLIOTECA recolhida → trilho fino */}
          {!libOpen && (
            <button onClick={() => setLibOpen(true)} title="Mostrar biblioteca"
              className="shrink-0 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-white/10 flex lg:flex-col items-center justify-center gap-2 px-3 py-2 lg:py-3 text-slate-400 hover:text-cyan-500 hover:bg-cyan-500/5">
              <span className="text-[12px] font-black uppercase tracking-[0.16em] lg:[writing-mode:vertical-rl] lg:rotate-180">Biblioteca</span>
            </button>
          )}

          {/* BIBLIOTECA (direita) — read-only; clicar/arrastar insere no caderno compartilhado */}
          {libOpen && (
            <div className="lg:w-64 shrink-0 flex flex-col min-h-0 lg:m-3 lg:rounded-2xl border-t lg:border border-slate-200 dark:border-white/12 bg-slate-100/80 dark:bg-[#0a0f1c] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.03]">
                <span className="text-[12px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-white/50">Biblioteca</span>
                <span className="text-[11px] font-mono text-slate-400">{libSpaces.length}</span>
                <button onClick={() => setLibOpen(false)} className="ml-auto p-1 rounded-lg text-slate-400 hover:text-cyan-500" title="Recolher biblioteca"><X size={15} /></button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2.5 flex flex-col gap-2 min-h-[120px]">
                <p className="px-1 pt-0.5 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-white/30">Estudos</p>
                {libSpaces.length === 0 ? (
                  <p className="text-[13px] text-slate-400 dark:text-white/30 p-2 leading-relaxed">Seus estudos aparecem aqui. Clique pra trazer o título pro caderno.</p>
                ) : libSpaces.map((sp) => (
                  <button key={sp.id} title="Clique ou arraste pro caderno"
                    draggable onDragStart={(e) => e.dataTransfer.setData("application/x-zaeon-lib", sp.title)}
                    onClick={() => addBlock("h2", sp.title)}
                    className="group flex items-center gap-2 rounded-xl border p-2 text-left cursor-grab active:cursor-grabbing bg-white border-slate-200 shadow-sm hover:border-cyan-400/50 dark:bg-white/[0.04] dark:border-white/10 dark:shadow-none">
                    <FileText size={14} className="text-violet-500 dark:text-violet-300 shrink-0" />
                    <span className="flex-1 min-w-0 text-[13px] font-medium text-slate-700 dark:text-white/90 truncate">{sp.title || "Estudo"}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {share && <Portal><SharePopup link={share.link} title={share.title} contacts={contacts} onClose={() => setShare(null)} /></Portal>}
    </motion.div>
  );
}
