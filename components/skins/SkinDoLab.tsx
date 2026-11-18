"use client";
/**
 * SkinDoLab — veste o laboratório com a skin da pessoa (lib/skins). Montado na raiz do laboratório: põe
 * `data-skin` no <html> (assim modais em portal e a barra do topo acompanham) e TIRA ao sair — fora do
 * laboratório as cores são sempre as originais. Não desenha nada.
 * Ordem: o navegador primeiro (sem piscar); depois a conta, que manda se a pessoa escolheu noutro aparelho.
 */
import { useEffect } from "react";
import { skinValida } from "@/lib/skins/paletas";
import { CHAVE_SKIN, EVT_SKIN, adotarSkinDaConta, aplicarSkin, lerSkinLocal, skinDaConta } from "@/lib/skins/preferencia";

export default function SkinDoLab() {
  useEffect(() => {
    let vivo = true;
    /** a pessoa mexeu DEPOIS de abrir? então a resposta atrasada da conta não desfaz a escolha dela */
    let mexeu = false;
    aplicarSkin(lerSkinLocal());

    void skinDaConta().then((daConta) => {
      if (!vivo || mexeu || !daConta) return;
      adotarSkinDaConta(daConta);
      aplicarSkin(daConta);
    });

    const aoEscolher = (e: Event) => { mexeu = true; aplicarSkin(skinValida((e as CustomEvent).detail)); };
    // outra aba trocou a skin: esta acompanha
    const aoGuardar = (e: StorageEvent) => { if (e.key === CHAVE_SKIN || e.key === null) { mexeu = true; aplicarSkin(lerSkinLocal()); } };
    window.addEventListener(EVT_SKIN, aoEscolher);
    window.addEventListener("storage", aoGuardar);
    return () => {
      vivo = false;
      window.removeEventListener(EVT_SKIN, aoEscolher);
      window.removeEventListener("storage", aoGuardar);
      aplicarSkin(null);
    };
  }, []);
  return null;
}
