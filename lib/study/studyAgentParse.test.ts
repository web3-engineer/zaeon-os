import { describe, it, expect } from "vitest";
import { extractJson, isRealStudy, buildStudy } from "./studyAgentParse";

const BODY = "Este é um parágrafo de corpo com tamanho suficiente para contar como estudo real.";

describe("extractJson", () => {
  it("parses pure JSON", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });
  it("strips ```json fences", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
  it("ignores prose around the object", () => {
    expect(extractJson('Claro! Aqui está:\n{"a":1}\nEspero ter ajudado.')).toEqual({ a: 1 });
  });
  it("handles nested objects/strings with braces", () => {
    expect(extractJson('prefixo {"t":"a } b","n":{"x":2}} sufixo')).toEqual({ t: "a } b", n: { x: 2 } });
  });
  it("returns null for total garbage", () => {
    expect(extractJson("desculpe, não consigo")).toBeNull();
  });
  it("returns null for empty input", () => {
    expect(extractJson("")).toBeNull();
  });
});

describe("isRealStudy", () => {
  it("rejects fewer than 3 blocks", () => {
    expect(isRealStudy([{ kind: "heading", text: "Tema" }, { kind: "text", text: BODY }])).toBe(false);
  });
  it("rejects heading-only-ish sets without a real text body", () => {
    expect(isRealStudy([
      { kind: "heading", text: "Tema" },
      { kind: "subheading", text: "Sub" },
      { kind: "text", text: "curto" },
    ])).toBe(false);
  });
  it("accepts a study with >=3 blocks and a real text body", () => {
    expect(isRealStudy([
      { kind: "heading", text: "Tema" },
      { kind: "subheading", text: "Sub" },
      { kind: "text", text: BODY },
    ])).toBe(true);
  });
});

describe("buildStudy", () => {
  it("builds a study and injects a heading when missing", () => {
    const raw = JSON.stringify({ title: "Fotossíntese", blocks: [
      { kind: "subheading", text: "Conceito" },
      { kind: "text", text: BODY },
      { kind: "text", text: BODY + " Mais um trecho." },
    ] });
    const s = buildStudy(raw, "estude fotossíntese");
    expect(s).not.toBeNull();
    expect(s!.title).toBe("Fotossíntese");
    expect(s!.blocks[0].kind).toBe("heading");
    expect(s!.blocks.length).toBeGreaterThanOrEqual(3);
  });
  it("returns null when the model output is degenerate (heading-only)", () => {
    const raw = JSON.stringify({ title: "Tema", blocks: [{ kind: "heading", text: "Tema" }] });
    expect(buildStudy(raw, "tema")).toBeNull();
  });
  it("returns null when JSON cannot be parsed", () => {
    expect(buildStudy("desculpe, não consigo montar", "tema")).toBeNull();
  });
});
