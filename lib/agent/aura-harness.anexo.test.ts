import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/agent/router", () => ({
  classify: vi.fn(async () => ({ intent: "explicar_conceito", mode: "elaborated", academicMode: "flexible" }) as any),
}));

import { buildHarnessDeps, passosDeAnexo } from "@/lib/agent/aura-harness";
import { MAX_ANEXOS_NO_PLANO, anexoDe } from "@/lib/agent/anexos";
import { INTENTS } from "@/lib/agent/contracts";
import { runTrajectoryTraced, type TrajectoryState } from "@/lib/agent/trajectory";
import { runToolByName, type ToolContext } from "@/lib/agent/runtime";

const semAnexo: ToolContext = { activeTab: "estudos", plan: "free", execMode: "auto" };
const anexo = (id: string, nome: string, texto = "Conteúdo do documento sobre entropia de Shannon.") =>
  anexoDe({ id, nome, tipo: "application/pdf", texto, paginas: 3 });
const comAnexo = { ...semAnexo, anexos: [anexo("a1", "artigo.pdf")] } as ToolContext;

const smartGen = () =>
  vi.fn(async (system: string, _user?: string, _o?: any): Promise<any> => {
    if (/Você decide se FALTA/.test(system)) return { pronto: true };
    if (/reasoning/i.test(system)) return { reasoning: "R" };
    return { nucleo: "N", conceitos: ["c"], proximos_passos: ["p"] };
  });

const stFor = (over: Partial<TrajectoryState> = {}): TrajectoryState =>
  ({
    objective: "o que esse artigo diz?", intent: "explicar_conceito", mode: "elaborated",
    academicMode: "flexible", spec: INTENTS.explicar_conceito, iter: 1, evidence: [], artifacts: [], reasoning: "",
    ...over,
  }) as TrajectoryState;

const promptDoDraft = (gen: ReturnType<typeof smartGen>, i: 0 | 1) =>
  String(gen.mock.calls.find((c) => /Campos obrigat/i.test(String(c[0])))?.[i] ?? "");

/**
 * As tools de ANEXO rodam DE VERDADE (passando pelo `permit`, que é o que esta fase mudou); as de
 * busca viram dublê. Sem isto o `literature_search` do plano sai pra internet de verdade —
 * 4,4 s por teste e dependência de OpenAlex/arXiv estarem no ar, que é o que se descobriu medindo.
 */
const soAnexoDeVerdade = () =>
  vi.fn(async (name: string, args: any, c: any, o: any) => {
    if (name === "ler_anexo" || name === "listar_anexos") return runToolByName(name, args, c, o);
    return { ok: true, findings: [], provenance: {} } as any;
  });

describe("passosDeAnexo · o plano lê o arquivo sozinho (F3 funciona com a F2 desligada)", () => {
  it("um passo de leitura por anexo", () => {
    const ctx = { ...semAnexo, anexos: [anexo("a1", "um.pdf"), anexo("a2", "dois.pdf")] };
    expect(passosDeAnexo(ctx)).toEqual([
      { tool: "ler_anexo", args: { anexo: "a1" } },
      { tool: "ler_anexo", args: { anexo: "a2" } },
    ]);
  });

  it("sem anexo, nenhum passo", () => {
    expect(passosDeAnexo(semAnexo)).toEqual([]);
    expect(passosDeAnexo(undefined)).toEqual([]);
  });

  it("respeita o teto (uma pasta de 20 arquivos não vira 20 leituras)", () => {
    const muitos = Array.from({ length: 20 }, (_, i) => anexo(`a${i}`, `d${i}.pdf`));
    expect(passosDeAnexo({ ...semAnexo, anexos: muitos })).toHaveLength(MAX_ANEXOS_NO_PLANO);
  });
});

