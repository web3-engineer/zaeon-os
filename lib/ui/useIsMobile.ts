"use client";
/**
 * `true` em tela de celular (≤ 767px). SSR-safe: o estado inicial é SEMPRE `false` (o que o
 * servidor renderiza), e só no mount sincroniza com o matchMedia — sem hydration mismatch.
 * Segue a mudança de tamanho (girar o aparelho, redimensionar a janela).
 */
import { useEffect, useState } from "react";

export const QUERY_MOBILE = "(max-width: 767px)";
/** #832: o celular DEITADO passa de 767 px de largura, mas é baixo e de toque — o layout de computador não cabia
 *  (nenhuma linha de conversa). Use só onde a tela de celular serve deitada também (o laboratório). */
export const QUERY_CELULAR_DEITADO = "(max-height: 500px) and (pointer: coarse)";
export const QUERY_CELULAR = `${QUERY_MOBILE}, ${QUERY_CELULAR_DEITADO}`;

export function useIsMobile(query: string = QUERY_MOBILE): boolean {
  const [m, setM] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(query);
    const sync = () => setM(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [query]);
  return m;
}
