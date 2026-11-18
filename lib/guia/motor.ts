/**
 * lib/guia/motor.ts — o MOTOR do guia. PURO (sem React). Recebe sinais, mantém o estado de movimento
 * (parado → movimento → pausa), passa cada sinal aos comportamentos e emite o nudge escolhido.
 *
 * O relógio é injetável (`programar`) pra o teste correr o tempo sem esperar de verdade. Nada aqui
 * sabe de UI nem de voz: a página alimenta sinais e assina os nudges; quem desenha o balão é o React.
 */
import type { Comportamento, EstadoGuia, Nudge, Sinal } from "./tipos";

export type Guia = {
  /** alimenta um sinal do aluno (ou o relógio). */
  enviar(sinal: Sinal): void;
  /** a UI assina os nudges; devolve a função de cancelar. */
  assinar(fn: (nudge: Nudge) => void): () => void;
  estado(): Readonly<EstadoGuia>;
  /** começa o relógio interno (idempotente). */
  iniciar(): void;
  /** para o relógio e esquece os assinantes. */
  parar(): void;
};

export type OpcoesGuia = {
  comportamentos: Comportamento[];
  /** fase inicial do plano, se já souber. */
  faseInicial?: string | null;
  agora?: () => number;
  /** período do relógio interno (default 5 s). */
  tickMs?: number;
  /** janela em que o MESMO nudge (por id) não repete (default 12 s). */
  reaparecerMs?: number;
  /** agenda `fn` a cada `ms` e devolve o cancelador (default setInterval). Injetável pra teste. */
  programar?: (fn: () => void, ms: number) => () => void;
};

const intervaloPadrao = (fn: () => void, ms: number): (() => void) => {
  const id = setInterval(fn, ms);
  // não segura o processo (vitest/worker) — o guia é acessório, não deve atrasar a saída.
  (id as unknown as { unref?: () => void }).unref?.();
  return () => clearInterval(id);
};

export function criarGuia(opts: OpcoesGuia): Guia {
  const agora = opts.agora ?? Date.now;
  const tickMs = opts.tickMs ?? 5_000;
  const reaparecerMs = opts.reaparecerMs ?? 12_000;
  const programar = opts.programar ?? intervaloPadrao;

  const estado: EstadoGuia = {
    fase: opts.faseInicial ?? null,
    objetivoAtual: null,
    movimento: "parado",
    ultimaAtividade: agora(),
    agora: agora(),
  };
  const assinantes = new Set<(n: Nudge) => void>();
  const mostradoEm = new Map<string, number>();
  let cancelarRelogio: (() => void) | null = null;

  function atualizar(sinal: Sinal): void {
    estado.agora = sinal.em;
    switch (sinal.tipo) {
      case "atividade":
        estado.ultimaAtividade = sinal.em;
        estado.movimento = "movimento"; // qualquer atividade retoma o movimento
        break;
      case "objetivo":
        if (sinal.estado === "iniciou") {
          estado.objetivoAtual = sinal.id;
          estado.movimento = "movimento";
          estado.ultimaAtividade = sinal.em;
        } else {
          estado.objetivoAtual = null;
          estado.movimento = "pausa"; // alcançou → descanso entre objetivos
        }
        break;
      case "fase":
        estado.fase = sinal.fase;
        break;
      case "tick":
        break; // só avança o relógio
    }
  }

  function emitir(sinal: Sinal): void {
    const candidatos: { n: Nudge; c: Comportamento }[] = [];
    for (const c of opts.comportamentos) {
      for (const n of c.aoSinal(sinal, estado)) {
        const visto = mostradoEm.get(n.id);
        if (visto !== undefined && sinal.em - visto < reaparecerMs) continue; // na janela de silêncio
        candidatos.push({ n, c });
      }
    }
    if (!candidatos.length) return;
    candidatos.sort((a, b) => (b.n.prioridade ?? 0) - (a.n.prioridade ?? 0) || b.n.em - a.n.em);
    const { n, c } = candidatos[0];
    mostradoEm.set(n.id, sinal.em);
    c.aoMostrar?.(n);
    for (const fn of assinantes) {
      try { fn(n); } catch { /* um assinante quebrado não derruba os outros */ }
    }
  }

  function enviar(sinal: Sinal): void {
    atualizar(sinal);
    emitir(sinal);
  }

  return {
    enviar,
    assinar(fn) { assinantes.add(fn); return () => assinantes.delete(fn); },
    estado: () => estado,
    iniciar() {
      if (cancelarRelogio) return;
      cancelarRelogio = programar(() => enviar({ tipo: "tick", em: agora() }), tickMs);
    },
    parar() {
      cancelarRelogio?.();
      cancelarRelogio = null;
      assinantes.clear();
    },
  };
}
