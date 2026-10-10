/**
 * Cyberespaço — SOM DA MOTO por estágio (PURO). Tudo SINTETIZADO no navegador (sem arquivo): o AudioCyber gera os
 * buffers no 1º gesto, como o jato da mochila (lib/cyber/audio: SINTESE).
 *
 * (O MOTOR é a exceção: gravações reais em arquivo, ver `FAIXAS_MOTOR`.) Os estágios e o que soa:
 *  - PARTIDA (montou): o motor de arranque gira (zumbido subindo), a ignição estoura e o motor dá uma acelerada;
 *  - LENTA (parada/pairando devagar): o MESMO motor, em rotação baixa (uma camada à parte, pulsada, soava como um
 *    "som extra estranho" por cima do motor — saiu);
 *  - DECOLA (saiu do chão): sopro subindo dos propulsores de baixo;
 *  - ACELERAÇÃO/CRUZEIRO: o MOTOR (gravações reais de superbike — `FAIXAS_MOTOR`) passa as MARCHAS
 *    (`passoCambio`: 6 no acelerador + a do boost): a rotação sobe dentro da marcha e CAI na troca (com um corte curtinho
 *    e um "tec" de engate); o tom vai da lenta grossa ao GRITO no corte; + o VENTO;
 *  - PERDENDO VELOCIDADE (soltou o acelerador ou freando, andando rápido): o CARBURADOR ESTALANDO (loop real);
 *  - BOOST: o GRITO da superbike varrendo do grave ao agudo (one-shot gravado `moto-boost`), o motor ESTOURANDO o giro
 *    e a TURBINA (ronco + assobio agudo) enquanto dura;
 *  - BARREIRA DO SOM (acender o boost acima dos 300 km/h): o ESTRONDO sônico (o "crack-crack" duplo da onda N + o
 *    trovão rolando) e, enquanto o boost durar, o SUPERSÔNICO (o ar rasgando) crescendo até os 1000 km/h;
 *  - FREIO (freada forte): chiado de ar;
 *  - SETA (curva): só a luz pisca — SEM som (o clique a cada piscada virava um "tik tik tik" na curva);
 *  - POUSO (encostou no chão): baque + assentamento;
 *  - DESLIGA (desceu da moto): o motor cai de tom e apaga com um sopro.
 * `mixDaMoto` diz o volume/afinação de cada loop; `eventosDaMoto` diz quais one-shots disparar (comparando estados).
 */

import { PILOTAGEM, rompeuBarreira, supersonico } from "./motoFisica";

/** PRNG determinístico (mulberry32): a síntese sai igual sempre (e dá pra testar) */
function prng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const normalizar = (x: Float32Array, pico: number) => { let m = 0; for (const v of x) m = Math.max(m, Math.abs(v)); if (m > 0) for (let i = 0; i < x.length; i++) x[i] = (x[i]! / m) * pico; return x; };
/** fecha o loop: a ponta (x amostras além do fim) entra em crossfade de potência constante no começo */
function fecharLoop(raw: Float32Array, n: number) {
  const x = raw.length - n, out = raw.slice(0, n);
  for (let i = 0; i < x; i++) { const u = i / x; out[i] = raw[i]! * Math.sqrt(u) + raw[n + i]! * Math.sqrt(1 - u); }
  return out;
}
const fimSemClique = (x: Float32Array, k = 96) => { for (let i = 0; i < Math.min(k, x.length); i++) x[x.length - 1 - i]! *= i / k; return x; };
const passaBaixa = (fc: number, sr: number) => 1 - Math.exp((-2 * Math.PI * fc) / sr);
/** um "motor" de harmônicos (dente de serra suave + ímpares reforçados) na fase `fase` */
const harmonicos = (fase: number, n = 10) => { let v = 0; for (let k = 1; k <= n; k++) v += (Math.sin(fase * k) / k) * (k % 2 ? 1 : 0.55); return v; };

