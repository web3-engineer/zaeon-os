import { describe, it, expect } from "vitest";
import { estudoDoItem, primeiraMensagemDaEstudo } from "./desbloqueioEstudo";
import { itensDasSkillsDoDisco } from "./vitrineSkills";

const item = (over: Record<string, unknown> = {}) => ({ id: "skill:x", titulo: "X", modulo: "agente" as const, ...over });

describe("estudoDoItem — item da vitrine → estudo pendente (puro)", () => {
  it("carrega módulo+slug+título dos itens de skill", () => {
    expect(estudoDoItem(item({ id: "skill:astropy-astronomia", titulo: "Astropy", modulo: "board" }))).toEqual({ modulo: "board", slug: "astropy-astronomia", titulo: "Astropy" });
    expect(estudoDoItem(item({ id: "skill:musescore-partituras", modulo: "device", titulo: "MuseScore" }))).toEqual({ modulo: "device", slug: "musescore-partituras", titulo: "MuseScore" });
  });
  it("ignora o que não é skill, o que não tem módulo, e slug vazio", () => {
    expect(estudoDoItem(item({ id: "forja:quiz", modulo: "board" }))).toBeNull(); // forja tem o laço dele
    expect(estudoDoItem(item({ id: "skill:x", modulo: undefined }))).toBeNull();   // sem módulo não roteia
    expect(estudoDoItem(item({ id: "skill:", modulo: "agente" }))).toBeNull();
    expect(estudoDoItem(null)).toBeNull();
  });
  it("título em branco cai no slug", () => {
    expect(estudoDoItem(item({ id: "skill:pandas", titulo: "  ", modulo: "board" }))!.titulo).toBe("pandas");
  });
});

describe("primeiraMensagemDaEstudo — a aula do módulo agente", () => {
  it("nomeia o slug pro activate_skill e o título pro aluno", () => {
    const m = primeiraMensagemDaEstudo({ modulo: "agente", slug: "diagrama-mermaid", titulo: "Diagramas" });
    expect(m).toContain("diagrama-mermaid");
    expect(m).toContain("Diagramas");
    expect(m).toMatch(/activate_skill/);
  });
});

describe("os itens REAIS da vitrine viram estudo pendente coerente (fio não é enfeite)", () => {
  it("todo item skill:* resolve, e o módulo bate com o do item", () => {
    const itens = itensDasSkillsDoDisco();
    expect(itens.length).toBeGreaterThan(0);
    for (const it of itens) {
      const p = estudoDoItem(it);
      expect(p, it.id).not.toBeNull();
      expect(p!.slug).toBe(it.id.slice("skill:".length));
      expect(p!.modulo).toBe(it.modulo);
    }
  });
});
