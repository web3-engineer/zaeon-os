/**
 * lib/agent/trajectory.ts — PR04 do runbook (§13.1; encarna §11.1). O MOTOR `runTrajectory`.
 *
 * O laço: route → (quick? draft→finalize) → plan → loop{ gather(Promise.all) → reason → draft →
 * critique → shouldRevise? } → finalize. STOP-conditions determinísticas (aprovado/maxIter/
 * orcamento/loop). `HarnessDeps` é INJETADO (classify/plan/runTool/reason/draft/critique/emit/
 * persistMemory) — mantém o motor puro e testável. Reasoning-sandwich: as fases pesadas são só
 * `plan` e `critique` (o adaptador escolhe Pro; o resto é Flash). NÃO chama rede aqui.
 *
 * Está atrás da flag `AURA_HARNESS` no NÍVEL DA ROTA (PASSO 3) — o motor em si é agnóstico.
 */
import type { AgentContext } from "@/lib/agent/context";
import type { AgentStep } from "@/lib/agent/actions";
import type { Drawer } from "@/lib/agent/memory";
import type { Finding, ToolResult } from "@/lib/agent/runtime";
import type { RouterResult } from "@/lib/agent/router";
import { chaveDaChamada } from "@/lib/agent/acao";
import {
  INTENTS,
  type IntentId,
  type Mode,
  type AcademicMode,
  type WorkKind,
  type IntentSpec,
  type StructuredAnswer,
  type ExaminerVerdict,
  type ProvenanceRecord,
  type Issue,
  type Source,
  type StudioRef,
} from "@/lib/agent/contracts";

// ───────────────────────────── tipos do laço (§11.1) ─────────────────────────────
export type Phase = "route" | "plan" | "gather" | "reason" | "draft" | "critique" | "finalize";
export type StopReason = "aprovado" | "orcamento" | "maxIter" | "loop" | "erro";
export type Step = { tool: string; args?: any };
export type Budget = { tokens: number; ms: number };

export type TrajectoryState = {
  objective: string;
  intent: IntentId;
  mode: Mode;
  academicMode: AcademicMode;
  kind?: WorkKind;
  spec: IntentSpec;
  phase: Phase;
  iter: number;
  spent: Budget;
  budget: Budget;
  plan: Step[];
  evidence: Finding[];
  artifacts: StudioRef[];
  memoryWrites: Drawer[];
  reasoning?: string;
  draft?: StructuredAnswer;
  critique?: Issue[];
  score?: number;
  degraded?: boolean;
  prevNucleo?: string;
  stop?: StopReason;
  traceId: string;
  startedAt: number;
  /** F2 · as chamadas já executadas neste turno (tool+args). É o que impede o laço de repetir. */
  feitas: Set<string>;
  /** F2 · quantas VOLTAS EXTRAS de ação o turno gastou (0 = só o plano determinístico). */
  voltas: number;
};

/** As dependências do harness — injetadas pelo adaptador (aura-harness). Motor não sabe de Gemini. */
export interface HarnessDeps {
  classify(objective: string, ctx: AgentContext): Promise<RouterResult>;
  plan(st: TrajectoryState): Promise<Step[]>;
  /**
   * F2 (opcional) · O MODELO ESCOLHE. Depois de uma rodada de coleta, devolve mais passos — ou `[]`
   * pra dizer "já basta". É o que torna o laço reentrante: sem ela, o `gather` roda uma vez só e
   * não existe observar → agir → observar. Ausente = comportamento de antes da F2, byte a byte.
   */
  proximosPassos?(st: TrajectoryState): Promise<Step[]>;
  runTool(name: string, args: any, ctx: AgentContext): Promise<ToolResult>;
  reason(st: TrajectoryState): Promise<string>;
  /** opcional: este estado dispensa o raciocínio separado (sem anunciar a fase nem cobrar o orçamento) */
  pulaRaciocinio?(st: TrajectoryState): boolean;
  draft(st: TrajectoryState): Promise<StructuredAnswer>;
  critique(st: TrajectoryState): Promise<ExaminerVerdict>;
  emit(step: AgentStep): void;
  persistMemory(drawers: Drawer[]): Promise<void>;
  /** C5 (opcional): tokens REAIS já gastos neste turno. COST segue como estimativa de pré-voo. */
  usoMedido?(): number;
}

