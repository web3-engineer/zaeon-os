import { describe, it, expect } from "vitest";
import { skillDoItem, primeiraMensagemDaSkill } from "./desbloqueioSkill";
import { destinoDe } from "./detalhes";
import { itensDasSkillsDoDisco } from "./vitrineSkills";

describe("desbloqueioSkill — card da vitrine → aula da skill", () => {
  it("skillDoItem mapeia id `skill:<slug>`; ignora o resto", () => {
    expect(skillDoItem({ id: "skill:astropy-astronomia", titulo: "Astropy" })).toEqual({ slug: "astropy-astronomia", titulo: "Astropy" });
    expect(skillDoItem({ id: "skill:pandas", titulo: "   " })).toEqual({ slug: "pandas", titulo: "pandas" }); // sem título, cai no slug
    expect(skillDoItem({ id: "forja:quiz" })).toBeNull(); // não é skill
    expect(skillDoItem({ id: "skill:" })).toBeNull();     // slug vazio não abre
    expect(skillDoItem(null)).toBeNull();
  });

  it("a primeira mensagem pede a aula E nomeia a skill a ativar (senão a Aura não sabe qual)", () => {
    const m = primeiraMensagemDaSkill({ slug: "astropy-astronomia", titulo: "Astropy" });
    expect(m).toContain("astropy-astronomia"); // o slug exato pro activate_skill
    expect(m).toContain("Astropy");            // o nome humano, pro aluno ler
    expect(m).toMatch(/activate_skill/);
  });
});

describe("as skills REAIS da vitrine abrem a aula (o fio não vira enfeite)", () => {
  it("todo item `skill:<slug>` do disco resolve por skillDoItem e vai pro CHAT, não pros blueprints antigos", () => {
    const itens = itensDasSkillsDoDisco();
    expect(itens.length, "nenhuma skill virou card").toBeGreaterThan(0);
    for (const it of itens) {
      const s = skillDoItem(it);
      expect(s, it.id).not.toBeNull();
      expect(s!.slug).toBe(it.id.slice("skill:".length)); // o slug certo pro activate_skill
      expect(destinoDe(it).aba).toBe("chat");              // a correção: skill abre o chat, não a vista de estudos
    }
  });
});
