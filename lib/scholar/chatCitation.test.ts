import { describe, it, expect } from "vitest";
import { extractCitationBlock } from "./chatCitation";

describe("extractCitationBlock", () => {
  it("returns the text unchanged when there is no citation block", () => {
    expect(extractCitationBlock("Vamos falar do seu projeto.")).toEqual({
      clean: "Vamos falar do seu projeto.",
      citation: null,
    });
  });

  it("extracts the citation and strips the markers from the clean text", () => {
    const txt = 'Isto é importante.\n\n⟦CITACAO⟧"A energia não se cria" — SILVA (2020)⟦/CITACAO⟧\n\nGuarde essa.';
    const out = extractCitationBlock(txt);
    expect(out.citation).toBe('"A energia não se cria" — SILVA (2020)');
    expect(out.clean).toBe("Isto é importante.\n\nGuarde essa.");
    expect(out.clean).not.toContain("⟦");
  });

  it("handles multiple blocks: first citation, all markers stripped", () => {
    const txt = "a ⟦CITACAO⟧um⟦/CITACAO⟧ b ⟦CITACAO⟧dois⟦/CITACAO⟧ c";
    const out = extractCitationBlock(txt);
    expect(out.citation).toBe("um");
    expect(out.clean).toBe("a  b  c");
  });

  it("treats an empty block as no citation", () => {
    expect(extractCitationBlock("x ⟦CITACAO⟧⟦/CITACAO⟧ y").citation).toBeNull();
  });

  it("is safe with empty input", () => {
    expect(extractCitationBlock("")).toEqual({ clean: "", citation: null });
  });
});
