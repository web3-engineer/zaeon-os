import { describe, it, expect } from "vitest";
import { podeVer, temBase } from "./permissao";

describe("permissão RAG", () => {
  it("podeVer: aluno A não vê turma alheia nem a base de B", () => {
    expect(podeVer({ turmaIds: ["t9"], donoIds: ["u2"] }, { userId: "u1", turmaIds: ["t1"] })).toBe(false);
  });

  it("podeVer: por turma e por dono", () => {
    expect(podeVer({ turmaIds: ["t1"], donoIds: [] }, { userId: "u1", turmaIds: ["t1"] })).toBe(true);
    expect(podeVer({ turmaIds: [], donoIds: ["u1"] }, { userId: "u1", turmaIds: [] })).toBe(true);
  });

  it("temBase", () => {
    const e = { userId: "u1", turmaIds: [] };
    expect(temBase(e, { pessoais: 0, deTurma: 0 })).toBe(false);
    expect(temBase(e, { pessoais: 1, deTurma: 0 })).toBe(true);
    expect(temBase(e, { pessoais: 0, deTurma: 2 })).toBe(true);
  });
});
