/**
 * lib/agent/aura-harness.pro.test.ts — F7 · QUAL MODELO EM QUAL FASE.
 *
 * Este arquivo existe por causa de um no-op. O desenho dizia que as fases pesadas rodavam no Pro, o
 * código tinha a expressão que faria isso, e em produção NUNCA acontecia — por dois motivos
 * somados: `opts.deepThink` não era passado por ninguém, e `opts.modelo` (que o cliente manda
 * SEMPRE, porque a pílula padrão é um id concreto) curto-circuitava o `||`.
 *
 * Nenhum teste pegou isso porque nenhum teste OLHAVA o modelo pedido por fase. Este olha: captura o
 * `model` de cada chamada do `genJson` e afirma o mapa inteiro, nos dois sentidos.
 */
import { describe, it, expect, vi } from "vitest";

const rota = vi.hoisted(() => ({ intent: "criar_trabalho", mode: "research", academicMode: "flexible", kind: "artigo" }));
vi.mock("@/lib/agent/router", () => ({ classify: vi.fn(async () => ({ ...rota }) as any) }));

import { buildHarnessDeps } from "@/lib/agent/aura-harness";
import { runTrajectoryTraced } from "@/lib/agent/trajectory";
import { GEMINI_MODEL_FLASH, GEMINI_MODEL_PRO } from "@/lib/ai/model";
import type { ToolContext } from "@/lib/agent/runtime";

const ctx: ToolContext = { activeTab: "estudos", plan: "free", execMode: "auto" };
const achado = () => ({ ok: true, findings: [{ claim: "c", source: { title: "P" }, confidence: "média" }], provenance: {} }) as any;

/** roda um turno e devolve o mapa fase → modelo pedido */
async function modelosPorFase(opts: Record<string, unknown>): Promise<Record<string, string>> {
  const mapa: Record<string, string> = {};
  const genJson = vi.fn(async (system: string, _u?: string, o?: any): Promise<any> => {
    if (o?.phase && o?.model) mapa[o.phase] = o.model;
    if (/Você decide se FALTA/.test(system)) return { pronto: true };
    if (/subquestions/i.test(system)) return { subquestions: ["q"] };
    if (/reasoning/i.test(system)) return { reasoning: "R" };
    return { nucleo: "N", work: { titulo: "T" }, proximos_passos: ["p"], evidencia: [{ claim: "c" }] };
  });
  await runTrajectoryTraced("escreva um artigo sobre X", ctx, buildHarnessDeps(ctx, {
    genJson, runToolImpl: vi.fn(async () => achado()), retryDelayMs: 0, ...opts,
  }));
  // GUARDA CONTRA PASSE NO VÁCUO: metade das asserções abaixo é "toda fase no modelo X", e com o
  // mapa vazio elas passariam sem medir nada. Este turno (`criar_trabalho`, modo research) dispara
  // QUATRO fases — e a lista foi escrita errada na primeira tentativa, até a guarda corrigir: a
  // `reason` NÃO é pulada aqui (`pulaRaciocinio` só vale no `elaborated`), e a `acao` roda porque
  // `HARNESS_ACAO` é ligada por padrão. `sintese` fica fora: precisa de 2+ documentos.
  expect(Object.keys(mapa).sort(), "as fases esperadas não rodaram — asserção vazia")
    .toEqual(["acao", "draft", "plan", "reason"]);
  return mapa;
}

describe("F7 · o Pro nas fases pesadas", () => {
  it("pílula PADRÃO + conta com direito: só o `plan` vai pro PRO; o resto segue FLASH", async () => {
    // é o caso de quase todo mundo: o cliente manda o id padrão, que não expressa preferência
    const m = await modelosPorFase({ modelo: GEMINI_MODEL_FLASH, modeloEhPadrao: true, proNasPesadas: true });
    expect(m.plan).toBe(GEMINI_MODEL_PRO);     // decidir O QUE buscar: raciocinar aqui muda o turno todo
    // O DRAFT FICA DE FORA, e é decisão, não esquecimento: a latência da 1ª palavra foi afinada com
    // eval (out/2026, 0,99 s medido) e o Pro desfaria isso na fase que o aluno espera olhando a tela.
    expect(m.draft).toBe(GEMINI_MODEL_FLASH);
    expect(m.acao).toBe(GEMINI_MODEL_FLASH);   // escolher tool num menu curto, com prazo de 12 s
    expect(m.reason).toBe(GEMINI_MODEL_FLASH); // 2–4 frases de raciocínio
  });

  it("O NO-OP DE ANTES: mandar `modelo` (o cliente SEMPRE manda) não pode mais anular o Pro", async () => {
    // a expressão antiga era `opts.modelo || (deepThink && heavy ? PRO : FLASH)`. Com `modelo`
    // preenchido — sempre — ela devolvia o Flash em TODA fase. Esta asserção é a lápide disso.
    const m = await modelosPorFase({ modelo: GEMINI_MODEL_FLASH, modeloEhPadrao: true, proNasPesadas: true });
    expect(m.plan).not.toBe(GEMINI_MODEL_FLASH);
  });

  it("conta SEM direito (free): tudo no Flash, mesmo com a fase pesada", async () => {
    const m = await modelosPorFase({ modelo: GEMINI_MODEL_FLASH, modeloEhPadrao: true, proNasPesadas: false });
    for (const [fase, modelo] of Object.entries(m)) expect(modelo, fase).toBe(GEMINI_MODEL_FLASH);
  });

  it("sem passar nada (o caminho de antes da F7): Flash em tudo, byte a byte", async () => {
    const m = await modelosPorFase({});
    for (const [fase, modelo] of Object.entries(m)) expect(modelo, fase).toBe(GEMINI_MODEL_FLASH);
  });

  it("escolha EXPLÍCITA do aluno manda em TODAS as fases — inclusive contra a política", async () => {
    // quem escolheu Flash-Lite pediu velocidade: receber Pro por trás seria desobedecer
    const lite = "gemini-3.5-flash-lite";
    const m = await modelosPorFase({ modelo: lite, modeloEhPadrao: false, proNasPesadas: true });
    for (const [fase, modelo] of Object.entries(m)) expect(modelo, fase).toBe(lite);
  });

  it("e quem escolhe o Pro na pílula recebe Pro em tudo, não só nas pesadas", async () => {
    const m = await modelosPorFase({ modelo: GEMINI_MODEL_PRO, modeloEhPadrao: false, proNasPesadas: false });
    for (const [fase, modelo] of Object.entries(m)) expect(modelo, fase).toBe(GEMINI_MODEL_PRO);
  });
});
