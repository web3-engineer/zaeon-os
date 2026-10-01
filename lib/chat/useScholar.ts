"use client";
/**
 * Sala de Pesquisa como HOOK — o que o mobile consome. Mesmo núcleo de rede do desktop
 * (lib/scholar/scholarClient): pesquisa nova (BG ou inline) e resume ao voltar.
 * Sem Suggestion Forge / pré-requisitos / glitch: isso é tela de desktop.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { iniciarPesquisa, acompanharSessao, lerNdjsonScholar, type Fase } from "@/lib/scholar/scholarClient";

export type EstadoPesquisa = {
  status: "idle" | "running" | "done" | "error" | "unauthorized";
  query: string;
  phases: Fase[];
  answer: string;
  session: any | null;
  error: string | null;
};

const VAZIO: EstadoPesquisa = { status: "idle", query: "", phases: [], answer: "", session: null, error: null };

export function useScholar(o: { room?: string; retomar?: boolean } = {}) {
  const [estado, setEstado] = useState<EstadoPesquisa>(VAZIO);
  const abortRef = useRef<AbortController | null>(null);

  const concluir = useCallback((session: any) =>
    setEstado({ status: "done", query: session?.query ?? "", phases: [], answer: session?.thread?.answer ?? "", session, error: null }), []);

  const parar = useCallback(() => {
    try { abortRef.current?.abort(); } catch { /* ignore */ }
    abortRef.current = null;
    setEstado((s) => (s.status === "running" ? { ...s, status: "idle" } : s));
  }, []);

  const pesquisar = useCallback(async (prompt: string, deep = false) => {
    const q = prompt.trim();
    if (!q) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setEstado({ ...VAZIO, status: "running", query: q });
    try {
      const ini = await iniciarPesquisa({ prompt: q, room: o.room, deep, signal: ac.signal });
      if (ini.tipo === "unauthorized") return setEstado((s) => ({ ...s, status: "unauthorized" }));
      if (ini.tipo === "http" || ini.tipo === "invalido") return setEstado((s) => ({ ...s, status: "error", error: "Não consegui começar a pesquisa." }));
      if (ini.tipo === "bg") {
        const fim = await acompanharSessao(ini.sessionId, {
          signal: ac.signal,
          onProgresso: ({ phases, answer }) => setEstado((s) => ({ ...s, phases: phases.length ? phases : s.phases, answer: answer ?? s.answer })),
        });
        if (fim.tipo === "cancelado") return;
        if (fim.tipo === "done") return concluir(fim.session);
        return setEstado((s) => ({ ...s, status: "error", error: fim.tipo === "erro" ? fim.mensagem : "A pesquisa demorou demais." }));
      }
      await lerNdjsonScholar(ini.body, (ev) => setEstado((s) => {
        if (ev.type === "phase") return { ...s, phases: [...s.phases, { phase: ev.phase, message: (ev as any).message ?? ev.phase }] };
        if (ev.type === "answer") return { ...s, answer: ev.text };
        if (ev.type === "done") return { ...s, status: "done", session: ev.session };
        if (ev.type === "error") return { ...s, status: "error", error: ev.message };
        return s;
      }));
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setEstado((s) => ({ ...s, status: "error", error: "Sem conexão agora." }));
    } finally {
      if (abortRef.current === ac) abortRef.current = null;
    }
  }, [o.room, concluir]);

  /** Reabre uma pesquisa do histórico. */
  const abrir = useCallback(async (id: string) => {
    const r = await fetch(`/api/ai/scholar/sessions?id=${encodeURIComponent(id)}`).catch(() => null);
    const s = r?.ok ? (await r.json().catch(() => null))?.session : null;
    if (s) concluir(s);
  }, [concluir]);

  // Resume ao voltar (pesquisa em curso no worker): mesmo comportamento do desktop.
  useEffect(() => {
    if (o.retomar === false) return;
    let cancelado = false;
    (async () => {
      const r = await fetch("/api/ai/scholar/sessions").catch(() => null);
      const lista = r?.ok ? (await r.json().catch(() => null))?.sessions ?? [] : [];
      const ult = lista[0];
      if (!ult || cancelado || (ult.status !== "running" && ult.status !== "queued")) return;
      const desde = new Date(ult.createdAt).getTime();
      if (Date.now() - desde > 10 * 60_000) return;
      setEstado({ ...VAZIO, status: "running", query: ult.query });
      const fim = await acompanharSessao(ult.id, {
        cancelado: () => cancelado, primeiroAtrasoMs: 2000, intervaloMs: 3000, desde,
        erroPadrao: "A pesquisa anterior foi interrompida. Tente de novo.",
        onProgresso: ({ phases, answer }) => { if (!cancelado) setEstado((s) => ({ ...s, phases: phases.length ? phases : s.phases, answer: answer ?? s.answer })); },
      });
      if (cancelado || fim.tipo === "cancelado") return;
      if (fim.tipo === "done") concluir(fim.session);
      else setEstado((s) => ({ ...s, status: "error", error: fim.tipo === "erro" ? fim.mensagem : "A pesquisa anterior foi interrompida. Tente de novo." }));
    })();
    return () => { cancelado = true; };
  }, [o.retomar, concluir]);

  return { ...estado, pesquisar, parar, abrir };
}
