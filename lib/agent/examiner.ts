/**
 * lib/agent/examiner.ts — PR05 do runbook (§13.1; encarna §8.4). O CRÍTICO (ScholarEval).
 *
 * `critique(input) → ExaminerVerdict`: rubrica ScholarEval APLICADA ADAPTATIVAMENTE por intenção +
 * checagens baratas determinísticas. A 1ª checagem é a mais barata — `sem_fonte`: cruza o
 * rascunho × a evidência reunida (afirmação sem lastro em fonte verificável). TUDO aqui é puro e
 * testável SEM LLM (é a base do stop-condition do `runTrajectory`, via `shouldRevise` do contracts).
 * Um scorer LLM (ScholarEval real) pode ser INJETADO depois para refinar a rubrica; o default é
 * heurístico e determinístico. Importe os tipos de contracts.ts; NÃO reinvente.
 */
import type { Finding } from "@/lib/agent/runtime";
import {
  INTENTS,
  type IntentId,
  type Mode,
  type AcademicMode,
  type IntentSpec,
  type StructuredAnswer,
  type Issue,
  type ExaminerRubric,
  type ExaminerVerdict,
  type ExaminerDecision,
  type ScholarDim,
  type EvidenceLevel,
  type StudioRef,
} from "@/lib/agent/contracts";

export type ExaminerInput = {
  intent: IntentId;
  mode: Mode;
  academicMode: AcademicMode;
  draft: StructuredAnswer;
  evidence?: Finding[];
  spec?: IntentSpec;
};

// ScholarEval é ADAPTATIVA: cada intenção pesa só as dimensões que fazem sentido (§8.4).
const DIMS_BY_INTENT: Record<IntentId, ScholarDim[]> = {
  conversa: [],
  duvida_rapida: ["escrita"],
  explicar_conceito: ["problema", "literatura", "escrita"],
  gerar_artefato: ["problema", "escrita"],
  criar_trabalho: ["problema", "literatura", "metodologia", "dados_fontes", "analise", "resultados", "escrita", "citacoes"],
  pesquisar_fontes: ["literatura", "dados_fontes", "citacoes"],
  revisar: ["problema", "metodologia", "analise", "escrita", "citacoes"],
  buscar_livro: [],
};

