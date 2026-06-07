import { describe, it, expect } from "vitest";
import {
  addWindowEntry,
  removeWindowEntry,
  type WindowEntry,
} from "./useWindowStore";

const doc = (id: string): WindowEntry => ({
  id,
  label: `Doc ${id}`,
  emoji: "📄",
  type: "document",
});
const research: WindowEntry = {
  id: "research",
  label: "Minha pesquisa",
  emoji: "📝",
  type: "research",
};

describe("addWindowEntry", () => {
  it("adds a new document window", () => {
    const result = addWindowEntry([research], doc("abc"));
    expect(result.map((w) => w.id)).toEqual(["research", "abc"]);
  });

  it("ignores duplicate ids", () => {
    const state = [research, doc("abc")];
    expect(addWindowEntry(state, doc("abc"))).toEqual(state);
  });

  it("adding research to existing list leaves it unchanged", () => {
    const state = [research];
    expect(addWindowEntry(state, research)).toEqual(state);
  });
});

describe("removeWindowEntry", () => {
  it("removes a document window", () => {
    const result = removeWindowEntry([research, doc("abc")], "abc");
    expect(result.map((w) => w.id)).toEqual(["research"]);
  });

  it("cannot remove the research window", () => {
    const state = [research, doc("abc")];
    expect(removeWindowEntry(state, "research")).toEqual(state);
  });

  it("no-op when id not found", () => {
    const state = [research, doc("abc")];
    expect(removeWindowEntry(state, "zzz")).toEqual(state);
  });
});
