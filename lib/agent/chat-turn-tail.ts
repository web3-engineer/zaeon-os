/**
 * Lado servidor do modo CHAT_BG: o stream do POST /api/ai/chat ACOMPANHA o ChatTurn que o
 * worker está preenchendo. Quem fica na sala vê tudo ao vivo (mesmo protocolo de sempre);
 * quem sai derruba só este acompanhamento — o turno segue no worker e fica no banco.
 *
 * PURO (load/emit/sleep injetáveis) pra testar sem banco nem timers.
 */
import { outputToWire, isHarnessOutput } from "@/lib/agent/chat-turn-wire";

export type TurnoLido = { status: string; partial: string | null; answer: unknown; error: string | null } | null;

export async function acompanharTurno(o: {
  load: () => Promise<TurnoLido>;
  emit: (chunk: string) => void;
  mensagemDeErro: (cru: string) => string;
  sleep?: (ms: number) => Promise<void>;
  agora?: () => number;
  parar?: () => boolean;          // o cliente fechou a conexão
  intervaloMs?: number;
  tetoMs?: number;
  /** O que o stream já mandou antes de começar a acompanhar (o "Acordando"). Se o parcial
   *  do worker começar igual, não repete. */
  prefixoJaEnviado?: string;
}): Promise<"done" | "error" | "sumiu" | "parado" | "tempo_esgotado"> {
  const sleep = o.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const agora = o.agora ?? (() => Date.now());
  const fim = agora() + (o.tetoMs ?? 5 * 60 * 1000);
  let enviado = 0; // quanto do parcial já foi repassado (o parcial só cresce)
  for (;;) {
    if (o.parar?.()) return "parado";
    const t = await o.load().catch(() => undefined);
    if (t === null) return "sumiu";
    if (t) {
      const p = t.partial ?? "";
      // markRunning zera o parcial numa retentativa: recomeça a contar sem repetir nem perder
      if (p.length < enviado) enviado = 0;
      if (enviado === 0 && o.prefixoJaEnviado && p.startsWith(o.prefixoJaEnviado)) enviado = o.prefixoJaEnviado.length;
      if (p.length > enviado) { o.emit(p.slice(enviado)); enviado = p.length; }
      if (t.status === "done") {
        o.emit(isHarnessOutput(t.answer) ? outputToWire(t.answer) : o.mensagemDeErro("invalid_output"));
        return "done";
      }
      if (t.status === "error") { o.emit(o.mensagemDeErro(t.error ?? "")); return "error"; }
    }
    // Teto do ACOMPANHAMENTO, não do turno: o stream fecha sem sentinela e o cliente
    // segue pelo polling de /turns/:id (esperarTurno), que tem teto próprio.
    if (agora() >= fim) return "tempo_esgotado";
    await sleep(o.intervaloMs ?? 400);
  }
}