// Intenções cuja resposta PRECISA de lastro em fonte (base do `sem_fonte`).
const INTENTS_NEED_SOURCE: IntentId[] = ["criar_trabalho", "pesquisar_fontes", "revisar"];

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function isEmpty(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim().length === 0;
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

/** quantas fontes/evidências ancoram este rascunho. */
function sourceCount(input: ExaminerInput): number {
  return (
    (input.evidence?.length ?? 0) +
    (input.draft.evidencia?.length ?? 0) +
    (input.draft.sources?.length ?? 0)
  );
}

/** A checagem MAIS BARATA (§8.4): afirmação sem lastro em fonte. Cruza rascunho × evidência. */
export function checkSemFonte(input: ExaminerInput): Issue[] {
  const needs = input.academicMode === "enforced" || INTENTS_NEED_SOURCE.includes(input.intent);
  if (!needs) return [];
  if (sourceCount(input) > 0) return [];
  return [{
    tipo: "sem_fonte",
    onde: "resposta",
    porque: "nenhuma afirmação está ancorada em fonte verificável",
    sugestao: "buscar literatura (literature_search) e citar as fontes na evidência",
  }];
}

/** Campos obrigatórios do schema da intenção que ficaram vazios (§8.1/8.3). */
export function checkLacuna(input: ExaminerInput): Issue[] {
  const spec = input.spec ?? INTENTS[input.intent];
  return spec.required
    .filter((f) => isEmpty((input.draft as Record<string, unknown>)[f as string]))
    .map((f) => ({
      tipo: "lacuna" as const,
      onde: String(f),
      porque: `campo obrigatório "${String(f)}" ausente ou vazio`,
      sugestao: `preencher "${String(f)}"`,
    }));
}

/** Profundidade abaixo do modo/intenção (raso). */
function checkRaso(input: ExaminerInput): Issue[] {
  if (input.mode === "quick") return [];
  const len = (input.draft.nucleo ?? "").length + (input.draft.desenvolvimento ?? "").length;
  if (len >= 120) return [];
  return [{ tipo: "raso", onde: "desenvolvimento", porque: "profundidade abaixo do esperado para o modo", sugestao: "desenvolver o raciocínio e os exemplos" }];
}

// Penalidade por issue. `sem_fonte`/`lacuna` são CRÍTICAS: uma só já derruba o score abaixo do
// `reviseThreshold` (7) — assim a decisão do examiner casa com o check inline do runTrajectory.
const ISSUE_PENALTY: Record<Issue["tipo"], number> = {
  sem_fonte: 4,
  lacuna: 4,
  impreciso: 2,
  raso: 2,
  confuso: 1,
};

function buildRubric(dims: ScholarDim[], issues: Issue[]): ExaminerRubric {
  const semFonte = issues.some((i) => i.tipo === "sem_fonte");
  const lacuna = issues.some((i) => i.tipo === "lacuna");
  const raso = issues.some((i) => i.tipo === "raso");
  const rubric: ExaminerRubric = {};
  for (const d of dims) {
    let v = 4;
    if (semFonte && (d === "literatura" || d === "citacoes" || d === "dados_fontes")) v -= 2;
    if (lacuna && (d === "escrita" || d === "resultados")) v -= 1;
    if (raso && (d === "analise" || d === "metodologia")) v -= 1;
    rubric[d] = clamp(v, 1, 5);
  }
  return rubric;
}

function evidenceLevelOf(n: number): EvidenceLevel {
  if (n >= 3) return 3;
  if (n >= 1) return 2;
  return 1;
}

function decide(score: number, threshold: number, issues: Issue[]): ExaminerDecision {
  const critical = issues.some((i) => i.tipo === "sem_fonte" || i.tipo === "lacuna");
  if (score <= 3) return "reprovado";
  if (score >= threshold && !critical) return "aprovado";
  return "revisar";
}

/**
 * critique — o veredito ScholarEval (determinístico). Ordem barata→cara: sem_fonte → lacuna → raso.
 * O score agrega penalidades; a decisão respeita o `reviseThreshold` da intenção (contracts).
 */
export function critique(input: ExaminerInput): ExaminerVerdict {
  const spec = input.spec ?? INTENTS[input.intent];
  const dims = DIMS_BY_INTENT[input.intent] ?? [];

  const issues: Issue[] = [
    ...checkSemFonte(input),
    ...checkLacuna(input),
    ...checkRaso(input),
  ];

  const score = clamp(
    10 - issues.reduce((acc, i) => acc + (ISSUE_PENALTY[i.tipo] ?? 1), 0),
    1,
    10,
  );

  const semFonte = issues.some((i) => i.tipo === "sem_fonte");
  const lacuna = issues.some((i) => i.tipo === "lacuna");
  const raso = issues.some((i) => i.tipo === "raso");
  const n = sourceCount(input);

  const soundness = clamp(10 - (semFonte ? 4 : 0) - (n === 0 ? 1 : 0), 1, 10);
  const contribution = clamp(10 - (lacuna ? 3 : 0) - (raso ? 2 : 0), 1, 10);

  return {
    soundness,
    contribution,
    score,
    decision: decide(score, spec.reviseThreshold ?? 7, issues),
    rubric: buildRubric(dims, issues),
    evidenceLevel: evidenceLevelOf(n),
    integrity: [], // achados de imagem/número/lógica/citação: aprofundado numa fase posterior
    issues,
    reflections: spec.reflections,
    ensemble: spec.ensemble,
  };
}

/** Adaptador p/ o `HarnessDeps.critique(st)` do runTrajectory (mapeia o estado → ExaminerInput). */
export function critiqueForState(st: {
  intent: IntentId;
  mode: Mode;
  academicMode: AcademicMode;
  spec: IntentSpec;
  draft?: StructuredAnswer;
  evidence?: Finding[];
  artifacts?: StudioRef[];
}): ExaminerVerdict {
  // os artefatos vivem em st.artifacts (anexados no finalize); reflita-os no draft p/ o exame
  // não marcar `lacuna` de `artifacts` que na verdade JÁ foram gerados pelas tools.
  const base = st.draft ?? { nucleo: "" };
  const draft: StructuredAnswer =
    st.artifacts?.length && !base.artifacts?.length ? { ...base, artifacts: st.artifacts } : base;
  return critique({
    intent: st.intent,
    mode: st.mode,
    academicMode: st.academicMode,
    spec: st.spec,
    draft,
    evidence: st.evidence,
  });
}
