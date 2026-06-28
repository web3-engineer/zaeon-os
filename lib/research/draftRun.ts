"use client";
/**
 * draftRun — store SINGLETON da geração de pesquisa ("Gerar pesquisa").
 *
 * Por que existe: a geração rodava em `useState` dentro do GenerateResearchPanel.
 * Trocar de aba (ex.: ir pra "Meus Estudos" durante o onboarding) DESMONTA o painel →
 * a Promise resolvia no vazio e o resultado se perdia. Aqui o estado e o fetch vivem
 * FORA do ciclo de vida do componente (módulo + pub/sub + localStorage), igual ao
 * padrão resiliente do scholar. Eventos: `zaeon:research:draftstart` / `draftdone`.
 */
import type { DraftFields } from "@/lib/abntTemplate";

export type DraftStatus = "idle" | "loading" | "done" | "error";
export type DraftResult = { title: string; fields: DraftFields };
export type DraftState = { status: DraftStatus; topic: string; result: DraftResult | null; error: string | null };

let state: DraftState = { status: "idle", topic: "", result: null, error: null };
const subs = new Set<(s: DraftState) => void>();
const emit = () => subs.forEach((f) => f(state));
const set = (p: Partial<DraftState>) => { state = { ...state, ...p }; emit(); };

export function getDraftState(): DraftState { return state; }
export function subscribeDraft(cb: (s: DraftState) => void) { subs.add(cb); cb(state); return () => { subs.delete(cb); }; }

const LS_KEY = "zaeon.research.draft";
function persist() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ topic: state.topic, result: state.result, status: state.status === "done" ? "done" : "idle" }));
  } catch { /* */ }
}

let hydrated = false;
/** Restaura um draft pronto do localStorage (sobrevive a reload). Idempotente. */
export function hydrateDraft() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && d.result && d.status === "done") { state = { status: "done", topic: d.topic || "", result: d.result, error: null }; emit(); }
    }
  } catch { /* */ }
}

/** Roda a geração FORA do componente — sobrevive a troca de aba/desmontagem. */
export async function runDraft(topic: string, references: string[] = []) {
  const t = topic.trim();
  if (!t || state.status === "loading") return;
  set({ status: "loading", topic: t, result: null, error: null });
  try { window.dispatchEvent(new CustomEvent("zaeon:research:draftstart", { detail: { topic: t } })); } catch { /* */ }
  try {
    const r = await fetch("/api/ai/research-draft", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: t, references }),
    });
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.fields) set({ status: "done", result: { title: d.title || t, fields: d.fields }, error: null });
    else set({ status: "error", error: d.error || "Não consegui gerar agora. Tente de novo." });
  } catch {
    set({ status: "error", error: "Erro de conexão ao gerar a pesquisa." });
  } finally {
    persist();
    try { window.dispatchEvent(new CustomEvent("zaeon:research:draftdone", { detail: { ok: state.status === "done" } })); } catch { /* */ }
  }
}

export function resetDraft() { state = { status: "idle", topic: "", result: null, error: null }; persist(); emit(); }
