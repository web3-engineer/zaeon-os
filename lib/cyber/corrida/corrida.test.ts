import { describe, expect, it } from "vitest";
import { PISTAS, pistaPorId, raioDeCurva, RAIO_LIVRE_PRACA, type Pista } from "./pistas";
import { CONTAGEM, cruzou, formatarTempo, novaCorrida, passoCorrida, tempoMinimo, type Corrida, type EventoCorrida } from "./corrida";
import { PILOTAGEM, motoParada, passoMotoSub, type EstadoMoto } from "../motoFisica";
import { PRACA } from "../praca";
import { NOS } from "../buracos";
import { VOO } from "../voo";

/** um PILOTO AUTOMÁTICO com a física de verdade: mira um ponto à frente na pista, freia nas curvas fechadas */
function correr(p: Pista, maxSeg = 900) {
  let s: EstadoMoto = { ...motoParada(p.grid.x, p.grid.y, p.grid.z, p.grid.rumo), y: p.grid.y }, c: Corrida = novaCorrida(p), sPista = 30;
  const eventos: EventoCorrida[] = [], dt = 1 / 30;
  for (let k = 0; k < maxSeg / dt && c.fase !== "fim"; k++) {
    const v = Math.hypot(s.vx, s.vz);
    // acompanha onde estou na pista (procura perto do último s) e mira à frente
    let melhor = sPista, dm = Infinity; for (let d = -20; d <= 120; d += 4) { const q = p.ponto(sPista + d), dd = Math.hypot(q.x - s.x, q.z - s.z); if (dd < dm) { dm = dd; melhor = sPista + d; } } sPista = melhor;
    const alvo = p.ponto(sPista + 20 + v * 0.35);
    let ang = Math.atan2(alvo.x - s.x, alvo.z - s.z) - s.yaw; while (ang > Math.PI) ang -= 2 * Math.PI; while (ang < -Math.PI) ang += 2 * Math.PI;
    const curva = Math.min(...[60, 120, 200].map((h) => raioDeCurva(p, sPista + h, 40)));   // a curva que vem aí
    const P = PILOTAGEM, vCurva = (R: number) => (R * P.giroBaixo) / (1 + (R * (P.giroBaixo - P.giroAlto)) / P.vel);   // v = R·ω(v)
    const vMax = Math.max(30, Math.min(P.vel, vCurva(curva) * 0.8));
    const acel = c.fase === "contagem" ? 0 : v > vMax ? -1 : 1;
    const ty = alvo.y - s.y;
    const de = { x: s.x, y: s.y, z: s.z };
    if (c.fase === "contagem") s = { ...s, x: p.grid.x, y: p.grid.y, z: p.grid.z, vx: 0, vz: 0 };
    else s = passoMotoSub(s, { acel, giro: Math.max(-1, Math.min(1, -ang * 2.2)), subir: ty > 0.6, descer: ty < -0.6, boost: false }, dt).s;
    const r = passoCorrida(c, p, de, { x: s.x, y: s.y, z: s.z }, dt); c = r.c; eventos.push(...r.eventos);
  }
  return { c, eventos };
}

