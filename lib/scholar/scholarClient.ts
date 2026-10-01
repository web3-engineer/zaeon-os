/**
 * Núcleo de REDE da Sala de Pesquisa — o mesmo no desktop (OmegaScholarContext) e no
 * mobile (useScholar). Sem React. Antes o OmegaScholarContext tinha DOIS laços de polling
 * quase iguais (pesquisa nova em BG e resume ao voltar); agora os dois chamam
 * `acompanharSessao`.
 */
import type { ScholarEvent } from "@/lib/scholar/types";

export type Fase = { phase: string; message: string };

export type Inicio =
  | { tipo: "unauthorized" }
  | { tipo: "http"; status: number }
  | { tipo: "bg"; sessionId: string }           // 202 {sessionId}: o worker roda até o fim
  | { tipo: "stream"; body: ReadableStream<Uint8Array> } // modo inline legado (NDJSON)
  | { tipo: "invalido" };

export async function iniciarPesquisa(o: { prompt: string; room?: string; deep?: boolean; signal?: AbortSignal; fetch?: typeof fetch }): Promise<Inicio> {
  const f = o.fetch ?? fetch;
  const res = await f("/api/ai/scholar", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: o.prompt, room: o.room, deep: o.deep }),
    signal: o.signal,
  });
  // Sessão ausente/expirada: 401 em texto (não NDJSON) — a UI mostra o gate de login.
  if (res.status === 401) return { tipo: "unauthorized" };
  if (!res.ok) return { tipo: "http", status: res.status };
  const ctype = res.headers.get("content-type") || "";
  if (res.status === 202 || ctype.includes("application/json")) {
    const j = await res.json().catch(() => null);
    return j?.sessionId ? { tipo: "bg", sessionId: String(j.sessionId) } : { tipo: "invalido" };
  }
  return res.body ? { tipo: "stream", body: res.body } : { tipo: "invalido" };
}

/** thread.events da sessão → fases da barra + resposta parcial. */
export function progressoDaSessao(session: any): { phases: Fase[]; answer: string | undefined; nEventos: number } {
  const events = Array.isArray(session?.thread?.events) ? session.thread.events : [];
  const phases = events.filter((e: any) => e?.type === "phase").map((e: any) => ({ phase: e.phase, message: e.message ?? e.phase }));
  return { phases, answer: session?.thread?.answer, nEventos: events.length };
}

export type FimSessao =
  | { tipo: "done"; session: any }
  | { tipo: "erro"; mensagem: string }
  | { tipo: "tempo_esgotado" }
  | { tipo: "cancelado" };

/**
 * Polla /api/ai/scholar/sessions?id= até done/error/teto. Dorme ANTES de cada leitura
 * (o worker acabou de receber o job). `onProgresso` só é chamado quando o nº de eventos muda.
 */
export async function acompanharSessao(sessionId: string, o: {
  onProgresso?: (p: { phases: Fase[]; answer: string | undefined }) => void;
  cancelado?: () => boolean;
  signal?: AbortSignal;
  intervaloMs?: number;
  primeiroAtrasoMs?: number;
  /** Instante de referência do teto (ex.: createdAt da sessão retomada). */
  desde?: number;
  tetoMs?: number;
  /** Mensagem quando a sessão vem com status error e sem thread.error. */
  erroPadrao?: string;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  agora?: () => number;
}): Promise<FimSessao> {
  const f = o.fetch ?? fetch;
  const sleep = o.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const agora = o.agora ?? (() => Date.now());
  const desde = o.desde ?? agora();
  const teto = o.tetoMs ?? 10 * 60_000;
  const parar = () => !!o.signal?.aborted || !!o.cancelado?.();
  let ultimoN = -1;
  let atraso = o.primeiroAtrasoMs ?? o.intervaloMs ?? 1500;
  for (;;) {
    if (parar()) return { tipo: "cancelado" };
    await sleep(atraso);
    atraso = o.intervaloMs ?? 1500;
    if (parar()) return { tipo: "cancelado" };
    let full: any = null;
    try {
      const sr = await f(`/api/ai/scholar/sessions?id=${encodeURIComponent(sessionId)}`, { signal: o.signal });
      full = sr.ok ? (await sr.json())?.session : null;
    } catch (e: any) {
      if (e?.name === "AbortError") return { tipo: "cancelado" };
      // rede oscilou: tenta de novo no próximo ciclo
    }
    if (full) {
      const p = progressoDaSessao(full);
      if (p.nEventos !== ultimoN) { ultimoN = p.nEventos; o.onProgresso?.(p); }
      if (full.status === "done") return { tipo: "done", session: full };
      if (full.status === "error") return { tipo: "erro", mensagem: full?.thread?.error ?? o.erroPadrao ?? "Erro na pesquisa" };
    }
    if (agora() - desde > teto) return { tipo: "tempo_esgotado" };
  }
}

/** Modo inline legado: lê o NDJSON e entrega cada evento (linha final sem \n também). */
export async function lerNdjsonScholar(body: ReadableStream<Uint8Array>, onEvento: (ev: ScholarEvent) => void): Promise<void> {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  const despachar = (linha: string) => {
    if (!linha.trim()) return;
    try { onEvento(JSON.parse(linha) as ScholarEvent); } catch { /* linha malformada não derruba o stream */ }
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const linhas = buf.split("\n"); buf = linhas.pop() ?? "";
    for (const l of linhas) despachar(l);
  }
  if (buf) despachar(buf);
}
