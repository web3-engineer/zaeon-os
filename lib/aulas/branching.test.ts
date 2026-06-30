import { describe, it, expect } from "vitest";
import { startNodeId, findNode, nextNodeId } from "@/lib/aulas/branching";

const nodes = [
  { id: "a", content: "início", choices: [{ label: "ir b", nextId: "b" }, { label: "quebrado", nextId: "zzz" }] },
  { id: "b", content: "fim", choices: [] },
];
describe("branching nav", () => {
  it("startNodeId = primeiro nó", () => { expect(startNodeId(nodes)).toBe("a"); expect(startNodeId([])).toBeNull(); });
  it("findNode acha por id", () => { expect(findNode(nodes, "b")?.content).toBe("fim"); expect(findNode(nodes, "x")).toBeNull(); });
  it("nextNodeId segue escolha válida; inválida/inexistente → null", () => {
    expect(nextNodeId(nodes, "a", 0)).toBe("b");
    expect(nextNodeId(nodes, "a", 1)).toBeNull();
    expect(nextNodeId(nodes, "a", 9)).toBeNull();
    expect(nextNodeId(nodes, "x", 0)).toBeNull();
  });
});
