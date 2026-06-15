"use client";
import { type ReactNode, createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import type { ScholarEvent, Suggestion, ForgeResponse } from "@/lib/scholar/types";
import type { Prereq } from "@/lib/scholar/prereqs";

interface Phase { phase: string; message: string; }
interface OmegaState {
  status: "idle" | "running" | "done" | "error" | "unauthorized";
  query: string;
  phases: Phase[];
  answer: string;
  session: any | null;
  error: string | null;
  startedAt: number | null; // quando a pesquisa começou (timer contínuo mesmo ao sair/voltar)
  // Suggestion Forge (engine 8003)
  suggestions: Suggestion[] | null;
  suggestionsCoverage: string | null;
  loadingSuggestions: boolean;
  // Conhecimentos Prévios (engine de contexto)
  prereqs: Prereq[] | null;
  prereqsSummary: string | null;
  loadingPrereqs: boolean;
}
interface OmegaCtx extends OmegaState {
  draft: string;
  setDraft: (v: string) => void;
  runQuery: (prompt: string, deep?: boolean) => Promise<void>;
  loadSession: (s: any) => void;
  fetchSuggestions: (opts?: { count?: number; exclude?: string[] }) => Promise<void>;
  fetchPrereqs: () => Promise<void>;
}

const Ctx = createContext<OmegaCtx | null>(null);
export const useOmegaScholar = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useOmegaScholar must be used within OmegaScholarProvider");
  return c;
};

const EMPTY_FORGE = { suggestions: null, suggestionsCoverage: null, loadingSuggestions: false } as const;
const EMPTY_PREREQS = { prereqs: null, prereqsSummary: null, loadingPrereqs: false } as const;

