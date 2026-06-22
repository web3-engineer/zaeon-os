import { describe, it, expect } from "vitest";
import { prevEditableId } from "@/lib/study/blockOrder";

const mk = (id: string, type = "note") => ({ id, type });

describe("prevEditableId", () => {
  it("retorna o bloco editável imediatamente anterior", () => {
    const feed = [mk("a"), mk("b"), mk("c")];
    expect(prevEditableId(feed, "c")).toBe("b");
    expect(prevEditableId(feed, "b")).toBe("a");
  });

  it("pula blocos não editáveis (studio/image) até achar um 'note'", () => {
    const feed = [mk("a"), mk("s1", "studio"), mk("img", "image"), mk("d")];
    expect(prevEditableId(feed, "d")).toBe("a");
  });

  it("null quando é o primeiro ou não há editável anterior", () => {
    expect(prevEditableId([mk("a")], "a")).toBeNull();
    expect(prevEditableId([mk("s1", "studio"), mk("b")], "b")).toBeNull();
    expect(prevEditableId([mk("a")], "zzz")).toBeNull();
  });
});