export type TrajectoryOpts = { budget?: Budget };

// ───────────────────────────── orçamento + custo por fase ─────────────────────────────
const BUDGET: Record<Mode, Budget> = {
  quick: { tokens: 3_000, ms: 15_000 },
  elaborated: { tokens: 12_000, ms: 60_000 },
  research: { tokens: 40_000, ms: 180_000 },
};
const COST: Record<Phase, Budget> = {
  route: { tokens: 300, ms: 500 },
  plan: { tokens: 1_200, ms: 2_500 },
  gather: { tokens: 400, ms: 1_500 },
  reason: { tokens: 1_500, ms: 2_000 },
  draft: { tokens: 1_800, ms: 2_500 },
  critique: { tokens: 1_500, ms: 2_500 },
  finalize: { tokens: 200, ms: 300 },
};

// Rótulos PT por fase — o `AgentStep.kind` é união FECHADA (navigate|create|type|say|done),
// então mapeamos toda fase para kind:"say" e guardamos a fase real em `detail` (PR06 lê daí).
const PHASE_LABEL: Record<Phase, string> = {
  route: "Entendendo o pedido",
  plan: "Planejando a resposta",
  gather: "Reunindo evidências",
  reason: "Raciocinando",
  draft: "Redigindo",
  critique: "Revisando criticamente",
  finalize: "Finalizando",
};

const nowIso = () => new Date().toISOString();

/** o harness está ligado? Ligado POR PADRÃO; `AURA_HARNESS="0"` é o kill-switch (fallback Fase 0). */
export function harnessEnabled(): boolean {
  return process.env.AURA_HARNESS !== "0";
}

// ───────────────────────────── helpers puros ─────────────────────────────
/** "Li 8 fontes · 6 artigos acadêmicos, 2 da web" — o rótulo do progresso depois da coleta */
export function rotuloDasFontes(ev: { source?: { url?: string; title?: string } | null; confidence?: string }[]): string {
  const comFonte = ev.filter((f) => f.source);
  const n = comFonte.length || ev.length;
  const web = comFonte.filter((f) => f.confidence === "baixa").length;   // achado web = confiança "baixa" (lib/agent/runtime)
  const acad = comFonte.length - web;
  const partes = [acad ? `${acad} ${acad === 1 ? "artigo acadêmico" : "artigos acadêmicos"}` : "", web ? `${web} da web` : ""].filter(Boolean);
  return `Li ${n} ${n === 1 ? "fonte" : "fontes"}${partes.length ? ` · ${partes.join(", ")}` : ""} — escrevendo`;
}

function emit(d: HarnessDeps, st: TrajectoryState, phase: Phase, detail?: string): void {
  st.phase = phase;
  d.emit({ kind: "say", label: PHASE_LABEL[phase], detail: detail ?? phase });
}

function charge(st: TrajectoryState, phase: Phase, mult = 1, d?: HarnessDeps): void {
  st.spent.tokens += COST[phase].tokens * mult;
  st.spent.ms += COST[phase].ms * mult;
  // C5: reconcilia com o medido — overBudget() frea com o maior entre estimado e real.
  if (d?.usoMedido) st.spent.tokens = Math.max(st.spent.tokens, d.usoMedido());
}

function overBudget(st: TrajectoryState): boolean {
  return st.spent.tokens >= st.budget.tokens || st.spent.ms >= st.budget.ms;
}

function safeSteps(steps: unknown): Step[] {
  return (Array.isArray(steps) ? steps : [])
    .filter((s): s is Step => !!s && typeof (s as any).tool === "string");
}

/**
 * F2 · Teto DURO de voltas de coleta, do motor. O adaptador tem o seu próprio (ajustável por env);
 * este não é ajustável e existe pra que um adaptador com defeito — ou um modelo que nunca diz
 * "pronto" — não gire até o orçamento. Duas travas, propósitos diferentes.
 */
export const MAX_VOLTAS_GATHER = 4;

/** A identidade de um passo (tool+args), pro adaptador não repetir trabalho já feito. */
const chaveDoPasso = (s: Step): string => chaveDaChamada({ tool: s.tool, args: (s.args ?? {}) as Record<string, unknown> });

/** Só reúne na 1ª iteração (as revisões reaproveitam a evidência + os issues como guia). */
function nextTools(st: TrajectoryState): Step[] {
  return st.iter === 1 ? st.plan : [];
}