/**
 * O MOTOR são GRAVAÇÕES REAIS (CC0 — public/assets/sounds/cyber/CREDITS.md), preparadas offline como loops com o tom
 * travado e um reverb leve embutido (o "espacial"):
 *  - `moto-motor` = a MARCHA LENTA (~30 Hz de disparo);
 *  - `moto-motor-alto` = o GRITO de uma superbike 1000 cc numa pista, travado em 300 Hz.
 * Os dois foram preparados AGRESSIVOS (grave reforçado + saturação). `mixDaMoto` toca os dois afinados na frequência do
 * motor (`freqDoMotor`: ~30 Hz na lenta → ~150 Hz no corte — GRAVE: o grito gravado toca encorpado, abaixo do tom
 * original) e cruza da lenta pro grito entre 60 e 110 Hz.
 * No BOOST o motor ESTOURA o giro (`CAMBIO.boostRpm`: bem acima do corte, subindo violento) e o one-shot `moto-boost`
 * (o grito real varrendo do grave ao agudo em 0,7 s, saturado) marca a ignição.
 * O CARBURADOR ESTALANDO (`moto-pipoco`: estouros reais de anti-lag e de moto, em rajadas irregulares) toca por cima do
 * motor quando a moto está PERDENDO VELOCIDADE (soltou o acelerador ou freando, andando rápido).
 */
/** o tom (Hz de disparo) em que cada loop foi gravado/travado */
export const FAIXAS_MOTOR = { "moto-motor": 30, "moto-motor-alto": 300 } as const;
/** onde a lenta vira o grito (Hz, crossfade em oitavas) */
const CRUZA = [60, 110] as const;

/** a FREQUÊNCIA do motor (Hz de disparo) na rotação `rpm` (lenta → 30 Hz; 1 → 150 Hz, o corte) — exponencial: cada
 *  pedaço do conta-giros sobe o mesmo tanto de TOM */
export function freqDoMotor(rpm: number): number { return 30 * Math.pow(150 / 30, Math.max(0, (rpm - CAMBIO.lenta) / (1 - CAMBIO.lenta))); }

/** TROCA DE MARCHA (~0,16 s): o "tec" seco do engate + um sopro curtinho de alívio */
export function sintetizarTrocaMoto(sr: number): Float32Array {
  const n = Math.round(sr * 0.16), out = new Float32Array(n), r = prng(97), a = passaBaixa(2500, sr);
  let lp = 0, fase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr; lp += (r() * 2 - 1 - lp) * a; fase += (2 * Math.PI * (180 - 400 * t)) / sr;
    out[i] = Math.sin(fase) * Math.exp(-t * 60) * 0.9 + lp * Math.exp(-t * 28) * 0.8;
  }
  return normalizar(fimSemClique(out, 128), 0.75);
}

/** ESTRONDO SÔNICO (~2,6 s): a onda N chega como DOIS estalos secos (proa e popa, 0,11 s de distância), um soco grave
 *  de 38 Hz e o TROVÃO rolando (ruído marrom, passa-baixa fechando, com ondulações) */
export function sintetizarEstrondoMoto(sr: number): Float32Array {
  const n = Math.round(sr * 2.6), out = new Float32Array(n), r = prng(107), a = passaBaixa(5000, sr);
  let lp = 0, marrom = 0, lp2 = 0, fase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, w = r() * 2 - 1; lp += (w - lp) * a; marrom = 0.996 * marrom + 0.06 * w;
    let v = 0;
    for (const t0 of [0.01, 0.12]) { const u = t - t0; if (u >= 0 && u < 0.06) v += (u < 0.002 ? u / 0.002 : 1) * Math.exp(-u * 90) * (lp * 1.6 + (u < 0.004 ? 1.4 : -0.7)); }   // os estalos
    fase += (2 * Math.PI * (38 + 30 * Math.exp(-t * 6))) / sr;
    v += Math.sin(fase) * Math.exp(-t * 3.2) * Math.min(1, t * 80) * 0.9;   // o soco grave
    const fc = 160 + 900 * Math.exp(-t * 2.5); lp2 += (marrom - lp2) * passaBaixa(fc, sr);
    v += lp2 * 5 * Math.min(1, t * 6) * Math.exp(-t * 1.25) * (0.75 + 0.25 * Math.sin(2 * Math.PI * 3.1 * t + Math.sin(t * 7)));   // o trovão rolando
    out[i] = v;
  }
  return normalizar(fimSemClique(out, 1024), 0.95);
}

/** SUPERSÔNICO (loop de 2 s): o ar RASGANDO — ronco grave (marrom), um chiado agudo (banda ~2,5 kHz) tremulando a 9 Hz e
 *  um assobio de choque descendo/subindo devagar */
