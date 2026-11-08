"use client";
/**
 * lib/plugins/chatPlugins.ts — os AGENTES que o aluno adicionou pelo Marketplace (vitrine de blueprints): eles
 * passam a aparecer no seletor do rosto do agente na sidebar (lib/agents/chatAgentes). Preferência por pessoa, no
 * navegador: adicionar/remover é instantâneo e não depende da moeda (ZAEON stable) estar no ar. Todo acesso ao storage é protegido: aba anônima ou storage bloqueado = nada plugado, sem quebrar.
 */
import { useEffect, useState } from "react";

/**
 * `eiffel-cad`: o Eiffel, engenharia civil e estrutural, com CAD paramétrico de verdade
 * (SolidCraft via MCP — docs/HANDOFF_EIFFEL_CAD.md). Plugável pela loja como o Octa, porque é
 * agente de ofício: quem não faz projeto não quer um CAD no seletor.
 */
// + os agentes da ORQUESTRA (lib/orquestra/catalogo), pelo mesmo trilho do Octa e do Eiffel
export type PluginChat = "octa-code" | "eiffel-cad" | import("@/lib/orquestra/catalogo").AgenteOrquestraId;
const CHAVE = "zaeon.chat.plugins";
const EVENTO = "zaeon:chat:plugins";

export function pluginsPlugados(): PluginChat[] {
  try { const v = JSON.parse(localStorage.getItem(CHAVE) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}

function gravar(lista: PluginChat[]) {
  try { localStorage.setItem(CHAVE, JSON.stringify(lista)); } catch { /* storage bloqueado: vale só nesta tela */ }
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: lista }));
}

export function plugar(id: PluginChat) { const l = pluginsPlugados(); if (!l.includes(id)) gravar([...l, id]); }
export function desplugar(id: PluginChat) { gravar(pluginsPlugados().filter((x) => x !== id)); }

/** Lista viva dos plugins (atualiza quando a vitrine pluga/desplugar, inclusive em outra aba). */
export function usePluginsChat(): PluginChat[] {
  const [lista, setLista] = useState<PluginChat[]>([]);
  useEffect(() => {
    setLista(pluginsPlugados());
    const atualizar = (e: Event) => setLista(((e as CustomEvent).detail as PluginChat[]) ?? pluginsPlugados());
    const storage = (e: StorageEvent) => { if (e.key === CHAVE) setLista(pluginsPlugados()); };
    window.addEventListener(EVENTO, atualizar);
    window.addEventListener("storage", storage);
    return () => { window.removeEventListener(EVENTO, atualizar); window.removeEventListener("storage", storage); };
  }, []);
  return lista;
}
