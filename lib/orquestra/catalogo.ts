/**
 * lib/orquestra/catalogo.ts — os AGENTES DA ORQUESTRA como o aluno os vê na Loja. PURO (cliente e servidor).
 *
 * Cada item é um motor de lib/orquestra/motores com cara de produto: quem fez, como trabalha, que plano
 * libera. O aluno PLUGA pela Loja (lib/plugins/chatPlugins, o mesmo trilho do Octa Code), o agente
 * aparece no seletor do chat, e o turno passa a PEDIR aquele motor à orquestra (lib/orquestra/roteador
 * `pedido`). A persona continua a da Aura — o motor muda o TRABALHO, não a voz; e conversa rápida
 * ("oi", dúvida de uma linha) segue com a Aura, que é instantânea.
 */
import type { Plan } from "@/lib/plans";

export type AgenteOrquestraId = "orq-deepseek" | "orq-tongyi" | "orq-qwen" | "orq-kimi" | "orq-enxame";

export type AgenteLoja = {
  id: AgenteOrquestraId;
  /** o motor em lib/orquestra/motores */
  motor: string;
  nome: string;
  laboratorio: string;
  /** ícone curto pro seletor e pra Loja (sem avatar 3D) */
  sigla: string;
  cor: string;
  formato: "profundo" | "enxame";
  resumo: string;
  comoTrabalha: string;
  minPlan: Plan;
};

export const AGENTES_ORQUESTRA: readonly AgenteLoja[] = [
  {
    id: "orq-deepseek", motor: "deepseek-v4-profundo", nome: "DeepSeek V4", laboratorio: "DeepSeek", sigla: "DS", cor: "#4D6BFE",
    formato: "profundo", minPlan: "pro",
    resumo: "Pesquisador profundo: dezenas de buscas encadeadas antes de escrever.",
    comoTrabalha: "Um agente que raciocina entre cada busca nas bases acadêmicas, na web e na base da Zaeon, e só escreve quando a evidência fecha.",
  },
  {
    id: "orq-tongyi", motor: "tongyi-deepresearch", nome: "Tongyi DeepResearch", laboratorio: "Alibaba", sigla: "TY", cor: "#FF6A00",
    formato: "profundo", minPlan: "pro",
    resumo: "Treinado para pesquisa de horizonte longo: vai fundo num tema só.",
    comoTrabalha: "Modelo aberto da Alibaba treinado por reforço pra pesquisa longa — muitas consultas, comparando fontes antes de concluir.",
  },
  {
    id: "orq-qwen", motor: "qwen-profundo", nome: "Qwen 3.5", laboratorio: "Alibaba", sigla: "QW", cor: "#615CED",
    formato: "profundo", minPlan: "pro",
    resumo: "O modelo aberto mais forte da Alibaba, pesquisando em profundidade.",
    comoTrabalha: "Qwen 3.5 em laço longo: planeja, busca nas bases acadêmicas e na base da Zaeon, compara e só então escreve.",
  },
  {
    id: "orq-kimi", motor: "kimi-enxame", nome: "Kimi K2.6 · enxame", laboratorio: "Moonshot AI", sigla: "KM", cor: "#16C2A3",
    formato: "enxame", minPlan: "pro",
    resumo: "Uma equipe: o Kimi divide o pedido e põe vários subagentes pesquisando ao mesmo tempo.",
    comoTrabalha: "O Kimi foi treinado pra decompor tarefas em partes paralelas; cada subagente pesquisa a sua com contexto próprio e o Kimi junta tudo. Pro: até 4 subagentes · Max: até 12.",
  },
  {
    id: "orq-enxame", motor: "enxame-misto", nome: "Enxame misto", laboratorio: "Zaeon", sigla: "ZX", cor: "#22D3EE",
    formato: "enxame", minPlan: "pro",
    resumo: "Laboratórios diferentes trabalhando juntos na mesma tarefa.",
    comoTrabalha: "Um orquestrador distribui as partes entre subagentes DeepSeek, Kimi e Qwen em rodízio — arquiteturas diferentes se completando. Pro: até 4 · Max: até 12.",
  },
];

export const ehAgenteOrquestra = (id: unknown): id is AgenteOrquestraId => AGENTES_ORQUESTRA.some((a) => a.id === id);
export const agenteOrquestra = (id: unknown): AgenteLoja | undefined => AGENTES_ORQUESTRA.find((a) => a.id === id);

/** id do seletor do chat → motor pedido à orquestra (ou null: agente comum). Aceita o id cru do cliente. */
export function motorDoAgenteChat(id: unknown): string | null {
  const v = typeof id === "string" ? id.trim().toLowerCase() : "";
  return agenteOrquestra(v)?.motor ?? null;
}

/** o plano mínimo pra um MOTOR pedido pelo aluno (motor fora do catálogo = só admin, nunca aluno) */
export function planoMinimoDoMotor(motor: string): Plan | null {
  return AGENTES_ORQUESTRA.find((a) => a.motor === motor)?.minPlan ?? null;
}