export function sintetizarSupersonicoMoto(sr: number): Float32Array {
  const n = sr * 2, x = Math.round(sr * 0.35), raw = new Float32Array(n + x), r = prng(113);
  let marrom = 0, lo = 0, band = 0, fase = 0;
  const f = 2 * Math.sin((Math.PI * 2500) / sr), q = 0.35;
  for (let i = 0; i < raw.length; i++) {
    const t = i / sr, w = r() * 2 - 1; marrom = 0.995 * marrom + 0.07 * w;
    lo += f * band; const hi = w - lo - q * band; band += f * hi;
    fase += (2 * Math.PI * (900 + 120 * Math.sin(2 * Math.PI * 0.5 * t))) / sr;
    raw[i] = marrom * 1.8 + band * 0.55 * (0.6 + 0.4 * Math.sin(2 * Math.PI * 9 * t)) + Math.sin(fase) * 0.06;
  }
  return normalizar(fecharLoop(raw, n), 0.85);
}

/** VENTO (loop de 3 s): ruído passa-baixa ondulando (rajadas) */
export function sintetizarVentoMoto(sr: number): Float32Array {
  const n = sr * 3, x = Math.round(sr * 0.4), raw = new Float32Array(n + x), r = prng(41);
  let lp1 = 0, lp2 = 0;
  const a1 = passaBaixa(900, sr), a2 = passaBaixa(1400, sr);
  for (let i = 0; i < raw.length; i++) {
    const t = i / sr, w = r() * 2 - 1; lp1 += (w - lp1) * a1; lp2 += (lp1 - lp2) * a2;
    raw[i] = lp2 * (0.7 + 0.3 * Math.sin(2 * Math.PI * 0.7 * t + Math.sin(2 * Math.PI * 0.23 * t) * 2));
  }
  return normalizar(fecharLoop(raw, n), 0.75);
}

/** TURBINA do boost (loop de 2 s): ronco (ruído marrom) + rugido médio + ASSOBIO agudo (1800 Hz com vibrato de 6 Hz) */
export function sintetizarTurbinaMoto(sr: number): Float32Array {
  const n = sr * 2, x = Math.round(sr * 0.3), raw = new Float32Array(n + x), r = prng(53);
  let marrom = 0, lp = 0, hp = 0, wAnt = 0, fase = 0;
  const a = passaBaixa(700, sr);
  for (let i = 0; i < raw.length; i++) {
    const t = i / sr, w = r() * 2 - 1;
    marrom = 0.995 * marrom + 0.07 * w; lp += (w - lp) * a; hp = 0.7 * (hp + w - wAnt); wAnt = w;
    fase += (2 * Math.PI * (1800 + 25 * Math.sin(2 * Math.PI * 6 * t))) / sr;
    raw[i] = marrom * 1.5 + lp * 1.6 + hp * 0.12 + 0.12 * Math.sin(fase) + 0.05 * Math.sin(fase * 1.5);
  }
  return normalizar(fecharLoop(raw, n), 0.85);
}

/** PARTIDA (~1,7 s): arranque zumbindo (220 → 600 Hz, com o "tec-tec" a 28 Hz), estouro da ignição e uma acelerada */
export function sintetizarPartidaMoto(sr: number): Float32Array {
  const n = Math.round(sr * 1.7), out = new Float32Array(n), r = prng(61), a = passaBaixa(900, sr);
  let fa = 0, fm = 0, lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr; let v = 0;
    if (t < 0.65) { fa += (2 * Math.PI * (220 + 380 * (t / 0.65))) / sr; v += Math.sin(fa) * (0.5 + 0.5 * Math.sin(2 * Math.PI * 28 * t)) * 0.35 * Math.min(1, t * 20); }
    if (t >= 0.6) {
      const u = t - 0.6;
      lp += (r() * 2 - 1 - lp) * a; v += lp * 2.2 * Math.exp(-u * 22);                               // o estouro
      const f = 60 + 110 * Math.exp(-Math.pow((u - 0.35) / 0.22, 2)) + 20 * Math.exp(-u * 3); fm += (2 * Math.PI * f) / sr;
      v += harmonicos(fm, 10) * Math.min(1, u * 30) * (0.35 + 0.65 * Math.exp(-u * 1.6)) * 0.6;   // a acelerada (blip)
    }
    out[i] = v;
  }
  return normalizar(fimSemClique(out, 512), 0.9);
}

