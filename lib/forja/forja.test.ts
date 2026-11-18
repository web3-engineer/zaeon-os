import { describe, it, expect } from "vitest";
import { fundirGrafos } from "./provedor";
import { arvoreNaTemperatura, grafoNaTemperatura, cobrancaDaTemperatura, rankTemperatura } from "./temperatura";
import { modulosPadrao, conexoesDoBoard } from "./curso";
import type { ArvoreEntendimento, GrafoConhecimento } from "./tipos";

const grafo = (nos: [string, number][], arestas: [string, string][] = []): GrafoConhecimento => ({
  nos: nos.map(([id, grau]) => ({ id, tipo: "funcao" as const, nome: id, grau })),
  arestas: arestas.map(([de, para]) => ({ de, para, tipo: "chama" as const })),
});

describe("fundirGrafos", () => {
  it("dedup por id (mantém o maior grau, acumula fontes) e por aresta", () => {
    const g1: GrafoConhecimento = { nos: [{ id: "a", tipo: "funcao", nome: "a", grau: 2, fonte: "graphify" }], arestas: [{ de: "a", para: "b", tipo: "chama" }] };
    const g2: GrafoConhecimento = { nos: [{ id: "a", tipo: "funcao", nome: "a", grau: 5, fonte: "understand-anything" }, { id: "b", tipo: "funcao", nome: "b" }], arestas: [{ de: "a", para: "b", tipo: "chama" }] };
    const f = fundirGrafos([g1, g2]);
    expect(f.nos).toHaveLength(2);
    const a = f.nos.find((n) => n.id === "a")!;
    expect(a.grau).toBe(5);
    expect(a.fonte).toContain("graphify");
    expect(a.fonte).toContain("understand-anything");
    expect(f.arestas).toHaveLength(1); // a→b não duplicou
  });
});

describe("temperatura — poda da árvore", () => {
  const arv: ArvoreEntendimento = {
    raiz: { id: "r", titulo: "Projeto", resumo: "", desde: "basico", refs: [], filhos: [
      { id: "core", titulo: "Núcleo", resumo: "", desde: "medio", refs: [], filhos: [
        { id: "calls", titulo: "Chamadas", resumo: "", desde: "avancado", refs: [], filhos: [] },
      ] },
      { id: "fund", titulo: "Fundação", resumo: "", desde: "basico", refs: [], filhos: [] },
    ] },
  };
  it("básico mostra só o que é básico; avançado mostra tudo", () => {
    const b = arvoreNaTemperatura(arv, "basico");
    expect(b.raiz.filhos.map((f) => f.id)).toEqual(["fund"]); // core é médio, some
    const m = arvoreNaTemperatura(arv, "medio");
    expect(m.raiz.filhos.map((f) => f.id).sort()).toEqual(["core", "fund"]);
    expect(m.raiz.filhos.find((f) => f.id === "core")!.filhos).toHaveLength(0); // calls é avançado
    const a = arvoreNaTemperatura(arv, "avancado");
    expect(a.raiz.filhos.find((f) => f.id === "core")!.filhos.map((f) => f.id)).toEqual(["calls"]);
  });
});

describe("temperatura — subgrafo quente", () => {
  it("básico fica com os nós mais centrais + a raiz; avançado com tudo", () => {
    const g: GrafoConhecimento = { ...grafo([["a", 10], ["b", 8], ["c", 1], ["d", 0], ["e", 0]], [["a", "b"], ["c", "d"]]), raiz: "a" };
    const b = grafoNaTemperatura(g, "basico"); // 20% de 5 = 1 nó + raiz
    expect(b.nos.map((n) => n.id).sort()).toEqual(["a"]);
    expect(grafoNaTemperatura(g, "avancado").nos).toHaveLength(5);
    // arestas só entre os mantidos
    expect(b.arestas).toHaveLength(0);
  });
});

describe("temperatura — cobrança sobe com o calor", () => {
  it("básico não exige digitar; avançado traz codebox e exige digitação", () => {
    expect(cobrancaDaTemperatura("basico")).toEqual({ licoes: ["perguntas"], exigeDigitar: false });
    const av = cobrancaDaTemperatura("avancado");
    expect(av.exigeDigitar).toBe(true);
    expect(av.licoes).toContain("codebox");
    expect(av.licoes).toContain("entrevista");
    expect(rankTemperatura("avancado")).toBeGreaterThan(rankTemperatura("basico"));
  });
});

describe("board — módulos e conexões por modo", () => {
  it("curso: entender→espelho→entregar, todos ativos", () => {
    const m = modulosPadrao("curso");
    expect(m.map((x) => x.papel)).toEqual(["entender", "espelho", "entregar"]);
    expect(m.some((x) => x.passivo)).toBe(false);
    expect(conexoesDoBoard(m)).toEqual([{ de: "entender", para: "espelho" }, { de: "espelho", para: "entregar" }]);
  });
  it("entregável: entregar lidera; os engines ficam passivos (base)", () => {
    const m = modulosPadrao("entregavel");
    expect(m[0].papel).toBe("entregar");
    expect(m.filter((x) => x.passivo).map((x) => x.papel).sort()).toEqual(["entender", "espelho"]);
  });
});
