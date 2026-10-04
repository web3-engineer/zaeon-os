import { describe, expect, it } from "vitest";
import { BASE_COLLIDER_R, BASE_PLATAFORMA_R, BASES_POR_ANEL, basesDosMembros, localParaMundo, posicaoDaBase, spawnDaBase } from "./bases";
import { dentroDeAlgum, empurrarParaFora } from "./colisao";
import { decidirClique, rotuloMonitor } from "./clique";

describe("bases", () => {
  it("fixas: mesma posição sempre; a primeira é a canônica do protótipo (mesma direção)", () => {
    expect(posicaoDaBase(0)).toEqual(posicaoDaBase(0));
    const b = posicaoDaBase(0);
    expect(Math.atan2(b.z, b.x)).toBeCloseTo(Math.atan2(-3, 6), 6);
  });
  it("espaçadas: plataformas nunca se sobrepõem (inclui anéis externos)", () => {
    const n = BASES_POR_ANEL * 3;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const a = posicaoDaBase(i), b = posicaoDaBase(j);
      expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(2 * BASE_PLATAFORMA_R + 1);
    }
  });
  it("próximas: as do 1º anel ficam na praça (≤ 12 do centro)", () => {
    for (let i = 0; i < BASES_POR_ANEL; i++) { const b = posicaoDaBase(i); expect(Math.hypot(b.x, b.z)).toBeLessThanOrEqual(12); }
  });
  it("por membro, na ordem; sair da sala não muda nada (a ordem só cresce)", () => {
    const m = basesDosMembros(["a", "b", "c", "a"]);
    expect([...m.keys()]).toEqual(["a", "b", "c"]);
    expect(m.get("b")).toEqual(posicaoDaBase(1));
    expect(basesDosMembros(["a", "b", "c", "d"]).get("b")).toEqual(m.get("b"));
  });
  it("monitor fica atrás de quem entra (longe da praça) e o spawn fica entre a praça e a base", () => {
    const b = posicaoDaBase(2);
    const mon = localParaMundo(b, 0, -1.44);
    expect(Math.hypot(mon.x, mon.z)).toBeGreaterThan(Math.hypot(b.x, b.z));
    expect(Math.hypot(...Object.values(spawnDaBase(b)) as [number, number])).toBeLessThan(Math.hypot(b.x, b.z));
    expect(spawnDaBase(undefined)).toEqual({ x: 0, z: 0 });
  });
});

describe("colisão", () => {
  const base = [{ x: 6, z: -3, r: BASE_COLLIDER_R }];
  it("fora do colisor não mexe", () => {
    expect(empurrarParaFora({ x: 0, z: 0 }, base)).toEqual({ x: 0, z: 0 });
  });
  it("dentro → vai pra borda, na mesma direção (desliza em vez de travar)", () => {
    const r = empurrarParaFora({ x: 6.5, z: -3 }, base);
    expect(Math.hypot(r.x - 6, r.z + 3)).toBeCloseTo(BASE_COLLIDER_R, 6);
    expect(r.z).toBeCloseTo(-3, 6);
    // passo diagonal contra a parede: o componente tangencial é preservado
    const pos = { x: 6 - BASE_COLLIDER_R - 0.1, z: -3 };
    const passo = empurrarParaFora({ x: pos.x + 0.3, z: pos.z + 0.3 }, base);
    expect(passo.z).toBeGreaterThan(-3);
  });
  it("exatamente no centro não explode", () => {
    const r = empurrarParaFora({ x: 6, z: -3 }, base);
    expect(Number.isFinite(r.x) && Number.isFinite(r.z)).toBe(true);
    expect(dentroDeAlgum(r, base)).toBe(false);
  });
});

describe("clique", () => {
  const o = { noMonitor: false, baseMinha: true, pertoDaBase: true, noColega: false, colegaPerto: false };
  it("monitor meu e perto → entra; longe → aproxima", () => {
    expect(decidirClique({ ...o, noMonitor: true })).toBe("monitor");
    expect(decidirClique({ ...o, noMonitor: true, pertoDaBase: false })).toBe("aproximar");
  });
  it("monitor de outra pessoa nunca entra (base privada)", () => {
    expect(decidirClique({ ...o, noMonitor: true, baseMinha: false })).toBe("chao");
  });
  it("prioridade monitor → colega → chão", () => {
    expect(decidirClique({ ...o, noMonitor: true, noColega: true, colegaPerto: true })).toBe("monitor");
    expect(decidirClique({ ...o, noColega: true, colegaPerto: true })).toBe("colega");
    expect(decidirClique({ ...o, noColega: true, colegaPerto: false })).toBe("chao");
  });
  it("rótulos", () => {
    expect(rotuloMonitor({ baseMinha: true, pertoDaBase: true, dono: "x" })).toMatch(/Entrar na Sala de Estudos/);
    expect(rotuloMonitor({ baseMinha: true, pertoDaBase: false, dono: "x" })).toMatch(/perto/);
    expect(rotuloMonitor({ baseMinha: false, pertoDaBase: true, dono: "Ana" })).toBe("Base de Ana · privada");
  });
});