/** DESLIGA (~1,3 s): o motor cai de tom (95 → 22 Hz) e apaga; um sopro no fim */
export function sintetizarDesligaMoto(sr: number): Float32Array {
  const n = Math.round(sr * 1.3), out = new Float32Array(n), r = prng(67), a = passaBaixa(500, sr);
  let fm = 0, lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, f = 22 + 73 * Math.exp(-t * 2.4); fm += (2 * Math.PI * f) / sr;
    lp += (r() * 2 - 1 - lp) * a;
    out[i] = harmonicos(fm, 8) * Math.exp(-t * 2.2) * 0.8 + lp * 1.5 * Math.exp(-Math.pow((t - 0.95) / 0.15, 2));
  }
  return normalizar(fimSemClique(out, 512), 0.85);
}

/** FREIO (~0,6 s): chiado de ar (ruído passa-alta) com ataque rápido */
export function sintetizarFreioMoto(sr: number): Float32Array {
  const n = Math.round(sr * 0.6), out = new Float32Array(n), r = prng(79);
  let hp = 0, wAnt = 0, lp = 0;
  const a = passaBaixa(6000, sr);
  for (let i = 0; i < n; i++) {
    const t = i / sr, w = r() * 2 - 1; hp = 0.9 * (hp + w - wAnt); wAnt = w; lp += (hp - lp) * a;
    out[i] = lp * Math.min(1, t * 40) * Math.exp(-t * 4.5) * (1 + 0.15 * Math.sin(2 * Math.PI * 37 * t));
  }
  return normalizar(fimSemClique(out), 0.7);
}

/** DECOLA (~0,9 s): sopro grave crescendo + um tom subindo (60 → 130 Hz) */
export function sintetizarDecolaMoto(sr: number): Float32Array {
  const n = Math.round(sr * 0.9), out = new Float32Array(n), r = prng(83), a = passaBaixa(400, sr);
  let lp = 0, ft = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr; lp += (r() * 2 - 1 - lp) * a; ft += (2 * Math.PI * (60 + 70 * t / 0.9)) / sr;
    const env = Math.sin(Math.PI * Math.min(1, t / 0.9)) ** 0.7;
    out[i] = (lp * 3 + Math.sin(ft) * 0.5) * env;
  }
  return normalizar(fimSemClique(out), 0.8);
}

/** POUSO (~0,55 s): baque grave (100 → 34 Hz) + assentamento (chiado curto) */
export function sintetizarPousoMoto(sr: number): Float32Array {
  const n = Math.round(sr * 0.55), out = new Float32Array(n), r = prng(89), a = passaBaixa(1200, sr);
  let fase = 0, lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr; fase += (2 * Math.PI * (34 + 66 * Math.exp(-t * 16))) / sr; lp += (r() * 2 - 1 - lp) * a;
    out[i] = Math.sin(fase) * (1 - Math.exp(-t * 700)) * Math.exp(-t * 8) + lp * 0.6 * Math.exp(-Math.pow((t - 0.12) / 0.08, 2));
  }
  return normalizar(fimSemClique(out), 0.9);
}

export const SINTESE_MOTO = {
  "moto-troca": sintetizarTrocaMoto, "moto-estrondo": sintetizarEstrondoMoto, "moto-supersonico": sintetizarSupersonicoMoto, "moto-vento": sintetizarVentoMoto, "moto-turbina": sintetizarTurbinaMoto,
  "moto-partida": sintetizarPartidaMoto, "moto-desliga": sintetizarDesligaMoto, "moto-freio": sintetizarFreioMoto,
  "moto-decola": sintetizarDecolaMoto, "moto-pouso": sintetizarPousoMoto,
} as const;
/** os sons da moto: os sintetizados + o MOTOR (gravações reais, em arquivo) */
export type NomeSomMoto = keyof typeof SINTESE_MOTO | keyof typeof FAIXAS_MOTOR | "moto-boost" | "moto-pipoco";
/** os LOOPS da moto (o resto é one-shot) */
export const LOOPS_MOTO = ["moto-motor", "moto-motor-alto", "moto-pipoco", "moto-vento", "moto-turbina", "moto-supersonico"] as const satisfies readonly NomeSomMoto[];

