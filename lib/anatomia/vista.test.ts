/**
 * A aritmética da câmera. É VARREDURA, não exemplo escolhido a dedo.
 *
 * Razão: o defeito aqui não produz exceção nem log — produz tela cinza, porque a câmera foi parar
 * dentro do corpo (distância ~0), longe demais (distância enorme) ou em NaN (qualquer divisão por
 * uma janela de altura zero). Um exemplo bem escolhido passa por cima dos três. Então o teste
 * principal varre 7 formatos de janela × 6 extensões × 3 campos de visão × 4 vistas = 504 casos e
 * afirma o que NUNCA pode acontecer.
 */
import { describe, expect, it } from "vitest";
import type { Vista as TVista } from "@/lib/anatomia/atlas";
import { LARGURA_CELULAR, enquadrar } from "@/lib/anatomia/vista";

const VISTAS: TVista[] = ["three-quarter", "front", "side", "back"];
const JANELAS: [number, number][] = [
  [0, 0],          // degenerada: o observador de redimensionamento dispara antes do layout
  [1, 1],
  [390, 844],      // celular em pé
  [844, 390],      // celular de lado (altura menor que o reservado de 350)
  [1440, 900],     // desktop
  [3840, 2160],
  [600, 4000],     // janela absurda, só para ver se a conta sobrevive
];

describe("enquadrar — o que NUNCA pode acontecer (varredura de 504 casos)", () => {
  it("distância sempre finita e > 0; alvo e direção sempre finitos", () => {
    const ruins: string[] = [];
    for (const [w, h] of JANELAS) {
      for (const extensao of [0, 0.05, 0.3, 0.5, 0.81, 1]) {
        for (const fov of [20, 34, 70]) {
          for (const vista of VISTAS) {
            for (const [pw, ph] of [[0, 0], [12, 30]] as [number, number][]) {
              const e = enquadrar({ larguraTela: w, alturaTela: h, fov, extensao, packLargura: pw, packAltura: ph, vista });
              const caso = `${w}x${h} ext=${extensao} fov=${fov} ${vista} pack=${pw}x${ph}`;
              if (!Number.isFinite(e.distancia) || e.distancia <= 0) ruins.push(`distância ${e.distancia} em ${caso}`);
              if (e.distancia > 1e4) ruins.push(`distância absurda ${e.distancia} em ${caso}`);
              if (![...e.alvo, ...e.direcao].every(Number.isFinite)) ruins.push(`alvo/direção não finitos em ${caso}`);
              if (Math.hypot(...e.direcao) < 0.5) ruins.push(`direção degenerada em ${caso}`);
            }
          }
        }
      }
    }
    expect(ruins.slice(0, 5), `${ruins.length} casos ruins`).toEqual([]);
  });

  it("fov fora de faixa (0 ou 180) não divide por zero", () => {
    for (const fov of [0, -10, 180, 1e9]) {
      const e = enquadrar({ larguraTela: 1440, alturaTela: 900, fov, extensao: 1, packLargura: 12, packAltura: 30, vista: "front" });
      expect(Number.isFinite(e.distancia), `fov ${fov}`).toBe(true);
      expect(e.distancia).toBeGreaterThan(0);
    }
  });
});

describe("enquadrar — o comportamento que o original tem", () => {
  const desktop = { larguraTela: 1440, alturaTela: 900, fov: 34 };

  it("explodir AFASTA a câmera, monotonicamente", () => {
    let anterior = -1;
    for (const extensao of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
      const e = enquadrar({ ...desktop, extensao, packLargura: 12, packAltura: 30, vista: "front" });
      expect(e.distancia, `ext=${extensao} devia afastar`).toBeGreaterThan(anterior);
      anterior = e.distancia;
    }
  });

  it("acima de 0,8 de explosão a vista é FORÇADA para a frente — de lado o inventário não se lê", () => {
    for (const vista of VISTAS) {
      expect(enquadrar({ ...desktop, extensao: 0.81, packLargura: 12, packAltura: 30, vista }).vista).toBe("front");
      expect(enquadrar({ ...desktop, extensao: 0.79, packLargura: 12, packAltura: 30, vista }).vista).toBe(vista);
    }
  });

  it("corpo montado olha o tronco (0,68) no desktop e mais alto (0,85) no celular", () => {
    expect(enquadrar({ ...desktop, extensao: 0, packLargura: 0, packAltura: 0, vista: "front" }).alvo[1]).toBeCloseTo(0.68, 6);
    expect(enquadrar({ larguraTela: 390, alturaTela: 844, fov: 34, extensao: 0, packLargura: 0, packAltura: 0, vista: "front" }).alvo[1]).toBeCloseTo(0.85, 6);
    // explodindo, sobe também no desktop
    expect(enquadrar({ ...desktop, extensao: 0.5, packLargura: 12, packAltura: 30, vista: "front" }).alvo[1]).toBeCloseTo(0.85, 6);
  });

  it("no desktop explodido o alvo desloca para a esquerda, abrindo espaço para o painel", () => {
    const e = enquadrar({ ...desktop, extensao: 0.5, packLargura: 10, packAltura: 20, vista: "front" });
    expect(e.alvo[0]).toBeCloseTo(-1.2, 6);
    // no celular não há painel lateral: o alvo fica centrado
    const cel = enquadrar({ larguraTela: 390, alturaTela: 844, fov: 34, extensao: 0.5, packLargura: 10, packAltura: 20, vista: "front" });
    expect(cel.alvo[0]).toBe(0);
  });

  it("as quatro direções são as do original, e a de ¾ é unitária", () => {
    const d = (vista: TVista) => enquadrar({ ...desktop, extensao: 0, packLargura: 0, packAltura: 0, vista }).direcao;
    expect(d("front")).toEqual([0, 0.02, 1]);
    expect(d("back")).toEqual([0, 0.02, -1]);
    expect(d("side")).toEqual([1, 0.02, 0]);
    expect(Math.hypot(...d("three-quarter"))).toBeCloseTo(1, 10);
    expect(d("three-quarter")[0]).toBeGreaterThan(0);
    expect(d("three-quarter")[2]).toBeGreaterThan(d("three-quarter")[0]);
  });

  it("o celular começa mais longe que o desktop — o corpo tem de caber numa tela estreita", () => {
    const cel = enquadrar({ larguraTela: 390, alturaTela: 844, fov: 34, extensao: 0, packLargura: 0, packAltura: 0, vista: "front" });
    const desk = enquadrar({ ...desktop, extensao: 0, packLargura: 0, packAltura: 0, vista: "front" });
    expect(cel.distancia).toBeGreaterThan(desk.distancia);
    expect(cel.distancia).toBeGreaterThanOrEqual(4.5);
    expect(desk.distancia).toBeCloseTo(4, 6);
    expect(LARGURA_CELULAR).toBe(768);
  });

  it("inventário MAIOR exige câmera mais longe", () => {
    const pequeno = enquadrar({ ...desktop, extensao: 1, packLargura: 4, packAltura: 6, vista: "front" });
    const grande = enquadrar({ ...desktop, extensao: 1, packLargura: 20, packAltura: 40, vista: "front" });
    expect(grande.distancia).toBeGreaterThan(pequeno.distancia * 2);
  });
});
