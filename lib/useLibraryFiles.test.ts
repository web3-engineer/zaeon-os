import { describe, it, expect } from "vitest";
import { upsertLibraryFile, renameLibraryFile, setLibraryFileFolder, type LibraryFile } from "./useLibraryFiles";
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

describe("renameLibraryFile", () => {
  it("renames only the matching id (trimmed)", () => {
    const out = renameLibraryFile([f("1"), f("2")], "2", "  Novo Título  ");
    expect(out.find(x => x.id === "2")!.title).toBe("Novo Título");
    expect(out.find(x => x.id === "1")!.title).toBe("T");
  });
  it("ignores empty/whitespace titles (no change)", () => {
    const list = [f("1")];
    expect(renameLibraryFile(list, "1", "   ")).toEqual(list);
  });
  it("no-op when id not found", () => {
    const list = [f("1")];
    expect(renameLibraryFile(list, "x", "Y").map(x => x.title)).toEqual(["T"]);
  });
});

describe("setLibraryFileFolder", () => {
  it("archives only the matching file into the folder", () => {
    const out = setLibraryFileFolder([f("1"), f("2")], "2", "fold-a");
    expect(out.find(x => x.id === "2")!.folderId).toBe("fold-a");
    expect(out.find(x => x.id === "1")!.folderId).toBeUndefined();
  });
  it("unarchives when folderId is null (folderId becomes undefined)", () => {
    const out = setLibraryFileFolder([{ ...f("1"), folderId: "fold-a" }], "1", null);
    expect(out[0].folderId).toBeUndefined();
  });
});
