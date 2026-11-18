/**
 * lib/agent/contracts.ts — PR01 do runbook (§13.1). Os CONTRATOS do harness da Aura
 * como código: intenção → modo/schema/tools/crítico. Fonte-da-verdade dos TIPOS.
 * Fiel ao docs/AURA_AGENTIC_LAYER_PLAN.md §8 (IntentRegistry, StructuredAnswer,
 * ExaminerVerdict), §8.8 (AcademicMode) e §11.4 (execMode). Zero comportamento aqui —
 * só tipos + a tabela INTENTS + helpers puros. Importe daqui; não reinvente.
 */

// ─────────────────────────── Dimensões de execução ───────────────────────────

/** Compute adaptativo (§7.4). quick = 1 tiro; elaborated = laço leve; research = estágios. */
export type Mode = "quick" | "elaborated" | "research";

/** Escopo acadêmico por sala (§8.8). enforced = só fonte acadêmica; flexible = geral. */
export type AcademicMode = "enforced" | "flexible";

/** Modo de execução (§11.4). auto = ponta-a-ponta; guiado = pausa nos gates HITL. */
export type ExecMode = "auto" | "guiado";

/** Dado a superfície/sala ativa, resolve o modo acadêmico. Pesquisa = enforced; resto = flexible. */
export function academicModeForSurface(surface?: string | null): AcademicMode {
  return surface === "pesquisa" ? "enforced" : "flexible";
}

// ─────────────────────────── Saída estruturada (§8.2) ───────────────────────────

export type Source = { title: string; url?: string; authors?: string; year?: number };
export type WorkKind = "estudo" | "pesquisa" | "artigo" | "tcc" | "relatorio" | "aula";

/** Referência a um artefato do Studio embutido na resposta (cada um com provenance). */
export type StudioRef = {
  studioKind: string;      // guide | mindmap | timeline | flashcards | faq | image | podcast | video
  title?: string;
  artifactId?: string;
  /**
   * O aluno PEDIU este artefato com todas as letras (intent gerar_artefato), em vez de
   * ele ter nascido do assunto. Muda só uma coisa: se falhar, pedido explícito merece
   * aviso; artefato que a Aura trouxe por conta própria falha calado — ninguém pediu,
   * ninguém precisa saber.
   */
  explicito?: boolean;
  provenance?: ProvenanceRecord;
};

/** PROVENANCE (open-science, §8.2/10.1-10.2): todo artefato/afirmação rastreia origem. */
export type ProvenanceRecord = {
  by: string;            // agente que gerou (StudentAgent.id)
  intent: IntentId;      // intenção que disparou
  toolsUsed: string[];   // tools/skills chamadas (slugs)
  sources: Source[];     // fontes consultadas (literatura/memória/caderno)
  model: string;         // modelo + versão (ex.: "gemini-flash@2026-07")
  at: string;            // ISO timestamp
  traceId: string;       // liga ao AuraTrajectory / aos AgentStep do action bus
  inputsHash?: string;   // hash dos inputs (reprodutibilidade)
};

/**
 * Uma expressão que merece sair do meio da frase e virar objeto na página: fórmula
 * química, equação, definição curta. Vem em LaTeX porque é a notação que o modelo já
 * sabe escrever e que o KaTeX sabe desenhar.
 *
 * O contrato com o modelo é de EXTRAÇÃO, não de estilo: ele diz quais expressões a
 * resposta menciona; quem decide se viram destaque, e como, é o código. Mesmo padrão
 * do `substancias` → molécula, que é o que funcionou.
 */
export type Destaque = {
  latex: string;            // "C_8H_{10}N_4O_2", "E = mc^2"
  rotulo?: string;          // legenda curta ("cafeína", "energia de repouso")
};

import type { FalhaVisivel } from "@/lib/agent/falhas";
import type { GraficoNaResposta } from "@/lib/agent/graficosDoTurno";
import type { FonteVerificada } from "@/lib/tcc/store";

