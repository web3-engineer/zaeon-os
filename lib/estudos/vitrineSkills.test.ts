import { describe, expect, it } from "vitest";
import { itemDaSkill, itensDasSkills, itensDasSkillsDoDisco } from "@/lib/estudos/vitrineSkills";
import { carregarSkillsDaCasa, fsDeDisco, type CardDaSkill } from "@/lib/agent/skills-dir";
import { FILTROS, NOME_TIPO, filtrarVitrine } from "@/lib/estudos/vitrine";

const card = (over: Partial<CardDaSkill> = {}): CardDaSkill => ({
  slug: "minha-skill",
  titulo: "Título",
  subtitulo: "Subtítulo",
  modelo: "molecula",
  tags: ["t1"],
  entrega: ["e1", "e2"],
  app: null,
  ...over,
});

describe("itemDaSkill — o card vira item da vitrine", () => {
  it("entra como tipo `skill`, grátis, uma fração, e a entrega é a do card", () => {
    const i = itemDaSkill(card());
    expect(i.id).toBe("skill:minha-skill");
    expect(i.tipo).toBe("skill");
    expect(i.preco).toBe(0);
    expect(i.fracoes).toEqual({ total: 1, vendidas: 0 });
    expect(i.entrega).toEqual(["e1", "e2"]);
  });

  it("o app secundário entra como tag — é por ele que o aluno acha a skill sem saber o nome dela", () => {
    expect(itemDaSkill(card({ app: "atlas-anatomia" })).tags).toEqual(["t1", "atlas-anatomia"]);
    expect(itemDaSkill(card({ app: null })).tags).toEqual(["t1"]);
  });

  it("modelo 3D desconhecido cai em `livro` em vez de quebrar o render", () => {
    expect(itemDaSkill(card({ modelo: "unicornio" })).modelo).toBe("livro");
    expect(itemDaSkill(card({ modelo: "molecula" })).modelo).toBe("molecula");
  });
});

describe("a SEÇÃO de skills na vitrine", () => {
  it("`skill` é um tipo com nome de exibição e um filtro próprio", () => {
    expect(NOME_TIPO.skill).toBe("Skill");
    expect(FILTROS.map((f) => f.id)).toContain("skill");
  });

  it("o filtro `skill` traz só as skills, e `todos` traz tudo", () => {
    const skill = itemDaSkill(card());
    const outro = { ...itemDaSkill(card({ slug: "x" })), tipo: "curso" as const, id: "curso:x" };
    expect(filtrarVitrine([skill, outro], "skill").map((i) => i.id)).toEqual(["skill:minha-skill"]);
    expect(filtrarVitrine([skill, outro], "todos")).toHaveLength(2);
  });

  it("a busca da vitrine acha a skill pelo app que ela comanda", () => {
    const skill = itemDaSkill(card({ app: "atlas-anatomia" }));
    expect(filtrarVitrine([skill], "todos", "atlas-anatomia")).toHaveLength(1);
  });
});

describe("as skills REAIS do repositório viram card", () => {
  it("o catálogo do disco produz pelo menos um item, e ele é consistente", () => {
    const itens = itensDasSkillsDoDisco();
    expect(itens.length, "nenhuma skill da casa virou card — o card é a porta da loja").toBeGreaterThan(0);
    for (const i of itens) {
      expect(i.tipo).toBe("skill");
      expect(i.id.startsWith("skill:")).toBe(true);
      expect(i.titulo.length).toBeGreaterThan(0);
      expect(i.entrega.length).toBeGreaterThan(0);
    }
  });

  it("o caminho puro e o caminho do disco concordam", () => {
    expect(itensDasSkills(carregarSkillsDaCasa(fsDeDisco()))).toEqual(itensDasSkillsDoDisco());
  });
});
