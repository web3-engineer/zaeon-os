import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/agent/router", () => ({
  classify: vi.fn(async () => ({ intent: "explicar_conceito", mode: "elaborated", academicMode: "flexible" }) as any),
}));

import { buildHarnessDeps } from "@/lib/agent/aura-harness";
import { sinteseLigada } from "@/lib/agent/sintese-flag";
import { anexoDe } from "@/lib/agent/anexos";
import { INTENTS } from "@/lib/agent/contracts";
import { runTrajectoryTraced, type TrajectoryState } from "@/lib/agent/trajectory";
import { runToolByName, type ToolContext } from "@/lib/agent/runtime";

const base: ToolContext = { activeTab: "estudos", plan: "free", execMode: "auto" };

const grupo = (titulo: string, textos: string[]) => ({ titulo, trechos: textos.map((texto) => ({ texto })) });
const ctxComDocs = (n: number) =>
  ({ ...base, docsDaBase: Array.from({ length: n }, (_, i) => grupo(`Apostila ${i + 1}`, [`trecho do doc ${i + 1}`])) }) as ToolContext;
const ctxComAnexos = (n: number) =>
  ({
    ...base,
    anexos: Array.from({ length: n }, (_, i) =>
      anexoDe({ id: `a${i + 1}`, nome: `arquivo${i + 1}.pdf`, tipo: "application/pdf", texto: `conteúdo do anexo ${i + 1} `.repeat(40) })),
  }) as ToolContext;

const SINTESE = {
  comum: ["os dois definem entropia como medida de incerteza"],
  divergem: ["a Apostila 1 usa base 2; a 2 usa base natural"],
  lacunas: ["nenhum trata de entropia condicional"],
  porDocumento: [{ titulo: "Apostila 1", diz: "define e aplica" }],
};

const gen = (resposta: unknown = SINTESE) =>
  vi.fn(async (system: string, _user?: string, _o?: any): Promise<any> => {
    if (/Você compara VÁRIOS documentos/.test(system)) return resposta;
    if (/Você decide se FALTA/.test(system)) return { pronto: true };
    if (/reasoning/i.test(system)) return { reasoning: "RACIOCINIO GENERICO" };
    return { nucleo: "N" };
  });

const stFor = (over: Partial<TrajectoryState> = {}): TrajectoryState =>
  ({
    objective: "o que esses materiais dizem sobre entropia", intent: "explicar_conceito", mode: "elaborated",
    academicMode: "flexible", spec: INTENTS.explicar_conceito, iter: 1, evidence: [], artifacts: [], reasoning: "",
    ...over,
  }) as TrajectoryState;

const chamadaDaSintese = (g: ReturnType<typeof gen>) =>
  g.mock.calls.find((c) => /Você compara VÁRIOS documentos/.test(String(c[0])));

/** Só as tools de anexo rodam de verdade; as de busca são dublê (senão o plano sai pra internet). */
const soAnexoDeVerdade = () =>
  vi.fn(async (name: string, args: any, c: any, o: any) =>
    name === "ler_anexo" || name === "listar_anexos" ? runToolByName(name, args, c, o) : ({ ok: true, findings: [], provenance: {} } as any));

const comFlag = async (v: string | undefined, fn: () => Promise<void>) => {
  const antes = process.env.HARNESS_SINTESE;
  if (v === undefined) delete process.env.HARNESS_SINTESE;
  else process.env.HARNESS_SINTESE = v;
  try { await fn(); } finally {
    if (antes === undefined) delete process.env.HARNESS_SINTESE;
    else process.env.HARNESS_SINTESE = antes;
  }
};

describe("a flag", () => {
  it("AUSENTE = LIGADA (dono: tudo ON); só 0/off/false/não desligam", () => {
    expect(sinteseLigada({})).toBe(true);
    for (const v of ["0", "off", "false", "nao"]) expect(sinteseLigada({ HARNESS_SINTESE: v }), v).toBe(false);
    expect(sinteseLigada({ HARNESS_SINTESE: "1" })).toBe(true);
  });
});

describe("DESLIGADA (=0) · o turno é o antigo", () => {
  it("a fase `reason` segue pulada no caminho elaborado, mesmo com 5 documentos", async () => {
    await comFlag("0", async () => {
      const genJson = gen();
      const deps = buildHarnessDeps(ctxComDocs(5), { genJson, retryDelayMs: 0 });
      expect(deps.pulaRaciocinio!(stFor())).toBe(true);
      expect(await deps.reason(stFor())).toBe("");
      expect(chamadaDaSintese(genJson)).toBeUndefined();
    });
  });
});

