import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CAM_FOLGA_CHAO, PITCH_MAX, PITCH_MIN, elevacaoDoOlhar, limitarPitch, poseDaCamera } from "./camera";

const olho = { x: 0, y: 2, z: 0 };
const pose = (pitch: number, chaoY = 0) => poseDaCamera({ olho: { ...olho, y: olho.y + chaoY }, az: 0.3, pitch, dist: 9, chaoY });

describe("câmera livre", () => {
  it("por cima: a câmera sobe e olha pro personagem (olhar pra baixo)", () => {
    const c = pose(0.8);
    expect(c.pos.y).toBeGreaterThan(olho.y);
    expect(elevacaoDoOlhar(c)).toBeLessThan(0);
  });
  it("arrastando pra baixo, a câmera encosta no chão e NÃO atravessa", () => {
    for (const p of [-0.2, -0.5, PITCH_MIN]) expect(pose(p).pos.y).toBeGreaterThanOrEqual(CAM_FOLGA_CHAO - 1e-9);
  });
  it("no limite, dá pra olhar pra CIMA (céu, Zaeon, buraco negro)", () => {
    expect(elevacaoDoOlhar(pose(PITCH_MIN))).toBeGreaterThan(0.9);
  });
  it("olhar sobe de forma contínua e monotônica ao arrastar pra baixo (sem pulo na transição)", () => {
    let ant = elevacaoDoOlhar(pose(PITCH_MAX));
    for (let p = PITCH_MAX; p >= PITCH_MIN; p -= 0.02) {
      const e = elevacaoDoOlhar(pose(p));
      expect(e).toBeGreaterThanOrEqual(ant - 1e-6);
      expect(e - ant).toBeLessThan(0.08);
      ant = e;
    }
  });
  it("na plataforma da Zaeon o 'chão' é o piso dela", () => {
    const c = pose(PITCH_MIN, 13);
    expect(c.pos.y).toBeGreaterThanOrEqual(13 + CAM_FOLGA_CHAO - 1e-9);
    expect(elevacaoDoOlhar(c)).toBeGreaterThan(0.9);
  });
  it("pitch fora da faixa é limitado", () => {
    expect(limitarPitch(-5)).toBe(PITCH_MIN);
    expect(limitarPitch(5)).toBe(PITCH_MAX);
  });
});

/**
 * A ABERTURA mede o RELÓGIO DE PAREDE, não o `dt` do laço.
 *
 * Afirmação sobre o TEXTO do engine porque o defeito não aparece em teste de função: ele só se manifesta quando o
 * computador é LENTO. O `dt` do laço é travado em 0,05 s de propósito (é o que impede a física de atravessar parede
 * num quadro lento), e a cinemática contava por ele. Medido no navegador com WebGL por software: 30 s de relógio
 * rendiam 3,6 s dos 12 da abertura — a introdução virava ~100 s, com a câmera colada no rosto, e são exatamente os
 * computadores que o app JÁ avisa serem lentos ("a aceleração de hardware está desligada"). Depois do conserto:
 * 12 s de cena em 12 s de relógio, e a câmera volta pros 9,16 m de sempre.
 */
describe("a abertura do login · relógio de parede, e o espaço pula", () => {
  const engine = () => readFileSync(join(process.cwd(), "components/cyber/engine.ts"), "utf8");

  it("a cena conta por `this.agora`, e NÃO acumula o `dt` travado do laço", () => {
    const eng = engine();
    const i = eng.indexOf("private cameraDaCenaLogin");
    expect(i, "a cutscene sumiu").toBeGreaterThan(0);
    const corpo = eng.slice(i, i + 2200);
    expect(corpo, "a cena precisa medir o relógio de parede").toContain("cl.t = Math.max(0, this.agora - cl.t0)");
    expect(corpo, "voltar a acumular o dt travado estica a abertura em máquina lenta").not.toContain("cl.t += dt");
  });

  it("o `t0` é marcado no 1º quadro DESENHADO, não na montagem (senão a cena acaba antes de aparecer)", () => {
    const eng = engine();
    expect(eng).toContain("this.cenaLogin = { t: 0, t0: 0, barras }");
    expect(eng, "sem isto a cena nasce com a idade da página inteira").toContain("if (!cl.t0) cl.t0 = this.agora;");
  });

  it("o ESPAÇO pula a abertura — ele não entra em `this.keys`, e era a única tecla que não pulava", () => {
    const eng = engine();
    const i = eng.indexOf('if (k === " " || k === "spacebar")');
    expect(i, "o ramo do espaço sumiu").toBeGreaterThan(0);
    const ramo = eng.slice(i, i + 400);
    expect(ramo).toContain("this.cenaLogin");
    expect(ramo).toContain("fimDaCenaLogin()");
    // e o pulo respeita a mesma carência da cutscene, pra uma tecla solta não cortar a abertura no 1º quadro
    expect(ramo).toMatch(/this\.cenaLogin\.t > 1\.2/);
  });
});
