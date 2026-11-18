import { describe, it, expect } from "vitest";
import { parsePartitura, ehPartitura } from "./partitura";

const BOA = '{"titulo":"Escala de Dó maior","tom":"C","abc":"X:1\\nT:Escala de Dó maior\\nM:4/4\\nL:1/4\\nQ:1/4=80\\nK:C\\nC D E F | G A B c |]","conceito":"Graus conjuntos; o semitom fica entre mi-fá e si-dó."}';

describe("parsePartitura", () => {
  it("aceita o JSON da skill e normaliza as quatro chaves", () => {
    const r = parsePartitura(BOA);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.titulo).toBe("Escala de Dó maior");
    expect(r.tom).toBe("C");
    expect(r.abc).toContain("K:C");
    expect(r.conceito).toContain("semitom");
  });

  it("rejeita JSON inválido, não-objeto e array", () => {
    expect(parsePartitura("nao é json").ok).toBe(false);
    expect(parsePartitura('"só string"').ok).toBe(false);
    expect(parsePartitura("[1,2,3]").ok).toBe(false);
  });

  it("rejeita quando falta uma chave", () => {
    expect(parsePartitura('{"tom":"C","abc":"X:1\\nK:C\\nC","conceito":"x"}').ok).toBe(false); // sem titulo
    expect(parsePartitura('{"titulo":"t","tom":"C","conceito":"x"}').ok).toBe(false);           // sem abc
  });

  it("rejeita abc sem cabeçalho X:/K: (abcjs desenharia vazio)", () => {
    const r = parsePartitura('{"titulo":"t","tom":"C","abc":"C D E F","conceito":"x"}');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toMatch(/cabeçalho/);
  });

  it("aceita conceito e tom vazios (tom modal pode vir curto), mas exige titulo e abc", () => {
    const r = parsePartitura('{"titulo":"Arpejo","tom":"","abc":"X:1\\nK:C\\nC E G","conceito":""}');
    expect(r.ok).toBe(true);
  });

  it("corta tamanhos absurdos sem quebrar", () => {
    const abcGigante = "X:1\\nK:C\\n" + "C ".repeat(10000);
    const r = parsePartitura(`{"titulo":"t","tom":"C","abc":"${abcGigante}","conceito":"x"}`);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toMatch(/grande/);
  });

  it("ehPartitura é o atalho booleano", () => {
    expect(ehPartitura(BOA)).toBe(true);
    expect(ehPartitura("{}")).toBe(false);
  });
});
