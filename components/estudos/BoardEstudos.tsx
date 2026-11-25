"use client";
/**
 * BoardEstudos — MEUS ESTUDOS como BOARD (lib/estudos/board): o canvas onde os cards são colados e arrastados, com
 * mais de uma pessoa ao mesmo tempo (os avatares de quem está aqui e os cursores dos outros). A estética é de
 * BLUEPRINT: papel azul técnico com a grade, traço branco/ciano, carimbos de prancha (ESTUDO · E-01).
 * As RAMIFICAÇÕES crescem da DIREITA pra ESQUERDA, quase em 3D: cada nível é um plano um pouco mais fundo (inclina e
 * escurece), e a linha técnica liga o lado esquerdo do pai ao direito do filho; as ESPECULAÇÕES são cards menores e
 * tracejados. O card de ESTUDO traz a PROFUNDIDADE, o "Gerar percurso" (o percursor) e a "Resposta certeira" (a
 * literatura, com cada citação conferida) — lib/estudos/harness.
 * Arrastar o fundo = mover; roda = zoom; duplo clique num card = editar.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { LARGURA, filhosDe, novoIdCard, posicaoDoFilho, profundidade, type CardEstudo, type TipoCard } from "@/lib/estudos/board";
import { useBoardEstudos } from "./useBoardEstudos";
import BlueprintEstudo from "./BlueprintEstudo";
import ConvitesBoard from "./ConvitesBoard";

const AZUL = "#0b2c4d", LINHA = "rgba(170,220,255,.9)", LINHA_FRACA = "rgba(150,205,255,.14)", TINTA = "#e8f6ff";
const ROTULO: Record<TipoCard, string> = { estudo: "ESTUDO", percurso: "PERCURSO", confirmacao: "CONFIRMAÇÃO", especulacao: "ESPECULAÇÃO", nota: "NOTA", pergunta: "PERGUNTA" };
const COR: Record<TipoCard, string> = { estudo: "#7fe0ff", percurso: "#ffd36b", confirmacao: "#7dffb0", especulacao: "#c9b6ff", nota: "#e8f6ff", pergunta: "#ff9ec7" };
const PREFIXO: Record<TipoCard, string> = { estudo: "E", percurso: "P", confirmacao: "C", especulacao: "S", nota: "N", pergunta: "Q" };
const ALTURA_PADRAO = 150;

export default function BoardEstudos({ boardInicialId, convite }: { boardInicialId?: string | null; convite?: string | null }) {
  const { data: sessao } = useSession();
  const euId = (sessao?.user as { id?: string } | undefined)?.id ?? null;
  const B = useBoardEstudos({ boardId: boardInicialId, convite, euId });
  const { board } = B;
  const leitor = board?.papel === "leitor";

  // ── câmera (pan + zoom) ──
  const [cam, setCam] = useState({ x: 0, y: 0, z: 0.85 });
  const raiz = useRef<HTMLDivElement>(null);
  const centrou = useRef<string | null>(null);
  useEffect(() => {   // ao abrir um board: enquadra os cards
    if (!board || centrou.current === board.id || !raiz.current) return;
    centrou.current = board.id;
    const r = raiz.current.getBoundingClientRect(), cs = board.cards;
    if (!cs.length) { setCam({ x: r.width / 2, y: 120, z: 0.85 }); return; }
    const x0 = Math.min(...cs.map((c) => c.x)), x1 = Math.max(...cs.map((c) => c.x + c.w)), y0 = Math.min(...cs.map((c) => c.y));
    const z = Math.max(0.35, Math.min(1, (r.width - 120) / Math.max(1, x1 - x0)));
    setCam({ x: r.width / 2 - ((x0 + x1) / 2) * z, y: 90 - y0 * z, z });
  }, [board]);
  const paraBoard = useCallback((cx: number, cy: number) => { const r = raiz.current!.getBoundingClientRect(); return { x: (cx - r.left - cam.x) / cam.z, y: (cy - r.top - cam.y) / cam.z }; }, [cam]);

  // as alturas medidas (pro leque das ramificações e pras linhas)
  const [alturas, setAlturas] = useState<Record<string, number>>({});
  const alturaDe = useCallback((c: CardEstudo) => alturas[c.id] ?? ALTURA_PADRAO, [alturas]);
  const medir = useCallback((id: string, el: HTMLDivElement | null) => { if (!el) return; const h = el.offsetHeight; setAlturas((a) => (Math.abs((a[id] ?? 0) - h) > 1 ? { ...a, [id]: h } : a)); }, []);

  // o NÍVEL de cada card (0 = estudo/solto; cada ramificação, +1) — o "fundo" do 3D
  const nivel = useMemo(() => {
    const porId = new Map((board?.cards ?? []).map((c) => [c.id, c] as const)), memo = new Map<string, number>();
    const n = (c: CardEstudo, guarda = 0): number => { if (memo.has(c.id)) return memo.get(c.id)!; const p = c.pai ? porId.get(c.pai) : undefined; const v = p && guarda < 30 ? n(p, guarda + 1) + 1 : 0; memo.set(c.id, v); return v; };
    for (const c of board?.cards ?? []) n(c);
    return memo;
  }, [board?.cards]);

  // ── arrastar (fundo = pan; cabeçalho do card = mover o card) ──
  const arrasto = useRef<{ tipo: "pan" | "card"; id?: string; x0: number; y0: number; ox: number; oy: number } | null>(null);
  const [arrastando, setArrastando] = useState<{ id: string; x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => { if (e.button !== 0) return; arrasto.current = { tipo: "pan", x0: e.clientX, y0: e.clientY, ox: cam.x, oy: cam.y }; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); };
  const comecarCard = (e: React.PointerEvent, c: CardEstudo) => {
    if (leitor || e.button !== 0) return; e.stopPropagation();
    arrasto.current = { tipo: "card", id: c.id, x0: e.clientX, y0: e.clientY, ox: c.x, oy: c.y }; (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (raiz.current) { const p = paraBoard(e.clientX, e.clientY); B.moverCursor(p.x, p.y); }
    const a = arrasto.current; if (!a) return;
    const dx = e.clientX - a.x0, dy = e.clientY - a.y0;
    if (a.tipo === "pan") setCam((c) => ({ ...c, x: a.ox + dx, y: a.oy + dy }));
    else if (a.id) setArrastando({ id: a.id, x: a.ox + dx / cam.z, y: a.oy + dy / cam.z });
  };
  const onPointerUp = () => {
    const a = arrasto.current; arrasto.current = null;
    if (a?.tipo === "card" && arrastando && board) { const c = board.cards.find((k) => k.id === arrastando.id); if (c && (c.x !== arrastando.x || c.y !== arrastando.y)) B.mudar([{ ...c, x: Math.round(arrastando.x), y: Math.round(arrastando.y) }]); }
    setArrastando(null);
  };
  const onWheel = (e: React.WheelEvent) => {
    const r = raiz.current!.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    setCam((c) => { const z = Math.max(0.25, Math.min(2.2, c.z * (e.deltaY > 0 ? 0.9 : 1.1))); return { z, x: mx - ((mx - c.x) / c.z) * z, y: my - ((my - c.y) / c.z) * z }; });
  };
  const posDe = (c: CardEstudo) => (arrastando?.id === c.id ? { x: arrastando.x, y: arrastando.y } : { x: c.x, y: c.y });

  // ── criar / editar / apagar ──
  const [editando, setEditando] = useState<string | null>(null);
  const novo = (tipo: TipoCard) => {
    if (!board || leitor || !raiz.current) return;
    const r = raiz.current.getBoundingClientRect(), p = paraBoard(r.left + r.width / 2, r.top + r.height / 2);
    const c: CardEstudo = { id: novoIdCard(tipo), tipo, x: Math.round(p.x - LARGURA[tipo] / 2), y: Math.round(p.y - 60), w: LARGURA[tipo], titulo: tipo === "estudo" ? "Novo estudo" : undefined, corpo: "", autor: euId ?? undefined };
    B.mudar([c]); setEditando(c.id);
  };
  /** uma ramificação nova saindo de `pai` (à esquerda dele) — as especulações e as notas manuais; o percurso e a
   *  resposta certeira geradas vêm na próxima entrega */
  const ramificar = (pai: CardEstudo, tipo: TipoCard) => {
    if (!board || leitor) return;
    const pos = posicaoDoFilho(pai, filhosDe(board.cards, pai.id), tipo, alturaDe);
    const c: CardEstudo = { id: novoIdCard(tipo), tipo, ...pos, pai: pai.id, corpo: "", autor: euId ?? undefined };
    B.mudar([c]); setEditando(c.id);
  };
  const [erroCard, setErroCard] = useState<Record<string, string>>({});
  const [blueprint, setBlueprint] = useState<string | null>(null);
  const gerar = async (c: CardEstudo, acao: "percurso" | "resposta") => {
    setErroCard((e) => { const n = { ...e }; delete n[c.id]; return n; });
    const erro = await B.gerar(c.id, acao);
    if (erro) { setErroCard((e) => ({ ...e, [c.id]: erro })); setTimeout(() => setErroCard((e) => { const n = { ...e }; delete n[c.id]; return n; }), 6000); }
  };
  const salvarTexto = (c: CardEstudo, titulo: string, corpo: string) => { setEditando(null); if ((c.titulo ?? "") !== titulo || (c.corpo ?? "") !== corpo) B.mudar([{ ...c, titulo: titulo.trim() || undefined, corpo: corpo.trim() || undefined }]); };

  // ── convite ──
  const [conviteMsg, setConviteMsg] = useState<string | null>(null);
  const convidar = async (papel: "editor" | "leitor") => {
    const link = await B.convidar(papel);
    if (!link) { setConviteMsg("Só o dono do board convida."); return; }
    try { await navigator.clipboard.writeText(link); setConviteMsg(`Link de ${papel} copiado — vale 7 dias.`); } catch { setConviteMsg(link); }
    setTimeout(() => setConviteMsg(null), 5000);
  };

  if (B.erro && !board) return <div className="flex h-full items-center justify-center text-sm text-sky-100/70" style={{ background: AZUL }}>{B.erro}</div>;
  const cards = board?.cards ?? [];
  const porId = new Map(cards.map((c) => [c.id, c] as const));

  return (
    <div ref={raiz} className="relative h-full w-full touch-none select-none overflow-hidden" style={{ background: AZUL }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onWheel={onWheel}>
      {/* a GRADE do blueprint (fina a cada 20, forte a cada 100 — acompanha o pan/zoom) */}
      <div className="pointer-events-none absolute inset-0" style={{
        backgroundImage: `linear-gradient(${LINHA_FRACA} 1px, transparent 1px), linear-gradient(90deg, ${LINHA_FRACA} 1px, transparent 1px), linear-gradient(rgba(150,205,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(150,205,255,.06) 1px, transparent 1px)`,
        backgroundSize: `${100 * cam.z}px ${100 * cam.z}px, ${100 * cam.z}px ${100 * cam.z}px, ${20 * cam.z}px ${20 * cam.z}px, ${20 * cam.z}px ${20 * cam.z}px`,
        backgroundPosition: `${cam.x}px ${cam.y}px`,
      }} />
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at 60% 40%, transparent 40%, rgba(3,14,30,.55) 100%)" }} />

      {/* o MUNDO do board */}
      <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.z})` }}>
        {/* as LINHAS das ramificações (do lado esquerdo do pai ao direito do filho), com a cota técnica */}
        <svg className="pointer-events-none absolute overflow-visible" style={{ left: 0, top: 0, width: 1, height: 1 }}>
          {cards.filter((c) => c.pai && porId.has(c.pai)).map((c) => {
            const p = porId.get(c.pai!)!, pp = posDe(p), cp = posDe(c);
            const x1 = pp.x, y1 = pp.y + Math.min(alturaDe(p), 120) / 2, x2 = cp.x + c.w, y2 = cp.y + Math.min(alturaDe(c), 120) / 2, mx = (x1 + x2) / 2;
            const esp = c.tipo === "especulacao";
            return (
              <g key={`l-${c.id}`}>
                <path d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`} fill="none" stroke={esp ? "rgba(201,182,255,.7)" : LINHA} strokeWidth={esp ? 1.4 : 1.8} strokeDasharray={esp ? "6 6" : undefined} />
                <path d={`M ${x1} ${y1 + 5} C ${mx} ${y1 + 5}, ${mx} ${y2 + 5}, ${x2} ${y2 + 5}`} fill="none" stroke="rgba(0,10,25,.35)" strokeWidth={3} />
                <circle cx={x1} cy={y1} r={3.5} fill={AZUL} stroke={LINHA} strokeWidth={1.5} />
                <path d={`M ${x2 + 1} ${y2} l 8 -4 l 0 8 z`} fill={esp ? "rgba(201,182,255,.8)" : LINHA} />
              </g>
            );
          })}
        </svg>

        {cards.map((c, i) => {
          const pos = posDe(c), n = nivel.get(c.id) ?? 0, esp = c.tipo === "especulacao", ed = editando === c.id;
          const prof = c.tipo === "estudo" ? profundidade(cards, c.id) : null;
          return (
            <div key={c.id} ref={(el) => medir(c.id, el)} className="absolute" onPointerDown={(e) => e.stopPropagation()} onDoubleClick={() => !leitor && setEditando(c.id)}
              style={{
                left: pos.x, top: pos.y, width: c.w, zIndex: arrastando?.id === c.id ? 50 : 10 + n,
                // o 3D: cada nível mais fundo inclina um pouco (vira pra direita, de onde veio) e escurece
                transform: `perspective(1100px) rotateY(${Math.min(14, n * 5)}deg) scale(${1 - Math.min(0.12, n * 0.035)})`, transformOrigin: "right center",
                filter: n ? `brightness(${1 - Math.min(0.3, n * 0.08)})` : undefined,
              }}>
              <div className="relative rounded-[3px] text-[13px] leading-snug" style={{
                background: esp ? "rgba(20,40,80,.55)" : "rgba(12,45,82,.92)", color: TINTA,
                border: `${esp ? 1.2 : 1.6}px ${esp ? "dashed" : "solid"} ${COR[c.tipo]}`,
                boxShadow: `${8 + n * 3}px ${10 + n * 3}px 0 rgba(0,10,25,.35), inset 0 0 0 1px rgba(255,255,255,.04)`,
                padding: esp ? "8px 10px" : "10px 12px", fontSize: esp ? 12 : 13,
              }}>
                {/* os cantos de registro da prancha */}
                {["left-1 top-1 border-l border-t", "right-1 top-1 border-r border-t", "left-1 bottom-1 border-l border-b", "right-1 bottom-1 border-r border-b"].map((k) => <span key={k} className={`pointer-events-none absolute h-2 w-2 ${k}`} style={{ borderColor: COR[c.tipo] }} />)}
                {/* o carimbo (arrasta por aqui) */}
                <div className={`mb-1.5 flex items-center gap-2 font-mono text-[10px] tracking-[0.18em] ${leitor ? "" : "cursor-grab active:cursor-grabbing"}`} style={{ color: COR[c.tipo] }} onPointerDown={(e) => comecarCard(e, c)}>
                  <span>{ROTULO[c.tipo]} · {PREFIXO[c.tipo]}-{String(i + 1).padStart(2, "0")}</span>
                  <span className="h-px flex-1" style={{ background: `${COR[c.tipo]}55` }} />
                  {!leitor && <button type="button" aria-label="Apagar" className="opacity-50 hover:opacity-100" onPointerDown={(e) => e.stopPropagation()} onClick={() => B.mudar([], [c.id])}>✕</button>}
                </div>
                {ed ? <Editor c={c} onSalvar={salvarTexto} /> : (
                  <>
                    {c.titulo && <div className={`font-semibold ${c.tipo === "estudo" ? "text-[17px]" : ""}`} style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", letterSpacing: "0.01em" }}>{c.titulo}</div>}
                    {c.corpo ? <p className="mt-1 whitespace-pre-wrap text-sky-50/85">{c.corpo}</p> : !c.titulo && <p className="italic text-sky-100/40">{leitor ? "…" : "duplo clique pra escrever"}</p>}
                  </>
                )}
                {c.fontes?.length ? (
                  <ul className="mt-2 space-y-1 border-t pt-2 text-[11px] text-emerald-100/85" style={{ borderColor: "rgba(125,255,176,.25)" }}>
                    {c.fontes.map((f, k) => <li key={k}>✓ {f.url ? <a href={f.url} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted" onPointerDown={(e) => e.stopPropagation()}>{f.titulo}</a> : f.titulo}{f.ano ? ` (${f.ano})` : ""}</li>)}
                  </ul>
                ) : null}
                {prof && (
                  <div className="mt-3 border-t pt-2" style={{ borderColor: "rgba(127,224,255,.25)" }}>
                    <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.16em] text-sky-200/80"><span>PROFUNDIDADE</span><span>{prof.nota}/100</span></div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-sky-950/60"><div className="h-full rounded-full" style={{ width: `${prof.nota}%`, background: "linear-gradient(90deg,#7fe0ff,#7dffb0)" }} /></div>
                    <div className="mt-1 font-mono text-[10px] text-sky-200/60">{prof.confirmacoes} confirmações · {prof.fontes} fontes · {prof.especulacoes} especulações · {prof.passos} passos</div>
                  </div>
                )}
                {/* as AÇÕES do harness (dentro do card): o percurso (no estudo), a resposta certeira (no estudo e em cada
                    passo) e as ramificações à mão */}
                {B.gerando[c.id] && (
                  <div className="mt-2 font-mono text-[10.5px] tracking-wide text-sky-200/80"><span className="inline-block animate-pulse">▮</span> {B.gerando[c.id] === "percurso" ? "o percursor está traçando o caminho…" : "buscando na literatura e conferindo cada citação…"}</div>
                )}
                {erroCard[c.id] && <div className="mt-2 font-mono text-[10.5px] text-amber-200/90">{erroCard[c.id]}</div>}
                {!leitor && !ed && !B.gerando[c.id] && (c.tipo === "estudo" || c.tipo === "percurso" || c.tipo === "confirmacao") && (
                  <div className="mt-2 flex flex-wrap gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
                    {c.tipo === "estudo" && <Botao cor="#ffd36b" titulo="O percursor traça o caminho do estudo (cada passo vira um card à esquerda)" onClick={() => gerar(c, "percurso")}>⟵ Gerar percurso</Botao>}
                    {c.tipo === "estudo" && <Botao cor="#7fe0ff" titulo="A prancha técnica do estudo: produto final, o que é factível, validação e o item que ele vira" onClick={() => setBlueprint(c.id)}>▤ blueprint</Botao>}
                    {(c.tipo === "estudo" || c.tipo === "percurso") && <Botao cor="#7dffb0" titulo="Busca na literatura: o que a citação confirma vira confirmação; o resto, especulação" onClick={() => gerar(c, "resposta")}>⟵ Resposta certeira</Botao>}
                    <Botao cor="#c9b6ff" titulo="Uma ideia ainda não confirmada: fica num card menor" onClick={() => ramificar(c, "especulacao")}>+ especulação</Botao>
                    <Botao cor="#e8f6ff" titulo="Uma nota ligada a este card" onClick={() => ramificar(c, "nota")}>+ nota</Botao>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* os CURSORES de quem está no board */}
        {Object.entries(B.cursores).map(([id, k]) => (
          <div key={id} className="pointer-events-none absolute transition-[left,top] duration-100" style={{ left: k.x, top: k.y, zIndex: 80 }}>
            <svg width="18" height="18" viewBox="0 0 18 18"><path d="M1 1 L16 7 L9 9 L7 16 Z" fill={k.cor} stroke="#031020" strokeWidth="1" /></svg>
            <span className="ml-3 rounded px-1.5 py-0.5 font-mono text-[10px] text-slate-950" style={{ background: k.cor }}>{k.nome}</span>
          </div>
        ))}
      </div>

      {/* a BARRA: o board, os cards novos, convidar */}
      <div className="absolute left-3 top-3 z-[90] flex max-w-[calc(100%-24px)] flex-wrap items-center gap-2 rounded-md border px-2.5 py-2 font-mono text-[11px] text-sky-100 backdrop-blur" style={{ background: "rgba(5,22,42,.82)", borderColor: "rgba(127,224,255,.3)" }} onPointerDown={(e) => e.stopPropagation()}>
        <span className="tracking-[0.2em] text-sky-300">PRANCHA</span>
        <select className="max-w-[200px] rounded border bg-transparent px-1.5 py-1 text-sky-50" style={{ borderColor: "rgba(127,224,255,.3)" }} value={board?.id ?? ""} onChange={(e) => { centrou.current = null; B.abrir(e.target.value === "meu" ? null : e.target.value); }}>
          {board && <option value={board.id} className="bg-[#0b2c4d]">{board.titulo}{board.papel !== "dono" ? " (convidado)" : ""}</option>}
          {board?.papel !== "dono" && <option value="meu" className="bg-[#0b2c4d]">Meus estudos</option>}
          {B.compartilhados.filter((s) => s.id !== board?.id).map((s) => <option key={s.id} value={s.id} className="bg-[#0b2c4d]">{s.titulo} — de {s.donoNome}</option>)}
        </select>
        {!leitor && (["estudo", "nota", "pergunta"] as const).map((t) => <Botao key={t} cor={COR[t]} onClick={() => novo(t)}>+ {ROTULO[t].toLowerCase()}</Botao>)}
        {board?.papel === "dono" && <><Botao cor="#7fe0ff" onClick={() => convidar("editor")}>convidar (edita)</Botao><Botao cor="#7fe0ff" onClick={() => convidar("leitor")}>convidar (só vê)</Botao></>}
        {board && <ConvitesBoard boardId={board.id} dono={board.papel === "dono"} abrir={(id) => { centrou.current = null; B.abrir(id); }} />}
        {leitor && <span className="text-amber-200/80">só leitura</span>}
        <span className="text-sky-300/60">{B.salvando ? "salvando…" : "salvo"}</span>
      </div>
      {conviteMsg && <div className="absolute left-3 top-16 z-[90] rounded border px-3 py-1.5 font-mono text-[11px] text-sky-50" style={{ background: "rgba(5,22,42,.9)", borderColor: "rgba(127,224,255,.3)" }}>{conviteMsg}</div>}

      {/* o BLUEPRINT do estudo (a prancha técnica) */}
      {blueprint && board && (
        <BlueprintEstudo cards={board.cards} estudoId={blueprint} rev={board.rev} autorNome={(sessao?.user?.name as string | undefined) ?? "você"} podeEditar={!leitor}
          onSalvar={(c) => B.mudar([c])} onChecar={() => B.checarSelos(blueprint)} onFechar={() => setBlueprint(null)} />
      )}

      {/* QUEM ESTÁ no board agora */}
      <div className="absolute right-3 top-3 z-[90] flex items-center -space-x-2" onPointerDown={(e) => e.stopPropagation()}>
        {B.presentes.map((p) => (
          <div key={p.id} title={p.nome} className="h-8 w-8 overflow-hidden rounded-full border-2 bg-sky-900 text-center font-mono text-[12px] leading-[28px] text-white" style={{ borderColor: p.cor }}>
            {p.imagem ? <img src={p.imagem} alt={p.nome} className="h-full w-full object-cover" /> : p.nome.slice(0, 1).toUpperCase()}
          </div>
        ))}
      </div>

      {/* o ZOOM e a legenda */}
      <div className="absolute bottom-3 right-3 z-[90] flex items-center gap-1 font-mono text-[11px] text-sky-100" onPointerDown={(e) => e.stopPropagation()}>
        <Botao cor="#7fe0ff" onClick={() => setCam((c) => ({ ...c, z: Math.max(0.25, c.z * 0.85) }))}>−</Botao>
        <span className="w-12 text-center">{Math.round(cam.z * 100)}%</span>
        <Botao cor="#7fe0ff" onClick={() => setCam((c) => ({ ...c, z: Math.min(2.2, c.z * 1.15) }))}>+</Botao>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 z-[90] font-mono text-[10px] tracking-[0.14em] text-sky-200/50">
        ━ CONFIRMADO NA LITERATURA &nbsp; ┅ ESPECULAÇÃO &nbsp; ⟵ AS RAMIFICAÇÕES CRESCEM PRA ESQUERDA
      </div>
    </div>
  );
}

function Botao({ children, cor, onClick, titulo, desabilitado }: { children: React.ReactNode; cor: string; onClick?: () => void; titulo?: string; desabilitado?: boolean }) {
  return <button type="button" title={titulo} disabled={desabilitado} onClick={onClick} className="rounded-sm border px-2 py-1 font-mono text-[10.5px] tracking-wide transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40" style={{ borderColor: `${cor}88`, color: cor }}>{children}</button>;
}

function Editor({ c, onSalvar }: { c: CardEstudo; onSalvar: (c: CardEstudo, titulo: string, corpo: string) => void }) {
  const [t, setT] = useState(c.titulo ?? ""), [b, setB] = useState(c.corpo ?? "");
  const fim = () => onSalvar(c, t, b);
  return (
    <div onPointerDown={(e) => e.stopPropagation()} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) fim(); }}>
      <input autoFocus value={t} onChange={(e) => setT(e.target.value)} placeholder="título" maxLength={200} className="mb-1 w-full rounded-sm border bg-sky-950/40 px-1.5 py-1 font-mono text-[13px] text-sky-50 outline-none" style={{ borderColor: "rgba(127,224,255,.3)" }} onKeyDown={(e) => { if (e.key === "Escape") fim(); }} />
      <textarea value={b} onChange={(e) => setB(e.target.value)} placeholder="o que você sabe / quer descobrir…" rows={4} maxLength={6000} className="w-full resize-y rounded-sm border bg-sky-950/40 px-1.5 py-1 text-[12.5px] text-sky-50 outline-none" style={{ borderColor: "rgba(127,224,255,.3)" }} onKeyDown={(e) => { if (e.key === "Escape") fim(); }} />
    </div>
  );
}
