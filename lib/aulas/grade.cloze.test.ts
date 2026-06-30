import { describe, it, expect } from "vitest";
import { gradeSubmission, type GradeQuestion } from "@/lib/aulas/grade";

describe("gradeSubmission cloze/dragwords", () => {
  it("cloze: crédito parcial pelos blanks", () => {
    const q: GradeQuestion = { id: "c1", type: "cloze", marks: 4, config: { text: "*um* e *dois*" } };
    const r = gradeSubmission([q], [{ questionId: "c1", blanks: ["um", "errado"] }], 70);
    expect(r.graded[0]).toMatchObject({ marks: 2, marksOutOf: 4, isCorrect: false });
  });
  it("dragwords: tudo certo → nota cheia + isCorrect", () => {
    const q: GradeQuestion = { id: "d1", type: "dragwords", marks: 2, config: { sentence: "*a* *b*", words: ["c"] } };
    const r = gradeSubmission([q], [{ questionId: "d1", blanks: ["a", "b"] }], 70);
    expect(r.graded[0]).toMatchObject({ marks: 2, marksOutOf: 2, isCorrect: true });
  });
  it("cloze grava blanksCorrect por-lacuna", () => {
    const q: GradeQuestion = { id: "c3", type: "cloze", marks: 2, config: { text: "*um* e *dois*" } };
    const r = gradeSubmission([q], [{ questionId: "c3", blanks: ["um", "x"] }], 70);
    expect((r.graded[0] as any).blanksCorrect).toEqual([true, false]);
  });
  it("sem lacunas → manual (marksOutOf 0)", () => {
    const q: GradeQuestion = { id: "c2", type: "cloze", marks: 3, config: { text: "sem lacuna" } };
    const r = gradeSubmission([q], [{ questionId: "c2", blanks: [] }], 70);
    expect(r.graded[0].marksOutOf).toBe(0);
  });
});
