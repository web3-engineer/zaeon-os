/**
 * lib/agents/agenteEscolhido.ts — QUEM o aluno escolheu no seletor, do ponto de vista do chat.
 *
 * O seletor mora em `app/research-lab/page.tsx` e guarda a escolha em `CHAVE_AGENTE`
 * (lib/research/zaeonEventos). O chat (`components/study/StudyCoworkChat`) mora em OUTRA tela
 * (app/workstation/student/StudyRoomContent, app/zz-cyber/estudos) — então o localStorage é o
 * contrato entre as duas, e já era: `personaSalva()` lê a mesma chave pro avatar do painel.
 *
 * O que faltava era este lado: o chat lia a escolha pro ROSTO e nunca pra CONVERSA. Por isso o
 * seletor "não trocava de agente" — ele trocava a cara.
 *
 * O Octa Code cai na Aura DE PROPÓSITO: a tela dele é a IDE (`tela: "ide"` em chatAgentes), e no
 * chat quem fala é a Aura. É a mesma regra que `agenteNaTela` já aplica — aqui ela vale pra todas as
 * telas de conversa, não só pra "sala-de-estudos".
 */
import { AGENTES_CHAT, type AgenteChatId } from "@/lib/agents/chatAgentes";
import { CHAVE_AGENTE } from "@/lib/research/zaeonEventos";

/** O agente que FALA no chat. PURA: recebe o que estava guardado e devolve um id válido. */
export function agenteDoChat(salvo: string | null | undefined): AgenteChatId {
  const achado = AGENTES_CHAT.find((a) => a.id === salvo);
  if (!achado) return "aura";               // nada salvo, ou id que não existe mais
  return achado.tela === "ide" ? "aura" : achado.id; // Octa abre IDE; no chat é a Aura
}

/** O mesmo, lendo o armazém do navegador. Storage bloqueado (aba privada) = Aura, nunca erro. */
export function agenteDoChatSalvo(): AgenteChatId {
  try { return agenteDoChat(localStorage.getItem(CHAVE_AGENTE)); } catch { return "aura"; }
}
