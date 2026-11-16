"use client";
/**
 * lib/ui/useFecharNoVoltar.ts — #832 · o ◀ do Android (e o "voltar" do navegador) FECHA o painel aberto.
 *
 * Nenhum painel entrava no histórico: o ◀ saía da página (ou fechava o app instalado) com um detalhe ou a gaveta
 * abertos. Aberto, o painel põe UMA entrada no histórico (mesmo endereço, só uma marca no `state`); o voltar consome
 * essa entrada e chama `fechar`. Fechado por outro caminho (✕, Esc, clique fora), a entrada que sobrou sai com um
 * `history.back()`.
 *
 * Vários abertos ao mesmo tempo: cada um tem a sua marca, e só fecha quem perdeu a marca — o voltar fecha o de cima.
 * A entrada é posta no tick seguinte: o efeito duplo do StrictMode (dev) cancela antes e não deixa entrada órfã.
 */
import { useEffect, useRef } from "react";

const CHAVE = "zaeonPainel";

function marcaAtual(): string | undefined {
  const s = window.history.state as Record<string, unknown> | null;
  return typeof s?.[CHAVE] === "string" ? (s[CHAVE] as string) : undefined;
}

/** as marcas abertas, da mais antiga à mais nova — quem está embaixo de uma marca viva continua aberto */
const pilha: string[] = [];

export function useFecharNoVoltar(aberto: boolean, fechar: () => void): void {
  const f = useRef(fechar);
  f.current = fechar;

  useEffect(() => {
    if (!aberto || typeof window === "undefined") return;
    const minha = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    let posta = false;
    let saiuPeloVoltar = false;

    const t = window.setTimeout(() => {
      window.history.pushState({ ...((window.history.state as object | null) ?? {}), [CHAVE]: minha }, "");
      pilha.push(minha);
      posta = true;
    }, 0);

    const aoVoltar = () => {
      if (!posta || saiuPeloVoltar) return;
      const atual = marcaAtual();
      // ainda na minha entrada, ou numa acima da minha (outro painel por cima): continuo aberto
      if (atual === minha) return;
      if (atual && pilha.indexOf(atual) > pilha.indexOf(minha)) return;
      saiuPeloVoltar = true;
      pilha.splice(pilha.indexOf(minha), 1);
      f.current();
    };
    window.addEventListener("popstate", aoVoltar);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("popstate", aoVoltar);
      if (!posta || saiuPeloVoltar) return;
      const i = pilha.indexOf(minha);
      if (i >= 0) pilha.splice(i, 1);
      // fechou pelo ✕/Esc: tira a entrada que sobrou (só se ela ainda for a de cima)
      if (marcaAtual() === minha) window.history.back();
    };
  }, [aberto]);
}
