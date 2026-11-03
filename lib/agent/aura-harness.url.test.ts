import { describe, it, expect, vi } from "vitest";

// O roteador real faz 1 chamada ao Flash (com heurística de fallback). Aqui o que se mede é o
// ADAPTADOR em cima dele, então ele vira um stub — e o modo volta `quick` de propósito, que é o
// caso em que a leitura de página seria perdida.
const classifyMock = vi.fn(async () => ({ intent: "duvida_rapida", mode: "quick", academicMode: "flexible" }) as any);
vi.mock("@/lib/agent/router", () => ({ classify: (...a: any[]) => classifyMock(...(a as [])) }));

import { buildHarnessDeps, passosDeUrl } from "@/lib/agent/aura-harness";
import { registrarAbrirUrl } from "@/lib/agent/runtime";
import { INTENTS } from "@/lib/agent/contracts";
import { runTrajectoryTraced, type TrajectoryState } from "@/lib/agent/trajectory";
import type { ToolContext } from "@/lib/agent/runtime";

const ctx: ToolContext = { activeTab: "estudos", plan: "free", execMode: "auto" };
const URL_A = "https://sidra.ibge.gov.br/tabela/1737";

const smartGen = () =>
  vi.fn(async (system: string, _user?: string, _o?: any): Promise<any> => {
    if (/subquestions/i.test(system)) return { subquestions: ["q1"] };
    if (/reasoning/i.test(system)) return { reasoning: "R" };
    return { nucleo: "N", conceitos: ["c"], proximos_passos: ["p"] };
  });

const stFor = (over: Partial<TrajectoryState> = {}): TrajectoryState =>
  ({
    objective: `resume isso: ${URL_A}`,
    intent: "explicar_conceito", mode: "elaborated", academicMode: "flexible",
    spec: INTENTS.explicar_conceito, iter: 1, evidence: [], artifacts: [], reasoning: "",
    ...over,
  }) as TrajectoryState;

// ⚠️ ESTE BLOCO VEM PRIMEIRO: o registry é global e não dá pra desregistrar.
describe("sem o Leitor configurado, nada de leitura de página", () => {
  it("passosDeUrl devolve vazio mesmo com URL na mensagem", () => {
    expect(passosDeUrl(`abre ${URL_A}`)).toEqual([]);
  });

  it("e o turno curto continua curto (nada a ler ⇒ nada a mudar)", async () => {
    const deps = buildHarnessDeps(ctx, { genJson: smartGen() });
    expect((await deps.classify(`resume isso: ${URL_A}`, ctx)).mode).toBe("quick");
  });
});

