/**
 * lib/orquestra/contrato.ts — o CONTRATO DE MOTOR. A Zaeon orquestra; os motores executam.
 *
 * Um motor é qualquer arquitetura de agente — a nossa (harness da Aura), as abertas (DeepSeek V4,
 * Kimi K2.6, Tongyi DeepResearch) ou um serviço Python que fale o mesmo contrato por HTTP
 * (research-engine, `motorHttp`). O que a Zaeon garante IGUAL para todos, seja quem for o motor:
 *
 *   1. o contexto do aluno entra pela Tarefa (memória, cartolina, TCC — montados pelo runChatTurn);
 *   2. as ferramentas são AS NOSSAS (CaixaDeFerramentas): bases acadêmicas reais, web, memória;
 *   3. toda evidência ganha uma CHAVE [E#] no registro da caixa, e o texto só pode citar chave que
 *      existe (portão de citação, estilo PaperQA — lib/orquestra/verificador);
 *   4. o prazo é de relógio e cancela de verdade (lib/orquestra/prazo);
 *   5. cada chamada de modelo vai pro TokenLedger com o id da tarefa (dá pra somar o custo de um
 *      enxame inteiro — antes nem o turno tinha id no ledger).
 *
 * O formato no shape do A2A (tarefa → eventos → artefato) é de propósito: um agente externo que já
 * fale A2A vira motor com um adaptador fino.
 */
import type { IntentId, Source, WorkKind } from "@/lib/agent/contracts";
import type { Plan } from "@/lib/plans";
import type { Prazo } from "@/lib/orquestra/prazo";

/** quem fez a arquitetura do motor (o rótulo que o aluno vê e que a arena compara) */
export type Origem = "zaeon" | "alibaba" | "deepseek" | "moonshot" | "outro";

/**
 * O FORMATO da execução — é ele, junto com o plano, que o roteador casa com a tarefa:
 *  - `unico`: um agente, poucas voltas (o chat de hoje);
 *  - `profundo`: um agente, muitas voltas (dezenas de chamadas de ferramenta);
 *  - `enxame`: um orquestrador que cria subagentes em paralelo, cada um com contexto isolado.
 */
export type Formato = "unico" | "profundo" | "enxame";

export type EventoOrquestra = { fase: string; rotulo: string; agente?: string };

/** Uma evidência no registro da tarefa. A `chave` ([E#]) é a ÚNICA forma de citá-la no texto. */
export type Evidencia = {
  chave: string;
  claim: string;
  source?: Source;
  ferramenta: string;
  agente: string;
};

export type UsoMotor = { promptTokens: number; completionTokens: number; chamadas: number; custoUsd: number };

export type Tarefa = {
  /** id da tarefa — 24 hex, pra caber no `taskId` (ObjectId) do TokenLedger */
  id: string;
  objetivo: string;
  intent: IntentId;
  kind?: WorkKind;
  /** systemContext já montado pelo turno (persona, memória, cartolina, TCC, anexos, fonte colada) */
  contexto?: string;
  historico: Array<{ role: string; text: string }>;
  plano: Plan;
};

export type ResultadoMotor = {
  /** markdown em pt-BR citando SÓ [E#] do registro */
  texto: string;
  evidencias: Evidencia[];
  uso: UsoMotor;
  modelos: string[];
  passos: number;
  subagentes: number;
  degradado: boolean;
  motivo?: string;
};

/** Uma ferramenta como o modelo a vê (JSON Schema do function-calling OpenAI-compatível). */
export type FerramentaVisivel = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

/** A ponte motor → ferramentas da Zaeon. Implementação em lib/orquestra/ferramentas. */
export interface CaixaDeFerramentas {
  visiveis(): FerramentaVisivel[];
  /** executa e devolve a OBSERVAÇÃO em texto (com as chaves [E#] novas); nunca lança */
  executar(nome: string, args: unknown, agente: string, prazo: Prazo): Promise<string>;
  evidencias(): Evidencia[];
  existe(chave: string): boolean;
  /** evidência vinda de FORA (motor HTTP) entra no registro com chave nossa; devolve chave de lá → chave daqui */
  importar(extras: Evidencia[]): Map<string, string>;
}

export type LedgerBase = {
  agentKey: string;
  surface: import("@/lib/llm/ledger").Surface;
  userId?: string | null;
  mentorSlug?: string | null;
  scopeId?: string | null;
};

export interface Execucao {
  prazo: Prazo;
  emitir(e: EventoOrquestra): void;
  caixa: CaixaDeFerramentas;
  ledger: LedgerBase;
  /** injetável (teste/arena); default = lib/orquestra/provedores chamarModelo */
  chamar: import("@/lib/orquestra/provedores").ChamarModelo;
  env: Record<string, string | undefined>;
  /** teto de subagentes do enxame NESTA tarefa (vem do plano) */
  maxSubagentes: number;
}

export interface Motor {
  id: string;
  nome: string;
  origem: Origem;
  formato: Formato;
  descricao: string;
  /** tem chave/endpoint configurado? Motor indisponível nunca é escolhido */
  disponivel(env: Record<string, string | undefined>): boolean;
  rodar(t: Tarefa, x: Execucao): Promise<ResultadoMotor>;
}

export const usoZero = (): UsoMotor => ({ promptTokens: 0, completionTokens: 0, chamadas: 0, custoUsd: 0 });
export function somarUso(a: UsoMotor, b: Partial<UsoMotor>): UsoMotor {
  return {
    promptTokens: a.promptTokens + (b.promptTokens ?? 0),
    completionTokens: a.completionTokens + (b.completionTokens ?? 0),
    chamadas: a.chamadas + (b.chamadas ?? 0),
    custoUsd: Math.round((a.custoUsd + (b.custoUsd ?? 0)) * 1e8) / 1e8,
  };
}

/** id de tarefa no formato ObjectId (24 hex) — é o que o `taskId` do TokenLedger aceita */
export function novoIdDeTarefa(): string {
  const bytes = new Uint8Array(12);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