function toFindings(res: ToolResult): Finding[] {
  return res.ok && Array.isArray(res.findings) ? res.findings : [];
}

/** intenções que dependem de evidência (memória/literatura) — base do sinal "degradado" (A3). */
function needsEvidence(st: TrajectoryState): boolean {
  return st.mode !== "quick" && st.spec.tools.some((t) => t === "literature_search" || t === "memory_search" || t === "web_search");
}

function collectSources(st: TrajectoryState): Source[] {
  const out: Source[] = [];
  const seen = new Set<string>();
  const push = (s?: Source) => {
    if (!s) return;
    const k = `${s.title}|${s.url ?? ""}`;
    if (!seen.has(k)) { seen.add(k); out.push(s); }
  };
  for (const f of st.evidence) push(f.source);
  for (const e of st.draft?.evidencia ?? []) push(e.source);
  for (const s of st.draft?.sources ?? []) push(s);
  return out;
}

function buildProvenance(st: TrajectoryState): ProvenanceRecord {
  const tools = [...new Set(st.plan.map((s) => s.tool))];
  return {
    by: "aura",
    intent: st.intent,
    toolsUsed: tools,
    sources: collectSources(st),
    model: st.mode === "research" ? "gemini-pro" : "gemini-flash",
    at: nowIso(),
    traceId: st.traceId,
  };
}