export type StructuredAnswer = {
  nucleo: string;                                   // resposta direta (sempre)
  /**
   * O RASCUNHO FALHOU e o `nucleo` é a mensagem de erro honesta (messageForError), não uma resposta. Vem do CÓDIGO
   * (aura-harness), nunca do modelo. Existe porque a falha virava "sucesso": o turno seguia, o crítico via um texto
   * curto e — com CACHE_RESPOSTAS — "Demorou demais pra responder…" (58 caracteres) passava no `respostaGuardavel`
   * e era servido depois como RESPOSTA a outros alunos. Com o campo, a trajetória marca `degraded` (sem cache).
   */
  rascunhoFalhou?: boolean;
  desenvolvimento?: string;                         // derivação / passo a passo
  conceitos?: string[];                             // âncoras do tema
  evidencia?: { claim: string; source: Source }[];  // afirmações COM fonte (deriva do L3/memory)
  proximos_passos?: string[];                       // artefato sugerido / o que estudar
  destaques?: Destaque[];                           // expressões que viram objeto na página
  artifacts?: StudioRef[];                          // Studio gerados (cada um com provenance)
  work?: { kind: WorkKind; sections: { title: string; body: string }[] }; // criar_trabalho
  sources?: Source[];                               // pesquisar_fontes
  /** buscar_livro: os livros achados e o caminho LEGAL (PDF livre, online, empréstimo, prévia). */
  livros?: { titulo: string; autores: string[]; ano: number | null; acesso: string; pdfUrl: string | null; lerUrl: string | null; paginaUrl: string; fonte: string; licenca: string | null }[];
  provenance?: ProvenanceRecord;                    // origem rastreável (open-science)
  /**
   * G2 · as AÇÕES QUE FALHARAM e o que o aluno pode fazer (lib/agent/falhas). Vem do CÓDIGO, nunca
   * do modelo — mesmo princípio de `fontesBase`. Existe porque a falha de tool só chegava ao modelo
   * (`resumoDasFalhas`, no prompt da ação) e nunca ao aluno: na conversa dos benchmarks o download
   * era impossível (domínio fora da allowlist) e o que ele viu foi um plano de cinco passos.
   */
  falhas?: FalhaVisivel[];
  /**
   * G3 · GRÁFICOS da resposta (lib/agent/graficosDoTurno). SVG já desenhado pelo servidor, e o
   * número SEMPRE apurado por código — nunca digitado pelo modelo. Ver a lei no cabeçalho de
   * lib/agent/grafico.ts.
   */
  graficos?: GraficoNaResposta[];
  /**
   * D4 · as fontes que o texto de `work` CITOU, apuradas pelo próprio harness (que tem a lista
   * original na mão). Antes o lado do documento remontava a lista a partir de `evidencia` —
   * funcionava, mas dependia de as duas remontagens baterem, e o ANEXO nem aparecia lá. Com o
   * campo, o que vale é o que foi medido onde a informação existe.
   */
  referencias?: FonteVerificada[];
  /** RAG: documentos da base (turma/pessoal) que a resposta citou — só trechos que a busca devolveu. `paginas` = "4" ou "4–5". */
  fontesBase?: { documentoId: string; titulo: string; paginas: string; publico?: boolean }[];
  /** TCC cross-sala (TCC_CROSS): o turno criou/editou o TCC desta conversa → o cliente abre a aba. */
  /** o VÍDEO do documento pedido no chat (lib/videodoc) — o card com ▶ abre o player com a Zaeon holograma */
  videoDoc?: { videoId?: string; titulo: string; motivo?: string };
  /** BLUEPRINT REA (engenharia reversa): o módulo próprio desta conversa (lib/rea-blueprint). `gerando` enquanto compõe. */
  reaBlueprint?: { id: string; titulo: string; gerando?: boolean };
  tcc?: { workId: string; titulo: string; criado: boolean; alteradas: number; gerando?: boolean; tipo?: string }; // tipo: chat único (TCC/Artigo/Relatório)
};

// ─────────────────────────── IntentRegistry (§8.1/8.3) ───────────────────────────

export type CriticLevel = "off" | "leve" | "full";
export type IntentId =
  | "conversa" | "duvida_rapida" | "explicar_conceito" | "gerar_artefato"
  | "criar_trabalho" | "pesquisar_fontes" | "revisar" | "buscar_livro";

export type IntentSpec = {
  id: IntentId;
  mode: Mode;
  tools: string[];                            // tools liberadas nesta intenção
  critic: CriticLevel;
  required: (keyof StructuredAnswer)[];       // campos obrigatórios do schema
  reviseThreshold?: number;                   // score mínimo p/ aceitar (critic != off)
  maxRevisions?: number;                      // teto de iterações do laço
  /**
   * `reflections` e `ensemble` SAÍRAM daqui (2026-11-07) e foram pro CARGO
   * (lib/agents/capacidades `Protocolo`). Não é refatoração de gosto — eles não podiam funcionar
   * aqui: vieram do AI-Scientist, onde o revisor é um MODELO, e o NOSSO crítico é CÓDIGO
   * (lib/agent/examiner.ts não tem uma chamada de modelo). Um ensemble de função pura devolve N
   * vereditos idênticos. Ficaram dois anos declarados e lidos por ninguém.
   *
   * Agora `ensemble` é N rascunhos escolhidos pelo crítico, e `reflexoes` é o `maxRevisions` do laço
   * que já existe. Se precisarem voltar a ser por TAREFA, o lugar é aqui — mas então alguém tem que
   * lê-los, e `maxRevisions` logo acima já faz o trabalho que `reflections` faria.
   */
};

/**
 * NOTA (memória = STANDARD): `memory_search` é runtime `ts` + `minPlan` free — nunca gateia
 * por plano (docs/MEMORY_AND_PERSISTENCE.md). O gate de plano é só compute pesado (tiers T0–T3).
 */