describe("LIGADA · quando a síntese acontece", () => {
  it("com 2+ documentos a fase VOLTA a existir", async () => {
    await comFlag("1", async () => {
      const deps = buildHarnessDeps(ctxComDocs(2), { genJson: gen(), retryDelayMs: 0 });
      expect(deps.pulaRaciocinio!(stFor())).toBe(false);
    });
  });

  it("com UM documento continua pulada — a `reason` não ajudava com um só (eval de out/2026)", async () => {
    await comFlag("1", async () => {
      const umDoc = buildHarnessDeps(ctxComDocs(1), { genJson: gen(), retryDelayMs: 0 });
      expect(umDoc.pulaRaciocinio!(stFor())).toBe(true);
      expect(await umDoc.reason(stFor())).toBe("");
      const semDoc = buildHarnessDeps(base, { genJson: gen(), retryDelayMs: 0 });
      expect(semDoc.pulaRaciocinio!(stFor())).toBe(true);
    });
  });

  it("dois ANEXOS também contam (não é só a base)", async () => {
    await comFlag("1", async () => {
      const deps = buildHarnessDeps(ctxComAnexos(2), { genJson: gen(), retryDelayMs: 0 });
      expect(deps.pulaRaciocinio!(stFor())).toBe(false);
    });
  });

  it("um anexo + um documento da base somam dois", async () => {
    await comFlag("1", async () => {
      const ctx = { ...ctxComAnexos(1), docsDaBase: (ctxComDocs(1) as any).docsDaBase } as ToolContext;
      expect(buildHarnessDeps(ctx, { genJson: gen(), retryDelayMs: 0 }).pulaRaciocinio!(stFor())).toBe(false);
    });
  });
});

describe("LIGADA · o que a síntese produz", () => {
  it("o ANEXO vem primeiro no prompt (é o documento que a pessoa acabou de dar)", async () => {
    await comFlag("1", async () => {
      const ctx = { ...ctxComAnexos(1), docsDaBase: (ctxComDocs(1) as any).docsDaBase } as ToolContext;
      const genJson = gen();
      await buildHarnessDeps(ctx, { genJson, retryDelayMs: 0 }).reason(stFor());
      const user = String(chamadaDaSintese(genJson)![1]);
      expect(user.indexOf("arquivo1.pdf")).toBeLessThan(user.indexOf("Apostila 1"));
      expect(user).toContain("[anexado agora]");
      expect(user).toContain("Documentos em jogo: 2");
    });
  });

  it("devolve o bloco comparativo, com as lacunas e a trava de não preencher", async () => {
    await comFlag("1", async () => {
      const r = await buildHarnessDeps(ctxComDocs(2), { genJson: gen(), retryDelayMs: 0 }).reason(stFor());
      expect(r).toContain("Convergem em:");
      expect(r).toContain("Divergem em:");
      expect(r).toContain("NENHUM documento cobre");
      expect(r).toMatch(/não preencha com conhecimento geral/);
      expect(r).not.toContain("RACIOCINIO GENERICO");   // é a síntese, não o raciocínio antigo
    });
  });

  it("ponta a ponta: a comparação chega no prompt do RASCUNHO", async () => {
    await comFlag("1", async () => {
      const genJson = gen();
      const { state } = await runTrajectoryTraced(
        "o que esses materiais dizem sobre entropia",
        ctxComDocs(3),
        buildHarnessDeps(ctxComDocs(3), { genJson, runToolImpl: soAnexoDeVerdade(), retryDelayMs: 0 }),
      );
      expect(state.reasoning).toContain("Divergem em:");
      const userDoDraft = String(genJson.mock.calls.find((c) => /Campos obrigat/i.test(String(c[0])))?.[1] ?? "");
      expect(userDoDraft).toContain("Raciocínio:");
      expect(userDoDraft).toContain("base 2");
    });
  });
});

describe("LIGADA · os freios", () => {
  it("síntese VAZIA não vira linha no prompt", async () => {
    await comFlag("1", async () => {
      expect(await buildHarnessDeps(ctxComDocs(2), { genJson: gen({}), retryDelayMs: 0 }).reason(stFor())).toBe("");
    });
  });

  it("síntese que ESTOURA não derruba o turno (é auxiliar, como o resto da fase)", async () => {
    await comFlag("1", async () => {
      const genJson = vi.fn(async (system: string, _u?: string, _o?: any): Promise<any> => {
        if (/Você compara VÁRIOS documentos/.test(system)) throw new Error("fetch failed");
        return { nucleo: "respondi mesmo assim" };
      });
      const deps = buildHarnessDeps(ctxComDocs(2), { genJson, runToolImpl: soAnexoDeVerdade(), retryDelayMs: 0 });
      const { answer, state } = await runTrajectoryTraced("x", ctxComDocs(2), deps);
      expect(answer.nucleo).toBe("respondi mesmo assim");
      expect(state.reasoning).toBe("");
    });
  });

  it("resposta com lixo não injeta nada no prompt", async () => {
    await comFlag("1", async () => {
      for (const lixo of ["texto solto", 42, null, { comum: "x" }]) {
        expect(await buildHarnessDeps(ctxComDocs(2), { genJson: gen(lixo), retryDelayMs: 0 }).reason(stFor()), String(lixo)).toBe("");
      }
    });
  });
});
