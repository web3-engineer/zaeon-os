import { describe, it, expect } from "vitest";
import { gradeSubmission, type GradeQuestion } from "./grade";

const questions: GradeQuestion[] = [
  { id: "q1", type: "choice", marks: 1, options: [
    { text: "Cloroplasto", isCorrect: true }, { text: "Mitocôndria", isCorrect: false } ] },
  { id: "q2", type: "input", marks: 2, accepted: ["fase clara", "fase escura"] },
  { id: "q3", type: "voice", marks: 1, accepted: ["energia"] },
  { id: "q4", type: "open", marks: 1 }, // not auto-graded
];

describe("gradeSubmission", () => {
  it("grades a fully correct submission (ignoring open) and passes", () => {
    const r = gradeSubmission(questions, [
      { questionId: "q1", answer: "Cloroplasto" },
      { questionId: "q2", answer: "Fase Clara" },
      { questionId: "q3", transcript: "acho que é energia química" },
      { questionId: "q4", answer: "minha opinião" },
    ], 70);
    // graded marks: q1(1)+q2(2)+q3(1) = 4 of 4 → 100%
    expect(r.percentage).toBe(100);
    expect(r.passed).toBe(true);
    const q4 = r.graded.find((g) => g.questionId === "q4")!;
    expect(q4.marksOutOf).toBe(0); // open not auto-graded
  });

  it("marks wrong choice and unmatched input as incorrect", () => {
    const r = gradeSubmission(questions, [
      { questionId: "q1", answer: "Mitocôndria" },
      { questionId: "q2", answer: "nada a ver" },
      { questionId: "q3", transcript: "sei lá" },
    ], 70);
    // earned 0 of (1+2+1)=4 → 0%
    expect(r.percentage).toBe(0);
    expect(r.passed).toBe(false);
  });

  it("supports choice by index", () => {
    const r = gradeSubmission([questions[0]], [{ questionId: "q1", choiceIndex: 0 }], 50);
    expect(r.percentage).toBe(100);
    expect(r.passed).toBe(true);
  });

  it("is accent/case insensitive for input matching", () => {
    const r = gradeSubmission([questions[1]], [{ questionId: "q2", answer: "FASE ESCURA" }], 50);
    expect(r.graded[0].isCorrect).toBe(true);
  });

  it("returns 0% with no auto-gradable questions", () => {
    const r = gradeSubmission([{ id: "qx", type: "open", marks: 1 }], [{ questionId: "qx", answer: "texto" }], 70);
    expect(r.percentage).toBe(0);
    expect(r.passed).toBe(false);
  });
});
