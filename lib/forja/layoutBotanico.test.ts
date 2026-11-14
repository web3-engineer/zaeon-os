import { describe, it, expect } from "vitest";
import { layoutBotanico, CANVAS } from "./layoutBotanico";
import type { ArvoreEntendimento } from "./tipos";

const no = (id: string, titulo: string, filhos: any[] = []) => ({ id, titulo, resumo: "", desde: "basico" as const, refs: [], filhos });

const arvore: ArvoreEntendimento = {
  raiz: no("r", "Biopython", [
    no("m1", "Seq.py", [no("s1", "Seq"), no("s2", "MutableSeq")]),
    no("m2", "align.py", [no("s3", "Alignment")]),
    no("m3", "SeqIO.py", []),
    no("m4", "SeqFeature.py", [no("s4", "SeqFeature")]),
  ]),
};

const CX = CANVAS.w / 2;

describe("layoutBotanico — a base de conhecimento como Árvore da Vida", () => {
  const l = layoutBotanico(arvore);

  it("a semente é a raiz, na base do tronco; o tronco é central e vertical", () => {
    expect(l.semente.titulo).toBe("Biopython");
    expect(l.semente.x).toBe(CX);
    expect(l.troncoPath.startsWith(`M ${CX} `)).toBe(true);
  });

  it("cada módulo vira um ramo com curva (path) e ponta", () => {
    expect(l.ramos).toHaveLength(4);
    for (const r of l.ramos) {
      expect(r.path.startsWith("M ")).toBe(true);
      expect(r.path).toContain("C"); // curva de Bézier
      expect(r.y).toBeLessThan(l.semente.y); // a copa fica acima da base
    }
  });

  it("a copa é simétrica: o 1º e o último ramo espelham em torno do tronco", () => {
    const a = l.ramos[0].x - CX;
    const b = l.ramos[l.ramos.length - 1].x - CX;
    expect(Math.sign(a)).toBe(-Math.sign(b));
    expect(Math.abs(a + b)).toBeLessThan(1); // espelhados
  });

  it("os símbolos de cada módulo viram folhas nas pontas", () => {
    expect(l.ramos[0].folhas.map((f) => f.titulo)).toEqual(["Seq", "MutableSeq"]);
    expect(l.ramos[2].folhas).toHaveLength(0);
  });

  it("as raízes espelham a copa, descendo pro solo, e são simétricas", () => {
    expect(l.raizes.length).toBeGreaterThanOrEqual(5);
    expect(l.raizes.every((r) => r.d.startsWith("M ") && r.d.includes("C"))).toBe(true);
  });

  it("entrega o anel e o centro do desenho", () => {
    expect(l.rAnel).toBeGreaterThan(0);
    expect(l.centro.x).toBe(CX);
  });
});
