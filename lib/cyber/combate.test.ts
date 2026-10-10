import { describe, expect, it } from "vitest";
import { COMBO, JANELA_COMBO, RITMO_GOLPES, VIDA_MAX, acabou, acerta, codificarGolpe, cortando, cortouEntre, danoDoGolpe, decodificarGolpe, levarGolpe, proximoGolpe } from "./combate";
import { ESPACOS, ITENS, equipar, inventarioInicial, itensPermitidos, sanitizarInventario } from "./inventario";
import { ARENA, BONECOS, PILARES_ARENA, naArena, pontoDeRenascer } from "./arena";
import { PORTAL_PRACA, PRACA } from "./praca";
import { poseGolpe } from "./posesCombate";

describe("inventário", () => {
  it("começa com a Espada Espiritual nível 7 no 1º espaço, equipada", () => {
    const inv = inventarioInicial();
    expect(inv.espacos).toHaveLength(ESPACOS); expect(inv.espacos[0]).toBe("espada-espiritual"); expect(inv.equipado).toBe("espada-espiritual");
    expect(ITENS["espada-espiritual"].nivel).toBe(7);
  });
  it("a espada (e os golpes) são só do FUNDADOR: os outros têm o inventário, vazio — e não ficam com ela nem forjando", () => {
    expect(inventarioInicial(false)).toEqual({ espacos: Array(ESPACOS).fill(null), equipado: null });
    expect(itensPermitidos(inventarioInicial(true), false)).toEqual({ espacos: Array(ESPACOS).fill(null), equipado: null });
    expect(itensPermitidos(inventarioInicial(true), true)).toEqual(inventarioInicial(true));
  });
  it("o que vem do navegador é limpo; só equipa o que está nos espaços", () => {
    expect(sanitizarInventario({ espacos: ["xyz", "espada-espiritual"], equipado: "xyz" })).toEqual({ espacos: [null, "espada-espiritual", ...Array(ESPACOS - 2).fill(null)], equipado: null });
    expect(sanitizarInventario(null)).toEqual(inventarioInicial());
    const vazio = { espacos: Array(ESPACOS).fill(null), equipado: null };
    expect(equipar(vazio, "espada-espiritual").equipado).toBeNull();
    expect(equipar(inventarioInicial(), null).equipado).toBeNull();
  });
});

describe("combate", () => {
  it("o combo: 1 → 2 → 3 encadeando; parado depois da janela, volta pro 1º", () => {
    let a = { golpe: proximoGolpe(null, 0), ini: 0, seq: 1 };
    expect(a.golpe.n).toBe(1);
    a = { golpe: proximoGolpe(a, a.golpe.dur + 0.1), ini: a.golpe.dur + 0.1, seq: 2 }; expect(a.golpe.n).toBe(2);
    a = { golpe: proximoGolpe(a, a.ini + a.golpe.dur), ini: a.ini + a.golpe.dur, seq: 3 }; expect(a.golpe.n).toBe(3);
    expect(proximoGolpe(a, a.ini + a.golpe.dur + 0.1).n).toBe(1);
    expect(proximoGolpe(a, a.ini + a.golpe.dur + JANELA_COMBO + 0.5).n).toBe(1);
  });
  it("só corta na janela ativa; acaba no fim", () => {
    const a = { golpe: COMBO[0]!, ini: 10, seq: 1 };
    expect(cortando(a, 10.05)).toBe(false); expect(cortando(a, 10 + a.golpe.ativoIni + 0.01)).toBe(true); expect(cortando(a, 10 + a.golpe.ativoFim + 0.05)).toBe(false);
    expect(acabou(a, 10 + a.golpe.dur + 1e-6)).toBe(true);
    expect(cortouEntre(a, 10.05, 10.6)).toBe(true);   // um quadro LONGO que engole a janela inteira ainda corta
    expect(cortouEntre(a, 10.5, 10.6)).toBe(false);
  });
  it("acerta na frente, no alcance; não pega atrás nem longe", () => {
    const g = COMBO[0]!, at = { x: 0, z: 0, rumo: 0 };
    expect(acerta(at, { x: 0, z: 2 }, "espada-espiritual", g)).toBe(true);
    expect(acerta(at, { x: 1.4, z: 1.4 }, "espada-espiritual", g)).toBe(true);
    expect(acerta(at, { x: 0, z: -2 }, "espada-espiritual", g)).toBe(false);
    expect(acerta(at, { x: 0, z: 5 }, "espada-espiritual", g)).toBe(false);
    expect(acerta(at, { x: 0, z: 3.4 }, "espada-espiritual", COMBO[2]!)).toBe(true);   // o pesado alcança mais
  });
  it("levar golpe: tira vida e empurra pra longe; no dash (desviando) ou protegido não pega; zera = caiu", () => {
    const g = COMBO[2]!, o = { arma: "espada-espiritual" as const, golpe: g, de: { x: 0, z: 0 }, em: { x: 0, z: 2 } };
    const r = levarGolpe(VIDA_MAX, { ...o, desviando: false, protegido: false });
    expect(r.pegou).toBe(true); expect(r.vida).toBe(VIDA_MAX - danoDoGolpe("espada-espiritual", g)); expect(r.empurrao.z).toBeGreaterThan(0);
    expect(levarGolpe(VIDA_MAX, { ...o, desviando: true, protegido: false })).toMatchObject({ pegou: false, desviou: true, vida: VIDA_MAX });
    expect(levarGolpe(VIDA_MAX, { ...o, desviando: false, protegido: true }).pegou).toBe(false);
    expect(levarGolpe(10, { ...o, desviando: false, protegido: false }).caiu).toBe(true);
    // um combo inteiro tira um bom pedaço, mas não mata de uma vez
    const combo = COMBO.reduce((s, x) => s + danoDoGolpe("espada-espiritual", x), 0); expect(combo).toBeGreaterThan(40); expect(combo).toBeLessThan(VIDA_MAX);
  });
  it("o golpe na presença (rede) vai e volta", () => {
    expect(decodificarGolpe(codificarGolpe(37, 3))).toEqual({ seq: 37, n: 3 });
  });
});

