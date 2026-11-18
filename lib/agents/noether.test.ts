/**
 * A NOETHER, como o dono pediu (2026-11-12): "connect these skills to our mathematician agent. put
 * the agent on the card on the vitrine instead of the skills."
 *
 * Três coisas, cada uma com o defeito próprio que este arquivo existe pra impedir:
 *  · a plugabilidade — o card da loja e o agente do chat têm de declarar o mesmo plugin;
 *  · a identidade — persona declarada em `capacidades` e ausente em `PERSONAS` cai na Aura pelo
 *    fallback do `buildPersona`, sem ninguém notar;
 *  · as skills — a persona cita skills pelo NOME DA PASTA. Uma skill renomeada ou apagada vira uma
 *    instrução para ativar o que não existe; uma skill ligada a ela e não citada nunca é usada.
 */
import { describe, expect, it } from "vitest";
import { ALL_COURSES } from "@/constants/courses";
import { mentorBySlug } from "@/lib/agent/mentors";
import { DIR_SKILLS_CASA, carregarSkillsDaCasa, cardDaSkill, fsDeDisco } from "@/lib/agent/skills-dir";
import { AGENTES_CHAT, agenteValido, agentesDisponiveis } from "@/lib/agents/chatAgentes";
import { CAPACIDADES, capacidadeDe } from "@/lib/agents/capacidades";
import { escopoDoTurno } from "@/lib/agents/escopo";
import { PERSONAS, buildPersona } from "@/lib/ai/personas";
import { CATALOGO } from "@/lib/estudos/vitrine";
import { agenteDaSkill, cardEhDoAgente, itensDasSkills } from "@/lib/estudos/vitrineSkills";

const catalogo = carregarSkillsDaCasa(fsDeDisco(), DIR_SKILLS_CASA);
const ligadas = catalogo.skills.filter((s) => agenteDaSkill(s) === "noether");
const nomes = (ss: typeof ligadas) => ss.map((s) => s.manifest.name).sort();

describe("Noether · plugável pela loja", () => {
  it("está no catálogo da loja, de graça, como agente plugável", () => {
    const item = CATALOGO.find((i) => i.id === "noether-matematica");
    expect(item, "a Noether tem de estar na vitrine pra poder ser adicionada").toBeTruthy();
    expect(item!.plugavel).toBe("noether-matematica");
    expect(item!.tipo).toBe("agente");
    expect(item!.preco).toBe(0);
    expect(item!.entrega.length).toBeGreaterThanOrEqual(4);
  });

  it("o agente do chat declara o mesmo plugin — senão a loja adiciona e o seletor ignora", () => {
    const a = AGENTES_CHAT.find((x) => x.id === "noether")!;
    expect(a.plugin).toBe("noether-matematica");
    expect(a.tela).toBe("chat");
  });

  it("não aparece no seletor de quem não a adicionou, e aparece pra quem adicionou", () => {
    expect(agentesDisponiveis([]).map((a) => a.id)).not.toContain("noether");
    expect(agentesDisponiveis(["noether-matematica"]).map((a) => a.id)).toContain("noether");
    expect(agenteValido("noether", [])).toBe("aura");
    expect(agenteValido("noether", ["noether-matematica"])).toBe("noether");
  });
});

describe("Noether · a identidade", () => {
  it("a persona existe de verdade — não cai na Aura pelo fallback", () => {
    expect(CAPACIDADES.noether.persona).toBe("noether");
    expect(PERSONAS.noether, "persona ausente = a Noether falaria como a Aura").toBeTruthy();
    expect(buildPersona("noether")).toContain("Você é a Noether");
    expect(buildPersona("noether")).not.toBe(buildPersona("aura"));
  });

  it("é a mesma Noether do mentor de Matemática, num curso que a plataforma oferece", () => {
    const m = mentorBySlug("matematica")!;
    expect(m.name).toBe("Noether");
    expect(ALL_COURSES).toContain(m.course);
    expect(CAPACIDADES.noether.area).toBe("matematica");
  });

  it("não declara habilidade que nenhuma tool resolve: as skills dela vêm por activate_skill", () => {
    expect(CAPACIDADES.noether.habilidades).toEqual([]);
    expect(capacidadeDe("noether")).toBe(CAPACIDADES.noether);
  });

  it("a persona traz os dois limites: não faz a prova pela pessoa, e figura não é demonstração", () => {
    const p = PERSONAS.noether.systemPrompt;
    expect(p).toMatch(/avaliação em andamento/);
    expect(p).toMatch(/não demonstra/);
  });
});

