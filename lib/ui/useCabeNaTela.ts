"use client";
/**
 * lib/ui/useCabeNaTela.ts — #850 · um popover preso a um botão (`absolute left-0`) não pode sair da tela.
 *
 * No celular, as notificações do escritório (sino) abriam a partir do sino com 340 px e ficavam 188 px fora da tela;
 * a lista de escritórios passava 44 px da borda e escondia o 🗑 e o "+". Aberto, o popover é medido e empurrado
 * pra dentro (com 8 px de folga dos dois lados) — no computador, onde já cabe, nada muda.
 */
import { useLayoutEffect, type RefObject } from "react";

export const FOLGA = 8;

/** Quanto mover pra caber: positivo = pra direita, negativo = pra esquerda. */
export function deslocamentoPraCaber(esquerda: number, direita: number, larguraTela: number, folga = FOLGA): number {
  if (direita > larguraTela - folga) {
    const dx = larguraTela - folga - direita;
    return esquerda + dx < folga ? folga - esquerda : dx;
  }
  return esquerda < folga ? folga - esquerda : 0;
}

export function useCabeNaTela(ref: RefObject<HTMLElement | null>, aberto: boolean): void {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!aberto || !el || typeof window === "undefined") return;
    const ajustar = () => {
      el.style.translate = "";
      const r = el.getBoundingClientRect();
      const dx = deslocamentoPraCaber(r.left, r.right, window.innerWidth);
      if (dx) el.style.translate = `${Math.round(dx)}px 0`;
    };
    ajustar();
    window.addEventListener("resize", ajustar);
    return () => window.removeEventListener("resize", ajustar);
  }, [ref, aberto]);
}