describe("pistas de corrida", () => {
  it("cada pista: fechada, rasante (dentro do teto da moto), longe da praça e dos buracos negros, dentro do mapa", () => {
    for (const p of PISTAS) {
      expect(p.portoes[0]!.tipo).toBe("largada"); expect(p.portoes.length).toBeGreaterThanOrEqual(8);
      expect(p.portoes.some((g) => g.tipo === "boost")).toBe(true);
      const a = p.ponto(0), b = p.ponto(p.comprimento); expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeLessThan(0.5);   // fecha
      for (let s = 0; s < p.comprimento; s += 10) {
        const q = p.ponto(s);
        expect(q.y, p.id).toBeGreaterThan(2); expect(q.y, p.id).toBeLessThan(PILOTAGEM.alturaMax - 1);
        expect(Math.hypot(q.x - PRACA.x, q.z - PRACA.z), p.id).toBeGreaterThan(RAIO_LIVRE_PRACA);
        expect(Math.hypot(q.x, q.z)).toBeLessThan(VOO.raioMapa - 120);
        for (const n of Object.values(NOS)) if (n.y < 30) expect(Math.hypot(q.x - n.anel.x, q.z - n.anel.z)).toBeGreaterThan(60);
      }
      // os portões: espaçados e o grid DEPOIS da largada (largar não fecha uma volta)
      for (let i = 1; i < p.portoes.length; i++) expect(p.portoes[i]!.s - p.portoes[i - 1]!.s).toBeGreaterThan(150);
      const g0 = p.portoes[0]!; expect((p.grid.x - g0.x) * Math.sin(g0.rumo) + (p.grid.z - g0.z) * Math.cos(g0.rumo)).toBeGreaterThan(10);
    }
    expect(pistaPorId("grande-circuito")!.comprimento).toBeGreaterThan(6000);
  });
  it("cruzar um portão: só de trás pra frente e dentro do anel", () => {
    const g = { x: 0, y: 5, z: 0, rumo: 0, r: 18 };   // passagem: +z
    expect(cruzou(g, { x: 0, y: 5, z: -2 }, { x: 0, y: 5, z: 2 })).toBe(true);
    expect(cruzou(g, { x: 0, y: 5, z: 2 }, { x: 0, y: 5, z: -2 })).toBe(false);   // contramão
    expect(cruzou(g, { x: 30, y: 5, z: -2 }, { x: 30, y: 5, z: 2 })).toBe(false); // por fora do anel
    expect(cruzou(g, { x: 0, y: 5, z: -60 }, { x: 0, y: 5, z: 60 })).toBe(true);  // rápido (um quadro longo) também conta
  });
  it("contagem 3-2-1 → largada; o relógio só anda depois dela", () => {
    const p = PISTAS[0]!; let c = novaCorrida(p); const ev: EventoCorrida[] = [];
    for (let k = 0; k < 100; k++) { const r = passoCorrida(c, p, p.grid, p.grid, 0.05); c = r.c; ev.push(...r.eventos); }
    expect(ev.filter((e) => e.tipo === "contagem").map((e) => (e as { n: number }).n)).toEqual([3, 2, 1]);
    expect(ev.filter((e) => e.tipo === "largou")).toHaveLength(1); expect(c.fase).toBe("correndo"); expect(c.t).toBeGreaterThan(CONTAGEM);
  });
  it("pular um portão não vale: ele continua sendo o próximo", () => {
    const p = PISTAS[0]!; let c: Corrida = { ...novaCorrida(p), fase: "correndo", t: 10 };
    const g2 = p.portoes[2]!, atras = { x: g2.x - Math.sin(g2.rumo) * 3, y: g2.y, z: g2.z - Math.cos(g2.rumo) * 3 }, frente = { x: g2.x + Math.sin(g2.rumo) * 3, y: g2.y, z: g2.z + Math.cos(g2.rumo) * 3 };
    const r = passoCorrida(c, p, atras, frente, 0.1); c = r.c;
    expect(r.eventos).toEqual([]); expect(c.proximo).toBe(1);
  });
  for (const p of PISTAS) it(`o piloto automático COMPLETA "${p.nome}" com a física real (todas as voltas, todos os portões em ordem)`, () => {
    const { c, eventos } = correr(p);
    expect(c.fase).toBe("fim"); expect(c.voltas).toHaveLength(p.voltas);
    expect(eventos.filter((e) => e.tipo === "portao")).toHaveLength((p.portoes.length - 1) * p.voltas);
    expect(eventos.filter((e) => e.tipo === "boost").length).toBe(p.portoes.filter((g) => g.tipo === "boost").length * p.voltas);
    expect(c.total!).toBeGreaterThan(tempoMinimo(p, PILOTAGEM.velBoost));
    // (pra referência: o tempo de volta de um piloto automático cauteloso, sem boost)
    console.log(`${p.nome}: ${c.voltas.map(formatarTempo).join(" · ")} = ${formatarTempo(c.total!)}`);
  }, 30_000);
  it("delta contra a melhor corrida: negativo = mais rápido", () => {
    const p = PISTAS[1]!, g1 = p.portoes[1]!;
    const c: Corrida = { ...novaCorrida(p), fase: "correndo", t: CONTAGEM + 20 };
    const atras = { x: g1.x - Math.sin(g1.rumo) * 2, y: g1.y, z: g1.z - Math.cos(g1.rumo) * 2 }, frente = { x: g1.x + Math.sin(g1.rumo) * 2, y: g1.y, z: g1.z + Math.cos(g1.rumo) * 2 };
    const r = passoCorrida(c, p, atras, frente, 0, [22]);
    expect(r.eventos[0]).toMatchObject({ tipo: "portao", delta: -2 });
    expect(formatarTempo(83.4567)).toBe("1:23.457"); expect(formatarTempo(-1.5)).toBe("-0:01.500");
  });
});
