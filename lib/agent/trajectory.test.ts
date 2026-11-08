import { describe, it, expect, vi, afterEach } from "vitest";
import { runTrajectoryTraced, harnessEnabled, rotuloDasFontes, type HarnessDeps } from "./trajectory";
import type { ExaminerVerdict, StructuredAnswer } from "./contracts";
import type { RouterResult } from "./router";
import type { AgentContext } from "./context";

const ctx: AgentContext = { activeTab: "estudos" };

const verdict = (over: Partial<ExaminerVerdict> = {}): ExaminerVerdict => ({
  soundness: 8, contribution: 7, score: 9, decision: "aprovado",
  rubric: {}, evidenceLevel: 3, integrity: [], issues: [], ...over,
});

function makeDeps(over: Partial<HarnessDeps> = {}) {
  const steps: string[] = [];
  const calls = { persistMemory: 0 };
  const draft = vi.fn(async (): Promise<StructuredAnswer> => ({
    nucleo: "resposta base", desenvolvimento: "d", conceitos: ["c"], proximos_passos: ["p"],
  }));
  const deps: HarnessDeps = {
    classify: async (): Promise<RouterResult> => ({ intent: "explicar_conceito", mode: "elaborated", academicMode: "flexible" }),
    plan: async () => [{ tool: "memory_search", args: { query: "x" } }],
    runTool: async () => ({ ok: true, findings: [{ claim: "f", source: { title: "S" }, confidence: "alta" }], provenance: {} }),
    reason: async () => "porque sim",
    draft,
    critique: async () => verdict(),
    emit: (s) => steps.push(String(s.detail ?? s.kind)),
    persistMemory: async () => { calls.persistMemory++; },
    ...over,
  };
  return { deps, steps, calls, draft };
}

describe("trajectory · caminho quick", () => {
  it("mode quick → draft → finalize, sem plan/gather/critique", async () => {
    const { deps, steps } = makeDeps({
      classify: async () => ({ intent: "duvida_rapida", mode: "quick", academicMode: "flexible" }),
    });
    const { answer, state } = await runTrajectoryTraced("quanto é 2+2?", ctx, deps);
    expect(answer.nucleo).toBe("resposta base");
    expect(state.mode).toBe("quick");
    expect(state.stop).toBe("aprovado");
    expect(steps).toEqual(["route", "draft", "finalize"]);
    expect(steps).not.toContain("plan");
    expect(steps).not.toContain("critique");
  });
});

describe("trajectory · stop-conditions (HarnessDeps mockado)", () => {
  it("aprovado: crítico aprova na 1ª → stop=aprovado, iter=1, provenance preenchida", async () => {
    const { deps, steps, calls } = makeDeps();
    const { answer, state } = await runTrajectoryTraced("explique entropia", ctx, deps);
    expect(state.stop).toBe("aprovado");
    expect(state.iter).toBe(1);
    expect(answer.provenance?.intent).toBe("explicar_conceito");
    expect(answer.provenance?.traceId).toBeTruthy();
    expect(calls.persistMemory).toBe(1);
    // reasoning-sandwich: plan e critique presentes (as duas fases pesadas)
    expect(steps).toContain("plan");
    expect(steps).toContain("critique");
  });

  it("maxIter: crítico sempre revisa e maxRevisions=1 → stop=maxIter", async () => {
    const { deps, draft } = makeDeps({
      critique: async () => verdict({ decision: "revisar", score: 3 }),
    });
    const { state } = await runTrajectoryTraced("explique entropia", ctx, deps);
    expect(state.stop).toBe("maxIter");
    expect(state.iter).toBe(1); // explicar_conceito.maxRevisions === 1
    expect(draft).toHaveBeenCalledTimes(1);
  });

  it("orcamento: budget minúsculo estoura antes do maxIter", async () => {
    const { deps } = makeDeps({
      classify: async () => ({ intent: "criar_trabalho", mode: "research", academicMode: "enforced", kind: "artigo" }),
      critique: async () => verdict({ decision: "revisar", score: 3 }),
    });
    const { state } = await runTrajectoryTraced("gera um artigo sobre X", ctx, deps, { budget: { tokens: 100, ms: 999_999 } });
    expect(state.stop).toBe("orcamento");
    expect(state.iter).toBe(1); // criar_trabalho.maxRevisions=2, mas estoura o orçamento antes
  });

  it("C5 · orcamento pelo MEDIDO: usoMedido maior que o estimado estoura o budget antes do maxIter", async () => {
    // estimado por fase é pequeno (COST); o ledger real diz que já foram 50k tokens → o motor frea.
    const { deps } = makeDeps({
      classify: async () => ({ intent: "criar_trabalho", mode: "research", academicMode: "enforced", kind: "artigo" }),
      critique: async () => verdict({ decision: "revisar", score: 3 }),
    });
    (deps as any).usoMedido = () => 50_000;
    const { state } = await runTrajectoryTraced("gera um artigo sobre X", ctx, deps, { budget: { tokens: 40_000, ms: 999_999 } });
    expect(state.stop).toBe("orcamento");
    expect(state.spent.tokens).toBeGreaterThanOrEqual(50_000);
  });

  it("C5 · sem usoMedido nada muda: o estimado segue mandando", async () => {
    const { deps } = makeDeps({
      classify: async () => ({ intent: "criar_trabalho", mode: "research", academicMode: "enforced", kind: "artigo" }),
      critique: async () => verdict({ decision: "aprovado", score: 9 }),
    });
    const { state } = await runTrajectoryTraced("gera um artigo sobre X", ctx, deps, { budget: { tokens: 40_000, ms: 999_999 } });
    expect(state.stop).not.toBe("orcamento");
  });

  it("loop: rascunho idêntico em 2 iterações → stop=loop", async () => {
    const constDraft = async (): Promise<StructuredAnswer> => ({ nucleo: "IGUAL", proximos_passos: [] });
    const { deps } = makeDeps({
      classify: async () => ({ intent: "criar_trabalho", mode: "research", academicMode: "enforced", kind: "artigo" }),
      draft: constDraft,
      critique: async () => verdict({ decision: "revisar", score: 3 }),
    });
    const { state } = await runTrajectoryTraced("gera um artigo sobre X", ctx, deps);
    expect(state.stop).toBe("loop");
    expect(state.iter).toBe(2);
  });

  it("A3 · degradado: tools sem findings marcam state.degraded e emitem degradado", async () => {
    const { deps, steps } = makeDeps({
      classify: async () => ({ intent: "criar_trabalho", mode: "research", academicMode: "enforced" }),
      runTool: async () => ({ ok: false, error: "offline", code: "skill_offline", provenance: {} }),
      critique: async () => verdict(), // aprova rápido pra encerrar
    });
    const { state } = await runTrajectoryTraced("gera um artigo sobre X", ctx, deps);
    expect(state.degraded).toBe(true);
    expect(steps.some((s) => s.startsWith("degradado"))).toBe(true);
  });
});

