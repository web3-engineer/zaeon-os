/**
 * Núcleo de REDE do chat da Aura — o mesmo no desktop (StudyCoworkChat) e no mobile
 * (useAuraChat). Sem React: fetch → lê o stream → (modo BG) espera o turno no worker.
 *
 * Devolve o texto LIMPO (sem eventos de progresso), pronto pro parser de sempre
 * (parseStructuredStream / sentinelas). A UI decide como mostrar: o desktop datilografa,
 * o mobile só pinta.
 */
import { separarProgresso, faseCorrente } from "@/lib/agent/progresso";
import { parseStructuredStream } from "@/lib/agent/structured-client";
import { STUDIO_SENTINEL } from "@/lib/agent/chat-turn-wire";
import { esperarTurno, TURNO_HEADER } from "@/lib/chat/turnoRetomavel";

export type AuraPedido = Record<string, unknown> & { prompt: string };

export type AuraCallbacks = {
  /** O turno foi pro worker (CHAT_BG): guarde o id pra reengatar se a pessoa sair. */
  onTurnId?: (turnId: string) => void;
  /** Fase nova narrada pelo harness (só quando muda). */
  onFase?: (rotulo: string) => void;
  /** Texto limpo acumulado a cada pedaço que chega (pra datilografar/pintar ao vivo). */
  onLimpo?: (limpo: string) => void;
  signal?: AbortSignal;
  /** Injetáveis pra teste. */
  fetch?: typeof fetch;
  esperar?: typeof esperarTurno;
};

export type AuraResultado =
  | { ok: true; limpo: string; turnId: string | null }
  | { ok: false; motivo: "http"; status: number }
  | { ok: false; motivo: "rede" };

/** Tem algo pra mostrar? (resposta estruturada, ação do Studio ou texto). */
export const temPayload = (limpo: string): boolean =>
  !!parseStructuredStream(limpo) || limpo.includes(STUDIO_SENTINEL) || !!limpo.trim();

/** Lê o corpo do stream separando progresso de conteúdo. */
export async function lerStreamAura(body: ReadableStream<Uint8Array>, cb: Pick<AuraCallbacks, "onFase" | "onLimpo"> = {}): Promise<string> {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let acc = "";
  let limpo = "";
  let faseVista = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    acc += dec.decode(value, { stream: true });
    // progresso sai do fio ANTES de qualquer conta (senão vira texto na tela)
    const { limpo: lp, eventos } = separarProgresso(acc);
    limpo = lp;
    const f = faseCorrente(eventos);
    if (f && f.rotulo !== faseVista) { faseVista = f.rotulo; cb.onFase?.(f.rotulo); }
    cb.onLimpo?.(limpo);
  }
  return limpo;
}

export async function pedirAura(pedido: AuraPedido, cb: AuraCallbacks = {}): Promise<AuraResultado> {
  const f = cb.fetch ?? fetch;
  let r: Response;
  try {
    r = await f("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent: "aura", stream: true, ...pedido }),
      signal: cb.signal,
    });
  } catch {
    return { ok: false, motivo: "rede" };
  }
  if (!r.ok || !r.body) return { ok: false, motivo: "http", status: r.status };
  const turnId = r.headers.get(TURNO_HEADER);
  if (turnId) cb.onTurnId?.(turnId);
  let limpo: string;
  try {
    limpo = await lerStreamAura(r.body, cb);
  } catch {
    // stream caiu no meio: sem turno no worker não há o que recuperar; com turno, espera
    if (!turnId) return { ok: false, motivo: "rede" };
    limpo = "";
  }
  // Modo BG: o acompanhamento pode fechar sem payload (teto). O turno segue no worker.
  if (turnId && !temPayload(limpo)) {
    const res = await (cb.esperar ?? esperarTurno)(turnId, {
      cancelado: () => !!cb.signal?.aborted,
      onParcial: (p) => { const fa = faseCorrente(separarProgresso(p).eventos); if (fa) cb.onFase?.(fa.rotulo); },
    });
    if (res.tipo === "pronto") limpo = separarProgresso(res.acumulado).limpo;
    else if (res.tipo === "erro") limpo = res.mensagem;
  }
  return { ok: true, limpo, turnId };
}

export type FinalAura =
  | { tipo: "estruturada"; answer: import("@/lib/agent/contracts").StructuredAnswer }
  | { tipo: "acao"; kind: string; topic: string; text: string }
  | { tipo: "texto"; text: string };

/** Como o turno terminou — a mesma leitura do `aplicarFinal` do desktop, sem efeitos. */
export function interpretarFinal(limpo: string, promptOriginal = ""): FinalAura {
  const s = parseStructuredStream(limpo);
  if (s) return s.kind === "answer" ? { tipo: "estruturada", answer: s.answer } : { tipo: "texto", text: s.text };
  const si = limpo.indexOf(STUDIO_SENTINEL);
  if (si >= 0) {
    try {
      const a = JSON.parse(limpo.slice(si + STUDIO_SENTINEL.length));
      if (a?.kind) return { tipo: "acao", kind: String(a.kind), topic: String(a.topic || promptOriginal), text: String(a.text || "Gerando o artefato…") };
    } catch { /* ação malformada → texto padrão abaixo */ }
    return { tipo: "texto", text: "Sem resposta agora." };
  }
  return { tipo: "texto", text: limpo.trim() ? limpo : "Sem resposta agora." };
}

/** Parte VISÍVEL do texto enquanto chega (antes de qualquer sentinela). */
export function visivel(limpo: string): string {
  const cut = [limpo.indexOf(STUDIO_SENTINEL), limpo.indexOf("@@STRUCTURED@@")].filter((i) => i >= 0);
  return cut.length ? limpo.slice(0, Math.min(...cut)) : limpo;
}