export const INTENTS: Record<IntentId, IntentSpec> = {
  conversa:          { id: "conversa",          mode: "quick",      tools: [],                                                                            critic: "off",  required: ["nucleo"] },
  duvida_rapida:     { id: "duvida_rapida",     mode: "quick",      tools: ["memory_search"],                                                             critic: "off",  required: ["nucleo"] },
  explicar_conceito: { id: "explicar_conceito", mode: "elaborated", tools: ["memory_search", "literature_search", "web_search"],                                        critic: "leve", required: ["nucleo", "desenvolvimento", "conceitos", "proximos_passos"], reviseThreshold: 7, maxRevisions: 1 },
  gerar_artefato:    { id: "gerar_artefato",    mode: "elaborated", tools: ["studio_generate"],                                                           critic: "leve", required: ["nucleo", "artifacts"], reviseThreshold: 7, maxRevisions: 1 },
  // `notebook_read` saiu daqui: NUNCA existiu no registry (lib/agent/runtime.ts não a registra).
  // Não quebrava nada — `plan()` filtra por `isGatherTool`, que não a inclui, então ela jamais era
  // chamada — mas era configuração que MENTE sobre a superfície do sistema para quem lê o código, e
  // agora o cardápio de capacidades é derivado do registry, onde a verdade mora.
  // (`studio_generate` nesta lista também nunca roda, pelo mesmo filtro; fica porque a tool existe.)
  criar_trabalho:    { id: "criar_trabalho",    mode: "research",   tools: ["literature_search", "web_search", "memory_search", "studio_generate"],    critic: "full", required: ["nucleo", "work", "evidencia", "proximos_passos"], reviseThreshold: 7, maxRevisions: 2 },
  pesquisar_fontes:  { id: "pesquisar_fontes",  mode: "elaborated", tools: ["literature_search", "web_search"],                                                         critic: "leve", required: ["nucleo", "sources"], reviseThreshold: 6, maxRevisions: 1 },
  // achar UM LIVRO e entregar o caminho legal até ele (lib/livros): 1 busca, sem crítico — a lista sai do código, não do modelo
  buscar_livro:      { id: "buscar_livro",      mode: "elaborated", tools: ["book_search"],                                                               critic: "off",  required: ["nucleo"] },
  revisar:           { id: "revisar",           mode: "research",   tools: ["memory_search"],                                                             critic: "full", required: ["nucleo", "evidencia"] },
};

export const INTENT_IDS = Object.keys(INTENTS) as IntentId[];
export const isIntentId = (v: unknown): v is IntentId => typeof v === "string" && v in INTENTS;
export const getIntentSpec = (id: IntentId): IntentSpec => INTENTS[id];

// ─────────────────────────── ExaminerVerdict (§8.4) ───────────────────────────

export type IssueTipo =
  | "sem_fonte"   // afirmação sem lastro em evidencia[] (verificável) — a checagem mais barata
  | "lacuna"      // faltou cobrir parte do pedido / do schema
  | "impreciso"   // afirmação factualmente frágil
  | "confuso"     // clareza/estrutura ruim
  | "raso";       // profundidade abaixo do modo/intenção

export type Issue = { tipo: IssueTipo; onde: string; porque: string; sugestao: string };

/** ScholarEval (K-Dense, arXiv:2510.16234), aplicada ADAPTATIVAMENTE por intenção. */
export type ScholarDim =
  | "problema" | "literatura" | "metodologia" | "dados_fontes"
  | "analise" | "resultados" | "escrita" | "citacoes";
export type ExaminerRubric = Partial<Record<ScholarDim, number>>;   // cada dim 1–5

export type EvidenceLevel = 1 | 2 | 3 | 4;   // 1 fraca · 2 indireta · 3 sólida · 4 forte/reproduzível
export type IntegrityFinding = {
  tipo: "imagem" | "numero" | "logica" | "citacao";
  onde: string;
  nivel: EvidenceLevel;
  nota: string;
};

export type ExaminerDecision = "aprovado" | "revisar" | "reprovado";
export type ExaminerVerdict = {
  soundness: number;                // 1-10 — validade empírica ante a literatura
  contribution: number;             // 1-10 — avanço relativo ao que já existe
  score: number;                    // 1-10 agregado (ponderado por intenção)
  decision: ExaminerDecision;
  rubric: ExaminerRubric;           // só as dims aplicáveis à intenção
  evidenceLevel: EvidenceLevel;     // grading global (open-science)
  integrity: IntegrityFinding[];    // achados de imagem/número/lógica/citação
  issues: Issue[];

};

/**
 * Regra do laço (§8.4): aceita se aprovado OU score alcança o limiar; senão revisa até o teto.
 * Determinística e testável sem LLM (é a base do stop-condition do runTrajectory, §11.1).
 */
export function shouldRevise(v: ExaminerVerdict, spec: IntentSpec, iter: number): boolean {
  if (spec.critic === "off") return false;
  const approved = v.decision === "aprovado" || v.score >= (spec.reviseThreshold ?? 7);
  if (approved) return false;
  return iter < (spec.maxRevisions ?? 1);
}
