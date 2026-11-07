/**
 * Núcleo de REDE do chat da Aura — o mesmo no desktop (StudyCoworkChat) e no mobile
 * (useAuraChat). Sem React: fetch → lê o stream → (modo BG) espera o turno no worker.
 *
 * Devolve o texto LIMPO (sem eventos de progresso), pronto pro parser de sempre
 * (parseStructuredStream / sentinelas). A UI decide como mostrar: o desktop datilografa,
 * o mobile só pinta.
 */
import { separarProgresso, faseCorrente, modeloDoTurno, previaDoTurno } from "@/lib/agent/progresso";
import { parseStructuredStream } from "@/lib/agent/structured-client";
import { STUDIO_SENTINEL } from "@/lib/agent/chat-turn-wire";
import { esperarTurno, TURNO_HEADER } from "@/lib/chat/turnoRetomavel";

/**
 * `agente`: QUEM responde (lib/agents/chatAgentes). Ausente = "aura", que era o único valor possível
 * antes — o corpo trazia `agent: "aura"` LITERAL, e por isso a escolha do seletor nunca chegava ao
 * servidor: ele caía em DEFAULT_AGENT_ID e todo turno era a Aura. O nome do campo no fio continua
 * `agent` (é o que a rota lê desde sempre); aqui ele tem nome em português como o resto do módulo.
 */
export type AuraPedido = Record<string, unknown> & { prompt: string; agente?: string };

export type AuraCallbacks = {
  /** O turno foi pro worker (CHAT_BG): guarde o id pra reengatar se a pessoa sair. */
  onTurnId?: (turnId: string) => void;
  /** Fase nova narrada pelo harness (só quando muda). */
  onFase?: (rotulo: string) => void;
  /** Texto limpo acumulado a cada pedaço que chega (pra datilografar/pintar ao vivo). */
  onLimpo?: (limpo: string) => void;
  /** Quem respondeu DE VERDADE (o servidor manda no fim; nome pronto pra tela). */
  onModelo?: (nome: string) => void;
  /** A PRÉVIA da resposta enquanto o rascunho é gerado (o texto acumulado); a resposta final a substitui. */
  onPrevia?: (texto: string) => void;
  signal?: AbortSignal;
  /** Injetáveis pra teste. */
  fetch?: typeof fetch;
  esperar?: typeof esperarTurno;
};

export type AuraResultado =
  | { ok: true; limpo: string; turnId: string | null; modelo: string | null }
  | { ok: false; motivo: "http"; status: number }
  | { ok: false; motivo: "rede" };

/** Tem algo pra mostrar? (resposta estruturada, ação do Studio ou texto). */
export const temPayload = (limpo: string): boolean =>
  !!parseStructuredStream(limpo) || limpo.includes(STUDIO_SENTINEL) || !!limpo.trim();

/** Lê o corpo do stream separando progresso de conteúdo. */
export async function lerStreamAura(body: ReadableStream<Uint8Array>, cb: Pick<AuraCallbacks, "onFase" | "onLimpo" | "onModelo" | "onPrevia"> = {}): Promise<string> {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let acc = "";
  let limpo = "";
  let faseVista = "";
  let modeloVisto = "";
  let previaVista = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    acc += dec.decode(value, { stream: true });
    // progresso sai do fio ANTES de qualquer conta (senão vira texto na tela)
    const { limpo: lp, eventos } = separarProgresso(acc);
    limpo = lp;
    const f = faseCorrente(eventos);
    if (f && f.rotulo !== faseVista) { faseVista = f.rotulo; cb.onFase?.(f.rotulo); }
    const quem = modeloDoTurno(eventos);
    if (quem && quem !== modeloVisto) { modeloVisto = quem; cb.onModelo?.(quem); }
    cb.onLimpo?.(limpo);
    const pv = previaDoTurno(eventos);
    if (pv && pv !== previaVista) { previaVista = pv; cb.onPrevia?.(pv); }
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
      // `agente` (o seletor) tem precedência; `agent` cru de chamador antigo continua valendo; e só
      // na falta das duas é a Aura. Sobrescrever um `agent` explícito seria trocar o agente de quem
      // já pedia outro, em silêncio. `agente: undefined` não vai no fio: JSON.stringify o descarta.
      body: JSON.stringify({ ...pedido, agent: pedido.agente ?? pedido.agent ?? "aura", agente: undefined, stream: true }),
      signal: cb.signal,
    });
  } catch {
    return { ok: false, motivo: "rede" };
  }
  if (!r.ok || !r.body) return { ok: false, motivo: "http", status: r.status };
  const turnId = r.headers.get(TURNO_HEADER);
  if (turnId) cb.onTurnId?.(turnId);
  let limpo: string;
  let modelo: string | null = null;
  const comModelo = { ...cb, onModelo: (n: string) => { modelo = n; cb.onModelo?.(n); } };
  try {
    limpo = await lerStreamAura(r.body, comModelo);
  } catch {
    // stream caiu no meio: sem turno no worker não há o que recuperar; com turno, espera
    if (!turnId) return { ok: false, motivo: "rede" };
    limpo = "";
  }
  // Modo BG: o acompanhamento pode fechar sem payload (teto). O turno segue no worker.
  if (turnId && !temPayload(limpo)) {
    const res = await (cb.esperar ?? esperarTurno)(turnId, {
      cancelado: () => !!cb.signal?.aborted,
      onParcial: (p) => {
        const { eventos } = separarProgresso(p), fa = faseCorrente(eventos);
        if (fa) cb.onFase?.(fa.rotulo);
        const pv = previaDoTurno(eventos); if (pv) cb.onPrevia?.(pv);
      },
    });
    if (res.tipo === "pronto") {
      const sep = separarProgresso(res.acumulado);
      limpo = sep.limpo;
      const quem = modeloDoTurno(sep.eventos);
      if (quem) { modelo = quem; cb.onModelo?.(quem); }
    }
    else if (res.tipo === "erro") limpo = res.mensagem;
  }
  return { ok: true, limpo, turnId, modelo };
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
