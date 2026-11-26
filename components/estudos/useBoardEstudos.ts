"use client";
/**
 * useBoardEstudos — o estado do board de MEUS ESTUDOS no cliente (lib/estudos/board):
 *  - carrega o MEU board (ou o de `boardId`, entrando antes pelo `convite` do link);
 *  - edição OTIMISTA: muda na hora, junta as mudanças e grava em lote (PATCH); as minhas edições em voo não são
 *    atropeladas pelo que chega dos outros (`mesclarRemoto`); conflito → relê;
 *  - TEMPO REAL: o canal de presença do board (Pusher) — quem está aqui, o aviso "mudou" (relê na hora) e os CURSORES
 *    dos outros (eventos de cliente; se o app não os aceita, só não aparecem); sem Pusher, consulta a cada 5 s.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type PusherClient from "pusher-js";
import { mesclarRemoto, type CardEstudo } from "@/lib/estudos/board";

export type BoardCliente = { id: string; titulo: string; cards: CardEstudo[]; rev: number; papel: "dono" | "editor" | "leitor"; donoId: string };
export type Presente = { id: string; nome: string; imagem: string | null; cor: string };
export type Cursor = { x: number; y: number; nome: string; cor: string; t: number };

const EV_MUDOU = "board-mudou", EV_CURSOR = "client-cursor";

export function useBoardEstudos(o: { boardId?: string | null; convite?: string | null; euId?: string | null }) {
  const [board, setBoard] = useState<BoardCliente | null>(null);
  const [compartilhados, setCompartilhados] = useState<{ id: string; titulo: string; donoNome: string }[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [presentes, setPresentes] = useState<Presente[]>([]);
  const [cursores, setCursores] = useState<Record<string, Cursor>>({});
  const [salvando, setSalvando] = useState(false);
  const [pendente, setPendente] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const boardRef = useRef<BoardCliente | null>(null); boardRef.current = board;
  const fila = useRef<{ upsert: Map<string, CardEstudo>; remove: Set<string>; titulo?: string }>({ upsert: new Map(), remove: new Set() });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emVoo = useRef(false);
  const idsEmVoo = useRef<Set<string>>(new Set());
  const canal = useRef<any>(null);
  const [alvo, setAlvo] = useState<{ id: string | null; convite: string | null }>({ id: o.boardId ?? null, convite: o.convite ?? null });

  const pendentesFila = () => new Set([...fila.current.upsert.keys(), ...fila.current.remove]);
  const pendentes = () => new Set([...pendentesFila(), ...idsEmVoo.current]);
  /** relê o board (do servidor) e junta com o que ainda não salvei */
  const reler = useCallback(async (id?: string) => {
    const bid = id ?? boardRef.current?.id; if (!bid) return;
    const r = await fetch(`/api/estudos/board/${bid}`, { cache: "no-store" }).catch(() => null);
    if (!r?.ok) return;
    const { board: b } = (await r.json()) as { board: BoardCliente };
    setBoard((atual) => (atual && atual.id === b.id ? { ...b, cards: mesclarRemoto(atual.cards, b.cards, pendentes()) } : b));
  }, []);

  // ── carregar (o meu, ou o do link) ──
  useEffect(() => {
    let vivo = true;
    (async () => {
      setErro(null);
      try {
        if (alvo.id && alvo.convite) await fetch(`/api/estudos/board/${alvo.id}/entrar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: alvo.convite }) }).catch(() => null);
        const meu = await fetch("/api/estudos/board", { cache: "no-store" });
        if (!meu.ok) throw new Error(meu.status === 401 ? "Entre na sua conta pra ver os seus estudos." : "Não deu pra abrir o board.");
        const j = (await meu.json()) as { board: BoardCliente; compartilhados: { id: string; titulo: string; donoNome: string }[] };
        if (!vivo) return;
        setCompartilhados(j.compartilhados ?? []);
        if (alvo.id && alvo.id !== j.board.id) {
          const r = await fetch(`/api/estudos/board/${alvo.id}`, { cache: "no-store" });
          if (r.ok) { const { board: b } = await r.json(); if (vivo) setBoard(b); return; }
        }
        setBoard(j.board);
      } catch (e) { if (vivo) setErro(e instanceof Error ? e.message : "Não deu pra abrir o board."); }
    })();
    return () => { vivo = false; };
  }, [alvo]);

  // ── gravar em lote ──
  const gravar = useCallback(async (): Promise<boolean> => {
    const b = boardRef.current;
    if (!b || emVoo.current) return false;
    const f = fila.current;
    if (!f.upsert.size && !f.remove.size && f.titulo === undefined) return true;
    const corpo = { upsert: [...f.upsert.values()], remove: [...f.remove], titulo: f.titulo };
    fila.current = { upsert: new Map(), remove: new Set() };
    emVoo.current = true; idsEmVoo.current = new Set([...corpo.upsert.map((c) => c.id), ...corpo.remove]); setSalvando(true); setErroSalvar(null);
    let sucesso = false;
    try {
      const r = await fetch(`/api/estudos/board/${b.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
      if (!r.ok) throw new Error(r.status === 403 ? "Você não tem permissão para salvar neste board." : "Não foi possível salvar. Tente novamente.");
      const { board: nb } = (await r.json()) as { board: BoardCliente };
      setBoard((atual) => (atual && atual.id === nb.id ? { ...nb, cards: mesclarRemoto(atual.cards, nb.cards, pendentesFila()) } : atual));
      sucesso = true; setErroSalvar(null);
    } catch (e) {
      // Restaura a operação, sem substituir uma edição ou exclusão mais recente.
      const atual = fila.current;
      for (const c of corpo.upsert) if (!atual.upsert.has(c.id) && !atual.remove.has(c.id)) atual.upsert.set(c.id, c);
      for (const id of corpo.remove) if (!atual.upsert.has(id) && !atual.remove.has(id)) atual.remove.add(id);
      if (corpo.titulo !== undefined && atual.titulo === undefined) atual.titulo = corpo.titulo;
      setErroSalvar(e instanceof Error ? e.message : "Não foi possível salvar. Tente novamente.");
    } finally {
      emVoo.current = false; idsEmVoo.current = new Set(); setSalvando(false);
      const temFila = !!(fila.current.upsert.size || fila.current.remove.size || fila.current.titulo !== undefined);
      setPendente(temFila);
      if (sucesso && temFila) agendar();
    }
    return sucesso && !fila.current.upsert.size && !fila.current.remove.size && fila.current.titulo === undefined;
  }, []);
  const agendar = useCallback(() => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => void gravar(), 350); }, [gravar]);

  // O navegador avisa se a pessoa tentar sair antes da confirmação do servidor.
  useEffect(() => {
    if (!pendente && !salvando) return;
    const avisar = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [pendente, salvando]);

  /** muda cards (na hora, na tela) e agenda a gravação */
  const mudar = useCallback((upsert: CardEstudo[], remove: string[] = []) => {
    if (!boardRef.current || boardRef.current.papel === "leitor") return;
    setBoard((b) => {
      if (!b || b.papel === "leitor") return b;
      const fora = new Set(remove), mapa = new Map(b.cards.filter((c) => !fora.has(c.id)).map((c) => [c.id, c] as const));
      for (const c of upsert) mapa.set(c.id, c);
      return { ...b, cards: [...mapa.values()].map((c) => (c.pai && fora.has(c.pai) ? { ...c, pai: undefined } : c)) };
    });
    for (const c of upsert) { fila.current.upsert.set(c.id, c); fila.current.remove.delete(c.id); }
    for (const id of remove) { fila.current.remove.add(id); fila.current.upsert.delete(id); }
    setPendente(true); setErroSalvar(null); agendar();
  }, [agendar]);
  const renomear = useCallback((titulo: string) => { setBoard((b) => (b ? { ...b, titulo } : b)); fila.current.titulo = titulo; setPendente(true); setErroSalvar(null); agendar(); }, [agendar]);

  // ── tempo real ──
  useEffect(() => {
    const id = board?.id; if (!id) return;
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY, cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    let p: PusherClient | null = null, vivo = true, poll: ReturnType<typeof setInterval> | null = null;
    const semRealtime = () => { if (!poll) poll = setInterval(() => { if (document.visibilityState === "visible") void reler(id); }, 5000); };
    if (!key || !cluster) { semRealtime(); return () => { if (poll) clearInterval(poll); }; }
    (async () => {
      const Pusher = (await import("pusher-js")).default; if (!vivo) return;
      p = new Pusher(key, { cluster, channelAuthorization: { endpoint: `/api/estudos/board/${id}/pusher-auth`, transport: "ajax" } });
      const ch: any = p.subscribe(`presence-estudos-${id}`); canal.current = ch;
      const lista = () => { const out: Presente[] = []; ch.members?.each((m: any) => out.push({ id: String(m.id), nome: m.info?.nome ?? "Alguém", imagem: m.info?.imagem ?? null, cor: m.info?.cor ?? "#7fd8ff" })); setPresentes(out); };
      ch.bind("pusher:subscription_succeeded", lista); ch.bind("pusher:member_added", lista);
      ch.bind("pusher:member_removed", (m: any) => { lista(); setCursores((c) => { const n = { ...c }; delete n[String(m.id)]; return n; }); });
      ch.bind("pusher:subscription_error", semRealtime);
      ch.bind(EV_MUDOU, (d: { rev: number; por: string }) => { if (d?.por !== o.euId && (boardRef.current?.rev ?? 0) < d.rev) void reler(id); });
      ch.bind(EV_CURSOR, (d: { x: number; y: number }, meta: any) => {
        const uid = String(meta?.user_id ?? ""), m = uid ? ch.members?.get(uid) : null; if (!uid || uid === o.euId) return;
        setCursores((c) => ({ ...c, [uid]: { x: d.x, y: d.y, nome: m?.info?.nome ?? "", cor: m?.info?.cor ?? "#7fd8ff", t: Date.now() } }));
      });
    })().catch(semRealtime);
    return () => { vivo = false; if (poll) clearInterval(poll); canal.current = null; p?.disconnect(); setPresentes([]); setCursores({}); };
  }, [board?.id, o.euId, reler]);

  /** o MEU cursor (coordenadas do board), no máximo ~8 por segundo */
  const ultCursor = useRef(0);
  const moverCursor = useCallback((x: number, y: number) => {
    const agora = Date.now(); if (agora - ultCursor.current < 120 || !canal.current?.subscribed) return; ultCursor.current = agora;
    try { canal.current.trigger(EV_CURSOR, { x: Math.round(x), y: Math.round(y) }); } catch { /* sem eventos de cliente */ }
  }, []);
  // os cursores parados somem
  useEffect(() => { const id = setInterval(() => setCursores((c) => { const agora = Date.now(), n: Record<string, Cursor> = {}; for (const [k, v] of Object.entries(c)) if (agora - v.t < 6000) n[k] = v; return n; }), 2000); return () => clearInterval(id); }, []);

  /** gera o link de convite (só o dono) */
  const convidar = useCallback(async (papel: "editor" | "leitor"): Promise<string | null> => {
    const b = boardRef.current; if (!b) return null;
    const r = await fetch(`/api/estudos/board/${b.id}/convite`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ papel }) }).catch(() => null);
    if (!r?.ok) return null;
    const { token } = await r.json();
    return `${window.location.origin}/research-lab?tab=sala-de-estudos&board=${b.id}&convite=${encodeURIComponent(token)}`;
  }, []);

  /** o HARNESS dentro do card: gera o percurso ou a resposta certeira (o servidor cria os cards pra todo mundo) */
  const [gerando, setGerando] = useState<Record<string, "percurso" | "resposta">>({});
  const gerar = useCallback(async (cardId: string, acao: "percurso" | "resposta"): Promise<string | null> => {
    const b = boardRef.current; if (!b) return null;
    if (emVoo.current) return "Aguarde o salvamento do board.";
    if ((fila.current.upsert.size || fila.current.remove.size) && !(await gravar())) return "Salve o board antes de gerar.";
    setGerando((g) => ({ ...g, [cardId]: acao }));
    try {
      const r = await fetch(`/api/estudos/board/${b.id}/gerar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cardId, acao }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return j?.error ?? "Não deu agora — tente de novo.";
      setBoard((atual) => (atual && atual.id === j.board.id ? { ...j.board, cards: mesclarRemoto(atual.cards, j.board.cards, pendentes()) } : atual));
      return j.criados ? null : "Nada novo pra ramificar.";
    } catch { return "Sem conexão."; }
    finally { setGerando((g) => { const n = { ...g }; delete n[cardId]; return n; }); }
  }, [gravar]);

  /** a CAMADA DE VALIDAÇÃO do blueprint: o servidor confere os links do estudo e grava o selo */
  const checarSelos = useCallback(async (cardId: string): Promise<string | null> => {
    const b = boardRef.current; if (!b) return null;
    if (emVoo.current) return "Aguarde o salvamento do board.";
    if ((fila.current.upsert.size || fila.current.remove.size) && !(await gravar())) return "Salve o board antes de conferir.";
    try {
      const r = await fetch(`/api/estudos/board/${b.id}/selos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cardId }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return j?.error ?? "Não deu pra checar agora.";
      setBoard((atual) => (atual && atual.id === j.board.id ? { ...j.board, cards: mesclarRemoto(atual.cards, j.board.cards, pendentes()) } : atual));
      const l = j.links as { ok: number; total: number };
      return !l.total ? "Nenhum link pra checar ainda (fontes ou entregável)." : l.ok === l.total ? `Todos os ${l.total} links responderam.` : `${l.total - l.ok} de ${l.total} links não responderam: ${(j.quebrados as string[]).slice(0, 3).join(", ")}`;
    } catch { return "Sem conexão."; }
  }, [gravar]);

  const abrir = useCallback(async (id: string | null) => {
    if (timer.current) clearTimeout(timer.current);
    if (!(await gravar())) {
      setErroSalvar((atual) => atual ?? "Aguarde o salvamento antes de trocar de board.");
      return;
    }
    setAlvo({ id, convite: null });
  }, [gravar]);

  return { board, compartilhados, erro, presentes, cursores, salvando, pendente, erroSalvar, tentarSalvar: gravar, gerando, mudar, renomear, moverCursor, convidar, gerar, checarSelos, abrir };

}