describe("a arena (a praça inteira)", () => {
  it("cabe na praça; pilares na borda, longe do buraco negro; bonecos dentro", () => {
    expect(ARENA.r).toBeLessThan(PRACA.r);
    for (const p of PILARES_ARENA) { expect(naArena(p)).toBe(true); expect(Math.hypot(p.x - PORTAL_PRACA.x, p.z - PORTAL_PRACA.z)).toBeGreaterThan(8); }
    for (const b of BONECOS) expect(naArena(b)).toBe(true);
    const r = pontoDeRenascer({ x: 10, z: 0 }); expect(naArena(r)).toBe(true); expect(r.x).toBeLessThan(0);
  });
});

describe("as poses dos golpes (a duas mãos, estilo Devil May Cry)", () => {
  const at = (n: 1 | 2 | 3) => { const g = COMBO[n - 1]!; return [g.ativoIni / g.dur, g.ativoFim / g.dur] as [number, number]; };
  it("o 1º: DIAGONAL descendo — de cima/atrás à direita, passa pela frente, termina embaixo à esquerda", () => {
    const [a0, a1] = at(1), l = (u: number) => poseGolpe(1, u, [a0, a1]).lamina;
    expect(l(a0)[1]).toBeGreaterThan(0.5); expect(l(a0)[2]).toBeLessThan(-0.3);
    expect(l((a0 + a1) / 2)[0]).toBeGreaterThan(0.8);
    expect(l(a1)[1]).toBeLessThan(-0.25); expect(l(a1)[2]).toBeGreaterThan(0.6);   // (a montante para rente ao chão)
  });
  it("o 3º: o PESADO — a lâmina atrás da cabeça, passa lá em cima e esmaga pra frente-baixo; o corpo agacha", () => {
    const [a0, a1] = at(3), p = (u: number) => poseGolpe(3, u, [a0, a1]);
    expect(p(a0).lamina[0]).toBeLessThan(-0.6); expect(p((a0 + a1) / 2).lamina[1]).toBeGreaterThan(0.9);
    expect(p(a1).lamina[0]).toBeGreaterThan(0.8); expect(p(a1).lamina[1]).toBeLessThan(-0.3); expect(p(a1).desce).toBeGreaterThan(0.3);   // (a ponta bate no chão lá na frente)
  });
  it("o PESO: o corte começa devagar e ganha embalo; logo depois a lâmina PASSA do ponto (inércia) e volta", () => {
    const [a0, a1] = at(1), l = (u: number) => poseGolpe(1, u, [a0, a1]).lamina, ang = (p: number[], q: number[]) => Math.acos(Math.min(1, p[0]! * q[0]! + p[1]! * q[1]! + p[2]! * q[2]!));
    const d = (a1 - a0) / 10, inicio = ang(l(a0), l(a0 + d)), meio = ang(l(a0 + 4 * d), l(a0 + 5 * d));
    expect(meio).toBeGreaterThan(inicio * 1.5);   // acelera
    const fim = l(a1), passou = l(a1 + 0.11 * (1 - a1));
    expect(fim[2]).toBeGreaterThan(0.6); expect(passou[2]).toBeGreaterThan(fim[2] - 0.05);   // segue pra esquerda além do fim
    expect(ang(fim, passou)).toBeGreaterThan(0.05);
  });
  it("os golpes tocam no RITMO escolhido (animados lentos, tocados mais rápido)", () => {
    expect(RITMO_GOLPES).toBeGreaterThan(1); expect(COMBO[0]!.dur).toBeCloseTo(1 / RITMO_GOLPES, 5);
  });
  it("o golpe COMEÇA com o braço abaixado (a espada arrastando) e volta pra ele", () => {
    const [a0, a1] = at(1), p0 = poseGolpe(1, 0, [a0, a1]), pf = poseGolpe(1, 1, [a0, a1]);
    for (const p of [p0, pf]) { expect(p.bracoD[1]).toBeLessThan(-0.9); expect(p.lamina[0]).toBeLessThan(-0.6); }
    expect(poseGolpe(1, a0, [a0, a1]).bracoD[1]).toBeGreaterThan(0.3);   // no preparo, lá em cima
  });
  it("a duas mãos no golpe todo; a antecipação é LONGA (mais lento, mais peso) e o pesado é o mais longo", () => {
    for (const n of [1, 2, 3] as const) { const [a0] = at(n); expect(poseGolpe(n, a0, at(n)).duasMaos).toBe(1); expect(COMBO[n - 1]!.ativoIni / COMBO[n - 1]!.dur).toBeGreaterThan(0.35); }   // (a antecipação é mais de um terço do golpe, em qualquer ritmo)
    expect(COMBO[2]!.dur).toBeGreaterThan(COMBO[0]!.dur);
    for (const n of [1, 2, 3] as const) for (let u = 0; u <= 1; u += 0.05) { const p = poseGolpe(n, u, at(n)); for (const d of [p.lamina, p.bracoD, p.anteD, p.tronco, p.plano]) expect(Math.hypot(...d)).toBeCloseTo(1, 5); }
  });
});