describe("trajectory · harnessEnabled (flag)", () => {
  const prev = process.env.AURA_HARNESS;
  afterEach(() => { if (prev === undefined) delete process.env.AURA_HARNESS; else process.env.AURA_HARNESS = prev; });

  it("ligado por padrão; AURA_HARNESS=0 desliga (kill-switch)", () => {
    delete process.env.AURA_HARNESS;
    expect(harnessEnabled()).toBe(true);
    process.env.AURA_HARNESS = "1";
    expect(harnessEnabled()).toBe(true);
    process.env.AURA_HARNESS = "0";
    expect(harnessEnabled()).toBe(false);
  });
});

describe("trajectory · as fontes antes do texto", () => {
  it("depois da coleta, o progresso diz quantas fontes e de que tipo", async () => {
    const labels: string[] = [];
    const { deps } = makeDeps({
      runTool: async () => ({ ok: true, findings: [
        { claim: "a", source: { title: "Paper A" }, confidence: "alta" }, { claim: "b", source: { title: "Paper B" }, confidence: "média" },
        { claim: "c", source: { title: "Site", url: "https://x" }, confidence: "baixa" },
      ], provenance: {} }),
      emit: (s) => labels.push(String(s.label ?? "")),
    });
    await runTrajectoryTraced("explique entropia", ctx, deps);
    expect(labels).toContain("Li 3 fontes · 2 artigos acadêmicos, 1 da web — escrevendo");
  });
  it("coleta vazia: não anuncia fonte nenhuma", async () => {
    const labels: string[] = [];
    const { deps } = makeDeps({ runTool: async () => ({ ok: true, findings: [], provenance: {} }), emit: (s) => labels.push(String(s.label ?? "")) });
    await runTrajectoryTraced("explique entropia", ctx, deps);
    expect(labels.some((l) => l.startsWith("Li "))).toBe(false);
  });
  it("rotuloDasFontes: singular e só web", () => {
    expect(rotuloDasFontes([{ source: { title: "x" }, confidence: "baixa" }])).toBe("Li 1 fonte · 1 da web — escrevendo");
    expect(rotuloDasFontes([{ source: { title: "x" }, confidence: "alta" }])).toBe("Li 1 fonte · 1 artigo acadêmico — escrevendo");
  });
});

describe("trajectory · raciocínio dispensado pelo adaptador", () => {
  it("pulaRaciocinio → nem anuncia a fase reason nem chama o reason", async () => {
    const reason = vi.fn(async () => "x");
    const { deps, steps } = makeDeps({ reason, pulaRaciocinio: () => true });
    await runTrajectoryTraced("explique entropia", ctx, deps);
    expect(reason).not.toHaveBeenCalled();
    expect(steps).not.toContain("reason");
    expect(steps).toContain("draft");
  });
});

describe("trajectory · rascunho que falhou nunca é sucesso", () => {
  it("quick com rascunho falho → degraded (fica fora do cache de respostas)", async () => {
    const { deps } = makeDeps({
      classify: async () => ({ intent: "duvida_rapida", mode: "quick", academicMode: "flexible" }),
      draft: async () => ({ nucleo: "Demorou demais pra responder — tenta de novo em instantes.", rascunhoFalhou: true }),
    });
    const { state } = await runTrajectoryTraced("quanto é 2+2?", ctx, deps);
    expect(state.degraded).toBe(true);
  });
  it("rascunho bom continua não-degradado", async () => {
    const { deps } = makeDeps({ classify: async () => ({ intent: "duvida_rapida", mode: "quick", academicMode: "flexible" }) });
    const { state } = await runTrajectoryTraced("quanto é 2+2?", ctx, deps);
    expect(state.degraded).toBeFalsy();
  });
});
