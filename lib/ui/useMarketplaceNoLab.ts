"use client";
/**
 * lib/ui/useMarketplaceNoLab.ts — #824 · o laboratório e o item "Marketplace" do menu principal sempre de acordo.
 *
 * - o ENDEREÇO manda: abrir por /marketplace (`?aba=marketplace`) abre a vitrine; voltar/avançar no navegador
 *   (`popstate`) reconcilia a aba com o endereço;
 * - o menu pede pra SAIR: clicar em "Laboratório" com a vitrine aberta (`EVT_SAIR_MARKETPLACE`) volta pra conversa —
 *   o link vai pra mesma página, então sem isto o laboratório ficaria parado na vitrine;
 * - o laboratório AVISA o menu (`avisarMarketplace`) e deixa o endereço igual à aba (`comMarketplace`, sem empilhar
 *   histórico) — recarregar cai no mesmo lugar.
 *
 * `noMarketplace` = a Sala de Estudos está aberta na aba da vitrine; `irEstudos` = trocar a aba da Sala.
 */
import { useEffect, useRef } from "react";
import type { AbaEstudos } from "@/lib/chat/conversasNav";
import { EVT_SAIR_MARKETPLACE, avisarMarketplace, comMarketplace, pedeMarketplace } from "./marketplaceRota";

export function useMarketplaceNoLab(noMarketplace: boolean, irEstudos: (aba: AbaEstudos) => void): void {
  const estado = useRef(noMarketplace);
  estado.current = noMarketplace;
  const ir = useRef(irEstudos);
  ir.current = irEstudos;
  // o endereço pediu a vitrine e a Sala ainda não chegou nela: não apagar o pedido do endereço nesse meio-tempo
  const pendente = useRef(false);

  useEffect(() => {
    const doEndereco = () => {
      const pede = pedeMarketplace(window.location.search);
      if (pede && !estado.current) { pendente.current = true; ir.current("community"); }
      else if (!pede && estado.current) ir.current("meus-estudos");
    };
    const sair = () => { pendente.current = false; if (estado.current) ir.current("meus-estudos"); };
    doEndereco();
    window.addEventListener("popstate", doEndereco);
    window.addEventListener(EVT_SAIR_MARKETPLACE, sair);
    return () => {
      window.removeEventListener("popstate", doEndereco);
      window.removeEventListener(EVT_SAIR_MARKETPLACE, sair);
      avisarMarketplace(false);
    };
  }, []);

  useEffect(() => {
    if (noMarketplace) pendente.current = false;
    avisarMarketplace(noMarketplace || pendente.current);
    if (!noMarketplace && pendente.current) return;
    const q = comMarketplace(window.location.search, noMarketplace);
    if (q !== window.location.search) {
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${q}${window.location.hash}`);
    }
  }, [noMarketplace]);
}