/** o que a moto está fazendo agora, do ponto de vista do som */
export type EstadoSomMoto = {
  /** alguém montado */ montada: boolean;
  /** no ar */ voando: boolean;
  /** velocidade 0..1 (cruzeiro = 1; no boost passa de 1) */ vel: number;
  /** acelerador −1..1 (só conhecido na MINHA moto; nas dos outros, 0) */ acel: number;
  boost: boolean;
  /** pisca aceso agora: −1 esquerda, 1 direita, 0 apagado */ seta: number;
  /** o CÂMBIO (`passoCambio`): rotação 0..1, marcha (0 = 1ª) e o corte da troca (0..1, 1 = acabou de trocar) */
  rpm?: number; marcha?: number; corte?: number;
};
export const somMotoParada: EstadoSomMoto = { montada: false, voando: false, vel: 0, acel: 0, boost: false, seta: 0 };

/** o CÂMBIO virtual: em que fração da velocidade de cruzeiro cada marcha chega no TOPO da rotação (a 6ª só no boost).
 *  A rotação na marcha é vel / topo — na troca ela cai pra topo(n)/topo(n+1): queda grande nas primeiras, pequena nas
 *  últimas, como numa moto de verdade */
export const CAMBIO = {
  topo: [0.14, 0.28, 0.44, 0.61, 0.8, 1.1, 1.9],   // 6 no acelerador (até os 560 km/h); a 7ª é a do boost (até os 1000)
  /** marcha lenta (parada / no chão), a rotação onde sobe a marcha e a fração do topo da anterior onde reduz */
  lenta: 0.14, troca: 0.96, reduz: 0.7,
  /** quanto o acelerador puxa a rotação (carga) e quão rápido ela segue o alvo (1/s); `corte` = duração da troca (s) */
  carga: 0.07, segue: 9, corte: 0.12,
  /** BOOST: o giro ESTOURA acima do corte — vai pra `boostRpm[0]` na hora (seguindo `boostSegue`× mais rápido) e sobe até
   *  `boostRpm[1]` com a velocidade */
  boostRpm: [1.4, 1.55], boostSegue: 2.5,
} as const;
export type Cambio = { marcha: number; rpm: number; corte: number };
export const cambioNeutro = (): Cambio => ({ marcha: 0, rpm: CAMBIO.lenta, corte: 0 });

/** um passo do câmbio: sobe/reduz a marcha pela velocidade, e a rotação segue (rápido) a da marcha + a carga */
export function passoCambio(c: Cambio, e: { voando: boolean; vel: number; acel: number; boost: boolean }, dt: number): Cambio {
  const C = CAMBIO, v = Math.max(0, e.vel), carga = Math.max(0, e.acel);
  let { marcha } = c, corte = Math.max(0, c.corte - dt / C.corte);
  if (!e.voando) marcha = 0;
  else {
    const n = C.topo.length, ultima = e.boost || v > C.topo[n - 2]! * 0.96 ? n - 1 : n - 2;   // a 6ª é a última do acelerador; a 7ª, do boost
    if (marcha < ultima && v / C.topo[marcha]! >= C.troca && carga > 0) { marcha++; corte = 1; }
    else if (marcha > ultima || (marcha > 0 && v < C.topo[marcha - 1]! * C.reduz)) marcha--;
  }
  const estoura = e.voando && e.boost;
  const alvo = !e.voando ? C.lenta + 0.22 * carga
    : estoura ? C.boostRpm[0] + (C.boostRpm[1] - C.boostRpm[0]) * Math.min(1, Math.max(0, v - 1) / 0.8)
    : Math.min(1.02, Math.max(C.lenta, v / C.topo[marcha]!) + C.carga * carga - (carga > 0 ? 0 : 0.04));
  const rpm = c.rpm + (alvo - c.rpm) * Math.min(1, dt * C.segue * (estoura ? C.boostSegue : corte > 0 ? 2 : 1));
  return { marcha, rpm, corte };
}

