import { describe, expect, it } from "vitest";
import { BOOST_SUPER, PILOTAGEM, ZONA_MOTO_ZAEON, motoParada, rompeuBarreira, supersonico, passoMoto, passoMotoSub, sensacaoDeVelocidade, tetoDaMoto, type ComandoMoto, type EstadoMoto } from "./motoFisica";
import * as ceuMod from "./ceu";

const NADA: ComandoMoto = { acel: 0, giro: 0, subir: false, descer: false, boost: false };
/** no ar (longe do chão e de tudo), parada, rumo +z */
const noAr = (): EstadoMoto => motoParada(300, 20, 300, 0);
const pilotar = (s: EstadoMoto, c: Partial<ComandoMoto>, seg: number) => { for (let i = 0; i < seg * 30; i++) s = passoMotoSub(s, { ...NADA, ...c }, 1 / 30).s; return s; };
const vel = (s: EstadoMoto) => Math.hypot(s.vx, s.vz);

describe("pilotagem da moto (dirigibilidade)", () => {
  it("W acelera PRA FRENTE do rumo até a velocidade de cruzeiro (não teleporta: leva uns segundos)", () => {
    const s1 = pilotar(noAr(), { acel: 1 }, 1);
    expect(vel(s1)).toBeGreaterThan(8); expect(vel(s1)).toBeLessThan(PILOTAGEM.vel);
    const s = pilotar(noAr(), { acel: 1 }, 14);
    expect(vel(s)).toBeCloseTo(PILOTAGEM.vel, 0); expect(vel(s) * 3.6).toBeGreaterThan(559);   // chega nos 560 km/h
    expect(vel(pilotar(noAr(), { acel: 1 }, 2.5))).toBeLessThan(PILOTAGEM.vel * 0.8);   // curva de potência: não chega em 2,5 s
    const reta = pilotar(noAr(), { acel: 1 }, 5);   // (14 s a 560 km/h passam da borda do mapa)
    expect(reta.z - 300).toBeGreaterThan(80); expect(Math.abs(reta.x - 300)).toBeLessThan(1e-6);
  });
  it("solta, PLANA perdendo velocidade aos poucos; S freia forte", () => {
    const rapido = pilotar(noAr(), { acel: 1 }, 14);
    const plana = pilotar(rapido, {}, 1), freia = pilotar(rapido, { acel: -1 }, 2);   // de 560 a 0 em ~1,8 s (depois ela dá ré)
    expect(vel(plana)).toBeGreaterThan(PILOTAGEM.vel * 0.55); expect(vel(plana)).toBeLessThan(PILOTAGEM.vel);
    expect(vel(freia)).toBeLessThan(5);
  });
  it("D vira pra DIREITA, A pra esquerda — e a curva é MAIS ABERTA quanto mais rápido", () => {
    const giro = (v0: number) => { let s = { ...noAr(), vz: v0 }; const y0 = s.yaw; s = pilotar(s, { acel: v0 > 0 ? v0 / PILOTAGEM.vel : 0, giro: 1 }, 1); return s.yaw - y0; };
    const devagar = giro(5), rapido = giro(PILOTAGEM.vel);
    expect(devagar).toBeLessThan(0); expect(rapido).toBeLessThan(0);   // direita = rumo diminui
    expect(Math.abs(rapido)).toBeLessThan(Math.abs(devagar) * 0.5);
    const curva = pilotar({ ...noAr(), vz: PILOTAGEM.vel }, { acel: 1, giro: 1 }, 3);
    expect(vel(curva)).toBeLessThanOrEqual(PILOTAGEM.vel + 0.01);   // curvar NÃO acelera (antes ganhava energia)
    expect(vel(curva)).toBeGreaterThan(PILOTAGEM.vel * 0.75);        // e nem trava: perde só um pouco
    const s = pilotar({ ...noAr(), vz: 30 }, { acel: 1, giro: 1 }, 0.8);
    expect(s.x).toBeLessThan(300);   // rumo +z, direita do piloto = −x
  });
  it("o guidão é SUTIL: um toque curto mal muda o rumo", () => {
    const s = pilotar({ ...noAr(), vz: PILOTAGEM.vel }, { acel: 1, giro: 1 }, 0.1);
    expect(Math.abs(s.yaw)).toBeLessThan(0.03);
  });
  it("INCLINA pra dentro da curva com tan θ = v·ω/g, até o máximo; reta volta a ficar em pé", () => {
    const dir = pilotar({ ...noAr(), vz: PILOTAGEM.vel }, { acel: 1, giro: 1 }, 2), esq = pilotar({ ...noAr(), vz: PILOTAGEM.vel }, { acel: 1, giro: -1 }, 2);
    expect(dir.inclina).toBeGreaterThan(0.2); expect(esq.inclina).toBeLessThan(-0.2);   // direita: + (deita pra direita)
    expect(Math.abs(dir.inclina)).toBeLessThanOrEqual(PILOTAGEM.inclinaMax + 1e-9);
    expect(dir.inclina).toBeLessThan(PILOTAGEM.inclinaMax - 0.03);   // no cruzeiro não satura: sobra inclinação pro boost
    const devagar = pilotar({ ...noAr(), vz: 6 }, { acel: 6 / PILOTAGEM.vel, giro: 1 }, 2);
    expect(devagar.inclina).toBeLessThan(dir.inclina * 0.8);       // devagar deita menos
    const omega = PILOTAGEM.giroBaixo + (PILOTAGEM.giroAlto - PILOTAGEM.giroBaixo) * Math.min(1, vel(dir) / PILOTAGEM.vel), esperado = Math.min(PILOTAGEM.inclinaMax, Math.atan((vel(dir) * omega) / PILOTAGEM.g));
    expect(dir.inclina).toBeCloseTo(esperado, 1);
    expect(Math.abs(pilotar(dir, { acel: 1 }, 2).inclina)).toBeLessThan(0.05);
  });
  it("ESCORREGA um pouco na curva (sobra velocidade de lado) e a aderência puxa de volta", () => {
    const s = pilotar({ ...noAr(), vz: PILOTAGEM.vel }, { acel: 1, giro: 1 }, 1.5);
    const lado = s.vx * Math.cos(s.yaw) - s.vz * Math.sin(s.yaw);
    expect(Math.abs(lado)).toBeGreaterThan(0.3);
    const reto = pilotar(s, { acel: 1 }, 2), ladoDepois = reto.vx * Math.cos(reto.yaw) - reto.vz * Math.sin(reto.yaw);
    expect(Math.abs(ladoDepois)).toBeLessThan(Math.abs(lado) * 0.2);
  });
  it("BOOST passa do cruzeiro, esvazia o tanque, apaga sozinho e recarrega", () => {
    let s = pilotar(noAr(), { acel: 1 }, 9);
    s = pilotar(s, { acel: 1, boost: true }, 3);
    expect(s.boost).toBe(true); expect(vel(s)).toBeGreaterThan(PILOTAGEM.vel + 10); expect(s.tanque).toBeLessThan(0.5);
    s = pilotar(s, { acel: 1, boost: true }, 2.5);
    expect(s.boost).toBe(false); expect(s.tanque).toBeLessThan(PILOTAGEM.boost.minimo);   // acabou: apaga
    s = pilotar(s, { acel: 1 }, 6);
    expect(vel(s)).toBeLessThan(PILOTAGEM.vel + 2);   // volta pro cruzeiro
    expect(s.tanque).toBeGreaterThan(0.7);
    expect(sensacaoDeVelocidade(s)).toBeGreaterThan(0.5);
  });
  it("o acelerador PROGRIDE até os 560 km/h (passa dos 300 e dos 500); o boost acima dos 300 ROMPE a barreira na hora e dobra até os 1000", () => {
    const km = (s: EstadoMoto) => vel(s) * 3.6;
    expect(km(pilotar(noAr(), { acel: 1 }, 4))).toBeGreaterThan(300);
    expect(km(pilotar(noAr(), { acel: 1 }, 8))).toBeGreaterThan(500);
    const topo = pilotar(noAr(), { acel: 1 }, 14); expect(km(topo)).toBeGreaterThan(555); expect(km(topo)).toBeLessThanOrEqual(560.5);
    expect(supersonico(vel(topo), false)).toBe(0);
    // acende o boost: rompe NO QUADRO em que acende
    const r = passoMotoSub(topo, { ...NADA, acel: 1, boost: true }, 1 / 60).s;
    expect(rompeuBarreira(topo.boost, r.boost, vel(r))).toBe(true); expect(supersonico(vel(r), r.boost)).toBeGreaterThanOrEqual(0.3);
    let s = r, max = 0; for (let i = 0; i < 4 * 60; i++) { const b0 = s.boost; s = passoMotoSub(s, { ...NADA, acel: 1, boost: true }, 1 / 60).s; expect(rompeuBarreira(b0, s.boost, vel(s))).toBe(false); max = Math.max(max, vel(s)); }
    expect(max * 3.6).toBeGreaterThan(990); expect(max * 3.6).toBeLessThan(1001);
    // devagar (< 300 km/h) o boost acende sem quebrar a barreira
    const devagar = pilotar(noAr(), { acel: 1 }, 1.5), d2 = passoMotoSub(devagar, { ...NADA, acel: 1, boost: true }, 1 / 60).s;
    expect(vel(devagar)).toBeLessThan(BOOST_SUPER); expect(d2.boost).toBe(true); expect(rompeuBarreira(devagar.boost, d2.boost, vel(d2))).toBe(false);
  });
  it("a 1000 km/h não atravessa um pilar (subpassos de no máximo 1,2 m)", () => {
    const pilar = { x: 300, z: 340, r: 2, topo: 100, base: 0 };
    let s = { ...noAr(), vz: PILOTAGEM.velBoost };
    for (let i = 0; i < 30; i++) s = passoMotoSub(s, { ...NADA, acel: 1, boost: true }, 1 / 30, [pilar]).s;
    expect(s.z).toBeLessThan(340);
  });
  it("parada não dá boost; no chão não anda (decola primeiro) mas o guidão gira ela no lugar", () => {
    expect(pilotar(noAr(), { boost: true }, 1).boost).toBe(false);
    const chao = motoParada(300, 0, 300, 0), s = pilotar(chao, { acel: 1, giro: 1 }, 1);
    expect(Math.hypot(s.x - 300, s.z - 300)).toBeLessThan(0.01);
    expect(s.yaw).toBeLessThan(-0.3);
    const sobe = pilotar(chao, { subir: true }, 1); expect(sobe.y).toBeGreaterThan(5);
  });
  it("o rumo NÃO depende de pra onde a câmera olha (W é sempre a frente da moto)", () => {
    const s = pilotar(motoParada(300, 20, 300, Math.PI / 2), { acel: 1 }, 3);
    expect(s.x - 300).toBeGreaterThan(30); expect(Math.abs(s.z - 300)).toBeLessThan(1e-6);
  });
  it("ALTURA: sobe no máximo alturaMax acima do chão de baixo — segurando SUBIR, para lá", () => {
    const s = pilotar(motoParada(300, 0, 300, 0), { subir: true }, 8);
    expect(s.y).toBeLessThanOrEqual(PILOTAGEM.alturaMax + 1e-6); expect(s.y).toBeGreaterThan(PILOTAGEM.alturaMax - 1.5);
  });
  it("sobe devagar e DESCE mais devagar que sobe (nada de despencar)", () => {
    // (dentro do teto: começa a 7,5 m, que é abaixo dos 8 m — acima dele a descida é a "planando")
    const sobe = pilotar(motoParada(300, 0, 300, 0), { subir: true }, 0.6), desce = pilotar(motoParada(300, 7.5, 300, 0), { descer: true }, 0.6);
    expect(sobe.y).toBeGreaterThan(2); expect(sobe.y).toBeLessThan(PILOTAGEM.alturaMax);
    expect(7.5 - desce.y).toBeLessThan(sobe.y); expect(7.5 - desce.y).toBeGreaterThan(1);
    expect(pilotar(motoParada(300, 7.5, 300, 0), { descer: true }, 0.9).vy).toBeGreaterThanOrEqual(-PILOTAGEM.desce - 1e-6);
    expect(PILOTAGEM.alturaMax).toBeLessThanOrEqual(10);   // moto voa BAIXO
  });
  it("passou da borda (chão sumiu lá embaixo): não sobe e desce PLANANDO até ficar abaixo do teto", () => {
    let s = motoParada(300, 450, 300, 0);   // 450 m acima do chão do mapa (como quem sai da borda da Zaeon)
    s = pilotar(s, { subir: true }, 2); expect(s.y).toBeLessThan(450);
    expect(s.vy).toBeLessThan(-PILOTAGEM.planaMin + 1e-6); expect(s.vy).toBeGreaterThanOrEqual(-PILOTAGEM.planaMax - 1e-6);
    s = pilotar(s, {}, 60); expect(s.y).toBeLessThanOrEqual(PILOTAGEM.alturaMax + 1.5);
  });
});

