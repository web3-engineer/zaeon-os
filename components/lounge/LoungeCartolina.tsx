"use client";

/**
 * LoungeCartolina — a "cartolina virtual" (tema Caderno) do coworking.
 *
 * Globo ao fundo (com marcadores, sem texto) → aba que PUXA pra cima → modo coworking:
 *   • Desktop: cartolina INFINITA (pan + zoom + cards arrastáveis).
 *   • Mobile: quadro FIXO rolável.
 * Um campo "Estudar: ___" chama a Aura (/api/lounge/cartolina) e preenche a cartolina com
 * cards gerados (nota/pergunta/exercício/prancha/vídeo). Cards mock entram como exemplo.
 *
 * `embedded`: quando dentro de uma aba (research-lab), usa absolute em vez de fixed.
 * A camada de MEMÓRIA (persistir como memória do agente, atada ao chat) é PR à parte —
 * docs/HANDOFF_CARTOLINA_MEMORIA.md.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { CartolinaCard } from "@/lib/caderno/cartolina";

const INK = "#3a2f1e";
const INK_SOFT = "#6b5a3e";
const ACCENT = "#0e7490";

type Card = CartolinaCard;

const CARDS0: Card[] = [
  { id: "t", tipo: "titulo", x: 120, y: 60, w: 380, rot: -1.5, titulo: "O Ciclo da Água", corpo: "caderno de estudos · exemplo" },
  { id: "n1", tipo: "nota", x: 560, y: 90, w: 300, rot: 1.2, titulo: "Evaporação", corpo: "O calor do sol transforma a água dos mares em vapor, que sobe na atmosfera." },
  { id: "p1", tipo: "prancha", x: 150, y: 250, w: 340, rot: -0.6, legenda: "diagrama do ciclo da água" },
  { id: "q1", tipo: "pergunta", x: 580, y: 320, w: 320, rot: -1, corpo: "Por que as nuvens se formam em altitudes mais frias?" },
  { id: "e1", tipo: "exercicio", x: 250, y: 580, w: 360, rot: 0.8, corpo: "Liste as 4 fases do ciclo e dê um exemplo de cada no seu dia.", resposta: "Evaporação, condensação, precipitação, escoamento." },
  { id: "v1", tipo: "video", x: 690, y: 580, w: 300, rot: -1.4, titulo: "Vídeo: o ciclo em 3 min", legenda: "aula sugerida pela Aura" },
];

function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const s = () => setM(mq.matches); s(); mq.addEventListener("change", s);
    return () => mq.removeEventListener("change", s);
  }, []);
  return m;
}

function Prancha() {
  return (
    <svg viewBox="0 0 320 200" width="100%" aria-hidden="true">
      <circle cx="52" cy="42" r="17" fill="none" stroke={INK} strokeWidth="1.5" />
      {Array.from({ length: 8 }).map((_, i) => { const a = (i / 8) * Math.PI * 2; return <line key={i} x1={52 + Math.cos(a) * 21} y1={42 + Math.sin(a) * 21} x2={52 + Math.cos(a) * 28} y2={42 + Math.sin(a) * 28} stroke={INK_SOFT} strokeWidth="1" />; })}
      <path d="M12 170 Q80 158 160 170 T308 170 L308 192 L12 192 Z" fill="none" stroke={INK} strokeWidth="1.6" />
      <path d="M70 62 C104 116 104 146 130 166" fill="none" stroke={ACCENT} strokeWidth="1.5" />
      <path d="M210 166 C236 130 240 86 210 66" fill="none" stroke={INK} strokeWidth="1.5" />
      <path d="M198 70 q-16 -22 -40 -10 q-20 -15 -38 5 q-18 3 -10 22 l96 0 q14 -12 -8 -22 Z" fill="none" stroke={INK} strokeWidth="1.6" />
    </svg>
  );
}

function CardView({ c, onReveal, revealed, onAbrirConversa }: { c: Card; onReveal: (id: string) => void; revealed: boolean; onAbrirConversa?: (msgId: string) => void }) {
  const base: React.CSSProperties = { width: c.w, transform: `rotate(${c.rot ?? 0}deg)` };
  if (c.tipo === "titulo") {
    return (
      <div style={base}>
        <div className="cal" style={{ fontSize: 15, color: INK_SOFT }}>{c.corpo}</div>
        <div className="cal" style={{ fontSize: 44, lineHeight: 1.05, color: INK }}>{c.titulo}</div>
        <div style={{ height: 2, background: `linear-gradient(90deg, ${INK}, transparent)`, marginTop: 6 }} />
      </div>
    );
  }
  const corner: Record<string, string> = { nota: "Nota", pergunta: "Pergunta", exercicio: "Exercício", prancha: "Prancha", video: "Vídeo" };
  return (
    <div className="cad-card" style={base}>
      <div className="cad-tag cal">{corner[c.tipo]}</div>
      {c.titulo && <div style={{ fontWeight: 700, color: INK, marginBottom: 6 }}>{c.titulo}</div>}
      {c.tipo === "prancha" ? (
        <>
          <Prancha />
          {c.legenda && <div className="cal" style={{ fontSize: 14, color: INK_SOFT, marginTop: 4 }}>{c.legenda}</div>}
        </>
      ) : c.tipo === "video" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, border: `1.5px solid ${INK_SOFT}`, display: "grid", placeItems: "center", color: ACCENT, fontSize: 17 }}>▶</div>
          <span style={{ fontSize: 13, color: INK_SOFT }}>{c.legenda || c.corpo}</span>
        </div>
      ) : (
        <div style={{ fontSize: 15, lineHeight: 1.5, color: c.tipo === "pergunta" ? INK : INK_SOFT }}>
          {c.tipo === "pergunta" ? <em>“{c.corpo}”</em> : c.corpo}
        </div>
      )}
      {c.tipo === "exercicio" && (
        <button className="cal" onClick={() => onReveal(c.id)} style={{ marginTop: 10, fontSize: 14, color: ACCENT, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
          {revealed ? "esconder resposta" : "revelar resposta"}
        </button>
      )}
      {c.tipo === "exercicio" && revealed && (
        <div style={{ marginTop: 6, fontSize: 13, color: INK_SOFT, borderTop: `1px dashed ${INK_SOFT}55`, paddingTop: 6 }}>{c.resposta}</div>
      )}
      {/* Memória por região: o card sabe de qual resposta nasceu → volta pra ela no chat. */}
      {onAbrirConversa && c.msgIds?.length ? (
        <button
          type="button" data-ui className="cal"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onAbrirConversa(c.msgIds![c.msgIds!.length - 1])}
          aria-label={`Abrir na conversa a resposta que gerou "${c.titulo ?? "este card"}"`}
          style={{ marginTop: 10, minHeight: 44, fontSize: 14, color: ACCENT, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}
        >
          ↩ ver na conversa
        </button>
      ) : null}
    </div>
  );
}

