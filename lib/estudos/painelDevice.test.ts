import { describe, it, expect } from "vitest";
import { passosDoCorpo } from "./painelDevice";

describe("passosDoCorpo — corpo do SKILL.md vira passos pelos títulos ##", () => {
  it("tira o # do topo, mantém a intro como card sem título, e quebra por cada ##", () => {
    const corpo = "# Topo ignora\n\nIntro antes do primeiro passo.\n\n## Instalar\nbaixe e abra.\n\n## Primeiro projeto\nclique em novo.";
    const p = passosDoCorpo(corpo);
    expect(p.map((x) => x.titulo)).toEqual(["", "Instalar", "Primeiro projeto"]);
    expect(p[0].markdown).toBe("Intro antes do primeiro passo."); // a prosa de intro (ex: comando de instalação)
    expect(p[1].markdown).toBe("baixe e abra.");
    expect(p[2].markdown).toBe("clique em novo.");
  });
  it("sem ## nenhum, devolve o corpo inteiro como um passo sem título", () => {
    const p = passosDoCorpo("só um texto corrido, sem seções.");
    expect(p).toHaveLength(1);
    expect(p[0].titulo).toBe("");
    expect(p[0].markdown).toContain("texto corrido");
  });
  it("corpo vazio = nenhum passo", () => {
    expect(passosDoCorpo("")).toEqual([]);
    expect(passosDoCorpo("   \n  ")).toEqual([]);
  });
});
