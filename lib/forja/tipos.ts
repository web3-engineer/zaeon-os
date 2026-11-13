/**
 * lib/forja/tipos.ts — o MODELO UNIFICADO do motor "Repo → Curso" (a Forja). PURO.
 *
 * A ideia-mãe do dono: um motor modular, expansível e adaptável que transforma QUALQUER repositório
 * num curso interativo. Vários engines de análise (Graphify — Apache-2.0/MIT; Understand-Anything —
 * MIT; e futuros) são PROVEDORES que entregam a mesma forma unificada aqui; a Zaeon desenha o board,
 * ensina e cobra por cima. Este arquivo é o contrato entre os engines e a Sala de Estudos — nada dos
 * engines é copiado; a Forja só consome a SAÍDA deles (o grafo/árvore), normalizada para estes tipos.
 *
 * Duas superfícies no board (cards conectados em ordem, estilo n8n):
 *   entender (Understand-Anything, FIEL ao repo-base da skill → ensina, menos alucinação)
 *   → espelho (Graphify, MUTÁVEL → reflete o fork do aluno conforme ele implementa)
 *   → entregar (Octa: IDE + GitHub + publish).
 */

// ─────────────────────────────── grafo de conhecimento ───────────────────────────────

export type TipoNo = "pasta" | "arquivo" | "modulo" | "classe" | "funcao" | "dependencia" | "conceito";

/** Um nó do grafo: um pedaço do código (ou um conceito), com o quanto ele é central (`grau`). */
export type NoCodigo = {
  id: string;
  tipo: TipoNo;
  nome: string;
  caminho?: string;       // arquivo/pasta no repo
  /** centralidade: quantas arestas tocam o nó. O motor preenche; a temperatura usa pra decidir o que mostrar. */
  grau?: number;
  /** o engine de origem ("graphify" | "understand-anything" | …) — rastreabilidade e deduplicação. */
  fonte?: string;
};

export type TipoAresta = "importa" | "chama" | "define" | "contem" | "depende" | "referencia";

export type Aresta = { de: string; para: string; tipo: TipoAresta };

/** O grafo inteiro do repositório, normalizado (a saída de um ou mais provedores, fundida). */
export type GrafoConhecimento = {
  nos: NoCodigo[];
  arestas: Aresta[];
  /** id do nó-raiz (o repositório / entry point principal), se houver. */
  raiz?: string;
};

// ─────────────────────────────── árvore de entendimento ───────────────────────────────

/** Básico = fundações; Médio = o que faz funcionar; Avançado = arquitetura + todas as chamadas (scanner 100%). */
export type Temperatura = "basico" | "medio" | "avancado";

export const TEMPERATURAS: readonly Temperatura[] = ["basico", "medio", "avancado"] as const;

/**
 * Um nó da ÁRVORE de entendimento (a "tour" que o Understand-Anything monta): uma lição de leitura do
 * código, com o nível mínimo de temperatura em que ela aparece e os nós do grafo que ela cobre.
 */
export type NoEntendimento = {
  id: string;
  titulo: string;
  resumo: string;
  /** a partir de qual temperatura esta parte entra (básico aparece em todas; avançado só no avançado). */
  desde: Temperatura;
  /** nós do grafo que esta lição explica (refs, não cópias). */
  refs: string[];
  filhos: NoEntendimento[];
};

export type ArvoreEntendimento = { raiz: NoEntendimento };

// ─────────────────────────────── lições e board ───────────────────────────────

/** Os formatos de lição dentro de cada temperatura (quanto mais quente, mais cobra). */
export type TipoLicao = "leetcode" | "review" | "perguntas" | "teste" | "entrevista" | "codebox";

export const TIPOS_LICAO: readonly TipoLicao[] = ["leetcode", "review", "perguntas", "teste", "entrevista", "codebox"] as const;

export type Licao = {
  id: string;
  tipo: TipoLicao;
  titulo: string;
  temperatura: Temperatura;
  /** nós do grafo / entendimento que a lição exercita. */
  refs: string[];
  /** codebox: só digitação, cola bloqueada (a "boa e velha digitação" que o dono pediu). */
  semColar?: boolean;
};

/** Curso = hiper-detalhado (temperatura cheia + lições). Entregável = engines como BASE passiva. */
export type ModoEstudo = "curso" | "entregavel";

/** O papel de cada card-módulo do board (fluxo conectado, estilo n8n). */
export type PapelModulo = "entender" | "espelho" | "entregar";

export type ModuloBoard = {
  id: string;
  papel: PapelModulo;
  titulo: string;
  /** posição no fluxo (0, 1, 2…); o card N se conecta ao N-1. */
  ordem: number;
  /** no modo entregável, os cards de estudo entram como base passiva (não uso ativo). */
  passivo?: boolean;
};

/** A licença de um engine/repo estudado — preservada e exibida (atribuição obrigatória). */
export type Licenca = { spdx: string; titular?: string; url?: string };

/** Um esqueleto CURADO de estudo de repositório (o "nós curamos" do híbrido): vira um CursoRepo pronto. */
export type EsqueletoRepo = {
  id: string;
  /** o repo estudado: "owner/name". */
  repo: string;
  titulo: string;
  resumo: string;
  modo: ModoEstudo;
  /** a licença do repo estudado (atribuição preservada, somada às dos engines). */
  licenca?: Licenca;
  /** o conceito/arquétipo que o aluno aprende (ex.: "lista de tarefas"). */
  conceito?: string;
};

/** O curso inteiro que a Forja produz a partir de um repositório. */
export type CursoRepo = {
  /** o repo estudado: "owner/name" ou URL. */
  repo: string;
  modo: ModoEstudo;
  grafo: GrafoConhecimento;
  arvore: ArvoreEntendimento;
  modulos: ModuloBoard[];
  licoes: Licao[];
  /** licenças dos engines/repo (atribuição). */
  licencas: Licenca[];
};