// Persistência real (Cartolina no banco) — atrás da flag; desligada = o protótipo de sempre.
const PERSISTIR = process.env.NEXT_PUBLIC_CARTOLINA_MEMORIA === "1";
const SALVAR_APOS_MS = 800;

export default function LoungeCartolina({ embedded = false, surface = "lounge", scopeId, abrirDeInicio = false, onAbrirConversa, onFechar }: {
  embedded?: boolean; surface?: "estudos" | "lounge"; scopeId?: string;
  /** Sala de Estudos abre o board já aberto (o globo/aba puxável é do lounge). */
  abrirDeInicio?: boolean;
  onAbrirConversa?: (msgId: string) => void;
  onFechar?: () => void;
}) {
  const isMobile = useIsMobile();
  const [open, setOpenRaw] = useState(abrirDeInicio);
  const setOpen = useCallback((v: boolean | ((o: boolean) => boolean)) => {
    setOpenRaw((o) => {
      const n = typeof v === "function" ? v(o) : v;
      if (!n && onFechar) setTimeout(onFechar, 0); // fora do setState
      return n;
    });
  }, [onFechar]);
  const [cards, setCards] = useState<Card[]>(CARDS0);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [view, setView] = useState({ x: 40, y: 20, scale: 1 });
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const boardId = useRef<string | null>(null);
  const somenteLeitura = useRef(false);
  const sujos = useRef<Set<string>>(new Set());
  const cardsRef = useRef<Card[]>(cards);
  cardsRef.current = cards;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Carrega a cartolina real da conversa (se já existe uma).
  useEffect(() => {
    if (!PERSISTIR) return;
    let vivo = true;
    const q = new URLSearchParams({ surface, ...(scopeId ? { scopeId } : {}) });
    fetch(`/api/cartolina?${q}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!vivo || !d?.board) return;
        boardId.current = d.board.id;
        somenteLeitura.current = d.board.papel === "leitor";
        if (Array.isArray(d.board.cards) && d.board.cards.length) setCards(d.board.cards);
      })
      .catch(() => { /* sem rede: segue com o que está na tela */ });
    return () => { vivo = false; };
  }, [surface, scopeId]);

  // Salva só os cards que mudaram, com debounce (arrastar dispara muitos eventos).
  const salvar = useCallback(() => {
    if (!PERSISTIR || !boardId.current || somenteLeitura.current || !sujos.current.size) return;
    const ids = [...sujos.current];
    sujos.current.clear();
    const upsert = cardsRef.current.filter((c) => ids.includes(c.id));
    fetch(`/api/cartolina/${boardId.current}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ upsert }) })
      .then((r) => { if (r.status === 403) somenteLeitura.current = true; else if (!r.ok) ids.forEach((i) => sujos.current.add(i)); })
      .catch(() => ids.forEach((i) => sujos.current.add(i))); // falhou: tenta de novo no próximo salvar
  }, []);
  const agendarSalvar = useCallback((id: string) => {
    if (!PERSISTIR) return;
    sujos.current.add(id);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(salvar, SALVAR_APOS_MS);
  }, [salvar]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); salvar(); }, [salvar]); // ao sair, grava o pendente

  const reveal = useCallback((id: string) => setRevealed((r) => ({ ...r, [id]: !r[id] })), []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("zaeon-focus-mode", { detail: open }));
    return () => { window.dispatchEvent(new CustomEvent("zaeon-focus-mode", { detail: false })); };
  }, [open]);

  // Aura gera a cartolina do tópico
  const gerar = useCallback(async () => {
    const t = topic.trim();
    if (!t || loading) return;
    setLoading(true);
    try {
      // Apertar "gerar" é pedido explícito → regenerar:true (senão a API devolveria o board existente).
      const r = PERSISTIR
        ? await fetch("/api/cartolina", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic: t, surface, scopeId, regenerar: true }) })
        : await fetch("/api/lounge/cartolina", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic: t }) });
      const d = await r.json().catch(() => null);
      const novos = PERSISTIR ? d?.board?.cards : d?.cards;
      if (r.ok && Array.isArray(novos) && novos.length) {
        if (PERSISTIR) { boardId.current = d.board.id; somenteLeitura.current = false; sujos.current.clear(); }
        setCards(novos); setRevealed({}); setView({ x: 40, y: 20, scale: 1 });
      }
    } catch { /* mantém os cards atuais */ }
    finally { setLoading(false); }
  }, [topic, loading, surface, scopeId]);

  const pull = useRef<{ y0: number } | null>(null);
  const onHandleDown = (e: React.PointerEvent) => { pull.current = { y0: e.clientY }; (e.target as HTMLElement).setPointerCapture(e.pointerId); };
  const onHandleMove = (e: React.PointerEvent) => { if (pull.current && pull.current.y0 - e.clientY > 70) { setOpen(true); pull.current = null; } };

  const pan = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const onBoardDown = (e: React.PointerEvent) => {
    if (isMobile) return;
    if ((e.target as HTMLElement).closest("[data-card]") || (e.target as HTMLElement).closest("[data-ui]")) return;
    pan.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onBoardMove = (e: React.PointerEvent) => { if (pan.current) setView((v) => ({ ...v, x: pan.current!.vx + (e.clientX - pan.current!.x), y: pan.current!.vy + (e.clientY - pan.current!.y) })); };
  const onWheel = (e: React.WheelEvent) => { if (isMobile) return; const d = e.deltaY < 0 ? 1.1 : 1 / 1.1; setView((v) => ({ ...v, scale: Math.min(2, Math.max(0.4, v.scale * d)) })); };

  const drag = useRef<{ id: string; x: number; y: number; cx: number; cy: number } | null>(null);
  const onCardDown = (e: React.PointerEvent, c: Card) => { if (isMobile) return; e.stopPropagation(); drag.current = { id: c.id, x: e.clientX, y: e.clientY, cx: c.x, cy: c.y }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); };
  const onCardMove = (e: React.PointerEvent) => { if (!drag.current) return; const dx = (e.clientX - drag.current.x) / view.scale; const dy = (e.clientY - drag.current.y) / view.scale; setCards((cs) => cs.map((c) => (c.id === drag.current!.id ? { ...c, x: drag.current!.cx + dx, y: drag.current!.cy + dy } : c))); };
  // Soltar um card arrastado = mudança a salvar (o drag.current ainda aponta pro card).
  const endAll = () => { if (drag.current) agendarSalvar(drag.current.id); pull.current = null; pan.current = null; drag.current = null; };

  return (
    <div style={{ position: embedded ? "absolute" : "fixed", inset: 0, overflow: "hidden", background: "#030712" }}>
      <style>{`
        .cal { font-family: 'Snell Roundhand','Segoe Script','Brush Script MT',cursive; }
        .cad-card { position: relative; background: rgba(243,231,206,.96); border: 1px solid ${INK_SOFT}66; border-radius: 10px; padding: 16px 16px 14px; box-shadow: 0 22px 44px -22px rgba(0,0,0,.8), inset 0 1px 0 rgba(255,255,255,.6); }
        .cad-tag { position:absolute; top:-10px; left:14px; background:${ACCENT}; color:#fff; font-size:12px; padding:1px 10px; border-radius:999px; box-shadow:0 4px 10px -4px ${ACCENT}; }
        .globe-grid { animation: spin 90s linear infinite; transform-origin:center; }
        .marker { animation: pulse 2.4s ease-in-out infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:.4 } 50% { opacity:1 } }
        .star { position:absolute; width:2px; height:2px; background:#fff; border-radius:50%; }
      `}</style>

      {/* GLOBO + MARCADORES (sem texto) */}
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "radial-gradient(130% 100% at 50% 20%, #0b1b3a 0%, #030712 70%)" }}>
        {[...Array(44)].map((_, i) => <span key={i} className="star" style={{ left: `${(i * 97) % 100}%`, top: `${(i * 53) % 100}%`, opacity: 0.15 + ((i * 7) % 6) / 12 }} />)}
        <svg viewBox="0 0 400 400" width="min(70vmin,620px)" height="min(70vmin,620px)" style={{ filter: "drop-shadow(0 0 60px rgba(14,116,144,.35))" }}>
          <defs><radialGradient id="globo" cx="40%" cy="35%" r="75%"><stop offset="0%" stopColor="#164e63" /><stop offset="70%" stopColor="#0a2540" /><stop offset="100%" stopColor="#030712" /></radialGradient></defs>
          <circle cx="200" cy="200" r="150" fill="url(#globo)" stroke={ACCENT} strokeWidth="1" opacity="0.9" />
          <g className="globe-grid" stroke={ACCENT} strokeOpacity="0.35" fill="none" strokeWidth="0.7" opacity="0.5">
            {[-120, -75, -35, 0, 35, 75, 120].map((o) => <ellipse key={o} cx="200" cy="200" rx={Math.max(8, 150 - Math.abs(o))} ry="150" />)}
            {[-120, -60, 0, 60, 120].map((o) => <ellipse key={o} cx="200" cy="200" rx="150" ry={Math.max(8, 150 - Math.abs(o))} />)}
          </g>
          {/* marcadores (pins luminosos) */}
          {[[150, 120], [250, 150], [200, 240], [120, 210], [280, 230]].map(([mx, my], i) => (
            <g key={i} className="marker" style={{ animationDelay: `${i * 0.4}s` }}>
              <circle cx={mx} cy={my} r="4.5" fill="#e0f7ff" />
              <circle cx={mx} cy={my} r="9" fill="none" stroke="#67e8f9" strokeWidth="1" opacity="0.6" />
            </g>
          ))}
        </svg>
      </div>

      {/* CARTOLINA */}
      <div
        onPointerMove={(e) => { onHandleMove(e); onBoardMove(e); onCardMove(e); }}
        onPointerUp={endAll}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: open ? "100%" : (isMobile ? 120 : 96), transition: "height .55s cubic-bezier(.22,1,.36,1)", background: open ? "linear-gradient(180deg,#efe7d3 0%, #e6dcc2 100%)" : "transparent", boxShadow: open ? "0 -30px 80px -20px rgba(0,0,0,.6)" : "none", borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden" }}
      >
        <div
          onPointerDown={open ? undefined : onHandleDown}
          onClick={() => setOpen((o) => !o)}
          style={{ height: open ? 56 : (isMobile ? 120 : 96), cursor: open ? "pointer" : "grab", display: "flex", alignItems: "center", justifyContent: "center", gap: 14, background: open ? "rgba(58,47,30,.06)" : "rgba(239,231,211,.85)", backdropFilter: "blur(8px)", color: INK, userSelect: "none", borderTop: open ? `1px solid ${INK_SOFT}44` : "none", position: "relative", zIndex: 5, flexWrap: "wrap", padding: "0 16px" }}
        >
          {!open ? (
            <><div style={{ width: 54, height: 5, borderRadius: 999, background: INK_SOFT }} /><span className="cal" style={{ fontSize: 20 }}>↑ puxe a cartolina — entre no coworking</span></>
          ) : (
            // barra de comando: Estudar ___  → a Aura gera
            <div data-ui style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", maxWidth: 760 }} onClick={(e) => e.stopPropagation()}>
              <span className="cal" style={{ fontSize: 20, color: INK_SOFT }}>Estudar:</span>
              <input
                value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") gerar(); }}
                placeholder="ex.: harmonia musical, fotossíntese, cálculo de rota…"
                style={{ flex: 1, background: "rgba(255,255,255,.7)", border: `1px solid ${INK_SOFT}55`, borderRadius: 10, padding: "8px 12px", color: INK, outline: "none", fontSize: 14 }}
              />
              <button onClick={gerar} disabled={loading} style={{ background: ACCENT, color: "#fff", border: "none", borderRadius: 10, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 700, opacity: loading ? 0.6 : 1 }}>
                {loading ? "gerando…" : "gerar com a Aura"}
              </button>
              <button onClick={() => setOpen(false)} title="recolher" style={{ background: "none", border: "none", color: INK_SOFT, cursor: "pointer", fontSize: 18 }}>↓</button>
            </div>
          )}
        </div>

        {open && (
          <div onPointerDown={onBoardDown} onWheel={onWheel} style={{ position: "absolute", inset: 0, top: 56, overflow: isMobile ? "auto" : "hidden", cursor: isMobile ? "auto" : "grab", backgroundImage: `radial-gradient(${INK_SOFT}22 1px, transparent 1px)`, backgroundSize: "26px 26px" }}>
            {isMobile ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 26, padding: "28px 18px 60px", maxWidth: 520, margin: "0 auto" }}>
                {cards.map((c) => <div key={c.id}><CardView c={{ ...c, rot: 0, w: Math.min(c.w, 480) }} onReveal={reveal} revealed={!!revealed[c.id]} onAbrirConversa={onAbrirConversa} /></div>)}
              </div>
            ) : (
              <div style={{ position: "absolute", inset: 0, transform: `translate(${view.x}px,${view.y}px) scale(${view.scale})`, transformOrigin: "0 0" }}>
                {cards.map((c) => (
                  <div key={c.id} data-card onPointerDown={(e) => onCardDown(e, c)} style={{ position: "absolute", left: c.x, top: c.y, cursor: "grab", touchAction: "none" }}>
                    <CardView c={c} onReveal={reveal} revealed={!!revealed[c.id]} onAbrirConversa={onAbrirConversa} />
                  </div>
                ))}
              </div>
            )}
            {!isMobile && <div className="cal" style={{ position: "absolute", right: 16, bottom: 12, fontSize: 14, color: INK_SOFT, pointerEvents: "none" }}>arraste o fundo · roda = zoom · arraste os cards</div>}
          </div>
        )}
      </div>
    </div>
  );
}
