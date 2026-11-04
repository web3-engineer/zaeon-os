import { describe, expect, it } from "vitest";
import { ANDAR2, ESCADA_CW, NAVE_COWORK, pontoDaEscada } from "./naveCoworking";
import { IDS_NIVEIS_NAVE, NAVES, chegadaDaNave, naveDoPonto, noPortalDaNave, pisoNaNave, regiaoDoNivel, resolverNaNave } from "./navesRegiao";
import { REGIOES } from "./regiaoUsuario";
import { CIDADE } from "./ceu";

describe("as naves por região", () => {
  it("cada região tem a sua nave, longe da Zaeon e longe das outras", () => {
    for (const r of REGIOES) { const n = NAVES[r]; expect(Math.hypot(n.x - CIDADE.centro.x, n.z - CIDADE.centro.z)).toBeGreaterThan(1500); expect(naveDoPonto(n, n.y + 1)).toBe(r); }
    for (let i = 0; i < REGIOES.length; i++) for (let j = i + 1; j < REGIOES.length; j++) { const a = NAVES[REGIOES[i]!], b = NAVES[REGIOES[j]!]; expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(500); }
    expect(naveDoPonto(CIDADE.centro, CIDADE.pisoY)).toBeNull();
    expect(IDS_NIVEIS_NAVE.map(regiaoDoNivel)).toEqual([...REGIOES]);
    expect(regiaoDoNivel("lounge")).toBeNull();
  });
  it("nasce no átrio, com chão, e o portal é na popa", () => {
    const c = chegadaDaNave("sul"); expect(c.y).toBe(NAVES.sul.y);
    expect(pisoNaNave(NAVE_COWORK.chegada, 0)).toBe(0);
    expect(noPortalDaNave(NAVE_COWORK.portal, 0)).toBe(true); expect(noPortalDaNave(NAVE_COWORK.chegada, 0)).toBe(false);
  });
  it("fora do casco é o vazio", () => { expect(pisoNaNave({ x: 30, z: 0 }, 0)).toBeNull(); expect(pisoNaNave({ x: 0, z: 60 }, 0)).toBeNull(); });
  it("subindo a escada de degrau em degrau se chega no 2º andar", () => {
    let y = 0;
    for (let k = 1; k <= 200; k++) { const p = pontoDaEscada((ESCADA_CW.giro * k) / 200); const piso = pisoNaNave(p, y); expect(piso, `passo ${k}`).not.toBeNull(); expect(piso! - y).toBeLessThan(0.56); y = piso!; }
    expect(y).toBeCloseTo(ANDAR2.y, 1);
    // e lá em cima o chão é o do 2º andar (o lounge e o terraço)
    expect(pisoNaNave({ x: -6, z: -2 }, ANDAR2.y)).toBe(ANDAR2.y);
    expect(pisoNaNave({ x: 0, z: 30 }, ANDAR2.y)).toBe(ANDAR2.y);
  });
  it("as paredes seguram: o casco no 1º andar, o guarda-corpo no terraço, a parede do lounge fora da porta", () => {
    const longe = resolverNaNave({ x: 25, z: 0 }, 0); expect(Math.abs(longe.x)).toBeLessThan(NAVE_COWORK.a);
    // o lounge: pela porta (na proa dele) passa; do lado, a parede empurra
    const frente = ANDAR2.z + ANDAR2.b;
    expect(resolverNaNave({ x: 0, z: frente }, ANDAR2.y)).toEqual({ x: 0, z: frente });
    const lado = resolverNaNave({ x: ANDAR2.a, z: ANDAR2.z }, ANDAR2.y); expect(Math.hypot(lado.x - ANDAR2.a, lado.z - ANDAR2.z)).toBeGreaterThan(0.1);
    // o átrio é livre
    expect(resolverNaNave(NAVE_COWORK.chegada, 0)).toEqual({ x: NAVE_COWORK.chegada.x, z: NAVE_COWORK.chegada.z });
  });
});
