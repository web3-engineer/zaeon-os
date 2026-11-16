"use client";
/**
 * lib/ui/useFecharNoVoltar.ts — #832 · o ◀ do Android (e o "voltar" do navegador) FECHA o painel aberto.
 *
 * Nenhum painel entrava no histórico: o ◀ saía da página (ou fechava o app instalado) com um detalhe ou a gaveta
 * abertos. Aberto, o painel põe UMA entrada no histórico (mesmo endereço, só uma marca no `state`); o voltar consome
 * essa entrada e chama `fechar`. Fechado por outro caminho (✕, Esc, clique fora — `aberto` vira false), a entrada que
 * sobrou sai com um `history.back()`.
 *
 * - Vários abertos ao mesmo tempo: cada um tem a sua marca, e só fecha quem perdeu a marca — o voltar fecha o de cima.
 * - Uma entrada que não dá pra tirar na hora (o painel fechou com outro por cima dele, ou o componente desmontou numa
 *   troca de tela, que não pode virar um "voltar") fica MORTA: quando o histórico cair nela, ela é pulada.
 * - A entrada é posta no tick seguinte: o efeito duplo do StrictMode (dev) cancela antes e não deixa entrada órfã.
 */
import { useEffect, useRef } from "react";

const CHAVE = "zaeonPainel";

function marcaAtual(): string | undefined {
  const s = window.history.state as Record<string, unknown> | null;
  return typeof s?.[CHAVE] === "string" ? (s[CHAVE] as string) : undefined;
}

/** as marcas no histórico, da mais antiga à mais nova (as mortas também, até serem puladas) — quem está embaixo da
 *  entrada atual continua aberto */
const pilha: string[] = [];
/** entradas de painéis que já fecharam mas ficaram no histórico: pular quando o voltar/avançar cair nelas */
const mortas = new Set<string>();
let pulandoMortas = false;
function pularMortas() {
  const m = marcaAtual();
  if (!m || !mortas.has(m)) return;
  // no tick seguinte: os outros ouvintes deste mesmo popstate ainda veem a entrada como morta (e a ignoram)
  window.setTimeout(() => {
    if (marcaAtual() !== m) return;
    mortas.delete(m);
    const i = pilha.indexOf(m);
    if (i >= 0) pilha.splice(i, 1);
    window.history.back();
  }, 0);
}

export function useFecharNoVoltar(aberto: boolean, fechar: () => void): void {
  const f = useRef(fechar);
  f.current = fechar;
  // lido na limpeza do efeito: false = fechou de propósito; ainda true = desmontou aberto (troca de tela)
  const abertoAgora = useRef(aberto);
  abertoAgora.current = aberto;

  useEffect(() => {
    if (typeof window === "undefined" || pulandoMortas) return;
    pulandoMortas = true;
    window.addEventListener("popstate", pularMortas);
  }, []);

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
      // fechou pelo ✕/Esc e a entrada é a de cima: tira ela. Senão (outro painel por cima, ou desmontou numa troca de
      // tela — voltar ali desfaria a navegação), ela fica marcada pra ser pulada.
      if (!abertoAgora.current && marcaAtual() === minha) {
        pilha.splice(pilha.indexOf(minha), 1);
        window.history.back();
      } else mortas.add(minha);   // fica na pilha (a ordem importa) até ser pulada
    };
  }, [aberto]);
}
