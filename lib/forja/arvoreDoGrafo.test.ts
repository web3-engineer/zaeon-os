import { describe, it, expect } from "vitest";
import { arvoreDoGrafo, comBaseDoGrafo, mesclarEnriquecimento } from "./arvoreDoGrafo";
import type { ArvoreEntendimento, GrafoConhecimento, NoEntendimento } from "./tipos";

const grafo: GrafoConhecimento = {
  nos: [
    { id: "seq.py", tipo: "arquivo", nome: "Seq.py", caminho: "Bio/Seq.py", grau: 20 },
    { id: "seq.py::Seq", tipo: "funcao", nome: "Seq", caminho: "Bio/Seq.py", grau: 15 },
    { id: "seq.py::MutableSeq", tipo: "funcao", nome: "MutableSeq", caminho: "Bio/Seq.py", grau: 8 },
    { id: "align.py", tipo: "arquivo", nome: "align.py", caminho: "Bio/align.py", grau: 5 },
    { id: "align.py::Alignment", tipo: "funcao", nome: "Alignment", caminho: "Bio/align.py", grau: 3 },
  ],
  arestas: [],
};

describe("arvoreDoGrafo — base de conhecimento derivada do grafo real", () => {
  const arv = arvoreDoGrafo(grafo, "Biopython");
  it("raiz nomeada; módulos (arquivos) viram ramos, ordenados por centralidade", () => {
    expect(arv.raiz.titulo).toBe("Biopython");
    expect(arv.raiz.filhos.map((f) => f.titulo)).toEqual(["Seq.py", "align.py"]); // Seq.py mais central primeiro
  });
  it("os símbolos centrais de cada módulo viram folhas (sem repetir o nome do módulo)", () => {
    const seq = arv.raiz.filhos.find((f) => f.titulo === "Seq.py")!;
    expect(seq.filhos.map((f) => f.titulo)).toEqual(["Seq", "MutableSeq"]);
  });
  it("respeita o teto de módulos", () => {
    expect(arvoreDoGrafo(grafo, "X", "", 1).raiz.filhos).toHaveLength(1);
  });
});

describe("comBaseDoGrafo — só deriva quando a árvore está vazia", () => {
  const vazia: ArvoreEntendimento = { raiz: { id: "r", titulo: "T", resumo: "", desde: "basico", refs: [], filhos: [] } };
  const cheia: ArvoreEntendimento = { raiz: { id: "r", titulo: "T", resumo: "", desde: "basico", refs: [], filhos: [{ id: "a", titulo: "A", resumo: "", desde: "basico", refs: [], filhos: [] }] } };
  it("árvore vazia + grafo com nós → deriva do grafo", () => {
    expect(comBaseDoGrafo({ arvore: vazia, grafo }, "Biopython").raiz.filhos.length).toBeGreaterThan(0);
  });
  it("árvore já cheia (understand rodou) → mantém a árvore, não deriva", () => {
    expect(comBaseDoGrafo({ arvore: cheia, grafo }, "Biopython")).toBe(cheia);
  });
  it("sem grafo → mantém a árvore como está", () => {
    expect(comBaseDoGrafo({ arvore: vazia, grafo: { nos: [], arestas: [] } }, "X")).toBe(vazia);
  });
});

describe("mesclarEnriquecimento — camada 1 aditiva, nunca destrói a base curada", () => {
  const ramo = (id: string, titulo: string): NoEntendimento => ({ id, titulo, resumo: "", desde: "basico", refs: [], filhos: [] });
  const base: ArvoreEntendimento = { raiz: { id: "raiz", titulo: "Curso", resumo: "r", desde: "basico", refs: [], filhos: [ramo("mod:0", "Lição A"), ramo("mod:1", "Lição B")] } };

  it("acrescenta os ramos do motor DEPOIS dos curados (a lição manda)", () => {
    const extra: ArvoreEntendimento = { raiz: { ...base.raiz, filhos: [ramo("mod:sym1", "símbolo real")] } };
    const r = mesclarEnriquecimento(base, extra);
    expect(r.raiz.filhos.map((f) => f.id)).toEqual(["mod:0", "mod:1", "mod:sym1"]);
  });

  it("não duplica ramo de id já presente", () => {
    const extra: ArvoreEntendimento = { raiz: { ...base.raiz, filhos: [ramo("mod:0", "dup"), ramo("mod:novo", "novo")] } };
    const r = mesclarEnriquecimento(base, extra);
    expect(r.raiz.filhos.map((f) => f.id)).toEqual(["mod:0", "mod:1", "mod:novo"]);
  });

  it("sem enriquecimento → a base intacta (mesma referência)", () => {
    expect(mesclarEnriquecimento(base, null)).toBe(base);
    expect(mesclarEnriquecimento(base, { raiz: { ...base.raiz, filhos: [] } })).toBe(base);
  });

  it("sem base curada → o enriquecimento é a árvore", () => {
    const vaziaBase: ArvoreEntendimento = { raiz: { id: "raiz", titulo: "x", resumo: "", desde: "basico", refs: [], filhos: [] } };
    const extra: ArvoreEntendimento = { raiz: { ...vaziaBase.raiz, filhos: [ramo("g:1", "do grafo")] } };
    expect(mesclarEnriquecimento(vaziaBase, extra)).toBe(extra);
  });
});
