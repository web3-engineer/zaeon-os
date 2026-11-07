/**
 * O empacotamento da vista explodida, afirmado contra o ARQUIVO DE DADOS REAL.
 *
 * O que estes testes protegem:
 *  1. NENHUMA célula se sobrepõe a outra — varredura de TODOS os pares das 2.234 peças. Duas peças
 *     no mesmo lugar é o defeito que o olho não distingue de "estão perto", e que torna a vista
 *     explodida inútil justamente onde ela deveria servir: achar uma peça pequena.
 *  2. A ordem é ESTÁVEL. Sem desempate por id, peças de mesma altura trocariam de célula conforme a
 *     ordem de chegada dos 15 pedaços binários, e o inventário tremeria entre quadros.
 *  3. O conjunto fica CENTRADO na origem, senão a câmera enquadra o vazio ao lado dele.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Atlas, Parte } from "@/lib/anatomia/atlas";
import { criarLayoutDeExplosao } from "@/lib/anatomia/explosao";

const atlas: Atlas = JSON.parse(readFileSync(join(process.cwd(), "public/models/atlas.json"), "utf8"));

describe("criarLayoutDeExplosao", () => {
  it("dá uma célula a CADA peça visível, e a nenhuma outra", () => {
    const algumas = atlas.parts.slice(0, 40);
    const l = criarLayoutDeExplosao(algumas);
    expect(l.celulas.size).toBe(algumas.length);
    for (const p of algumas) expect(l.celulas.has(p.id), `peça ${p.id} sem célula`).toBe(true);
    expect(criarLayoutDeExplosao([]).celulas.size).toBe(0);
  });

  it("NENHUM par de células se sobrepõe — varredura de todas as 2.234 peças", () => {
    const l = criarLayoutDeExplosao(atlas.parts, 1.6);
    const caixas = [...l.celulas.entries()].map(([id, c]) => ({
      id,
      x0: c.x - c.largura / 2, x1: c.x + c.largura / 2,
      y0: c.y - c.altura / 2, y1: c.y + c.altura / 2,
    }));
    expect(caixas.length).toBe(2234);
    // ordena por x para só comparar vizinhos possíveis: 2.234² seria desperdício, e a varredura
    // por linha de corte prova o mesmo — duas caixas que não se cruzam em x não se sobrepõem.
    caixas.sort((a, b) => a.x0 - b.x0);
    const sobrepostas: string[] = [];
    const FOLGA = 1e-9;
    for (let i = 0; i < caixas.length; i++) {
      const a = caixas[i];
      for (let j = i + 1; j < caixas.length; j++) {
        const b = caixas[j];
        if (b.x0 >= a.x1 - FOLGA) break;                       // daqui pra frente nenhuma cruza em x
        if (b.y0 < a.y1 - FOLGA && a.y0 < b.y1 - FOLGA) sobrepostas.push(`${a.id}×${b.id}`);
      }
    }
    expect(sobrepostas.slice(0, 5), `${sobrepostas.length} pares sobrepostos`).toEqual([]);
  });

  it("é DETERMINÍSTICO: a mesma entrada em outra ordem dá o mesmo layout", () => {
    const partes = atlas.parts.slice(0, 300);
    const a = criarLayoutDeExplosao(partes, 1.2);
    const b = criarLayoutDeExplosao([...partes].reverse(), 1.2);
    expect(a.largura).toBeCloseTo(b.largura, 10);
    expect(a.altura).toBeCloseTo(b.altura, 10);
    for (const p of partes) {
      expect(a.celulas.get(p.id)!.x, `x de ${p.id}`).toBeCloseTo(b.celulas.get(p.id)!.x, 10);
      expect(a.celulas.get(p.id)!.y, `y de ${p.id}`).toBeCloseTo(b.celulas.get(p.id)!.y, 10);
    }
  });

  it("CENTRA o conjunto na origem — senão a câmera enquadra o vazio ao lado", () => {
    const l = criarLayoutDeExplosao(atlas.parts, 1.6);
    const xs = [...l.celulas.values()], ys = xs;
    const minX = Math.min(...xs.map((c) => c.x - c.largura / 2)), maxX = Math.max(...xs.map((c) => c.x + c.largura / 2));
    const minY = Math.min(...ys.map((c) => c.y - c.altura / 2)), maxY = Math.max(...ys.map((c) => c.y + c.altura / 2));
    expect(Math.abs(minX + maxX), "centro em x").toBeLessThan(1e-6);
    expect(Math.abs(minY + maxY), "centro em y").toBeLessThan(1e-6);
    expect(l.largura).toBeCloseTo(maxX - minX, 6);
    expect(l.altura).toBeCloseTo(maxY - minY, 6);
  });

  it("o aspecto da tela muda a FORMA e não o conteúdo: tela larga, inventário largo", () => {
    const partes = atlas.parts.slice(0, 600);
    const estreito = criarLayoutDeExplosao(partes, 0.5);
    const largo = criarLayoutDeExplosao(partes, 1.5);
    expect(largo.largura).toBeGreaterThan(estreito.largura);
    expect(largo.altura).toBeLessThan(estreito.altura);
    expect(largo.celulas.size).toBe(estreito.celulas.size);
  });

  it("peça de tamanho zero ainda ganha célula clicável (piso de 0,035 + folga)", () => {
    const degenerada: Parte = { ...atlas.parts[0], id: "ZERO", bounds: [[0, 0, 0], [0, 0, 0]] };
    const c = criarLayoutDeExplosao([degenerada]).celulas.get("ZERO")!;
    expect(c.largura).toBeCloseTo(0.075, 6);
    expect(c.altura).toBeCloseTo(0.075, 6);
  });
});