/** volume (0..1) e afinação de cada loop no estado `e` */
export function mixDaMoto(e: EstadoSomMoto): Record<(typeof LOOPS_MOTO)[number], { vol: number; taxa: number }> {
  const zero = { vol: 0, taxa: 1 };
  if (!e.montada) return { "moto-motor": zero, "moto-motor-alto": zero, "moto-pipoco": zero, "moto-vento": zero, "moto-turbina": zero, "moto-supersonico": zero };
  const sup = e.voando ? supersonico(e.vel * PILOTAGEM.vel, e.boost) : 0;
  const v = Math.max(0, Math.min(1.8, e.vel)), v1 = Math.min(1, v), acel = Math.max(0, e.acel);
  // sem câmbio (quem chama não passou rpm): a rotação sai da velocidade
  const rpm = e.rpm ?? (e.voando ? Math.min(1, 0.2 + 0.6 * v1 + 0.15 * acel) : CAMBIO.lenta + 0.2 * acel);
  const f = freqDoMotor(rpm), corte = 1 - 0.5 * (e.corte ?? 0), carga = 0.6 + 0.4 * acel;
  // da LENTA pro GRITO, em oitavas; os dois afinados em `f`
  const u = Math.min(1, Math.max(0, Math.log2(f / CRUZA[0]) / Math.log2(CRUZA[1] / CRUZA[0]))), x = u * u * (3 - 2 * u);
  // o CARBURADOR: perdendo velocidade rápido (soltou/freando), pipoca por cima do motor
  const desacel = e.voando && !e.boost && e.acel <= 0 ? Math.min(1, Math.max(0, (v - 0.12) / 0.4)) * (e.acel < 0 ? 1 : 0.8) : 0;
  const motor = 1 - 0.35 * desacel;
  const forca = (0.55 + 0.45 * rpm) * carga * corte * motor;   // mais alto em cima e no acelerador; a troca corta um instante
  return {
    "moto-motor": { vol: (1 - x) * forca, taxa: Math.max(0.8, Math.min(3.2, f / FAIXAS_MOTOR["moto-motor"])) },
    "moto-motor-alto": { vol: x * forca * (e.boost ? 1.15 : 1), taxa: Math.max(0.3, Math.min(2.2, f / FAIXAS_MOTOR["moto-motor-alto"])) },
    "moto-pipoco": { vol: 0.85 * desacel, taxa: 0.85 + 0.3 * Math.min(1, rpm) },
    "moto-vento": { vol: e.voando ? Math.pow(v1, 1.6) * 0.8 + (e.boost ? 0.25 : 0) : 0, taxa: 0.8 + 0.45 * Math.min(1.5, v) },
    "moto-turbina": { vol: e.boost ? 1 - 0.35 * sup : 0, taxa: 1 + 0.15 * Math.min(2, v) },
    // supersônico (boost aceso acima dos 300 km/h): o ar rasgando, crescendo e subindo de tom até os 1000 km/h
    "moto-supersonico": { vol: sup > 0 ? 0.35 + 0.65 * sup : 0, taxa: 0.8 + 0.4 * sup },
  };
}

/** os one-shots de um quadro pro outro (montar/descer, decolar/pousar, boost, freada forte, pisca) */
export function eventosDaMoto(a: EstadoSomMoto, b: EstadoSomMoto): NomeSomMoto[] {
  const ev: NomeSomMoto[] = [];
  if (!a.montada && b.montada) ev.push("moto-partida");
  if (a.montada && !b.montada) ev.push("moto-desliga");
  if (!a.montada || !b.montada) return ev;
  if (!a.voando && b.voando) ev.push("moto-decola");
  if (a.voando && !b.voando) ev.push("moto-pouso");
  if (!a.boost && b.boost) ev.push("moto-boost");
  if (b.voando && a.acel >= 0 && b.acel < 0 && b.vel > 0.35) ev.push("moto-freio");
  if (b.voando && (b.marcha ?? 0) > (a.marcha ?? 0)) ev.push("moto-troca");
  if (b.voando && rompeuBarreira(a.boost, b.boost, b.vel * PILOTAGEM.vel)) ev.push("moto-estrondo");   // acendeu o boost rápido: quebrou a barreira do som
  return ev;
}

/** o pisca: ligado pra um lado enquanto o guidão está virado (> 0,25), piscando a 1,5 Hz (aceso metade do tempo) */
export function setaAcesa(guidao: number, t: number): number {
  const lado = guidao > 0.25 ? 1 : guidao < -0.25 ? -1 : 0;
  return lado !== 0 && (t * 1.5) % 1 < 0.5 ? lado : 0;
}
