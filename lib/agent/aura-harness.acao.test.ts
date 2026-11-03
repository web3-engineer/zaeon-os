import { describe, it, expect, vi } from "vitest";

// roteador stubado: o que se mede aqui é o LAÇO, não a classificação
vi.mock("@/lib/agent/router", () => ({
  classify: vi.fn(async () => ({ intent: "explicar_conceito", mode: "elaborated", academicMode: "flexible" }) as any),
}));

import {
  acaoDoModeloLigada,
  buildHarnessDeps,
  VOLTAS_ACAO_PADRAO,
  voltasDeAcao,
} from "@/lib/agent/aura-harness";
import { MAX_VOLTAS_GATHER, runTrajectoryTraced, type HarnessDeps, type TrajectoryState } from "@/lib/agent/trajectory";
import { INTENTS } from "@/lib/agent/contracts";
import type { ToolContext } from "@/lib/agent/runtime";

const ctx: ToolContext = { activeTab: "estudos", plan: "free", execMode: "auto" };

const comFlags = async (vals: Record<string, string | undefined>, fn: () => Promise<void> | void) => {
  const antes: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(vals)) {
    antes[k] = process.env[k];
    if (v === undefined) delete process.env[k];   // Object.assign gravaria a STRING "undefined"
    else process.env[k] = v;
  }
  try { await fn(); } finally {
    for (const [k, v] of Object.entries(antes)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
};

/** genJson que atende cada fase, e deixa o teste dizer o que a fase de AÇÃO responde por volta. */
const genPara = (respostasDaAcao: unknown[]) => {
  let i = 0;
  const fn = vi.fn(async (system: string, _user?: string, _o?: any): Promise<any> => {
    if (/Você decide se FALTA/.test(system)) return respostasDaAcao[i++] ?? { pronto: true };
    if (/subquestions/i.test(system)) return { subquestions: ["q"] };
    if (/reasoning/i.test(system)) return { reasoning: "R" };
    return { nucleo: "N" };
  });
  return fn;
};

const achado = (titulo: string) => ({ ok: true, findings: [{ claim: `${titulo}: conteúdo`, source: { title: titulo }, confidence: "média" }], provenance: {} }) as any;
const vazio = () => ({ ok: true, findings: [], provenance: {} }) as any;

const userDoDraft = (gen: ReturnType<typeof genPara>) =>
  String(gen.mock.calls.find((c) => /Campos obrigat/i.test(String(c[0])))?.[1] ?? "");
const chamadasDaAcao = (gen: ReturnType<typeof genPara>) =>
  gen.mock.calls.filter((c) => /Você decide se FALTA/.test(String(c[0])));

describe("F2 · as flags e os dois tetos", () => {
  it("HARNESS_ACAO: AUSENTE = LIGADA (dono: tudo ON); só 0/off/false/não desligam", () => {
    expect(acaoDoModeloLigada({})).toBe(true);
    for (const v of ["0", "off", "false", "nao"]) expect(acaoDoModeloLigada({ HARNESS_ACAO: v }), v).toBe(false);
    expect(acaoDoModeloLigada({ HARNESS_ACAO: "1" })).toBe(true);
  });

  it("o teto de política é 2 (o número da casa) e é ajustável", () => {
    expect(VOLTAS_ACAO_PADRAO).toBe(2);
    expect(voltasDeAcao({})).toBe(2);
    expect(voltasDeAcao({ HARNESS_VOLTAS_ACAO: "1" })).toBe(1);
    expect(voltasDeAcao({ HARNESS_VOLTAS_ACAO: "0" })).toBe(0);   // desliga as voltas, mantém o resto
  });

  it("valor inválido cai no padrão; valor alto é PRESO no teto duro do motor", () => {
    for (const v of ["", "abc", "-3", "null"]) expect(voltasDeAcao({ HARNESS_VOLTAS_ACAO: v }), v).toBe(2);
    expect(voltasDeAcao({ HARNESS_VOLTAS_ACAO: "999" })).toBe(MAX_VOLTAS_GATHER - 1);
  });
});

describe("F2 · desligada (=0), o turno é o antigo", () => {
  it("o motor nem recebe `proximosPassos`", async () => {
    await comFlags({ HARNESS_ACAO: "0" }, () => {
      const deps = buildHarnessDeps(ctx, { genJson: genPara([]) });
      expect(deps.proximosPassos).toBeUndefined();
    });
  });

  it("o gather roda UMA vez e nenhuma chamada de ação é feita", async () => {
    await comFlags({ HARNESS_ACAO: "0" }, async () => {
      const genJson = genPara([{ chamadas: [{ tool: "web_search", args: { query: "x" } }] }]);
      const runToolImpl = vi.fn(async () => achado("Paper"));
      const { state } = await runTrajectoryTraced("explique entropia", ctx, buildHarnessDeps(ctx, { genJson, runToolImpl, retryDelayMs: 0 }));
      expect(state.voltas).toBe(0);
      expect(chamadasDaAcao(genJson)).toHaveLength(0);
      expect(runToolImpl.mock.calls.length).toBe(INTENTS.explicar_conceito.tools.length);
    });
  });
});

describe("F2 · ligada: observar → agir → observar", () => {
  it("o modelo pede uma tool na 2ª volta, ela RODA, e o achado chega no rascunho", async () => {
    await comFlags({ HARNESS_ACAO: "1" }, async () => {
      const genJson = genPara([
        { chamadas: [{ tool: "web_search", args: { query: "ipca outubro 2024" } }] },
        { pronto: true },
      ]);
      const runToolImpl = vi.fn(async (name: string, args: any) =>
        name === "web_search" && args?.query === "ipca outubro 2024" ? achado("IBGE outubro") : vazio());
      const { state } = await runTrajectoryTraced("explique o IPCA", ctx, buildHarnessDeps(ctx, { genJson, runToolImpl, retryDelayMs: 0 }));

      expect(state.voltas).toBe(1);
      expect(runToolImpl).toHaveBeenCalledWith("web_search", { query: "ipca outubro 2024" }, expect.anything(), expect.anything());
      expect(userDoDraft(genJson)).toContain("IBGE outubro");
    });
  });

  it("ROUND 1 VAZIO E ROUND 2 ACHA ⇒ o turno NÃO é degradado — é o ganho da fase", async () => {
    await comFlags({ HARNESS_ACAO: "1" }, async () => {
      const genJson = genPara([{ chamadas: [{ tool: "web_search", args: { query: "outro jeito" } }] }, { pronto: true }]);
      let volta = 0;
      const runToolImpl = vi.fn(async () => (++volta <= INTENTS.explicar_conceito.tools.length ? vazio() : achado("Achado tardio")));
      const { state } = await runTrajectoryTraced("explique X", ctx, buildHarnessDeps(ctx, { genJson, runToolImpl, retryDelayMs: 0 }));
      expect(state.evidence.length).toBeGreaterThan(0);
      expect(state.degraded).toBeFalsy();
    });
  });

  it("`pronto` na 1ª decisão encerra a coleta: 1 chamada de ação, nenhuma volta", async () => {
    await comFlags({ HARNESS_ACAO: "1" }, async () => {
      const genJson = genPara([{ pronto: true }]);
      const { state } = await runTrajectoryTraced("explique X", ctx, buildHarnessDeps(ctx, { genJson, runToolImpl: vi.fn(async () => achado("A")), retryDelayMs: 0 }));
      expect(state.voltas).toBe(0);
      expect(chamadasDaAcao(genJson)).toHaveLength(1);
    });
  });

  it("a decisão é cobrada no orçamento (é chamada de modelo, não é de graça)", async () => {
    await comFlags({ HARNESS_ACAO: "1" }, async () => {
      const gasto = async (ligada: boolean) => {
        const genJson = genPara([{ pronto: true }]);
        const deps = buildHarnessDeps(ctx, { genJson, runToolImpl: vi.fn(async () => achado("A")), retryDelayMs: 0 });
        if (!ligada) delete (deps as any).proximosPassos;
        return (await runTrajectoryTraced("explique X", ctx, deps)).state.spent.tokens;
      };
      expect(await gasto(true)).toBeGreaterThan(await gasto(false));
    });
  });
});

describe("F2 · os freios", () => {
  it("modelo que NUNCA diz pronto para no teto de política (+2 voltas, não mais)", async () => {
    await comFlags({ HARNESS_ACAO: "1", HARNESS_VOLTAS_ACAO: undefined }, async () => {
      // uma chamada NOVA a cada volta (senão a trava de repetição pararia antes, por outro motivo)
      let n = 0;
      const genJson = vi.fn(async (system: string, _user?: string, _o?: any): Promise<any> => {
        if (/Você decide se FALTA/.test(system)) return { chamadas: [{ tool: "web_search", args: { query: `q${n++}` } }] };
        if (/reasoning/i.test(system)) return { reasoning: "R" };
        return { nucleo: "N" };
      });
      const { state } = await runTrajectoryTraced("explique X", ctx, buildHarnessDeps(ctx, { genJson, runToolImpl: vi.fn(async () => achado("A")), retryDelayMs: 0 }));
      expect(state.voltas).toBe(VOLTAS_ACAO_PADRAO);
    });
  });

  it("HARNESS_VOLTAS_ACAO=0 mantém a F2 ligada mas sem volta nenhuma", async () => {
    await comFlags({ HARNESS_ACAO: "1", HARNESS_VOLTAS_ACAO: "0" }, async () => {
      const genJson = genPara([{ chamadas: [{ tool: "web_search", args: { query: "x" } }] }]);
      const { state } = await runTrajectoryTraced("explique X", ctx, buildHarnessDeps(ctx, { genJson, runToolImpl: vi.fn(async () => achado("A")), retryDelayMs: 0 }));
      expect(state.voltas).toBe(0);
      expect(chamadasDaAcao(genJson)).toHaveLength(0);   // nem pergunta: o teto é checado antes
    });
  });

  it("CHAMADA REPETIDA é descartada e o laço para (o modelo teimoso não gira o turno)", async () => {
    await comFlags({ HARNESS_ACAO: "1" }, async () => {
      // pede EXATAMENTE o que o plano determinístico já fez
      const genJson = genPara([
        { chamadas: [{ tool: "web_search", args: { query: "explique X" } }] },
        { chamadas: [{ tool: "web_search", args: { query: "explique X" } }] },
      ]);
      const runToolImpl = vi.fn(async () => achado("A"));
      const { state } = await runTrajectoryTraced("explique X", ctx, buildHarnessDeps(ctx, { genJson, runToolImpl, retryDelayMs: 0 }));
      expect(state.voltas).toBe(0);
      const doPlano = INTENTS.explicar_conceito.tools.length;
      expect(runToolImpl.mock.calls).toHaveLength(doPlano);   // nada rodou duas vezes
    });
  });

  it("tool INVENTADA não roda e encerra a coleta", async () => {
    await comFlags({ HARNESS_ACAO: "1" }, async () => {
      const genJson = genPara([{ chamadas: [{ tool: "clonar_repo", args: { repo: "x" } }] }]);
      const runToolImpl = vi.fn(async (_name: string, _args?: any) => achado("A"));
      const { state } = await runTrajectoryTraced("explique X", ctx, buildHarnessDeps(ctx, { genJson, runToolImpl, retryDelayMs: 0 }));
      expect(runToolImpl.mock.calls.every((c) => c[0] !== "clonar_repo")).toBe(true);
      expect(state.voltas).toBe(0);
    });
  });

  it("a decisão estourando NÃO derruba o turno (é auxiliar, como o `reason`)", async () => {
    await comFlags({ HARNESS_ACAO: "1" }, async () => {
      const genJson = vi.fn(async (system: string, _user?: string, _o?: any): Promise<any> => {
        if (/Você decide se FALTA/.test(system)) throw new Error("fetch failed");
        if (/reasoning/i.test(system)) return { reasoning: "R" };
        return { nucleo: "respondi mesmo assim" };
      });
      const { answer, state } = await runTrajectoryTraced("explique X", ctx, buildHarnessDeps(ctx, { genJson, runToolImpl: vi.fn(async () => achado("A")), retryDelayMs: 0 }));
      expect(answer.nucleo).toBe("respondi mesmo assim");
      expect(state.voltas).toBe(0);
    });
  });
});

describe("F2 · o teto DURO do motor não depende do adaptador", () => {
  /** um adaptador "quebrado": sempre pede mais, com argumento novo, pra sempre. */
  const depsInfinitas = (): { deps: HarnessDeps; voltas: () => number } => {
    let n = 0;
    const deps: HarnessDeps = {
      classify: async () => ({ intent: "explicar_conceito", mode: "elaborated", academicMode: "flexible" }) as any,
      plan: async () => [{ tool: "web_search", args: { query: "inicial" } }],
      proximosPassos: async () => [{ tool: "web_search", args: { query: `q${n++}` } }],
      runTool: async () => achado("A"),
      reason: async () => "",
      draft: async () => ({ nucleo: "N" }),
      critique: async () => ({ decision: "aprovado", score: 10, issues: [] }) as any,
      emit: () => undefined,
      persistMemory: async () => undefined,
    };
    return { deps, voltas: () => n };
  };

  it("mesmo com `proximosPassos` infinita, o turno TERMINA no teto do motor", async () => {
    const { deps, voltas } = depsInfinitas();
    const { state } = await runTrajectoryTraced("x", ctx, deps);
    expect(state.voltas).toBeLessThanOrEqual(MAX_VOLTAS_GATHER - 1);
    expect(voltas()).toBeLessThanOrEqual(MAX_VOLTAS_GATHER);
    expect(state.stop).toBeTruthy();
  });

  it("orçamento estourado também encerra as voltas", async () => {
    const { deps } = depsInfinitas();
    const { state } = await runTrajectoryTraced("x", ctx, deps, { budget: { tokens: 1, ms: 1 } });
    expect(state.voltas).toBe(0);
  });
});
