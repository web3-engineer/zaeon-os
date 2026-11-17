"use client";
/**
 * lib/ui/useTecladoAberto.ts — #837 · `true` enquanto um campo de texto está com o foco (no celular, é quando o
 * teclado está aberto). O laboratório esconde a barra de baixo nesse tempo: com o teclado, cada pixel de altura é da
 * conversa e da caixa de escrever.
 */
import { useEffect, useState } from "react";

function ehCampoDeTexto(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement) return !el.readOnly && !el.disabled;
  if (el instanceof HTMLInputElement) {
    const tipo = (el.type || "text").toLowerCase();
    return !el.readOnly && !el.disabled && ["text", "search", "email", "url", "tel", "password", "number"].includes(tipo);
  }
  return (el as HTMLElement).isContentEditable === true;
}

export function useTecladoAberto(ligado = true): boolean {
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    if (!ligado || typeof document === "undefined") { setAberto(false); return; }
    const sync = () => setAberto(ehCampoDeTexto(document.activeElement));
    sync();
    // focusout dispara antes do foco ir pro próximo campo: confere no tick seguinte
    const sair = () => setTimeout(sync, 0);
    document.addEventListener("focusin", sync);
    document.addEventListener("focusout", sair);
    return () => { document.removeEventListener("focusin", sync); document.removeEventListener("focusout", sair); };
  }, [ligado]);
  return aberto;
}