export function OmegaScholarProvider({ room, onStart, children }:
  { room?: string; onStart?: () => void; children: ReactNode }) {
  const [state, setState] = useState<OmegaState>({
    status: "idle", query: "", phases: [], answer: "", session: null, error: null, startedAt: null, ...EMPTY_FORGE, ...EMPTY_PREREQS });

  const RUN_KEY = "zaeon.omega.run"; // lembra a pesquisa em curso p/ resumir ao voltar

  // Draft do input da barra, elevado ao contexto para o dock de sugestão observá-lo.
  const [draft, setDraft] = useState("");

  // Snapshot do estado para callbacks assíncronos lerem a sessão corrente sem stale-closure.
  const stateRef = useRef(state);
  stateRef.current = state;

  const runQuery = useCallback(async (prompt: string, deep = false) => {
    if (!prompt.trim()) return;
    onStart?.(); // parent switches activeTab → "community"
    const startedAt = Date.now();
    try { localStorage.setItem(RUN_KEY, JSON.stringify({ query: prompt, startedAt })); } catch { /* ignore */ }
    setState({ status: "running", query: prompt, phases: [], answer: "", session: null, error: null, startedAt, ...EMPTY_FORGE, ...EMPTY_PREREQS });
    try {
      const res = await fetch("/api/ai/scholar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, room, deep }),
      });
      // Sessão ausente/expirada: o servidor responde 401 (texto, não NDJSON).
      // Tratamos explicitamente para não travar o stream — a UI mostra o gate de login.
      if (res.status === 401) {
        setState((s) => ({ ...s, status: "unauthorized", error: null }));
        return;
      }
      if (!res.ok) {
        setState((s) => ({ ...s, status: "error", error: `Erro ${res.status}` }));
        return;
      }
      if (!res.body) throw new Error("Sem stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      const dispatch = (line: string) => {
        if (!line.trim()) return;
        let ev: ScholarEvent;
        try { ev = JSON.parse(line) as ScholarEvent; } catch { return; }
        setState((s) => {
          if (ev.type === "phase") return { ...s, phases: [...s.phases, { phase: ev.phase, message: (ev as any).message ?? ev.phase }] };
          if (ev.type === "answer") return { ...s, answer: ev.text };
          if (ev.type === "done") { try { localStorage.removeItem(RUN_KEY); } catch { /* ignore */ } return { ...s, status: "done", session: ev.session }; }
          if (ev.type === "error") { try { localStorage.removeItem(RUN_KEY); } catch { /* ignore */ } return { ...s, status: "error", error: ev.message }; }
          return s;
        });
      };
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) dispatch(line);
      }
      // Flush any trailing line not terminated by a newline (robust to servers
      // that don't append a final \n — e.g. a last `done` event).
      if (buf) dispatch(buf);
    } catch (e: any) {
      setState((s) => ({ ...s, status: "error", error: e?.message ?? "Erro" }));
    }
  }, [room, onStart]);

  const loadSession = useCallback((s: any) => {
    // Hidrata sugestões já persistidas (ForgeResponse em ScholarSession.suggestions), se houver.
    const stored: ForgeResponse | null = s?.suggestions ?? null;
    setState({
      status: "done", query: s.query, phases: [], answer: s?.thread?.answer ?? "", session: s, error: null, startedAt: null,
      suggestions: stored?.suggestions ?? null,
      suggestionsCoverage: stored?.coverage_summary ?? null,
      loadingSuggestions: false,
      ...EMPTY_PREREQS,
    });
  }, []);

  // ── RESUMO AO VOLTAR ──────────────────────────────────────────────────────
  // Ao remontar (saiu e voltou), retoma a pesquisa em curso (poll até concluir) ou
  // restaura a última concluída — em vez de zerar a barra e ficar em branco.
  const resumedRef = useRef(false);
  useEffect(() => {
    if (resumedRef.current) return;
    resumedRef.current = true;
    if (stateRef.current.status !== "idle") return;

    let run: { query: string; startedAt: number } | null = null;
    try { const raw = localStorage.getItem(RUN_KEY); if (raw) run = JSON.parse(raw); } catch { /* ignore */ }

    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/ai/scholar/sessions");
        if (!r.ok) return;
        const d = await r.json();
        const list = Array.isArray(d.sessions) ? d.sessions : [];
        if (!list.length) return;
        const latest = list[0]; // mais recente (orderBy createdAt desc)
        const ageMs = Date.now() - new Date(latest.createdAt).getTime();

        if (latest.status === "running") {
          if (ageMs > 90_000) { try { localStorage.removeItem(RUN_KEY); } catch { /* ignore */ } return; } // morreu no servidor
          setState((s) => ({ ...s, status: "running", query: latest.query, startedAt: run?.startedAt ?? new Date(latest.createdAt).getTime() }));
          const poll = async () => {
            if (cancelled) return;
            try {
              const sr = await fetch(`/api/ai/scholar/sessions?id=${latest.id}`);
              const sd = sr.ok ? await sr.json() : null;
              const full = sd?.session;
              if (full?.status === "done") { try { localStorage.removeItem(RUN_KEY); } catch { /* ignore */ } if (!cancelled) loadSession(full); return; }
              if (full?.status === "error" || (Date.now() - new Date(latest.createdAt).getTime()) > 120_000) {
                try { localStorage.removeItem(RUN_KEY); } catch { /* ignore */ }
                if (!cancelled) setState((s) => ({ ...s, status: "error", error: "A pesquisa anterior foi interrompida. Tente de novo." }));
                return;
              }
            } catch { /* tenta de novo */ }
            if (!cancelled) setTimeout(poll, 4000);
          };
          setTimeout(poll, 3000);
        } else if (latest.status === "done" && ageMs < 30 * 60_000) {
          // restaura a última pesquisa concluída recente (continuidade)
          const sr = await fetch(`/api/ai/scholar/sessions?id=${latest.id}`);
          const sd = sr.ok ? await sr.json() : null;
          if (sd?.session && !cancelled) loadSession(sd.session);
        }
      } catch { /* offline */ }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSuggestions = useCallback(async (opts?: { count?: number; exclude?: string[] }) => {
    const sess = stateRef.current.session;
    if (!sess || (sess.references?.length ?? 0) < 3) return;
    const isMore = !!opts?.exclude?.length;
    setState((s) => ({ ...s, loadingSuggestions: true }));
    try {
      const res = await fetch("/api/ai/suggestion-forge", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: sess.query,
          level: sess.user_level ?? "msc", // nível só calibra apresentação; default seguro
          references: sess.references ?? [],
          count: opts?.count ?? 5,
          exclude_titles: opts?.exclude ?? [],
          sessionId: sess.id,
        }),
      });
      if (!res.ok) {
        setState((s) => ({ ...s, loadingSuggestions: false }));
        return;
      }
      const data: ForgeResponse = await res.json();
      setState((s) => ({
        ...s,
        loadingSuggestions: false,
        suggestions: isMore && s.suggestions ? [...s.suggestions, ...data.suggestions] : data.suggestions,
        suggestionsCoverage: data.coverage_summary ?? s.suggestionsCoverage,
      }));
    } catch {
      setState((s) => ({ ...s, loadingSuggestions: false }));
    }
  }, []);

  // Conhecimentos Prévios — gera sob demanda (ex.: ao abrir a aba). Não persiste.
  const fetchPrereqs = useCallback(async () => {
    const sess = stateRef.current.session;
    if (!sess || stateRef.current.loadingPrereqs) return;
    setState((s) => ({ ...s, loadingPrereqs: true }));
    try {
      const res = await fetch("/api/ai/scholar/prereqs", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: sess.query,
          references: sess.references ?? [],
          insights: sess.insights ?? null,
        }),
      });
      if (!res.ok) {
        // falha → prereqs: [] faz o módulo mostrar o estado vazio com botão "tentar de novo"
        setState((s) => ({ ...s, loadingPrereqs: false, prereqs: [] }));
        return;
      }
      const data = await res.json();
      setState((s) => ({ ...s, loadingPrereqs: false, prereqs: data.prereqs ?? [], prereqsSummary: data.summary ?? null }));
    } catch {
      setState((s) => ({ ...s, loadingPrereqs: false, prereqs: [] }));
    }
  }, []);

  // Auto-forge: quando uma pesquisa nova termina (done) com ≥3 refs e o usuário
  // não desativou, dispara a forja automaticamente. Sessões carregadas que já têm
  // sugestões persistidas não re-forjam (suggestions !== null).
  useEffect(() => {
    if (state.status !== "done" || !state.session || state.suggestions || state.loadingSuggestions) return;
    const disabled = typeof window !== "undefined" && window.localStorage.getItem("zaeon:omega:autoforge") === "off";
    if (disabled) return;
    if ((state.session.references?.length ?? 0) >= 3) void fetchSuggestions();
  }, [state.status, state.session, state.suggestions, state.loadingSuggestions, fetchSuggestions]);

  return (
    <Ctx.Provider value={{ ...state, draft, setDraft, runQuery, loadSession, fetchSuggestions, fetchPrereqs }}>
      {children}
    </Ctx.Provider>
  );
}
