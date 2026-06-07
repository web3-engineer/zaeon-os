import { describe, it, expect } from "vitest";
import { upsertLibraryFile, type LibraryFile } from "./useLibraryFiles";
const f = (id: string): LibraryFile => ({ id, title: "T", pdfUrl: "http://x/p.pdf", savedAt: 1 });
describe("upsertLibraryFile", () => {
  it("adds newest first", () => {
    expect(upsertLibraryFile([f("1")], f("2")).map(x => x.id)).toEqual(["2", "1"]);
  });
  it("dedupes by id (replaces, moves to front)", () => {
    const out = upsertLibraryFile([f("1"), f("2")], { ...f("1"), pdfUrl: "http://x/NEW.pdf" });
    expect(out.map(x => x.id)).toEqual(["1", "2"]);
    expect(out[0].pdfUrl).toBe("http://x/NEW.pdf");
  });
});
