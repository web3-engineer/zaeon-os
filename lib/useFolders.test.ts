import { describe, it, expect } from "vitest";
import { addFolder, renameFolder, type LibraryFolder } from "./useFolders";

const fo = (id: string, name = "P"): LibraryFolder => ({ id, name, createdAt: 1 });

describe("addFolder", () => {
  it("adds the new folder first, with a trimmed name and an id", () => {
    const out = addFolder([fo("1")], "  Minha Pasta  ");
    expect(out).toHaveLength(2);
    expect(out[0].name).toBe("Minha Pasta");
    expect(typeof out[0].id).toBe("string");
    expect(out[1].id).toBe("1");
  });
  it("ignores empty/whitespace names (no change)", () => {
    const list = [fo("1")];
    expect(addFolder(list, "   ")).toEqual(list);
  });
});

describe("renameFolder", () => {
  it("renames only the matching id (trimmed)", () => {
    const out = renameFolder([fo("1", "A"), fo("2", "B")], "2", "  Novo  ");
    expect(out.find(x => x.id === "2")!.name).toBe("Novo");
    expect(out.find(x => x.id === "1")!.name).toBe("A");
  });
  it("ignores empty names", () => {
    const list = [fo("1", "A")];
    expect(renameFolder(list, "1", "  ")).toEqual(list);
  });
});
