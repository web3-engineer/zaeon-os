/**
 * Reengate de um turno da Aura que roda no WORKER (CHAT_BG=1) — lado cliente, PURO o bastante
 * pra testar (fetch/sleep/relógio injetáveis). Espelha o resume da Sala de Pesquisa
 * (OmegaScholarContext): aceita `queued`, teto de ~10 min, progresso enquanto espera.
 *
 * O que volta é o MESMO texto de protocolo que o stream ao vivo entrega (eventos de
 * progresso + sentinela final), então quem chama passa pelo mesmo parser de sempre e a
 * resposta retomada renderiza igual à ao vivo.
 */
export const TURNO_HEADER = "X-Chat-Turn-Id";
export const POLL_TURNO_MS = 1500;
export const TETO_TURNO_MS = 10 * 60 * 1000;

export type TurnoWire = {
  id: string;
  status: "queued" | "running" | "done" | "error";
  partial: string;         // eventos @@PROGRESS@@ até agora
  wire: string | null;     // payload final (sentinela + JSON) quando done
  erro: string | null;     // mensagem AMIGÁVEL (o servidor já passou por messageForError)
};

export type ResultadoTurno =
  | { tipo: "pronto"; acumulado: string }       // partial + wire: alimenta o parser do chat
  | { tipo: "erro"; mensagem: string }
  | { tipo: "sumiu" }                           // 404: não existe / não é seu
  | { tipo: "tempo_esgotado" }
  | { tipo: "cancelado" };

type Deps = {
  fetch?: (url: string) => Promise<{ ok: boolean; status: number; json: () => Promise<any> }>;
  sleep?: (ms: number) => Promise<void>;
  agora?: () => number;
  /** Chamado a cada poll com o progresso parcial (pra pintar a fase enquanto espera). */
  onParcial?: (partial: string) => void;
  /** true = parar (o componente desmontou / trocou de conversa). */
  cancelado?: () => boolean;
  tetoMs?: number;
  intervaloMs?: number;
};

export async function esperarTurno(turnId: string, d: Deps = {}): Promise<ResultadoTurno> {
  const f = d.fetch ?? ((u: string) => fetch(u));
  const sleep = d.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const agora = d.agora ?? (() => Date.now());
  const fim = agora() + (d.tetoMs ?? TETO_TURNO_MS);
  let falhasSeguidas = 0;
  for (;;) {
    if (d.cancelado?.()) return { tipo: "cancelado" };
    let t: TurnoWire | null = null;
    try {
      const r = await f(`/api/ai/chat/turns/${encodeURIComponent(turnId)}`);
      if (r.status === 404) return { tipo: "sumiu" };
      if (r.ok) { t = (await r.json())?.turn ?? null; falhasSeguidas = 0; }
      else falhasSeguidas++;
    } catch {
      falhasSeguidas++; // rede caiu: tenta de novo até o teto (o turno segue no servidor)
    }
    if (t) {
      if (t.status === "done" && t.wire) return { tipo: "pronto", acumulado: (t.partial || "") + t.wire };
      if (t.status === "error") return { tipo: "erro", mensagem: t.erro || "Não consegui responder agora. Tenta de novo." };
      d.onParcial?.(t.partial || "");
    }
    if (agora() >= fim) return { tipo: "tempo_esgotado" };
    // backoff leve quando o servidor está falhando, pra não martelar
    await sleep((d.intervaloMs ?? POLL_TURNO_MS) * Math.min(4, 1 + falhasSeguidas));
  }
}
