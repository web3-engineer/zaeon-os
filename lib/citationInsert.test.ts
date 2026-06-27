import { describe, it, expect } from "vitest";
import {
  insertQuoteAtCursor,
  appendReference,
  applyCitationDrop,
  removeQuoteFromDoc,
  removeReference,
  applyCitationRemoval,
} from "./citationInsert";

// Regressão: o drag-drop de citação já existe; estes testes o protegem ao
// estendermos o onDrop do editor para também aceitar imagens.

describe("insertQuoteAtCursor", () => {
  it("insere a frase no cursor com espaçamento limpo", () => {
    expect(insertQuoteAtCursor("AB", 1, "X")).toBe("A X B");
  });
  it("não insere frase vazia", () => {
    expect(insertQuoteAtCursor("AB", 1, "   ")).toBe("AB");
  });
});

describe("appendReference", () => {
  it("cria a seção REFERÊNCIAS quando não existe", () => {
    const out = appendReference("Texto.", "SILVA, A. Obra. 2020.");
    expect(out).toContain("# REFERÊNCIAS");
    expect(out).toContain("SILVA, A. Obra. 2020.");
  });
  it("não duplica referência já presente", () => {
    const doc = "Texto.\n\n# REFERÊNCIAS\n\nSILVA, A. Obra. 2020.\n";
    expect(appendReference(doc, "SILVA, A. Obra. 2020.")).toBe(doc);
  });
});

describe("applyCitationDrop", () => {
  it("frase vai no cursor e referência vai pras Referências", () => {
    const out = applyCitationDrop("Intro.", 6, { quote: '"trecho"', abnt: "SILVA, A. Obra. 2020." });
    expect(out).toContain('"trecho"');
    expect(out).toContain("# REFERÊNCIAS");
    expect(out).toContain("SILVA, A. Obra. 2020.");
  });
  it("não adiciona referência igual à frase (citação legada)", () => {
    const out = applyCitationDrop("Intro.", 6, { quote: "X", abnt: "X" });
    expect(out).not.toContain("# REFERÊNCIAS");
  });
});

describe("remoção", () => {
  it("remove a frase do documento", () => {
    expect(removeQuoteFromDoc('a "q" b', '"q"')).toBe("a b");
  });
  it("remove a referência da seção", () => {
    const doc = "T\n\n# REFERÊNCIAS\n\nSILVA, A. Obra. 2020.";
    expect(removeReference(doc, "SILVA, A. Obra. 2020.")).not.toContain("SILVA, A. Obra. 2020.");
  });
  it("applyCitationRemoval tira frase e referência", () => {
    const doc = 'Intro "q" .\n\n# REFERÊNCIAS\n\nSILVA, A. Obra. 2020.';
    const out = applyCitationRemoval(doc, { quote: '"q"', abnt: "SILVA, A. Obra. 2020." });
    expect(out).not.toContain('"q"');
    expect(out).not.toContain("SILVA, A. Obra. 2020.");
  });
});
