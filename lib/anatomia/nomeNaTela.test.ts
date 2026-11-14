/** #764 · o cartão de anatomia em português ("coração", não "heart") */
import { describe, it, expect } from "vitest";
import { NOMES_PT, nomeDaEstruturaNaTela, nomeDoAtlasEmPortugues } from "./nomeNaTela";
import { SINONIMOS_PT } from "./busca";

describe("nomeDaEstruturaNaTela", () => {
  it("o termo curto em português vence o nome do atlas", () => {
    expect(nomeDaEstruturaNaTela("coração", "heart")).toBe("coração");
    expect(nomeDaEstruturaNaTela("sistema respiratório", "respiratory system")).toBe("sistema respiratório");
  });
  it("#777 manda o nome canônico do atlas como termo: traduz", () => {
    expect(nomeDaEstruturaNaTela("heart", "heart")).toBe("coração");
    expect(nomeDaEstruturaNaTela("left lung", "left lung")).toBe("pulmão (lado esquerdo)");
    expect(nomeDaEstruturaNaTela("small intestine", "small intestine")).toBe("intestino delgado");
  });
  it("termo curto em inglês, diferente do nome do atlas: traduz também", () => {
    expect(nomeDaEstruturaNaTela("lung", "left lung")).toBe("pulmão (lado esquerdo)");
    expect(nomeDaEstruturaNaTela("heart", "heart wall")).toBe("coração");
  });
  it("sem tradução, fica o nome do atlas", () => {
    expect(nomeDaEstruturaNaTela("left ventricle wall", "left ventricle wall")).toBe("left ventricle wall");
  });
  it("frase longa, vazia ou com número: tradução do atlas, ou o nome dele", () => {
    expect(nomeDaEstruturaNaTela("desenhe a anatomia do coração humano agora", "heart")).toBe("coração");
    expect(nomeDaEstruturaNaTela("", "heart")).toBe("coração");
    expect(nomeDaEstruturaNaTela("FMA7088", "femur")).toBe("femur");
  });
});

describe("NOMES_PT", () => {
  it("todo alvo do mapa PT→EN da busca tem nome de tela em português", () => {
    const faltam = [...new Set(Object.values(SINONIMOS_PT))].filter((en) => !nomeDoAtlasEmPortugues(en));
    expect(faltam).toEqual([]);
  });
  it("a tradução de tela volta para o mesmo alvo pela busca (sem acento)", () => {
    const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    for (const [en, pt] of Object.entries(NOMES_PT)) {
      const alvo = SINONIMOS_PT[semAcento(pt)];
      if (alvo) expect(alvo).toBe(en);
    }
  });
});