describe("com o Leitor configurado", () => {
  it("ligando a tool", () => expect(registrarAbrirUrl({ LEITOR_PROXY_URL: "http://leitor:8787" })).toBe(true));

  it("cada URL da mensagem vira um passo com a URL no args (não `query`)", () => {
    const passos = passosDeUrl(`compara ${URL_A} com https://exemplo.com/b`);
    expect(passos).toEqual([
      { tool: "abrir_url", args: { url: URL_A } },
      { tool: "abrir_url", args: { url: "https://exemplo.com/b" } },
    ]);
  });

  it("mensagem sem URL não planeja leitura nenhuma", () => {
    expect(passosDeUrl("me explica o IPCA")).toEqual([]);
  });

  it("URL COLADA TIRA O TURNO DO CAMINHO RÁPIDO — senão o plan() nunca roda", async () => {
    const deps = buildHarnessDeps(ctx, { genJson: smartGen() });
    // `quick` vai direto pro draft (trajectory.ts): sem este degrau, a página jamais seria lida
    expect((await deps.classify(`resume isso: ${URL_A}`, ctx)).mode).toBe("elaborated");
    // e sem URL o caminho rápido continua rápido (não encarecemos o turno de graça)
    expect((await deps.classify("e aí, tudo bem?", ctx)).mode).toBe("quick");
  });

  it("a leitura vem ANTES das buscas, em toda intenção", async () => {
    const deps = buildHarnessDeps(ctx, { genJson: smartGen() });
    for (const intent of ["explicar_conceito", "gerar_artefato", "criar_trabalho"] as const) {
      const st = stFor({ intent, spec: INTENTS[intent], mode: INTENTS[intent].mode });
      const plano = await deps.plan(st);
      expect(plano[0], intent).toEqual({ tool: "abrir_url", args: { url: URL_A } });
      expect(plano.length, intent).toBeGreaterThan(1);   // a leitura não substitui o resto do plano
    }
  });

  it("ponta a ponta: a página é lida e o TEXTO dela chega no prompt do rascunho", async () => {
    const genJson = smartGen();
    const runToolImpl = vi.fn(async (name: string, args: any) => {
      if (name !== "abrir_url") return { ok: true, findings: [], provenance: {} } as any;
      expect(args).toEqual({ url: URL_A });
      return {
        ok: true,
        findings: [{ claim: "Tabela 1737 <https://sidra.ibge.gov.br/tabela/1737>\nIPCA mensal por grupo", source: { title: "Tabela 1737", url: URL_A }, confidence: "baixa" }],
        provenance: { toolsUsed: ["abrir_url"] },
      } as any;
    });
    const deps = buildHarnessDeps(ctx, { genJson, runToolImpl, retryDelayMs: 0 });

    const { state } = await runTrajectoryTraced(`resume isso: ${URL_A}`, ctx, deps);

    expect(runToolImpl).toHaveBeenCalledWith("abrir_url", { url: URL_A }, expect.anything(), expect.anything());
    expect(state.mode).toBe("elaborated");          // o degrau do classify valeu no motor de verdade
    const userDoDraft = String(genJson.mock.calls.find((c) => /Campos obrigat/i.test(String(c[0])))?.[1] ?? "");
    expect(userDoDraft).toContain("IPCA mensal por grupo");
  });

  it("falha na leitura não derruba o turno — e entra como observação pro rascunho contornar", async () => {
    const genJson = smartGen();
    const runToolImpl = vi.fn(async (name: string) =>
      name === "abrir_url"
        ? ({ ok: false, error: "domínio fora da lista do Leitor", code: "url_nao_permitida", provenance: {} } as any)
        : ({ ok: true, findings: [], provenance: {} } as any));
    const deps = buildHarnessDeps(ctx, { genJson, runToolImpl, retryDelayMs: 0 });

    const { answer } = await runTrajectoryTraced(`resume isso: ${URL_A}`, ctx, deps);

    expect(answer.nucleo).toBe("N");   // a resposta sai
    const userDoDraft = String(genJson.mock.calls.find((c) => /Campos obrigat/i.test(String(c[0])))?.[1] ?? "");
    expect(userDoDraft).toMatch(/FALHARAM/);
    expect(userDoDraft).toContain("url_nao_permitida");
    // e NÃO foi retentada (A2): allowlist não muda por insistência
    expect(runToolImpl.mock.calls.filter((c) => c[0] === "abrir_url")).toHaveLength(1);
  });

  it("agora o cardápio da F0 anuncia a capacidade — a propriedade que a F0 prometeu", async () => {
    const antes = process.env.HARNESS_CAPACIDADE;
    process.env.HARNESS_CAPACIDADE = "1";
    try {
      const genJson = smartGen();
      const deps = buildHarnessDeps(ctx, { genJson, retryDelayMs: 0 });
      await deps.draft(stFor());
      const sys = String(genJson.mock.calls.find((c) => /Campos obrigat/i.test(String(c[0])))?.[0] ?? "");
      expect(sys).toContain("abrir um endereço da web e ler o conteúdo da página");
      // e saiu do "NÃO executa", sem ninguém editar prompt
      expect(sys.split("NÃO executa")[1] ?? "").not.toContain("abrir um endereço da web e ler o conteúdo de uma página");
    } finally {
      if (antes === undefined) delete process.env.HARNESS_CAPACIDADE;
      else process.env.HARNESS_CAPACIDADE = antes;
    }
  });
});
