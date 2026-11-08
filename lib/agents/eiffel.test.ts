/**
 * O EIFFEL, como o dono decidiu (2026-11-08): "eiffel mesmo, e crie o curso engenharia civil. o
 * agente deve ser plugável no chat através da loja."
 *
 * Os três são testáveis e os três têm um defeito próprio que este arquivo existe pra impedir:
 *  · o curso — um mentor servindo curso que a plataforma não oferece (era o caso dele até aqui);
 *  · a plugabilidade — um agente que aparece no seletor de quem não o adicionou;
 *  · a identidade — persona declarada em `capacidades` e ausente em `PERSONAS`, que cai na Aura
 *    pelo fallback do `buildPersona` SEM ninguém notar. Foi assim que `exam_generator` virou Aura.
 */
import { describe, expect, it } from "vitest";
import { ALL_COURSES } from "@/constants/courses";
import { MENTOR_SEED, mentorBySlug } from "@/lib/agent/mentors";
import { AGENTES_CHAT, agenteValido, agentesDisponiveis } from "@/lib/agents/chatAgentes";
import { CAPACIDADES } from "@/lib/agents/capacidades";
import { PERSONAS, buildPersona } from "@/lib/ai/personas";
import { CATALOGO } from "@/lib/estudos/vitrine";

describe("Eiffel · o curso", () => {
  it("Engenharia Civil existe em ALL_COURSES", () => {
    expect(ALL_COURSES).toContain("Engenharia Civil");
  });

  it("o curso do mentor Eiffel bate com um curso oferecido — era o buraco dele", () => {
    const m = mentorBySlug("eng-civil")!;
    expect(m.name).toBe("Eiffel");
    expect(ALL_COURSES).toContain(m.course);
  });

  it("e isso vale pra todo mentor que a varredura apontou como coberto", () => {
    // não afirmo os 13: cinco servem curso inexistente e isso é decisão de produto em aberto.
    // Afirmo que o Eiffel saiu dessa lista, que é o que mudou aqui.
    const orfaos = MENTOR_SEED.filter((m) => !ALL_COURSES.includes(m.course)).map((m) => m.slug);
    expect(orfaos).not.toContain("eng-civil");
  });
});

describe("Eiffel · plugável pela loja", () => {
  it("está no catálogo da loja, de graça, e marcado como plugável", () => {
    const item = CATALOGO.find((i) => i.id === "eiffel-cad");
    expect(item, "o Eiffel tem de estar na vitrine pra poder ser adicionado").toBeTruthy();
    expect(item!.plugavel).toBe("eiffel-cad");
    expect(item!.tipo).toBe("agente");
    expect(item!.preco).toBe(0);
  });

  it("o agente do chat declara o mesmo plugin — senão a loja adiciona e o seletor ignora", () => {
    const a = AGENTES_CHAT.find((x) => x.id === "eiffel")!;
    expect(a.plugin).toBe("eiffel-cad");
    expect(a.tela, "ele fala no CHAT; o CAD é artefato. Só o Octa tem tela de IDE").toBe("chat");
  });

  it("NÃO aparece no seletor de quem não o adicionou", () => {
    const semNada = agentesDisponiveis([]).map((a) => a.id);
    expect(semNada).not.toContain("eiffel");
    expect(semNada).toContain("aura");
  });

  it("…e aparece pra quem adicionou", () => {
    expect(agentesDisponiveis(["eiffel-cad"]).map((a) => a.id)).toContain("eiffel");
  });

  it("o agente salvo que foi DESPLUGADO volta pra Aura, não dá tela vazia", () => {
    expect(agenteValido("eiffel", [])).toBe("aura");
    expect(agenteValido("eiffel", ["eiffel-cad"])).toBe("eiffel");
  });
});

describe("Eiffel · a identidade", () => {
  it("a persona que `capacidades` aponta EXISTE em PERSONAS", () => {
    const chave = CAPACIDADES.eiffel.persona;
    expect(PERSONAS[chave], `persona "${chave}" não existe: buildPersona cairia na Aura em silêncio`).toBeTruthy();
    expect(PERSONAS[chave].name).toBe("Eiffel");
  });

  it("o prompt dele manda LER a skill antes de modelar e MEDIR cada etapa", () => {
    const p = buildPersona("eiffel");
    expect(p).toContain("skill_reference");
    expect(p).toContain("solidcraft-modeling");
    expect(p).toMatch(/measure/);
    expect(p).toMatch(/batch/);
  });

  it("o guardrail não se negocia: educacional, nunca projeto executivo", () => {
    const p = buildPersona("eiffel");
    expect(p).toMatch(/CREA/);
    expect(p).toMatch(/não assina|NÃO assina/);
    expect(p).toMatch(/insistir/);
  });

  it("ele é paramétrico por padrão — é o ponto de usar CAD paramétrico", () => {
    expect(buildPersona("eiffel")).toContain("set_parameter");
  });
});