function seedState(objective: string, r: RouterResult, opts?: TrajectoryOpts): TrajectoryState {
  return {
    objective,
    intent: r.intent,
    mode: r.mode,
    academicMode: r.academicMode,
    kind: r.kind,
    spec: INTENTS[r.intent],
    phase: "route",
    iter: 0,
    spent: { tokens: 0, ms: 0 },
    budget: opts?.budget ? { ...opts.budget } : { ...BUDGET[r.mode] },
    plan: [],
    evidence: [],
    artifacts: [],
    memoryWrites: [],
    traceId: `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    startedAt: Date.now(),
    feitas: new Set<string>(),
    voltas: 0,
  };
}

async function finalize(st: TrajectoryState, d: HarnessDeps): Promise<StructuredAnswer> {
  emit(d, st, "finalize");
  charge(st, "finalize", 1, d);
  const answer: StructuredAnswer = st.draft ?? { nucleo: "" };
  // anexa o que as tools reuniram, se o draft não trouxe
  if ((!answer.artifacts || answer.artifacts.length === 0) && st.artifacts.length) answer.artifacts = st.artifacts;
  if ((!answer.evidencia || answer.evidencia.length === 0) && st.evidence.length) {
    answer.evidencia = st.evidence
      .filter((f) => f.source)
      .map((f) => ({ claim: f.claim, source: f.source as Source }));
  }
  const prov = buildProvenance(st);
  answer.provenance = prov;
  for (const a of answer.artifacts ?? []) if (!a.provenance) a.provenance = prov;
  // memória NUNCA derruba a resposta (write best-effort). Derivação real (L1→Drawer) no PR-M3.
  try { await d.persistMemory(st.memoryWrites); } catch { /* descarta */ }
  return answer;
}

// ───────────────────────────── o motor (§11.1) ─────────────────────────────
/** Versão instrumentada: devolve a resposta E o estado final (base dos testes de stop-condition). */
export async function runTrajectoryTraced(
  objective: string,
  ctx: AgentContext,
  d: HarnessDeps,
  opts?: TrajectoryOpts,
): Promise<{ answer: StructuredAnswer; state: TrajectoryState }> {
  d.emit({ kind: "say", label: PHASE_LABEL.route, detail: "route" }); // 1º emit é antes do state existir
  const r = await d.classify(objective, ctx);
  const st = seedState(objective, r, opts);
  charge(st, "route", 1, d);

  // QUICK: 1 tiro (paridade com a Fase 0 — sem plano, sem crítico)
  if (st.mode === "quick") {
    emit(d, st, "draft");
    st.draft = await d.draft(st);
    charge(st, "draft", 1, d);
    st.stop = "aprovado";
    return { answer: await finalize(st, d), state: st };
  }

  emit(d, st, "plan"); // fatia 1 do sandwich (reasoning-heavy)
  st.plan = safeSteps(await d.plan(st));
  charge(st, "plan", 1, d);

  for (;;) {
    st.iter++;

    // F2 · O GATHER É REENTRANTE. Antes rodava UMA vez (`nextTools` só devolve na 1ª iteração) e
    // não havia caminho de volta: observar → agir → observar era impossível. Agora, depois de cada
    // rodada, `proximosPassos` (se o adaptador a oferecer) decide se há mais o que fazer.
    let steps = nextTools(st);
    let anunciadas = 0;   // quantas fontes já foram anunciadas (não repete o mesmo rótulo)
    for (let volta = 0; steps.length; volta++) {
      emit(d, st, "gather");
      const results = await Promise.all(steps.map((s) => d.runTool(s.tool, s.args ?? {}, ctx)));
      for (const res of results) {
        st.evidence.push(...toFindings(res));
        if (res.artifact) st.artifacts.push(res.artifact);
      }
      for (const s of steps) st.feitas.add(chaveDoPasso(s));
      charge(st, "gather", steps.length, d);
      // AS FONTES ANTES DO TEXTO: o aluno vê o que foi achado (~2 s) enquanto a resposta é escrita
      if (st.evidence.length > anunciadas) {
        anunciadas = st.evidence.length;
        d.emit({ kind: "say", label: rotuloDasFontes(st.evidence), detail: "gather" });
      }
      steps = [];
      // TETO DURO DO MOTOR, além do teto de política do adaptador: se um dia o adaptador devolver
      // passos pra sempre, o turno ainda termina. São duas travas de propósito — a de política é
      // ajustável por env, esta não é.
      if (d.proximosPassos && volta + 1 < MAX_VOLTAS_GATHER && !overBudget(st)) {
        steps = safeSteps(await d.proximosPassos(st));
        // a decisão é uma chamada de modelo: cobra como `plan` (é a mesma classe de custo)
        charge(st, "plan", 1, d);
        if (steps.length) st.voltas = volta + 1;
      }
    }
    // A3 · degradado ≠ sucesso silencioso: gather vazio quando se esperava evidência. Avaliado
    // DEPOIS de todas as voltas — na F2 a 2ª tentativa é justamente quem salva a 1ª que falhou.
    if (st.iter === 1 && needsEvidence(st) && st.evidence.length === 0) {
      st.degraded = true;
      emit(d, st, "gather", "degradado: nenhuma evidência reunida");
    }

    // (o adaptador pode pular o raciocínio — caminho elaborado: devolve "" sem chamar modelo; aí nem anuncia a fase)
    if (d.pulaRaciocinio?.(st)) st.reasoning = "";
    else {
      emit(d, st, "reason");
      st.reasoning = await d.reason(st);
      charge(st, "reason", 1, d);
    }

    emit(d, st, "draft");
    st.draft = await d.draft(st);
    charge(st, "draft", 1, d);

    // loop-guard: rascunho idêntico ao anterior → revisar não adianta.
    if (st.prevNucleo !== undefined && st.draft?.nucleo === st.prevNucleo) { st.stop = "loop"; break; }
    st.prevNucleo = st.draft?.nucleo;

    if (st.spec.critic === "off") { st.stop = "aprovado"; break; }

    emit(d, st, "critique"); // fatia 2 do sandwich (reasoning-heavy)
    const v = await d.critique(st);
    charge(st, "critique", 1, d);
    st.critique = v.issues;
    st.score = v.score;

    // STOP-conditions determinísticas (ordem do §11.1): aprovado → maxIter → orcamento.
    if (v.decision === "aprovado" || (st.score ?? 0) >= (st.spec.reviseThreshold ?? 7)) { st.stop = "aprovado"; break; }
    if (st.iter >= (st.spec.maxRevisions ?? 1)) { st.stop = "maxIter"; break; }
    if (overBudget(st)) { st.stop = "orcamento"; break; }
    // senão: revisa — os issues guiam o próximo reason/draft.
  }

  return { answer: await finalize(st, d), state: st };
}

/** O motor público (§11.1): devolve a resposta estruturada final. */
export async function runTrajectory(
  objective: string,
  ctx: AgentContext,
  d: HarnessDeps,
  opts?: TrajectoryOpts,
): Promise<StructuredAnswer> {
  return (await runTrajectoryTraced(objective, ctx, d, opts)).answer;
}