describe("o plano põe o ARQUIVO DA PESSOA na frente", () => {
  it("antes da página colada e antes das buscas da intenção", async () => {
    const ctx = { ...comAnexo };
    const deps = buildHarnessDeps(ctx, { genJson: smartGen() });
    const plano = await deps.plan(stFor({ objective: "compara com https://x.gov.br/nota" }));
    expect(plano[0]).toEqual({ tool: "ler_anexo", args: { anexo: "a1" } });
    expect(plano.length).toBeGreaterThan(1);   // a busca da intenção continua
  });

  it("em toda intenção", async () => {
    const deps = buildHarnessDeps(comAnexo, { genJson: smartGen() });
    for (const intent of ["explicar_conceito", "gerar_artefato", "criar_trabalho"] as const) {
      const plano = await deps.plan(stFor({ intent, spec: INTENTS[intent], mode: INTENTS[intent].mode }));
      expect(plano[0], intent).toEqual({ tool: "ler_anexo", args: { anexo: "a1" } });
    }
  });
});

describe("ponta a ponta · o anexo chega no rascunho", () => {
  it("o turno lê o arquivo e o TEXTO dele entra no prompt da resposta", async () => {
    const genJson = smartGen();
    const { state } = await runTrajectoryTraced(
      "o que esse artigo diz?",
      comAnexo,
      buildHarnessDeps(comAnexo, { genJson, runToolImpl: soAnexoDeVerdade(), retryDelayMs: 0 }),
    );
    expect(state.evidence.some((f) => f.claim.includes("entropia de Shannon"))).toBe(true);
    expect(promptDoDraft(genJson, 1)).toContain("entropia de Shannon");
    // e o turno NÃO é degradado: o arquivo da pessoa é evidência
    expect(state.degraded).toBeFalsy();
  });

  it("documento grande: o rascunho recebe o aviso de que sobrou documento", async () => {
    const grande = { ...semAnexo, anexos: [anexo("a1", "tese.pdf", `COMEÇO ${"x".repeat(30_000)}`)] } as ToolContext;
    const genJson = smartGen();
    await runTrajectoryTraced("resume", grande, buildHarnessDeps(grande, { genJson, runToolImpl: soAnexoDeVerdade(), retryDelayMs: 0 }));
    expect(promptDoDraft(genJson, 1)).toContain("HÁ MAIS DEPOIS DISTO");
  });
});

describe("o cardápio e o menu só anunciam o anexo quando ele existe", () => {
  const comFlag = async (vals: Record<string, string>, fn: () => Promise<void>) => {
    const antes: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(vals)) { antes[k] = process.env[k]; process.env[k] = v; }
    try { await fn(); } finally {
      for (const [k, v] of Object.entries(antes)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    }
  };

  it("F0: com anexo o cardápio diz que lê; SEM anexo, não promete", async () => {
    await comFlag({ HARNESS_CAPACIDADE: "1" }, async () => {
      const comGen = smartGen();
      await buildHarnessDeps(comAnexo, { genJson: comGen, retryDelayMs: 0 }).draft(stFor());
      expect(promptDoDraft(comGen, 0)).toContain("ler um arquivo que a pessoa anexou");

      const semGen = smartGen();
      await buildHarnessDeps(semAnexo, { genJson: semGen, retryDelayMs: 0 }).draft(stFor());
      expect(promptDoDraft(semGen, 0)).not.toContain("ler um arquivo que a pessoa anexou");
    });
  });

  it("F2: o menu de ação só traz `ler_anexo` no turno que tem anexo", async () => {
    await comFlag({ HARNESS_ACAO: "1" }, async () => {
      const menuDe = async (ctx: ToolContext) => {
        const genJson = smartGen();
        const deps = buildHarnessDeps(ctx, { genJson, retryDelayMs: 0 });
        await deps.proximosPassos!(stFor({ feitas: new Set(), voltas: 0 } as any));
        return String(genJson.mock.calls.find((c) => /Você decide se FALTA/.test(String(c[0])))?.[1] ?? "");
      };
      expect(await menuDe(comAnexo)).toContain("ler_anexo");
      expect(await menuDe(semAnexo)).not.toContain("ler_anexo");
    });
  });
});
