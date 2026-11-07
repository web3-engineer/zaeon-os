/**
 * O PROTOCOLO DE CARGO em funcionamento. Este teste existe porque `reflections`/`ensemble` passaram
 * a vida inteira declarados em `INTENTS` e lidos por NINGUÉM — e a razão era estrutural: o nosso
 * crítico é código, não modelo, então um ensemble dele devolveria N vereditos idênticos. Agora eles
 * mudaram de lugar (tarefa → cargo) e de alvo (crítico → rascunho). Se isso voltar a ser enfeite,
 * é aqui que se descobre.
 */
import { describe, it, expect, vi } from "vitest";
import { buildHarnessDeps } from "./aura-harness";
import { ENSEMBLE_MAX_POR_MODO, ensembleDoTurno, maxRevisionsDoTurno } from "./trajectory";
import { CAPACIDADES } from "@/lib/agents/capacidades";

const ctx: any = { userId: "0123456789abcdef01234567", activeTab: "estudos", plan: "free", execMode: "auto" };
const estado = (over: any = {}): any => ({
  objective: "o que causa anemia ferropriva?",
  mode: "elaborated", academicMode: "off", intent: "explicar_conceito",
  spec: { tools: [], required: ["nucleo"], critic: "leve", reviseThreshold: 7, maxRevisions: 1 },
  evidence: [], reasoning: "", steps: [], artifacts: [], ...over,
});

describe("protocolo de cargo · ensemble no rascunho", () => {
  it("N=1 (ou ausente) → UMA chamada de rascunho, com prévia, temperatura 0.4: o caminho de sempre", async () => {
    const chamadas: any[] = [];
    const genJson = (async (_s: string, _u: string, o: any) => { chamadas.push(o); return { nucleo: "n" }; }) as any;
    const previa = vi.fn();
    await buildHarnessDeps(ctx, { genJson, onPrevia: previa }).draft(estado());
    expect(chamadas.filter((c) => c.phase === "draft")).toHaveLength(1);
    expect(chamadas[0].temperature).toBe(0.4);
    expect(typeof chamadas[0].onTexto).toBe("function"); // prévia ligada
  });

  it("N=3 → TRÊS chamadas, todas à MESMA temperatura (i.i.d., não um leque)", async () => {
    const chamadas: any[] = [];
    const genJson = (async (_s: string, _u: string, o: any) => { chamadas.push(o); return { nucleo: "n" }; }) as any;
    await buildHarnessDeps(ctx, { genJson, protocolo: { ensemble: 3 } }).draft(estado());
    const drafts = chamadas.filter((c) => c.phase === "draft");
    expect(drafts).toHaveLength(3);
    expect(new Set(drafts.map((c) => c.temperature)).size).toBe(1);
    expect(drafts[0].temperature).toBe(0.6); // acima de um rascunho só
  });

  it("SEM PRÉVIA quando N>1 — não se transmite ao vivo um rascunho que pode ser descartado", async () => {
    const chamadas: any[] = [];
    const genJson = (async (_s: string, _u: string, o: any) => { chamadas.push(o); return { nucleo: "n" }; }) as any;
    const previa = vi.fn();
    await buildHarnessDeps(ctx, { genJson, onPrevia: previa, protocolo: { ensemble: 3 } }).draft(estado());
    expect(chamadas.filter((c) => c.phase === "draft").every((c) => c.onTexto === undefined)).toBe(true);
    expect(previa).not.toHaveBeenCalled();
  });

  it("O CRÍTICO escolhe: ganha a amostra de maior score, não a primeira", async () => {
    // a 1ª vem oca (sem desenvolvimento/conceitos/proximos_passos → o crítico acha lacuna e pune);
    // a 3ª vem completa. Se o código devolvesse a primeira, este teste cai.
    const corpos = [
      { nucleo: "oca" },
      { nucleo: "média", desenvolvimento: "algum texto" },
      { nucleo: "completa", desenvolvimento: "texto longo o suficiente para não ser raso ".repeat(8), conceitos: ["ferro", "hemoglobina"], proximos_passos: ["ler sobre absorção de ferro"] },
    ];
    let i = 0;
    const genJson = (async () => corpos[i++] ?? corpos[0]) as any;
    const r = await buildHarnessDeps(ctx, { genJson, protocolo: { ensemble: 3 } }).draft(estado());
    expect(r.nucleo).toBe("completa");
  });

  it("amostra que FALHA não derruba o turno: as vivas continuam valendo", async () => {
    let i = 0;
    const genJson = (async () => {
      i++;
      if (i === 1) throw new Error("timeout");
      return { nucleo: `viva-${i}`, desenvolvimento: "x" };
    }) as any;
    const r = await buildHarnessDeps(ctx, { genJson, protocolo: { ensemble: 3 } }).draft(estado());
    expect(String(r.nucleo)).toMatch(/^viva-/);
  });

  it("o TETO é do MODO, não do cargo: quick nunca faz ensemble", async () => {
    const chamadas: any[] = [];
    const genJson = (async (_s: string, _u: string, o: any) => { chamadas.push(o); return { nucleo: "n" }; }) as any;
    await buildHarnessDeps(ctx, { genJson, protocolo: { ensemble: 5 } }).draft(estado({ mode: "quick" }));
    expect(chamadas.filter((c) => c.phase === "draft")).toHaveLength(1);
  });
});

