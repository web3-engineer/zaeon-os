import { describe, it, expect } from "vitest";
import { estudoDoItem } from "./desbloqueioEstudo";
import { itensDasSkillsDoDisco } from "./vitrineSkills";

const item = (over: Record<string, unknown> = {}) => ({ id: "skill:x", titulo: "X", modulo: "board" as const, ...over });

describe("estudoDoItem — item da vitrine → estudo pendente (puro)", () => {
  it("board e device viram pendente (carregam módulo+slug+título)", () => {
    expect(estudoDoItem(item({ id: "skill:astropy-astronomia", titulo: "Astropy", modulo: "board" }))).toEqual({ modulo: "board", slug: "astropy-astronomia", titulo: "Astropy" });
    expect(estudoDoItem(item({ id: "skill:musescore-partituras", modulo: "device", titulo: "MuseScore" }))).toEqual({ modulo: "device", slug: "musescore-partituras", titulo: "MuseScore" });
  });
  it("AGENTE não vira pendente — a skill fica disponível via prompt, nada a abrir", () => {
    expect(estudoDoItem(item({ id: "skill:diagrama-mermaid", modulo: "agente" }))).toBeNull();
  });
  it("ignora o que não é skill, o que não tem módulo, e slug vazio", () => {
    expect(estudoDoItem(item({ id: "forja:quiz", modulo: "board" }))).toBeNull(); // forja tem o laço dele
    expect(estudoDoItem(item({ id: "skill:x", modulo: undefined }))).toBeNull();   // sem módulo não roteia
    expect(estudoDoItem(item({ id: "skill:", modulo: "board" }))).toBeNull();
    expect(estudoDoItem(null)).toBeNull();
  });
  it("título em branco cai no slug", () => {
    expect(estudoDoItem(item({ id: "skill:pandas", titulo: "  ", modulo: "board" }))!.titulo).toBe("pandas");
  });
});

describe("os itens REAIS da vitrine: board/device abrem, agente fica disponível via prompt", () => {
  it("board/device resolvem no módulo certo; agente devolve null (nada a abrir)", () => {
    const itens = itensDasSkillsDoDisco();
    expect(itens.length).toBeGreaterThan(0);
    for (const it of itens) {
      const p = estudoDoItem(it);
      if (it.modulo === "board" || it.modulo === "device") {
        expect(p, it.id).not.toBeNull();
        expect(p!.slug).toBe(it.id.slice("skill:".length));
        expect(p!.modulo).toBe(it.modulo);
      } else {
        expect(p, `${it.id} (agente) não deve abrir nada`).toBeNull();
      }
    }
  });
});
