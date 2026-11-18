"use client";

/**
 * useGuia — liga o MOTOR do guia (lib/guia/motor, puro) ao navegador: cria o motor, toca o relógio, e
 * escuta a atividade do aluno distinguindo DIGITOU de COLOU de CLICOU (a semente da variedade de
 * comportamento). Devolve o nudge corrente (pra o avatar mostrar) e `enviar` (pra a página mandar
 * sinais ricos: objetivo iniciou/alcançou, trocou de fase, tocou uma nota).
 *
 * A escuta global é opcional: numa lição a própria página costuma mandar sinais mais precisos.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { criarGuia, type Guia } from "./motor";
import { ociosidade } from "./comportamentos/ociosidade";
import type { Comportamento, FonteAtividade, Nudge, Sinal } from "./tipos";

export type OpcoesUseGuia = {
  comportamentos?: Comportamento[];
  faseInicial?: string | null;
  /** escutar teclado/colagem/clique na janela inteira (default true). */
  escutaGlobal?: boolean;
  tickMs?: number;
};

export function useGuia(opts: OpcoesUseGuia = {}) {
  const [nudge, setNudge] = useState<Nudge | null>(null);
  const guiaRef = useRef<Guia | null>(null);
  if (!guiaRef.current) {
    guiaRef.current = criarGuia({
      comportamentos: opts.comportamentos ?? [ociosidade()],
      faseInicial: opts.faseInicial ?? null,
      tickMs: opts.tickMs,
    });
  }

  useEffect(() => {
    const g = guiaRef.current!;
    const off = g.assinar(setNudge);
    g.iniciar();
    return () => { off(); g.parar(); };
  }, []);

  useEffect(() => {
    if (opts.escutaGlobal === false) return;
    const g = guiaRef.current!;
    const ativ = (fonte: FonteAtividade) => g.enviar({ tipo: "atividade", fonte, em: Date.now() });
    // keydown que NÃO é auto-repeat = o aluno digitou de fato.
    const onKey = (e: KeyboardEvent) => { if (!e.repeat) ativ("digitou"); };
    const onPaste = () => ativ("colou");
    const onPointer = () => ativ("clicou");
    const onScroll = () => ativ("rolou");
    window.addEventListener("keydown", onKey);
    window.addEventListener("paste", onPaste);
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [opts.escutaGlobal]);

  const enviar = useCallback((s: Sinal) => guiaRef.current?.enviar(s), []);
  return { nudge, enviar };
}
