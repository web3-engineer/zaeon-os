"use client";
/**
 * lib/ui/useTecladoAberto.ts — #837 · `true` enquanto o teclado do celular está aberto. O laboratório esconde a barra
 * de baixo nesse tempo: com o teclado, cada pixel de altura é da conversa e da caixa de escrever.
 *
 * #845: só "campo de texto com o foco" não basta — o Android devolve o foco à caixa SEM abrir o teclado (ao voltar
 * pro app, numa troca rápida de tela), e a barra sumia com a tela inteira livre. Agora é preciso as duas coisas:
 * um campo com o foco E a tela encolhida (o teclado ocupa a parte de baixo: a `visualViewport` fica bem mais baixa
 * que a maior altura já vista). Sem `visualViewport` (navegador antigo, testes), vale só o foco, como antes.
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

/** a tela encolheu o bastante pra ser o teclado (e não a barra do navegador indo e vindo)? */
export const ENCOLHEU = 0.8;
export function telaEncolhida(altura: number, maiorAltura: number): boolean {
  return maiorAltura > 0 && altura < maiorAltura * ENCOLHEU;
}

export function useTecladoAberto(ligado = true): boolean {
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    if (!ligado || typeof document === "undefined") { setAberto(false); return; }
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    // a maior altura vista NESTA largura (girar o celular muda tudo: recomeça)
    let largura = vv?.width ?? 0;
    let maior = vv?.height ?? 0;
    const sync = () => {
      const campo = ehCampoDeTexto(document.activeElement);
      if (!vv) { setAberto(campo); return; }
      if (Math.abs(vv.width - largura) > 1) { largura = vv.width; maior = vv.height; }
      maior = Math.max(maior, vv.height);
      setAberto(campo && telaEncolhida(vv.height, maior));
    };
    sync();
    // focusout dispara antes do foco ir pro próximo campo: confere no tick seguinte
    const sair = () => setTimeout(sync, 0);
    const voltou = () => { if (document.visibilityState === "visible") sync(); };
    document.addEventListener("focusin", sync);
    document.addEventListener("focusout", sair);
    document.addEventListener("visibilitychange", voltou);
    vv?.addEventListener("resize", sync);
    return () => {
      document.removeEventListener("focusin", sync);
      document.removeEventListener("focusout", sair);
      document.removeEventListener("visibilitychange", voltou);
      vv?.removeEventListener("resize", sync);
    };
  }, [ligado]);
  return aberto;
}
