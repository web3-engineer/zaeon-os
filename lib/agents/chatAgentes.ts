/**
 * lib/agents/chatAgentes.ts — os agentes que ocupam a aba de conversa do lab (o rosto na sidebar). Clicar no rosto
 * abre o seletor; cada agente tem a SUA tela: a Aura, a Zenita e a Nina são o chat da Sala de Estudos (cada uma com o
 * seu AVATAR no painel dos documentos — lib/research/zaeonEventos), o Octa Code é a IDE dele (sem avatar).
 * Agente de vitrine (Marketplace) só aparece no seletor depois de adicionado lá. PURO.
 */
import type { PluginChat } from "@/lib/plugins/chatPlugins";

export type AgenteChatId = "aura" | "zenita" | "nina" | "octa";
export type AgenteChat = {
  id: AgenteChatId;
  nome: string;
  papel: string;
  /** a tela que o agente abre no lab */
  tela: "chat" | "ide";
  /** vem do Marketplace: só aparece depois de adicionado */
  plugin?: PluginChat;
};

export const AGENTES_CHAT: readonly AgenteChat[] = [
  { id: "aura", nome: "Aura", papel: "Estudos, pesquisa e conversa", tela: "chat" },
  { id: "zenita", nome: "Zenita", papel: "Agenda, aulas e provas", tela: "chat" },
  { id: "nina", nome: "Nina", papel: "Caderno, resumos e plano de estudo", tela: "chat" },
  { id: "octa", nome: "Octa Code", papel: "Agente de código · IDE", tela: "ide", plugin: "octa-code" },
];

export const agenteChat = (id: AgenteChatId): AgenteChat => AGENTES_CHAT.find((a) => a.id === id) ?? AGENTES_CHAT[0];

/** Quem aparece no seletor: os nativos + os adicionados pelo Marketplace. */
export function agentesDisponiveis(plugados: readonly PluginChat[]): AgenteChat[] {
  return AGENTES_CHAT.filter((a) => !a.plugin || plugados.includes(a.plugin));
}

/** O agente salvo continua valendo? (se o Octa foi removido no Marketplace, volta pra Aura) */
export function agenteValido(id: string | null | undefined, plugados: readonly PluginChat[]): AgenteChatId {
  return agentesDisponiveis(plugados).find((a) => a.id === id)?.id ?? "aura";
}

/** #666: o agente que está na tela. O de IDE (Octa) só vale fora do chat: na Sala de Estudos, quem está na tela é a Aura. */
export function agenteNaTela(id: AgenteChatId, aba: string): AgenteChatId {
  return agenteChat(id).tela === "ide" && aba === "sala-de-estudos" ? "aura" : id;
}
