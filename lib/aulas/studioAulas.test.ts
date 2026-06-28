import { describe, it, expect } from "vitest";
import { AULA_BLOCKS, READY_BLOCKS, aulaBlock, EVALUABLE_KINDS } from "./blockTypes";
import { buildQuestionBlock } from "./generateParse";
import { gradeSubmission, type GradeQuestion } from "./grade";

describe("blockTypes registry", () => {
  it("has the 4 ready question types", () => {
    expect(READY_BLOCKS.map((b) => b.kind).sort()).toEqual(["q-choice", "q-roulette", "q-voice", "q-written"]);
  });
  it("registers the 5 game scaffolds (not ready)", () => {
    const scaffold = AULA_BLOCKS.filter((b) => !b.ready).map((b) => b.kind);
    expect(scaffold).toContain("q-cloze");
    expect(scaffold).toContain("branching");
  });
  it("flashcards/memory/branching are not evaluable", () => {
    expect(EVALUABLE_KINDS.has("flashcards")).toBe(false);
    expect(EVALUABLE_KINDS.has("q-choice")).toBe(true);
  });
  it("aulaBlock resolves by kind", () => {
    expect(aulaBlock("q-choice")?.baseType).toBe("choice");
    expect(aulaBlock("nope")).toBeUndefined();
  });
});

describe("buildQuestionBlock", () => {
  it("builds a choice question", () => {
    const raw = JSON.stringify({ text: "Capital do Brasil?", options: [
      { text: "Brasília", isCorrect: true, explanation: "Desde 1960." }, { text: "Rio", isCorrect: false } ], marks: 2 });
    const b = buildQuestionBlock(raw, "q-choice");
    expect(b).not.toBeNull();
    expect(b!.type).toBe("choice");
    expect(b!.marks).toBe(2);
    expect(b!.options).toHaveLength(2);
  });
  it("rejects choice with no correct option", () => {
    const raw = JSON.stringify({ text: "q", options: [{ text: "a", isCorrect: false }, { text: "b", isCorrect: false }] });
    expect(buildQuestionBlock(raw, "q-choice")).toBeNull();
  });
  it("written with accepted → input (auto) + noPaste; without → open (manual)", () => {
    const a = buildQuestionBlock(JSON.stringify({ text: "2+2?", accepted: ["4", "quatro"] }), "q-written");
    expect(a!.type).toBe("input"); expect(a!.noPaste).toBe(true); expect(a!.accepted).toContain("4");
    const b = buildQuestionBlock(JSON.stringify({ text: "Disserte sobre X." }), "q-written");
    expect(b!.type).toBe("open"); expect(b!.noPaste).toBe(true);
  });
  it("voice keeps type voice", () => {
    expect(buildQuestionBlock(JSON.stringify({ text: "Fale sobre Y" }), "q-voice")!.type).toBe("voice");
  });
  it("roulette builds a pool of auto-gradeable questions + rounds", () => {
    const raw = JSON.stringify({ config: { rounds: 2, pool: [
      { text: "1+1?", accepted: ["2"] },
      { text: "Cor do céu?", options: [{ text: "Azul", isCorrect: true }, { text: "Verde", isCorrect: false }] },
      { text: "sem gabarito", type: "open" },
    ] } });
    const b = buildQuestionBlock(raw, "q-roulette");
    expect(b!.type).toBe("roulette");
    expect(b!.config!.pool.length).toBe(2); // o 'open' sem gabarito é descartado
    expect(b!.config!.rounds).toBe(2);
  });
  it("returns null for scaffold kinds (games not ready)", () => {
    expect(buildQuestionBlock(JSON.stringify({ text: "x" }), "game-memory")).toBeNull();
  });
});

describe("grade — roleta (crédito parcial) + pontos", () => {
  const roulette: GradeQuestion = {
    id: "r1", type: "roulette", marks: 10, config: { rounds: 2, pool: [
      { type: "input", accepted: ["2"] },
      { type: "choice", options: [{ text: "Azul", isCorrect: true }, { text: "Verde", isCorrect: false }] },
    ] },
  };
  it("100% das picks corretas → pontos cheios", () => {
    const r = gradeSubmission([roulette], [{ questionId: "r1", picks: [
      { index: 0, answer: "2" }, { index: 1, choiceIndex: 0 } ] }], 50);
    expect(r.graded[0].marks).toBe(10);
    expect(r.percentage).toBe(100);
  });
  it("metade certo → metade dos pontos (parcial)", () => {
    const r = gradeSubmission([roulette], [{ questionId: "r1", picks: [
      { index: 0, answer: "2" }, { index: 1, choiceIndex: 1 } ] }], 50);
    expect(r.graded[0].marks).toBe(5);
    expect(r.percentage).toBe(50);
  });
});
