import { describe, it, expect } from "vitest";
import { layoutMindmap } from "@/lib/studio/mindmap-layout";

const tree = [
  { id: "1", label: "Raiz", parent: null },
  { id: "2", label: "A", parent: "1" },
  { id: "3", label: "B", parent: "1" },
  { id: "4", label: "A1", parent: "2" },
];

describe("layoutMindmap", () => {
  it("calcula profundidades corretas", () => {
    const out = layoutMindmap(tree);
    const depth = (id: string) => out.nodes.find((n) => n.id === id)!.depth;
    expect(depth("1")).toBe(0);
    expect(depth("2")).toBe(1);
    expect(depth("4")).toBe(2);
  });

  it("cria uma linha por relação pai→filho", () => {
    const out = layoutMindmap(tree);
    expect(out.links).toHaveLength(3);
    expect(out.links.every((l) => l.x2 > l.x1 || l.x2 >= l.x1)).toBe(true); // filho à direita do pai
    expect(out.links.find((l) => l.to === "4")!.from).toBe("2");
  });

  it("nós mais profundos ficam em colunas mais à direita (x cresce com depth)", () => {
    const out = layoutMindmap(tree);
    const x = (id: string) => out.nodes.find((n) => n.id === id)!.x;
    expect(x("2")).toBeGreaterThan(x("1"));
    expect(x("4")).toBeGreaterThan(x("2"));
  });

  it("é robusto a parent inexistente (vira raiz) e lista vazia", () => {
    const out = layoutMindmap([{ id: "x", label: "solto", parent: "999" }]);
    expect(out.nodes[0].depth).toBe(0);
    expect(layoutMindmap([]).nodes).toEqual([]);
  });

  it("não trava com ciclo de parent", () => {
    const out = layoutMindmap([
      { id: "a", label: "A", parent: "b" },
      { id: "b", label: "B", parent: "a" },
    ]);
    expect(out.nodes).toHaveLength(2);
  });
});
