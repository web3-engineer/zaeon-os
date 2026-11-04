/**
 * lib/agent/harness-evidencia.test.ts — F6 · o teto POR TAREFA e a crítica PEDINDO EVIDÊNCIA.
 *
 * As duas mudanças que este arquivo fixa nasceram da mesma falha: o laço tratava toda tarefa como a
 * mesma tarefa (2 voltas pra qualquer coisa) e não tinha caminho de volta pro `gather` depois de
 * escrever — um veredito "afirmação sem fonte" era respondido reescrevendo o mesmo texto sem fonte.
 *
 * O que se mede aqui é o LAÇO e a POLÍTICA, nos dois sentidos: que a volta dirigida acontece quando
 * deve, e que ela NÃO acontece quando não deve (sem a dep, sem lacuna de fonte, sem orçamento, e
 * nunca duas vezes). Os testes de borda usam deps crus; o de ponta a ponta usa o adaptador e o
 * examiner REAIS, porque é assim que um defeito de fiação aparece — foi um teste com `critique`
 * injetado que escondeu, hoje, o defeito do bundler no MCP.
 */
import { describe, it, expect, vi } from "vitest";

// roteador stubado e MUTÁVEL: o que se mede aqui é o laço, não a classificação
const rota = vi.hoisted(() => ({ intent: "criar_trabalho", mode: "research", academicMode: "enforced", kind: "artigo" }));
vi.mock("@/lib/agent/router", () => ({ classify: vi.fn(async () => ({ ...rota }) as any) }));

import { buildHarnessDeps, VOLTAS_ACAO_PADRAO, VOLTAS_POR_INTENT, voltasDeAcao } from "@/lib/agent/aura-harness";
import {
  MAX_VOLTAS_EVIDENCIA,
  MAX_VOLTAS_GATHER,
  lacunasDeEvidencia,
  runTrajectoryTraced,
  type HarnessDeps,
  type Step,
} from "@/lib/agent/trajectory";
import { INTENT_IDS, type Issue } from "@/lib/agent/contracts";
import type { ToolContext } from "@/lib/agent/runtime";

const ctx: ToolContext = { activeTab: "estudos", plan: "free", execMode: "auto" };
const semFonte: Issue = { tipo: "sem_fonte", onde: "resposta", porque: "nenhuma afirmação está ancorada em fonte verificável", sugestao: "buscar literatura" };
const confuso: Issue = { tipo: "confuso", onde: "desenvolvimento", porque: "estrutura ruim", sugestao: "reescrever" };
const achado = (t: string) => ({ ok: true, findings: [{ claim: `${t}: conteúdo`, source: { title: t }, confidence: "média" }], provenance: {} }) as any;
const vazio = () => ({ ok: true, findings: [], provenance: {} }) as any;

