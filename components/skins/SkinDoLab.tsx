"use client";
/**
 * SkinDoLab — veste o laboratório com a skin da pessoa (lib/skins). Não desenha nada.
 *  - Laboratório em tela cheia (/research-lab): põe `data-skin` no <html>, assim os modais em portal e a barra
 *    do topo acompanham; TIRA ao sair — fora do laboratório as cores são sempre as originais.
 *  - Laboratório EMBUTIDO (dentro da workstation, no mesmo documento): passa `escopo` com a raiz do laboratório
 *    e a marca fica só nela — a workstation em volta não muda de cor.
 * Ordem: o navegador primeiro (sem piscar); depois acerta com a conta (lib/skins/preferencia).
 */
import { useEffect, type RefObject } from "react";
import { skinValida } from "@/lib/skins/paletas";
import { CHAVE_SKIN, EVT_SKIN, aplicarSkin, lerSkinLocal, reconciliarComAConta } from "@/lib/skins/preferencia";

export default function SkinDoLab({ escopo }: { escopo?: RefObject<HTMLElement | null> }) {
  useEffect(() => {
    const alvo = escopo ? escopo.current : null;
    if (escopo && !alvo) return;   // embutido, mas a raiz ainda não existe: melhor nada do que pintar a página toda
    aplicarSkin(lerSkinLocal(), alvo);
    // escolha em Configurações ou adoção da conta: os dois avisam pelo mesmo evento
    const aoMudar = (e: Event) => aplicarSkin(skinValida((e as CustomEvent).detail), alvo);
    // outra aba trocou a skin: esta acompanha
    const aoGuardar = (e: StorageEvent) => { if (e.key === CHAVE_SKIN || e.key === null) aplicarSkin(lerSkinLocal(), alvo); };
    window.addEventListener(EVT_SKIN, aoMudar);
    window.addEventListener("storage", aoGuardar);
    void reconciliarComAConta();
    return () => {
      window.removeEventListener(EVT_SKIN, aoMudar);
      window.removeEventListener("storage", aoGuardar);
      aplicarSkin(null, alvo);
    };
  }, [escopo]);
  return null;
}
