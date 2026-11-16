"use client";
/**
 * O lugar dos ESTUDOS (os blueprints da Sala de Estudos) na sidebar PRINCIPAL do laboratório — o mesmo desenho das
 * conversas (components/chat/ConversasSlot): a página põe um <div> vazio embaixo de "Sala de Estudos" e o publica aqui;
 * a Sala (components/blueprint/SalaBlueprint) desenha a lista lá por portal, e o estado continua nela. Com isso o board
 * fica limpo — sem a fileira de seletores no topo.
 * Sem provedor (workstation embutida, testes) a Sala desenha o seletor no topo do board, como antes.
 */
import { createContext, useContext } from "react";

export const BlueprintsSlotContext = createContext<{ el: HTMLElement | null } | null>(null);

/** `undefined` = não há sidebar principal (desenhe no board); `null` = há, mas o lugar ainda não montou (não desenhe) */
export function useBlueprintsSlot(): HTMLElement | null | undefined {
  const ctx = useContext(BlueprintsSlotContext);
  return ctx ? ctx.el : undefined;
}
