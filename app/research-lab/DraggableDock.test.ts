import { describe, it, expect } from "vitest";
import { reorderDock, type DockItem } from "./DraggableDock";

const item = (id: string): DockItem => ({ id, emoji: "📌", label: id });

describe("reorderDock", () => {
  it("moves item forward", () => {
    const result = reorderDock([item("a"), item("b"), item("c")], 0, 2);
    expect(result.map((i) => i.id)).toEqual(["b", "c", "a"]);
  });

  it("moves item backward", () => {
    const result = reorderDock([item("a"), item("b"), item("c")], 2, 0);
    expect(result.map((i) => i.id)).toEqual(["c", "a", "b"]);
  });

  it("same index returns identical array", () => {
    const arr = [item("a"), item("b")];
    expect(reorderDock(arr, 1, 1)).toBe(arr);
  });
});