describe("protocolo de cargo · os tetos e as contas", () => {
  it("ensembleDoTurno corta pelo modo e nunca devolve menos de 1", () => {
    expect(ensembleDoTurno(5, "quick")).toBe(1);
    expect(ensembleDoTurno(5, "elaborated")).toBe(3);
    expect(ensembleDoTurno(5, "research")).toBe(5);
    expect(ensembleDoTurno(3, "research")).toBe(3);   // pede menos que o teto: vale o pedido
    expect(ensembleDoTurno(0, "research")).toBe(1);
    expect(ensembleDoTurno(undefined, "research")).toBe(1);
  });

  it("a intenção é PISO de maxRevisions: o cargo sobe, nunca desce", () => {
    // criar_trabalho pede 2; um cargo de reflexoes 0 não pode torná-lo menos exigente
    expect(maxRevisionsDoTurno(2, 0, "research")).toBe(2);
    // e um cargo insistente sobe, até o teto do modo (research: 2 → 1+2 = 3)
    expect(maxRevisionsDoTurno(1, 2, "research")).toBe(3);
    expect(maxRevisionsDoTurno(1, 5, "research")).toBe(3);
    // elaborated tem teto 1 → no máximo 2
    expect(maxRevisionsDoTurno(1, 5, "elaborated")).toBe(2);
    // quick não tem laço → fica no piso
    expect(maxRevisionsDoTurno(1, 5, "quick")).toBe(1);
  });

  it("todo cargo tem protocolo, e nenhum pede acima do teto do modo mais generoso", () => {
    for (const [id, c] of Object.entries(CAPACIDADES)) {
      expect(c.protocolo, id).toBeTruthy();
      expect(c.protocolo.ensemble, id).toBeGreaterThanOrEqual(1);
      expect(c.protocolo.ensemble, id).toBeLessThanOrEqual(ENSEMBLE_MAX_POR_MODO.research);
      expect(c.protocolo.reflexoes, id).toBeGreaterThanOrEqual(0);
      expect(c.protocolo.porque.length, id).toBeGreaterThan(40); // o porquê fica no código
    }
  });

  it("os cargos REALMENTE diferem — senão o protocolo é enfeite com nome novo", () => {
    const z = CAPACIDADES.zenita.protocolo, a = CAPACIDADES.aura.protocolo;
    expect(z.ensemble).toBeGreaterThan(a.ensemble);   // ela gasta em largura
    expect(a.reflexoes).toBeGreaterThan(z.reflexoes); // ele, em profundidade
  });
});
