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
 * - #845: o "voltar" de um painel fechando (o Menu do celular, depois de tocar em "Marketplace") não é a pessoa
 *   voltando: a aba fica, e o endereço acompanha a aba. E trocar o endereço em cima da marca de um painel tira a marca
 *   (`estadoSemPainel`), senão o painel, ao fechar, desfazia a ida pro Marketplace.
 *
 * `noMarketplace` = a Sala de Estudos está aberta na aba da vitrine; `irEstudos` = trocar a aba da Sala.
 */
import { useEffect, useRef } from "react";
import type { AbaEstudos } from "@/lib/chat/conversasNav";
import { EVT_SAIR_MARKETPLACE, avisarMarketplace, comMarketplace, pedeMarketplace } from "./marketplaceRota";
import { estadoSemPainel, voltaDePainel } from "./useFecharNoVoltar";

/** deixa o endereço igual à aba, sem empilhar histórico (e sem a marca de painel, se houver) */
function alinharEndereco(noMarketplace: boolean) {
  const q = comMarketplace(window.location.search, noMarketplace);
  if (q !== window.location.search) {
    window.history.replaceState(estadoSemPainel(window.history.state), "", `${window.location.pathname}${q}${window.location.hash}`);
  }
}

export function useMarketplaceNoLab(noMarketplace: boolean, irEstudos: (aba: AbaEstudos) => void): void {
  const estado = useRef(noMarketplace);
  estado.current = noMarketplace;
  const ir = useRef(irEstudos);
  ir.current = irEstudos;
  // o endereço pediu a vitrine e a Sala ainda não chegou nela: não apagar o pedido do endereço nesse meio-tempo
  const pendente = useRef(false);

  useEffect(() => {
    const doEndereco = () => {
      // um painel fechou (não foi a pessoa voltando): a aba manda e o endereço acompanha
      if (voltaDePainel()) { alinharEndereco(estado.current || pendente.current); return; }
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
    alinharEndereco(noMarketplace);
  }, [noMarketplace]);
}
