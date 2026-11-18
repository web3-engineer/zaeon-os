import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { graphifyParaGrafo, arestaDeRelation, tipoDoNoGraphify } from "./graphify";
import {
  understandParaGrafo, understandParaArvore, temperaturaDoPasso,
  tipoDoNoUA, arestaDeEdgeType, temperaturaDeComplexidade,
} from "./understand";

const lerFixture = (nome: string) => JSON.parse(readFileSync(join(__dirname, "fixtures", nome), "utf8"));

describe("adaptador graphify (node_link_data → GrafoConhecimento)", () => {
  const g = graphifyParaGrafo(lerFixture("graphify.graph.json"));

  it("mapeia nós (tipo por símbolo), nomes e caminhos", () => {
    expect(g.nos).toHaveLength(3);
    const app = g.nos.find((n) => n.id === "app.py")!;
    const main = g.nos.find((n) => n.id === "app.py::main")!;
    expect(app.tipo).toBe("arquivo");
    expect(main.tipo).toBe("funcao"); // tem source_location
    expect(main.nome).toBe("main");
    expect(main.caminho).toBe("app.py");
    expect(g.nos.every((n) => n.fonte === "graphify")).toBe(true);
  });

  it("mapeia relation → aresta e computa grau", () => {
    expect(g.arestas).toHaveLength(5);
    expect(g.arestas.find((a) => a.de === "app.py" && a.para === "utils.py")!.tipo).toBe("importa");
    expect(g.arestas.find((a) => a.de === "app.py" && a.para === "app.py::main")!.tipo).toBe("define");
    expect(g.nos.find((n) => n.id === "app.py")!.grau).toBe(4); // o mais central
  });

  it("escolhe a raiz como o nó de maior grau (quando destaca-se)", () => {
    expect(g.raiz).toBe("app.py");
  });

  it("relation desconhecido vira referencia; vazio não quebra", () => {
    expect(arestaDeRelation("uses")).toBe("referencia");
    expect(arestaDeRelation(undefined)).toBe("referencia");
    expect(arestaDeRelation("calls")).toBe("chama");
    expect(tipoDoNoGraphify({ id: "x", source_location: { line: 2 } })).toBe("funcao");
    expect(graphifyParaGrafo({} as never).nos).toEqual([]);
  });
});

describe("adaptador understand (KnowledgeGraph → grafo + árvore)", () => {
  const json = lerFixture("understand.knowledge-graph.json");
  const g = understandParaGrafo(json);
  const arv = understandParaArvore(json);

  it("mapeia nós por NodeType e arestas por EdgeType", () => {
    expect(g.nos.find((n) => n.id === "n1")!.tipo).toBe("arquivo");
    expect(g.nos.find((n) => n.id === "n2")!.tipo).toBe("funcao");
    expect(g.nos.find((n) => n.id === "n3")!.tipo).toBe("conceito");
    expect(g.nos.every((n) => n.fonte === "understand-anything")).toBe(true);
    expect(g.arestas.find((a) => a.de === "n1" && a.para === "n2")!.tipo).toBe("contem");
    expect(g.arestas.find((a) => a.de === "n1" && a.para === "n3")!.tipo).toBe("importa");
    expect(g.arestas.find((a) => a.de === "n2" && a.para === "n3")!.tipo).toBe("referencia");
  });

  it("sem nó claramente central (empate), não força raiz", () => {
    expect(g.raiz).toBeUndefined();
  });

  it("monta a árvore da tour, ordenada por `order`, com desde pela complexidade dos nós", () => {
    expect(arv.raiz.titulo).toBe("Demo");
    const filhos = arv.raiz.filhos;
    expect(filhos.map((f) => f.titulo)).toEqual(["Comece aqui", "Visão geral", "O coração"]); // order 0,1,2
    expect(filhos[0].id).toBe("tour-0");
    expect(filhos[1].desde).toBe("basico"); // cobre n1 (simple)
    expect(filhos[2].desde).toBe("avancado"); // cobre n2 (complex) → o maior
    expect(filhos[2].refs).toEqual(["n2", "n3"]);
  });

  it("mapas puros: unknown → padrão seguro", () => {
    expect(tipoDoNoUA("class")).toBe("classe");
    expect(tipoDoNoUA("article")).toBe("conceito");
    expect(tipoDoNoUA(undefined)).toBe("conceito");
    expect(arestaDeEdgeType("depends_on")).toBe("depende");
    expect(arestaDeEdgeType("cites")).toBe("referencia");
    expect(temperaturaDeComplexidade("complex")).toBe("avancado");
    expect(temperaturaDeComplexidade(undefined)).toBe("basico");
    expect(understandParaArvore({}).raiz.filhos).toEqual([]);
    expect(temperaturaDoPasso({ nodeIds: [] }, new Map())).toBe("basico");
  });
});
