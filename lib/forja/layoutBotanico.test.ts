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

describe("layoutBotanico — casas simétricas da Árvore da Vida (motor modular)", () => {
  const l = layoutBotanico(arvore);

  it("a semente é a raiz (início), na base; o anchor (topo do tronco) fica acima", () => {
    expect(l.semente.titulo).toBe("Biopython");
    expect(l.semente.x).toBe(CX);
    expect(l.anchor.y).toBeLessThan(l.semente.y);
    expect(l.troncoPath.startsWith(`M ${CX} `)).toBe(true);
  });

  it("cada módulo tem uma casa na copa, acima da base", () => {
    expect(l.ramos).toHaveLength(4);
    for (const r of l.ramos) expect(r.hy).toBeLessThan(l.semente.y);
  });

  it("a copa é simétrica: 1º e último módulo espelham em torno do tronco", () => {
    const a = l.ramos[0].hx - CX, b = l.ramos[l.ramos.length - 1].hx - CX;
    expect(Math.sign(a)).toBe(-Math.sign(b));
    expect(Math.abs(a + b)).toBeLessThan(1);
  });

  it("os símbolos viram folhas com casa própria nas pontas", () => {
    expect(l.ramos[0].folhas.map((f) => f.titulo)).toEqual(["Seq", "MutableSeq"]);
    expect(l.ramos[2].folhas).toHaveLength(0);
  });

  it("as raízes são simétricas (pares espelhados) + a central, e a copa escala com o nº de módulos", () => {
    expect(l.raizes.length).toBe(7); // 3 pares + central
    expect(l.raizes.every((r) => r.d.startsWith("M "))).toBe(true);
    // mais módulos → copa mais larga (geometria modular)
    const grande = layoutBotanico({ raiz: no("r", "X", Array.from({ length: 9 }, (_, i) => no("m" + i, "mod" + i))) });
    const spanG = Math.max(...grande.ramos.map((r) => Math.abs(r.hx - CX)));
    const spanP = Math.max(...l.ramos.map((r) => Math.abs(r.hx - CX)));
    expect(spanG).toBeGreaterThan(spanP);
  });

  it("entrega o anel e o centro do desenho", () => {
    expect(l.rAnel).toBeGreaterThan(0);
    expect(l.centro.x).toBe(CX);
  });
});