describe("Noether · o campo dela não é recusado pelo portão de escopo", () => {
  const cap = CAPACIDADES.noether;
  const veredicto = (pergunta: string) => escopoDoTurno({ pergunta, areaDaAgente: cap.area, termosProprios: cap.termosProprios });

  it.each([
    "resolve passo a passo a equação 2x² − 8x + 6 = 0",
    "qual a derivada de x^3 sen(x)?",
    "me mostra a mediatriz de um segmento",
    "como eu provo isso por indução?",
    "calcula o mdc de 1071 e 462",
    "o que é um espaço vetorial?",
    "qual a probabilidade de sair dois seis?",
  ])("%s", (pergunta) => {
    expect(veredicto(pergunta), "pergunta de matemática tem de ficar com ela").toEqual(veredicto("matemática"));
  });
});

describe("Noether · as skills do catálogo", () => {
  it("as oito skills de matemática estão ligadas a ela", () => {
    expect(nomes(ligadas)).toEqual([
      "algoritmos-classicos", "diagrama-mermaid", "formulas-katex", "geometria-jsxgraph",
      "jupyter-notebooks", "pandas-analise-de-dados", "scilab-numerico", "sympy-matematica-simbolica",
    ]);
  });

  it("a persona cita CADA skill ligada, pelo nome da pasta — e nenhuma que não exista", () => {
    const p = PERSONAS.noether.systemPrompt;
    for (const s of ligadas) expect(p, `a persona não manda ativar "${s.manifest.name}"`).toContain(`\`${s.manifest.name}\``);
    const existentes = new Set(catalogo.skills.map((s) => s.manifest.name));
    const citadas = [...p.matchAll(/^- `([a-z0-9-]+)`/gm)].map((m) => m[1]);
    expect(citadas.sort()).toEqual(nomes(ligadas));
    for (const c of citadas) expect(existentes.has(c), `a persona manda ativar "${c}", que não está no catálogo`).toBe(true);
  });

  it("toda skill ligada a um agente aponta um agente que existe", () => {
    const ids = new Set(AGENTES_CHAT.map((a) => a.id as string));
    for (const s of catalogo.skills) {
      const a = agenteDaSkill(s);
      if (a) expect(ids.has(a), `"${s.manifest.name}" declara o agente "${a}", que não existe`).toBe(true);
    }
  });
});

describe("Noether · o card da loja é o agente, não as skills", () => {
  const escondidas = catalogo.skills.filter(cardEhDoAgente);
  const naLoja = new Set(itensDasSkills(catalogo).map((i) => i.id));

  it("as três skills que são só dela saem da loja como card avulso", () => {
    expect(nomes(escondidas)).toEqual(["formulas-katex", "geometria-jsxgraph", "sympy-matematica-simbolica"]);
    for (const s of escondidas) expect(naLoja.has(`skill:${s.manifest.name}`)).toBe(false);
  });

  it("…e o card do agente é quem as entrega: cada biblioteca aparece na entrega da Noether", () => {
    const entrega = CATALOGO.find((i) => i.id === "noether-matematica")!.entrega.join(" ");
    for (const lib of ["KaTeX", "JSXGraph", "SymPy", "Mermaid"]) expect(entrega).toContain(lib);
  });

  it("skill escondida tem dono: `zaeon-card: agente` só vale junto de `zaeon-agente`", () => {
    for (const s of escondidas) expect(agenteDaSkill(s)).toBe("noether");
    for (const s of catalogo.skills) {
      const m = (s.manifest.metadata ?? {}) as Record<string, unknown>;
      if (m["zaeon-card"] === "agente") expect(agenteDaSkill(s), `"${s.manifest.name}" ficaria sem card nenhum`).not.toBeNull();
    }
  });

  it("as de uso geral continuam na loja: curso, device e as que servem a outros cursos", () => {
    for (const n of ["algoritmos-classicos", "scilab-numerico", "jupyter-notebooks", "pandas-analise-de-dados", "diagrama-mermaid"]) {
      expect(naLoja.has(`skill:${n}`), `"${n}" não pode sumir da loja`).toBe(true);
    }
    // e nenhuma outra skill sumiu: a loja perdeu exatamente as três
    expect(catalogo.skills.filter((s) => cardDaSkill(s)).length - naLoja.size).toBe(3);
  });
});