describe("o PODER da moto na Zaeon: o teto sobe até o início da ponta da capela", () => {
  it("no céu da Zaeon (até as plataformas) dá pra subir até a altura das salas; fora dela, o teto baixo de sempre", () => {
    const { CIDADE, ALTURA_LOUNGE, mundo } = ceuMod;
    const centro = CIDADE.centro, garagem = mundo(CIDADE.salas.garagem);
    expect(tetoDaMoto(centro, CIDADE.pisoY)).toBeGreaterThanOrEqual(CIDADE.pisoY + ALTURA_LOUNGE);
    expect(tetoDaMoto(garagem, CIDADE.pisoY + ALTURA_LOUNGE)).toBeGreaterThan(CIDADE.pisoY + ALTURA_LOUNGE);   // pousa/decola da garagem
    expect(tetoDaMoto({ x: 0, z: 0 }, 0)).toBe(PILOTAGEM.alturaMax);                                       // na praça: baixo
    expect(ZONA_MOTO_ZAEON.r).toBeGreaterThan(Math.hypot(CIDADE.salas.garagem.x, CIDADE.salas.garagem.z) + CIDADE.salas.garagem.r);
    // subindo da central: chega na altura das plataformas (e não passa muito dela)
    let s = motoParada(centro.x + 100, CIDADE.pisoY + 3, centro.z, 0);
    for (let i = 0; i < 60 * 25; i++) s = passoMoto(s, { acel: 0, giro: 0, subir: true, descer: false, boost: false }, 1 / 60).s;
    expect(s.y).toBeGreaterThan(CIDADE.pisoY + ALTURA_LOUNGE); expect(s.y).toBeLessThanOrEqual(ZONA_MOTO_ZAEON.teto + 0.5);
  });
});
