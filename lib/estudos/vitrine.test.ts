import { describe, expect, it } from "vitest";
import { CATALOGO, FILTROS, MOEDA, filtrarVitrine, precoTexto, valorTotal, vendido } from "./vitrine";
import { RARIDADES } from "./blueprint";
import { itensDasSkillsDoDisco } from "./vitrineSkills";

describe("a VITRINE de estudos (catálogo simulado)", () => {
  it("o catálogo: ids únicos, frações coerentes, raridade válida, grátis = 1 fração; tem DYOM, agente, RWA, grátis e ironia", () => {
    expect(new Set(CATALOGO.map((i) => i.id)).size).toBe(CATALOGO.length);
    for (const i of CATALOGO) {
      expect(i.fracoes.vendidas).toBeLessThanOrEqual(i.fracoes.total); expect(RARIDADES).toContain(i.raridade);
      expect(i.profundidade).toBeGreaterThanOrEqual(0); expect(i.profundidade).toBeLessThanOrEqual(100); expect(i.entrega.length).toBeGreaterThan(0);
      if (i.preco === 0) expect(i.fracoes.total).toBe(1);
    }
    // NENHUMA ABA VAZIA. A régua é o conjunto que a UI mostra de verdade, não só o catálogo
    // embutido: as SKILLS não moram aqui de propósito — o catálogo delas é o diretório
    // `.claude/skills`, e `/api/estudos/vitrine` as junta a estes itens (lib/estudos/vitrineSkills).
    // Checar só `CATALOGO` daria aba "Skills" vazia como se fosse invariante quebrada, quando o
    // que mudou foi de onde o item vem.
    const comoAUIMostra = [...CATALOGO, ...itensDasSkillsDoDisco()];
    for (const f of FILTROS) {
      expect(filtrarVitrine(comoAUIMostra, f.id).length, `aba "${f.nome}" vazia`).toBeGreaterThan(0);
    }
    expect(CATALOGO.some((i) => i.id === "ps5-rev")).toBe(true);
  });
  it("filtra por tipo e busca no texto", () => {
    expect(filtrarVitrine(CATALOGO, "gratis").every((i) => i.preco === 0)).toBe(true);
    expect(filtrarVitrine(CATALOGO, "todos", "PS5").map((i) => i.id)).toEqual(["ps5-rev"]);
    expect(filtrarVitrine(CATALOGO, "rwa", "café").map((i) => i.id)).toEqual(["cafe-cariri"]);
  });
  it("preço em SOL (Solana) — e a compra ainda NÃO está no ar (nada cobra ninguém)", () => {
    expect(precoTexto(0)).toBe("Grátis"); expect(precoTexto(48)).toBe("48 SOL"); expect(MOEDA.ativa).toBe(false);
    const ps5 = CATALOGO.find((i) => i.id === "ps5-rev")!; expect(vendido(ps5)).toBeCloseTo(0.812, 6); expect(valorTotal(ps5)).toBe(48000);
  });
});
