import { describe, it, expect } from "vitest";
import { isTeacherSession } from "./roles";

describe("isTeacherSession", () => {
  it("aceita role teacher/professor (case-insensitive) e isAdmin", () => {
    expect(isTeacherSession({ user: { role: "teacher" } })).toBe(true);
    expect(isTeacherSession({ user: { role: "Professor" } })).toBe(true);
    expect(isTeacherSession({ user: { isAdmin: true } })).toBe(true);
  });
  it("recusa aluno / vazio / nulo", () => {
    expect(isTeacherSession({ user: { role: "student" } })).toBe(false);
    expect(isTeacherSession({ user: {} })).toBe(false);
    expect(isTeacherSession(null)).toBe(false);
    expect(isTeacherSession(undefined)).toBe(false);
  });
});
