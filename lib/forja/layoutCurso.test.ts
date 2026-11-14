import { describe, it, expect } from "vitest";
import { layoutSaber, layoutCodigo, visivelNaTemp, CENTRO } from "./layoutCurso";
import type { ArvoreEntendimento, GrafoConhecimento } from "./tipos";

const arvore: ArvoreEntendimento = {
  raiz: {
    id: "r", titulo: "Raiz", resumo: "", desde: "basico", refs: [], filhos: [
      { id: "a", titulo: "A", resumo: "", desde: "basico", refs: [], filhos: [
        { id: "a1", titulo: "A1", resumo: "", desde: "avancado", refs: [], filhos: [] },
      ] },
      { id: "b", titulo: "B", resumo: "", desde: "medio", refs: [], filhos: [] },
    ],
  },
};

describe("layoutSaber — a árvore do understand vira posições + arestas", () => {
  const { nos, arestas } = layoutSaber(arvore);
  it("raiz no centro; todos os nós posicionados; arestas pai→filho", () => {
    expect(nos.find((n) => n.id === "r")).toMatchObject({ x: CENTRO.x, y: CENTRO.y, nivel: 0 });
    expect(nos.map((n) => n.id).sort()).toEqual(["a", "a1", "b", "r"]);
    expect(arestas).toContainEqual({ de: "r", para: "a" });
    expect(arestas).toContainEqual({ de: "a", para: "a1" });
    expect(nos.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y))).toBe(true);
  });
  it("carrega o `desde` de cada nó (pra quem quiser filtrar por temperatura)", () => {
    expect(nos.find((n) => n.id === "a1")!.desde).toBe("avancado");
    expect(nos.find((n) => n.id === "b")!.desde).toBe("medio");
  });
});

describe("visivelNaTemp — raiz sempre; o resto pelo `desde`", () => {
  const { nos } = layoutSaber(arvore);
  const no = (id: string) => nos.find((n) => n.id === id)!;
  it("básico mostra raiz + nível 1; esconde avançado", () => {
    expect(visivelNaTemp(no("r"), "basico")).toBe(true);
    expect(visivelNaTemp(no("a"), "basico")).toBe(true);   // nível 1 (desde basico)
    expect(visivelNaTemp(no("b"), "basico")).toBe(false);  // desde medio
    expect(visivelNaTemp(no("a1"), "basico")).toBe(false); // desde avancado
  });
  it("avançado mostra tudo", () => {
    expect(visivelNaTemp(no("a1"), "avancado")).toBe(true);
    expect(visivelNaTemp(no("b"), "avancado")).toBe(true);
  });
});

describe("layoutCodigo — nós do grafo espalhados, os mais centrais primeiro", () => {
  const grafo: GrafoConhecimento = {
    nos: [
      { id: "x", tipo: "arquivo", nome: "x.py", grau: 1 },
      { id: "y", tipo: "arquivo", nome: "y.py", grau: 9 },
      { id: "z", tipo: "arquivo", nome: "z.py", grau: 5 },
    ],
    arestas: [],
  };
  it("limita, ordena por grau desc e posiciona", () => {
    const cod = layoutCodigo(grafo, 2);
    expect(cod).toHaveLength(2);
    expect(cod[0].id).toBe("y"); // maior grau primeiro
    expect(cod.every((c) => Number.isFinite(c.x) && Number.isFinite(c.y))).toBe(true);
  });
});
