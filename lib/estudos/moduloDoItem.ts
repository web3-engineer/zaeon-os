/**
 * lib/estudos/moduloDoItem.ts — o ROTEADOR da Sala de Estudos modular.
 *
 * O dono foi enfático: a experiência de uma skill/curso é única e acontece NA SALA DE ESTUDOS, com
 * o módulo certo pra cada tipo — não tudo jogado no chat. Este módulo é a decisão pura "card → qual
 * módulo", a partir da FAMÍLIA da skill e de ter (ou não) um repositório de código:
 *
 *   · "board"  — curso de CÓDIGO (família `course`, ou qualquer skill com `repo`): abre o board da
 *                Forja (graphify + cards interligados + understand-anything) sobre o repo.
 *   · "device" — app de dispositivo (família `device`): painel de download (espelho) + instruções.
 *   · "agente" — skill de saída única (família `agentic`, ou procedimento sem código): o agente roda
 *                e mostra o artefato.
 *
 * PURO e testável (opera sobre o `CardDaSkill`, sem tocar disco). O resultado é gravado no
 * `ItemVitrine.modulo` em `itemDaSkill`, pra o roteamento no cliente ser um simples `switch`.
 */
import type { CardDaSkill } from "@/lib/agent/skills-dir";

export type ModuloEstudo = "board" | "device" | "agente";

/** O módulo que uma skill abre na Sala de Estudos. PURA. */
export function moduloDaSkill(card: Pick<CardDaSkill, "familia" | "repo">): ModuloEstudo {
  if (card.familia === "device") return "device";                  // app de dispositivo: nunca board/chat
  if (card.familia === "course") return "board";                   // curso autoral de código
  if (card.familia === "procedimento" && card.repo) return "board"; // lib de código com repo (astropy, pandas…)
  return "agente";                                                 // agentic, procedimento sem repo, pago
}
