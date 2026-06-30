import { describe, it, expect } from "vitest";
import { buildQuestionBlock } from "@/lib/aulas/generateParse";

describe("buildQuestionBlock branching", () => {
  it("normaliza nós e escolhas", () => {
    const raw = JSON.stringify({ config: { nodes: [
      { id: "a", content: "início", choices: [{ label: "ir", nextId: "b" }] },
      { id: "b", content: "fim", choices: [] },
    ] } });
    const b = buildQuestionBlock(raw, "branching");
    expect(b).toMatchObject({ type: "branching" });
    expect((b as any).config.nodes).toHaveLength(2);
  });
  it("0 nós → null", () => { expect(buildQuestionBlock(JSON.stringify({ config: { nodes: [] } }), "branching")).toBeNull(); });
});