const comFlags = async (vals: Record<string, string | undefined>, fn: () => Promise<void> | void) => {
  const antes: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(vals)) {
    antes[k] = process.env[k];
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
  try { await fn(); } finally {
    for (const [k, v] of Object.entries(antes)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
};

// ─────────────────────────── 1 · o teto é por tarefa ───────────────────────────

describe("F6 · o teto de voltas é POR TAREFA", () => {
  it("a tabela só fala de intenções que EXISTEM (chave errada = número que não faz nada)", () => {
    // o defeito que esta asserção pega é o da superfície "meus-estudos" vs "estudos": uma chave que
    // ninguém procura nunca dá erro, só deixa de valer. `satisfies` não cobre: a chave pode ser
    // válida no tipo e a tabela ainda estar incompleta.
    for (const k of Object.keys(VOLTAS_POR_INTENT)) expect(INTENT_IDS, k).toContain(k);
    for (const id of INTENT_IDS) expect(Object.keys(VOLTAS_POR_INTENT), id).toContain(id);
  });

  it("nenhuma entrada passa do teto DURO do motor (seria número que o motor desfaz em silêncio)", () => {
    for (const [id, n] of Object.entries(VOLTAS_POR_INTENT)) {
      expect(n, id).toBeLessThanOrEqual(MAX_VOLTAS_GATHER - 1);
      expect(voltasDeAcao({}, { intent: id as any }), id).toBe(n);
    }
  });

  it("pergunta simples anda com 0–1; pedido de trabalho ganha 5", () => {
    expect(voltasDeAcao({}, { intent: "duvida_rapida" })).toBe(0);
    expect(voltasDeAcao({}, { intent: "conversa" })).toBe(0);
    expect(voltasDeAcao({}, { intent: "buscar_livro" })).toBe(1);
    expect(voltasDeAcao({}, { intent: "criar_trabalho" })).toBe(5);
    expect(voltasDeAcao({}, { intent: "criar_trabalho" })).toBeGreaterThan(voltasDeAcao({}, { intent: "duvida_rapida" }));
  });

  it("sem tarefa (ou tarefa desconhecida) cai no padrão de antes — nada muda pra quem não passa `st`", () => {
    expect(voltasDeAcao({})).toBe(VOLTAS_ACAO_PADRAO);
    expect(voltasDeAcao({}, {})).toBe(VOLTAS_ACAO_PADRAO);
    expect(voltasDeAcao({}, { intent: null })).toBe(VOLTAS_ACAO_PADRAO);
  });

  it("HARNESS_VOLTAS_ACAO é a alavanca CEGA do dono: setada, vale pra toda tarefa", () => {
    expect(voltasDeAcao({ HARNESS_VOLTAS_ACAO: "1" }, { intent: "criar_trabalho" })).toBe(1);
    expect(voltasDeAcao({ HARNESS_VOLTAS_ACAO: "0" }, { intent: "criar_trabalho" })).toBe(0);
    expect(voltasDeAcao({ HARNESS_VOLTAS_ACAO: "999" }, { intent: "duvida_rapida" })).toBe(MAX_VOLTAS_GATHER - 1);
  });

  it("env em branco/lixo é AUSENTE, não zero: volta pra tabela da tarefa", () => {
    for (const v of ["", "   ", "abc", "-3", "null"]) {
      expect(voltasDeAcao({ HARNESS_VOLTAS_ACAO: v }, { intent: "criar_trabalho" }), v).toBe(5);
    }
  });
});

const comRota = async (intent: string, mode: string, fn: () => Promise<void>) => {
  const antes = { ...rota };
  Object.assign(rota, { intent, mode });
  try { await fn(); } finally { Object.assign(rota, antes); }
};

describe("F6 · o teto por tarefa VALE no turno real (não é número que o ledger desfaz)", () => {
  /** um turno onde o modelo sempre pede mais: mede quantas voltas a tarefa realmente consegue. */
  const gastaTudo = async (intent: string, mode: string) => {
    let n = 0;
    const genJson = vi.fn(async (system: string, _u?: string): Promise<any> => {
      if (/Você decide se FALTA/.test(system)) return { chamadas: [{ tool: "literature_search", args: { query: `q${n++}` } }] };
      if (/subquestions/i.test(system)) return { subquestions: ["q"] };
      if (/reasoning/i.test(system)) return { reasoning: "R" };
      return { nucleo: "N".repeat(400), work: { titulo: "T" }, proximos_passos: ["p"], evidencia: [{ claim: "c" }] };
    });
    let st: any;
    await comRota(intent, mode, async () => {
      const r = await runTrajectoryTraced("escreva um artigo sobre X", ctx, buildHarnessDeps(ctx, { genJson, runToolImpl: vi.fn(async () => achado("P")), retryDelayMs: 0 }));
      st = r.state;
    });
    return st;
  };

  it("`criar_trabalho` chega nas 5 voltas DE VERDADE, e o orçamento do modo paga", async () => {
    // medido em 11/2026: 19k de 40k tokens com as 5 voltas gastas. Se um dia o teto subir acima do
    // que o `research` paga, o `overBudget` corta antes e este teste cai — que é o ponto: um número
    // que o ledger desfaz é pior que um número menor e honesto.
    const st = await gastaTudo("criar_trabalho", "research");
    expect(st.voltas).toBe(voltasDeAcao({}, { intent: "criar_trabalho" }));
    expect(st.voltas).toBe(5);
    expect(st.spent.tokens).toBeLessThan(st.budget.tokens);
  });

  it("e a tarefa simples continua curta: `buscar_livro` gasta 1, não 5", async () => {
    const st = await gastaTudo("buscar_livro", "elaborated");
    expect(st.voltas).toBe(1);
  });

  it("`pesquisar_fontes` fica em 2 porque é o que o orçamento `elaborated` paga", async () => {
    // a 3ª volta custaria ~1,6k sobre os ~10,2k medidos: estouraria os 12k e trocaria a revisão por
    // coleta no escuro. O teto baixo aqui é a consequência do ledger, não timidez.
    const st = await gastaTudo("pesquisar_fontes", "elaborated");
    expect(st.voltas).toBe(2);
    expect(st.budget.tokens - st.spent.tokens).toBeLessThan(2_400);
  });
});

// ─────────────────── 2 · a crítica pedindo evidência (bordas, deps cruas) ───────────────────

/** deps cruas: o teste diz o que a crítica responde e o que a coleta dirigida devolve. */
function deps(o: {
  issues: Issue[];
  comDep?: boolean;
  passos?: Step[];
  achaNaDirigida?: boolean;
  maxRevisions?: number;
}): { deps: HarnessDeps; dirigidas: () => readonly Issue[][] } {
  const dirigidas: Issue[][] = [];
  let n = 0;
  let dirigiu = false;
  const d: HarnessDeps = {
    classify: async () => ({ intent: "explicar_conceito", mode: "elaborated", academicMode: "flexible" }) as any,
    plan: async () => [{ tool: "web_search", args: { query: "inicial" } }],
    runTool: async () => (dirigiu && o.achaNaDirigida ? achado("nova") : vazio()),
    reason: async () => "",
    // nucleo DIFERENTE por iteração: igual, o loop-guard pararia antes da crítica
    draft: async () => ({ nucleo: `N${n++}` }),
    critique: async () => ({ decision: "revisar", score: 3, issues: o.issues }) as any,
    emit: () => undefined,
    persistMemory: async () => undefined,
    ...(o.comDep === false ? {} : {
      async passosDeEvidencia(_st, lacunas) {
        dirigidas.push([...lacunas]);
        dirigiu = true;
        return o.passos ?? [{ tool: "literature_search", args: { query: "dirigida" } }];
      },
    }),
  };
  return { deps: d, dirigidas: () => dirigidas };
}

describe("F6 · a crítica pode pedir evidência — uma vez", () => {
  it("`lacunasDeEvidencia` só deixa passar o que COLETA resolve", () => {
    expect(lacunasDeEvidencia([semFonte, confuso])).toEqual([semFonte]);
    expect(lacunasDeEvidencia([confuso, { ...confuso, tipo: "raso" }, { ...confuso, tipo: "lacuna" }])).toEqual([]);
    expect(lacunasDeEvidencia()).toEqual([]);
    expect(lacunasDeEvidencia([undefined as any])).toEqual([]);
  });

  it("veredito `sem_fonte` → UMA volta dirigida, com as lacunas na mão, e a evidência chega", async () => {
    const { deps: d, dirigidas } = deps({ issues: [semFonte], achaNaDirigida: true });
    const { state } = await runTrajectoryTraced("explique X", ctx, d);
    expect(dirigidas()).toHaveLength(1);
    expect(dirigidas()[0]).toEqual([semFonte]);            // o PEDIDO chega inteiro em quem coleta
    expect(state.voltasEvidencia).toBe(MAX_VOLTAS_EVIDENCIA);
    expect(state.evidence.map((e) => e.source?.title)).toContain("nova");
    expect(state.pedidoDeEvidencia).toBeUndefined();        // consumido: não é estado grudento
  });

  it("o pedido PASSA NA FRENTE do `maxIter` — sem isso, com maxRevisions=1, nunca existiria", async () => {
    const { deps: d, dirigidas } = deps({ issues: [semFonte], achaNaDirigida: true });
    const { state } = await runTrajectoryTraced("explique X", ctx, d);
    expect(INTENT_IDS).toContain("explicar_conceito");
    expect(state.spec.maxRevisions).toBe(1);               // pararia na 1ª iteração...
    expect(state.iter).toBeGreaterThan(1);                 // ...e não parou: a iteração extra rodou
    expect(state.stop).toBeTruthy();
  });

  it("insistir não ganha segunda volta: a crítica repete `sem_fonte` e o turno TERMINA", async () => {
    const { deps: d, dirigidas } = deps({ issues: [semFonte], achaNaDirigida: false });
    const { state } = await runTrajectoryTraced("explique X", ctx, d);
    expect(dirigidas()).toHaveLength(1);                   // uma só, por mais que a crítica reclame
    expect(state.voltasEvidencia).toBe(1);
    expect(state.stop).toBeTruthy();
  });

  it("lacuna que coleta NÃO resolve (`confuso`) não gasta volta dirigida", async () => {
    const { deps: d, dirigidas } = deps({ issues: [confuso] });
    const { state } = await runTrajectoryTraced("explique X", ctx, d);
    expect(dirigidas()).toHaveLength(0);
    expect(state.voltasEvidencia).toBe(0);
    expect(state.stop).toBe("maxIter");
  });

  it("SEM a dep `passosDeEvidencia`, o laço é o de antes da F6: para no `maxIter`, sem iteração extra", async () => {
    const { deps: d } = deps({ issues: [semFonte], comDep: false });
    const { state } = await runTrajectoryTraced("explique X", ctx, d);
    expect(state.voltasEvidencia).toBe(0);
    expect(state.iter).toBe(1);
    expect(state.stop).toBe("maxIter");
  });

  it("sem orçamento não se concede nada (o freio de custo vem antes do pedido)", async () => {
    const { deps: d, dirigidas } = deps({ issues: [semFonte], achaNaDirigida: true });
    const { state } = await runTrajectoryTraced("explique X", ctx, d, { budget: { tokens: 1, ms: 1 } });
    expect(dirigidas()).toHaveLength(0);
    expect(state.voltasEvidencia).toBe(0);
  });

  it("a coleta dirigida devolvendo [] não quebra o turno nem cobra volta em dobro", async () => {
    const { deps: d, dirigidas } = deps({ issues: [semFonte], passos: [] });
    const { answer, state } = await runTrajectoryTraced("explique X", ctx, d);
    expect(dirigidas()).toHaveLength(1);
    expect(state.voltasEvidencia).toBe(1);                 // a tentativa foi gasta: custou chamada
    expect(answer.nucleo).toMatch(/^N\d$/);                // e a resposta saiu
  });

  it("`degradado` deixa de valer quando a volta dirigida acha fonte (é o que libera o cache)", async () => {
    const { deps: d } = deps({ issues: [semFonte], achaNaDirigida: true });
    const { state } = await runTrajectoryTraced("explique X", ctx, d);
    expect(state.evidence.length).toBeGreaterThan(0);
    expect(state.degraded).toBe(false);                    // era true na 1ª iteração (gather vazio)
  });

  it("e CONTINUA degradado se a volta dirigida também vier vazia (nada de sucesso silencioso)", async () => {
    const { deps: d } = deps({ issues: [semFonte], achaNaDirigida: false });
    const { state } = await runTrajectoryTraced("explique X", ctx, d);
    expect(state.evidence).toHaveLength(0);
    expect(state.degraded).toBe(true);
  });
});

// ─────────────── 3 · ponta a ponta: adaptador e examiner REAIS ───────────────

describe("F6 · ponta a ponta pelo adaptador (só genJson e runTool são falsos)", () => {
  it("turno sem fonte: o examiner real aponta `sem_fonte` e o adaptador vai buscar de novo", async () => {
    await comFlags({ HARNESS_ACAO: "1", HARNESS_VOLTAS_ACAO: "0" }, async () => {
      expect(rota.intent).toBe("criar_trabalho");   // a rota que o examiner real exige fonte
      // VOLTAS_ACAO_PADRAO em 0 pela env: assim a única coleta extra possível é a DIRIGIDA, e o que
      // o teste observa não pode ser confundido com uma volta normal da F2.
      const acoes: string[] = [];
      // com o teto normal em 0, `proximosPassos` nem chama o modelo: TODA vez que o prompt de ação
      // aparece, é a volta DIRIGIDA. É por isso que este sinal pode mandar na coleta.
      let dirigiu = false;
      const genJson = vi.fn(async (system: string, user?: string, _o?: any): Promise<any> => {
        if (/Você decide se FALTA/.test(system)) {
          acoes.push(String(user));
          dirigiu = true;
          return { chamadas: [{ tool: "literature_search", args: { query: "andragogia 2024" } }] };
        }
        if (/subquestions/i.test(system)) return { subquestions: ["q"] };
        if (/reasoning/i.test(system)) return { reasoning: "R" };
        return { nucleo: "N", work: { titulo: "T" }, proximos_passos: ["p"] };
      });
      // a 1ª rodada (a do plano) vem VAZIA — é o turno sem lastro que a crítica tem de apanhar
      const runToolImpl = vi.fn(async (_name: string) => (dirigiu ? achado("Paper real") : vazio()));
      const { state } = await runTrajectoryTraced(
        "escreva um artigo sobre andragogia",
        ctx,
        buildHarnessDeps(ctx, { genJson, runToolImpl, retryDelayMs: 0 }),
      );
      expect(state.intent).toBe("criar_trabalho");
      expect(state.voltas).toBe(0);                        // teto normal em 0: nenhuma volta da F2
      expect(state.voltasEvidencia).toBe(1);               // a dirigida, essa sim
      expect(state.evidence.map((e) => e.source?.title)).toContain("Paper real");
      // o prompt da volta dirigida INVERTE o viés e carrega o que a revisão apontou
      const dirigida = acoes.at(-1) ?? "";
      expect(dirigida).toContain("O QUE A REVISÃO APONTOU:");
      expect(dirigida).toContain("fonte verificável");
    });
  });
});
