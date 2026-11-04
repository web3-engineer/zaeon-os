/**
 * Cyberespaço — as PISTAS CÓSMICAS (PURO): no lugar das escadas (lib/cyber/nivelAtivo — os níveis separados), da
 * borda da Zaeon sai, por cada vão da muralha (a direção de cada sala), uma PISTA — um FLUXO de luz bem longo e
 * sinuoso que leva pra um dos 4 CANTOS do mapa, longe da cidadela, onde fica um BURACO NEGRO MASSIVO. O fim da pista
 * é uma TRAJETÓRIA DE VERDADE pra um buraco negro: ela entra em ESPIRAL em volta dele, fechando, até cair no horizonte.
 * Quem pisa na BOCA (o anel na borda) é levado pelo fluxo; os carros e as motos do céu (lib/cyber/trafego) andam
 * pelas mesmas pistas. Perto do buraco negro, a tempestade (nuvens e trovões) — components/cyber/FiosCosmicos.
 *
 * Tudo no referencial LOCAL da ilha (relativo ao centro da Zaeon, y = acima do piso da central). Determinístico.
 * (O nome do arquivo ficou "fios" — a 1ª versão eram fios-neurônio.)
 */
import { ALTURA_LOUNGE, CIDADE, daSala, type NomeSala } from "./ceu";
import { BOCA_SAIDA_SALAO, SALAO } from "./temploCosmico";

export type V3 = { x: number; y: number; z: number };
export const FIO = {
  /** a distância (m, do centro da Zaeon) até o buraco negro do canto e o raio dele (o horizonte) */
  alcance: 8800, bnR: 650,   // (out/2026, o dono: massivos — 140 → 980 — e depois "um pouco menores e mais distantes, como reais buracos negros")
  /** a altura (m, acima do piso) em que o buraco negro fica e o teto da pista no meio do caminho */
  bnY: 260, teto: 330,
  /** a ESPIRAL final: quantas voltas e de que raio começa (fecha até o horizonte) */
  voltas: 1.2, espiralR: 1170,   // (≈1,8× o raio)
  /** as curvas da pista: quantas e de que largura (m) */
  curvas: 2, largura: 160,
  /** a boca (o anel na borda, onde se pisa) */
  bocaR: 3.2,
  /** onde o efeito do buraco negro começa (m do centro dele): a tempestade, o vento */
  zonaEfeito: 6000,
  /** a que distância (m) da pista o FLUXO pega quem chega (a pé na borda, de mochila, de moto ou de carro) */
  captura: 9,
  /** a pista de SAÍDA de cada sala (da porta antiga pra fora, até o buraco negro que leva de volta pro hub): comprimento */
  saidaComprimento: 2300,   // (o buraco negro de saída, 7× maior, mais longe da sala: ~1,8 km do horizonte até a porta)
  /** o buraco negro de SAÍDA de cada sala: menor que os dos cantos (e o magnetismo dele, proporcional) */
  bnSaidaR: 280,
} as const;

/** cada sala tem a sua pista e o CANTO dela (o ângulo, local da ilha, do buraco negro) */
const CANTO: Record<NomeSala, number> = { jardim: Math.PI / 4, lounge: (Math.PI * 3) / 4, garagem: (Math.PI * 5) / 4, biblioteca: (Math.PI * 7) / 4 };
const SALAS_FIO: readonly NomeSala[] = ["lounge", "garagem", "biblioteca", "jardim"];
function rng(semente: number) { let a = semente >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const semente = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

function cr(p0: V3, p1: V3, p2: V3, p3: V3, t: number): V3 {
  const t2 = t * t, t3 = t2 * t, f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return { x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y), z: f(p0.z, p1.z, p2.z, p3.z) };
}
/** amostra a curva pelos pontos de controle em `n` pontos (Catmull-Rom, com as pontas repetidas) */
export function amostrarCurva(ctrl: readonly V3[], n: number): V3[] {
  const out: V3[] = [], k = ctrl.length - 1;
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * k, j = Math.min(k - 1, Math.floor(u)), t = u - j;
    out.push(cr(ctrl[Math.max(0, j - 1)]!, ctrl[j]!, ctrl[j + 1]!, ctrl[Math.min(k, j + 2)]!, t));
  }
  return out;
}

export type FioCosmico = {
  sala: NomeSala;
  /** a pista de SAÍDA de uma sala (leva de volta pro hub) — senão, a do hub (leva pra sala) */
  saida?: boolean;
  /** a pista (amostrada), o comprimento acumulado de cada ponto e o total */
  eixo: V3[]; acum: number[]; comprimento: number;
  /** a boca (o anel na borda) e o buraco negro do canto */
  boca: V3 & { r: number }; bn: V3 & { r: number };
};

/** o buraco negro do canto: no ângulo do canto, a `alcance` m — MUITO além do mapa de voo (VOO.raioMapa): o portal
 *  entre os níveis é longe de verdade, só o FLUXO chega lá */
function centroDoCanto(ang: number): V3 {
  return { x: Math.cos(ang) * FIO.alcance, y: FIO.bnY, z: Math.sin(ang) * FIO.alcance };
}

function montarPista(sala: NomeSala): FioCosmico {
  const L = CIDADE.salas[sala], a0 = Math.atan2(L.z, L.x), a1 = CANTO[sala], r = rng(semente(sala)), fase = r() * Math.PI * 2;
  const r0 = CIDADE.andavelR - 3, bn = centroDoCanto(a1), dBn = Math.hypot(bn.x, bn.z);
  // o ângulo vai da direção da sala pro do canto pelo caminho curto
  let da = a1 - a0; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
  const ctrl: V3[] = [{ x: Math.cos(a0) * r0, y: 0.5, z: Math.sin(a0) * r0 }, { x: Math.cos(a0) * (r0 + 40), y: 3, z: Math.sin(a0) * (r0 + 40) }];
  // o MEIO: sai da borda, serpenteia (as curvas crescem no meio e somem na chegada) subindo até o teto e descendo
  const rFim = dBn - FIO.espiralR, N = 64;
  for (let k = 1; k <= N; k++) {
    const t = k / N, ang = a0 + da * (t * t * (3 - 2 * t)), rr = r0 + 40 + (rFim - r0 - 40) * t;
    const curva = Math.sin(t * Math.PI * FIO.curvas * 2 + fase) * FIO.largura * Math.sin(t * Math.PI), onda = Math.sin(t * Math.PI * 3 + fase * 1.3) * 22 * Math.sin(t * Math.PI);
    const px = Math.cos(ang) * rr, pz = Math.sin(ang) * rr, tx = -Math.sin(ang), tz = Math.cos(ang);
    ctrl.push({ x: px + tx * curva, y: 3 + (FIO.teto - 3) * Math.sin(t * Math.PI * 0.85) + (FIO.bnY - 3) * t * 0.4 + onda, z: pz + tz * curva });
  }
  // a ESPIRAL: entra na órbita do buraco negro (no sentido que a pista já vinha) e fecha até o horizonte
  const ult = ctrl[ctrl.length - 1]!, angEntra = Math.atan2(ult.z - bn.z, ult.x - bn.x), sentido = r() < 0.5 ? 1 : -1, M = 40;
  for (let k = 1; k <= M; k++) {
    const t = k / M, ang = angEntra + sentido * t * FIO.voltas * Math.PI * 2, rr = FIO.espiralR + (FIO.bnR * 1.05 - FIO.espiralR) * Math.pow(t, 1.4);
    ctrl.push({ x: bn.x + Math.cos(ang) * rr, y: ult.y + (bn.y - ult.y) * t + Math.sin(t * Math.PI * 2) * 60 * (1 - t), z: bn.z + Math.sin(ang) * rr });
  }
  const eixo = amostrarCurva(ctrl, 3200), acum = [0];
  for (let i = 1; i < eixo.length; i++) acum.push(acum[i - 1]! + Math.hypot(eixo[i]!.x - eixo[i - 1]!.x, eixo[i]!.y - eixo[i - 1]!.y, eixo[i]!.z - eixo[i - 1]!.z));
  return { sala, eixo, acum, comprimento: acum[acum.length - 1]!, boca: { ...eixo[0]!, y: 0, r: FIO.bocaR }, bn: { ...bn, r: FIO.bnR } };
}

/** a pista de SAÍDA de uma sala: da porta antiga (o lado que dava pra escada), pra FORA, serpenteando e subindo, até
 *  o buraco negro que leva de volta pro hub — a mesma espiral no fim */
function montarSaida(sala: NomeSala): FioCosmico {
  if (sala === "lounge") return montarSaidaDoSalao();
  const L = CIDADE.salas[sala], r = rng(semente(sala + ":saida")), fase = r() * Math.PI * 2;
  const dL = Math.hypot(L.x, L.z), dir = { x: L.x / dL, z: L.z / dL }, perp = { x: -dir.z, z: dir.x };
  // a porta antiga fica no lado da sala que olha pro centro da Zaeon: a pista sai dali e dá a volta por fora da sala
  const porta = daSala(L, 0, L.r - 3), y0 = ALTURA_LOUNGE + 0.6, lado = r() < 0.5 ? 1 : -1;
  const ctrl: V3[] = [{ x: porta.x, y: y0, z: porta.z }, { x: porta.x - dir.x * 30, y: y0 + 2, z: porta.z - dir.z * 30 }];
  // contorna a sala por um lado (fora do disco) e segue pra fora
  for (const [ang, rr] of [[0.6, L.r + 40], [1.4, L.r + 70], [2.2, L.r + 90]] as const) { const a = Math.atan2(-dir.z, -dir.x) + lado * ang; ctrl.push({ x: L.x + Math.cos(a) * rr, y: y0 + 10 + ang * 12, z: L.z + Math.sin(a) * rr }); }
  const ini = ctrl[ctrl.length - 1]!, bn: V3 = { x: L.x + dir.x * (FIO.saidaComprimento + L.r), y: y0 + 90, z: L.z + dir.z * (FIO.saidaComprimento + L.r) };
  for (let k = 1; k <= 36; k++) {
    const t = k / 36, curva = Math.sin(t * Math.PI * 3 + fase) * 120 * Math.sin(t * Math.PI);
    ctrl.push({ x: ini.x + (bn.x - ini.x) * t * 0.82 + perp.x * curva, y: ini.y + (bn.y - ini.y) * t + Math.sin(t * Math.PI) * 120, z: ini.z + (bn.z - ini.z) * t * 0.82 + perp.z * curva });
  }
  const ult = ctrl[ctrl.length - 1]!, angEntra = Math.atan2(ult.z - bn.z, ult.x - bn.x), sentido = r() < 0.5 ? 1 : -1, R0 = FIO.bnSaidaR * 4;
  for (let k = 1; k <= 36; k++) { const t = k / 36, ang = angEntra + sentido * t * FIO.voltas * Math.PI * 2, rr = R0 + (FIO.bnSaidaR * 1.05 - R0) * Math.pow(t, 1.4); ctrl.push({ x: bn.x + Math.cos(ang) * rr, y: ult.y + (bn.y - ult.y) * t, z: bn.z + Math.sin(ang) * rr }); }
  const eixo = amostrarCurva(ctrl, 2400), acum = [0];
  for (let i = 1; i < eixo.length; i++) acum.push(acum[i - 1]! + Math.hypot(eixo[i]!.x - eixo[i - 1]!.x, eixo[i]!.y - eixo[i - 1]!.y, eixo[i]!.z - eixo[i - 1]!.z));
  return { sala, saida: true, eixo, acum, comprimento: acum[acum.length - 1]!, boca: { ...eixo[0]!, r: FIO.bocaR }, bn: { ...bn, r: FIO.bnSaidaR } };
}
/** a SAÍDA do Templo Cósmico (o nível do lounge — lib/cyber/temploCosmico): a boca fica no SALÃO central, perto de onde
 *  se chega, e a pista vai pra FRENTE (o +z do layout, pro lado de onde se veio), serpenteando e subindo até o buraco
 *  negro que leva de volta pro hub. Montada no referencial do layout e convertida no fim (o espelho vem junto) */
function montarSaidaDoSalao(): FioCosmico {
  const L = CIDADE.salas.lounge, r = rng(semente("lounge:saida:salao")), fase = r() * Math.PI * 2, B = BOCA_SAIDA_SALAO;
  const y0 = ALTURA_LOUNGE - SALAO.desce + 0.6, comp = FIO.saidaComprimento, bnL = { x: B.x, y: y0 + 90, z: B.z + comp };
  const ctrl: V3[] = [{ x: B.x, y: y0, z: B.z }, { x: B.x, y: y0 + 2, z: B.z + 26 }, { x: B.x, y: y0 + 10, z: B.z + 70 }];
  const ini = ctrl[ctrl.length - 1]!;
  for (let k = 1; k <= 36; k++) {
    const t = k / 36, curva = Math.sin(t * Math.PI * 3 + fase) * 120 * Math.sin(t * Math.PI) * Math.min(1, t * 4);
    ctrl.push({ x: ini.x + curva, y: ini.y + (bnL.y - ini.y) * t + Math.sin(t * Math.PI) * 120, z: ini.z + (bnL.z - ini.z) * t * 0.82 });
  }
  const ult = ctrl[ctrl.length - 1]!, angEntra = Math.atan2(ult.z - bnL.z, ult.x - bnL.x), sentido = r() < 0.5 ? 1 : -1, R0 = FIO.bnSaidaR * 4;
  for (let k = 1; k <= 36; k++) { const t = k / 36, ang = angEntra + sentido * t * FIO.voltas * Math.PI * 2, rr = R0 + (FIO.bnSaidaR * 1.05 - R0) * Math.pow(t, 1.4); ctrl.push({ x: bnL.x + Math.cos(ang) * rr, y: ult.y + (bnL.y - ult.y) * t, z: bnL.z + Math.sin(ang) * rr }); }
  const ilha = (p: V3): V3 => { const w = daSala(L, p.x, p.z); return { x: w.x, y: p.y, z: w.z }; };
  const eixo = amostrarCurva(ctrl.map(ilha), 2400), acum = [0];
  for (let i = 1; i < eixo.length; i++) acum.push(acum[i - 1]! + Math.hypot(eixo[i]!.x - eixo[i - 1]!.x, eixo[i]!.y - eixo[i - 1]!.y, eixo[i]!.z - eixo[i - 1]!.z));
  const bn = ilha(bnL);
  return { sala: "lounge", saida: true, eixo, acum, comprimento: acum[acum.length - 1]!, boca: { ...eixo[0]!, r: FIO.bocaR }, bn: { ...bn, r: FIO.bnSaidaR } };
}
/** uma pista LIVRE (nov/2026 — o espaço aberto da SUA nave, lib/cyber/minhaNave): de `ini` pra fora, serpenteando e
 *  subindo, até o buraco negro `bn` (raio `bnR`), com a mesma espiral no fim. `saida` = leva pro hub (a Cidade dos
 *  Anjos); senão, pra `sala`. Tudo no referencial LOCAL da ilha, como as outras */
export function montarPistaLivre(chave: string, ini: V3, bn: V3, bnR: number, sala: NomeSala, saida: boolean): FioCosmico {
  const r = rng(semente(chave)), fase = r() * Math.PI * 2, dx = bn.x - ini.x, dz = bn.z - ini.z, L = Math.hypot(dx, dz) || 1, dir = { x: dx / L, z: dz / L }, perp = { x: -dir.z, z: dir.x };
  const ctrl: V3[] = [{ ...ini }, { x: ini.x + dir.x * 26, y: ini.y + 2, z: ini.z + dir.z * 26 }, { x: ini.x + dir.x * 70, y: ini.y + 10, z: ini.z + dir.z * 70 }];
  const de = ctrl[ctrl.length - 1]!, R0 = bnR * 1.8, alvo = { x: bn.x - dir.x * R0, y: bn.y, z: bn.z - dir.z * R0 }, N = 48;
  for (let k = 1; k <= N; k++) {
    const t = k / N, curva = Math.sin(t * Math.PI * FIO.curvas * 2 + fase) * FIO.largura * Math.sin(t * Math.PI) * Math.min(1, t * 4);
    ctrl.push({ x: de.x + (alvo.x - de.x) * t + perp.x * curva, y: de.y + (alvo.y - de.y) * t + Math.sin(t * Math.PI) * (FIO.teto - FIO.bnY), z: de.z + (alvo.z - de.z) * t + perp.z * curva });
  }
  const ult = ctrl[ctrl.length - 1]!, angEntra = Math.atan2(ult.z - bn.z, ult.x - bn.x), sentido = r() < 0.5 ? 1 : -1, M = 40;
  for (let k = 1; k <= M; k++) { const t = k / M, ang = angEntra + sentido * t * FIO.voltas * Math.PI * 2, rr = R0 + (bnR * 1.05 - R0) * Math.pow(t, 1.4); ctrl.push({ x: bn.x + Math.cos(ang) * rr, y: ult.y + (bn.y - ult.y) * t, z: bn.z + Math.sin(ang) * rr }); }
  const eixo = amostrarCurva(ctrl, 3200), acum = [0];
  for (let i = 1; i < eixo.length; i++) acum.push(acum[i - 1]! + Math.hypot(eixo[i]!.x - eixo[i - 1]!.x, eixo[i]!.y - eixo[i - 1]!.y, eixo[i]!.z - eixo[i - 1]!.z));
  return { sala, ...(saida ? { saida: true } : {}), eixo, acum, comprimento: acum[acum.length - 1]!, boca: { ...eixo[0]!, r: FIO.bocaR }, bn: { ...bn, r: bnR } };
}
let cacheSaida: FioCosmico[] | null = null;
/** as pistas de SAÍDA (uma por sala) */
export const pistasDeSaida = (): FioCosmico[] => (cacheSaida ??= SALAS_FIO.map(montarSaida));
export const saidaDaSala = (s: NomeSala): FioCosmico => pistasDeSaida().find((f) => f.sala === s)!;

/** o FLUXO pega quem chega perto de uma pista: a pista e a fração mais perto (ou null). `p` local da ilha (y acima do
 *  piso da central). Não pega no trecho final (a espiral, já no buraco negro) */
export function capturaDoFluxo(pistas: readonly FioCosmico[], p: V3, raio: number = FIO.captura): { f: FioCosmico; u: number } | null {
  let melhor: { f: FioCosmico; u: number } | null = null, dm = raio;
  for (const f of pistas) {
    const n = f.eixo.length - 1, ate = Math.floor(n * 0.9);
    for (let i = 0; i <= ate; i++) { const q = f.eixo[i]!, d = Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z); if (d < dm) { dm = d; melhor = { f, u: f.acum[i]! / f.comprimento }; } }
  }
  return melhor;
}
/** o MAGNETISMO do buraco negro (out/2026, o dono: "no começo o caminho é livre; chegando perto, ele puxa o veículo pro
 *  centro"): a `ATRACAO.raio` m do horizonte ele te pega e te traga numa ESPIRAL que fecha e acelera até o horizonte
 *  (aí o túnel). `p` local da ilha; devolve a pista daquele buraco negro (o destino) ou null */
export const ATRACAO = { raio: 700, abre: 1.12 } as const;
/** o alcance do magnetismo de um buraco negro: proporcional ao tamanho (o grande dos cantos: `ATRACAO.raio`) */
export const raioDeAtracao = (f: FioCosmico) => ATRACAO.raio * (f.bn.r / FIO.bnR);
export function naAtracao(pistas: readonly FioCosmico[], p: V3): FioCosmico | null {
  for (const f of pistas) if (Math.hypot(p.x - f.bn.x, p.y - f.bn.y, p.z - f.bn.z) < f.bn.r + raioDeAtracao(f)) return f;
  return null;
}
/** a CAPTURA (a 1ª cutscene — a entrada na zona de eventos; o dono, out/2026: "uma transição suave, coerente com a
 *  distância"): nos primeiros `dur` s ninguém é arrancado — a pessoa segue DESLIZANDO na velocidade em que vinha,
 *  freando, enquanto a órbita a assume aos poucos; depois, a espiral (a 2ª — até o núcleo) */
export const CAPTURA = { dur: 6 } as const;
export type Tragada = { f: FioCosmico; r0: number; r: number; ang: number; y: number; sentido: 1 | -1; abriu: boolean; /** s desde a captura, de onde e a que velocidade ela vinha */ t: number; p0: V3; v0: V3 };
/** começa a ser tragado de `p` (local da ilha), vindo a `v0` (m/s): as coordenadas em volta do buraco negro */
export function comecarTragada(f: FioCosmico, p: V3, v0: V3 = { x: 0, y: 0, z: 0 }): Tragada {
  const r = Math.max(f.bn.r * 1.2, Math.hypot(p.x - f.bn.x, p.z - f.bn.z)), ang = Math.atan2(p.z - f.bn.z, p.x - f.bn.x);
  return { f, r0: r, r, ang, y: p.y, sentido: 1, abriu: false, t: 0, p0: { ...p }, v0: { ...v0 } };
}
/** ainda na CAPTURA (a 1ª cutscene)? e quanto dela já foi (0..1) */
export const naCaptura = (v: Tragada) => v.t < CAPTURA.dur;
export const progressoCaptura = (v: Tragada) => Math.max(0, Math.min(1, v.t / CAPTURA.dur));
const s3c = (x: number) => { const c = Math.max(0, Math.min(1, x)); return c * c * (3 - 2 * c); };
/** quanto da tragada já foi (0 = acabou de ser pego → 1 = no horizonte) */
export const progressoTragada = (v: Tragada) => 1 - Math.max(0, Math.min(1, v.r / Math.max(1, v.r0)));
/** um passo da tragada: o raio fecha (devagar no começo, cada vez mais rápido) rumo ao EIXO, o giro acelera e a altura
 *  vai pro POLO DE CIMA (out/2026, o dono: "puxar sempre pro eixo superior" — nunca por baixo do disco): quem vem de
 *  baixo sobe, e todo mundo cai no horizonte por cima. `chegou` = tocou o horizonte (o clarão, e o outro lado) */
export function passoTragada(v: Tragada, dt: number): { chegou: boolean } {
  const R = v.f.bn.r, k = progressoTragada(v);
  v.t += dt;
  // (na escala do buraco negro; na CAPTURA a órbita mal anda e vai assumindo — a pessoa ainda desliza no embalo dela)
  const e = 0.08 + 0.92 * s3c(v.t / CAPTURA.dur);
  const vr = R * (0.09 + 1.3 * k * k) * e, vt = R * (0.35 + 1.5 * k * (1 - k * 0.7)) * e;
  v.r = Math.max(0, v.r - vr * dt);
  v.ang += ((vt / Math.max(v.r, R * 0.5)) * dt) * v.sentido;
  // (acima do disco, fechando até o polo — com o buraco negro 7× maior, sem a escalada de quilômetros: no começo, perto
  //  de onde se vinha, e só no fim por cima)
  const yAlvo = v.f.bn.y + R * (1.05 + 0.25 * (1 - k)) * Math.min(1, 0.35 + k);
  v.y += (yAlvo - v.y) * Math.min(1, dt * (0.9 + 2.5 * k));
  v.y = Math.max(v.y, v.f.bn.y + R * 0.15 + R * 0.9 * k * k);   // (nunca abaixo do disco — e cada vez mais por cima)
  return { chegou: Math.hypot(v.r, v.y - v.f.bn.y) <= R * ATRACAO.abre };
}
/** onde a tragada está (local da ilha) e pra onde se olha (o rumo: girando e caindo pra dentro) */
export function posDaTragada(v: Tragada): V3 & { rumo: number } {
  const c = Math.cos(v.ang), s = Math.sin(v.ang), b = v.f.bn;
  const dx = -s * v.sentido - c * 0.6, dz = c * v.sentido - s * 0.6;
  const orb = { x: b.x + c * v.r, y: v.y, z: b.z + s * v.r, rumo: Math.atan2(dx, dz) };
  if (!naCaptura(v)) return orb;
  // a CAPTURA: o embalo (freando até parar no fim dela) se misturando com a órbita
  const D = CAPTURA.dur, tau = v.t - (v.t * v.t) / (2 * D), w = s3c(v.t / D);
  const emb = { x: v.p0.x + v.v0.x * tau, y: v.p0.y + v.v0.y * tau, z: v.p0.z + v.v0.z * tau };
  const vx = v.v0.x * (1 - v.t / D), vz = v.v0.z * (1 - v.t / D), rumoEmb = Math.hypot(vx, vz) > 1 ? Math.atan2(vx, vz) : orb.rumo;
  let dr = orb.rumo - rumoEmb; while (dr > Math.PI) dr -= 2 * Math.PI; while (dr < -Math.PI) dr += 2 * Math.PI;
  return { x: emb.x + (orb.x - emb.x) * w, y: emb.y + (orb.y - emb.y) * w, z: emb.z + (orb.z - emb.z) * w, rumo: rumoEmb + dr * w };
}
/** voando (de carro, de moto, de mochila) PERTO DO HORIZONTE de um buraco negro: a pista dele (cai nele — o fluxo leva
 *  pela espiral até o fim); `p` local da ilha */
export function noBuracoNegro(pistas: readonly FioCosmico[], p: V3): FioCosmico | null {
  for (const f of pistas) if (Math.hypot(p.x - f.bn.x, p.y - f.bn.y, p.z - f.bn.z) < f.bn.r * 2.2) return f;
  return null;
}
/** a velocidade do fluxo (m/s) na fração `u`: puxa forte e ACELERA chegando no buraco negro */
export const velDoFluxo = (u: number) => { const k = Math.max(0, Math.min(1, u)); return 45 + 230 * Math.min(1, k * 6) ** 2 + 260 * k ** 3; };   // (sai devagar da borda, dispara no vazio cósmico e cai no buraco negro)

let cache: FioCosmico[] | null = null;
/** as pistas (uma por sala), na ordem das salas */
export const fiosCosmicos = (): FioCosmico[] => (cache ??= SALAS_FIO.map(montarPista));
export const fioDaSala = (s: NomeSala): FioCosmico => fiosCosmicos().find((f) => f.sala === s)!;

/** o ponto da pista na fração `u` (0 = a boca, 1 = o horizonte — pelo comprimento) e o rumo (yaw: +z = frente) */
export function pontoDoFio(f: FioCosmico, u: number): V3 & { rumo: number } {
  const alvo = Math.max(0, Math.min(1, u)) * f.comprimento;
  let lo = 0, hi = f.acum.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (f.acum[m]! < alvo) lo = m; else hi = m; }
  const a = f.eixo[lo]!, b = f.eixo[hi]!, seg = f.acum[hi]! - f.acum[lo]! || 1, k = (alvo - f.acum[lo]!) / seg;
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k, rumo: Math.atan2(b.x - a.x, b.z - a.z) };
}

/** pisou na boca de qual pista? (`l` = local da ilha; `yRel` = altura acima do piso da central) */
export function fioNaBoca(l: { x: number; z: number }, yRel: number): FioCosmico | null {
  if (Math.abs(yRel) > 1.5) return null;
  for (const f of fiosCosmicos()) if (Math.hypot(l.x - f.boca.x, l.z - f.boca.z) < f.boca.r) return f;
  return null;
}

/** a fração da viagem pelo fluxo (0..1) → a posição na pista: arranca suave e ACELERA no fim (caindo no buraco negro) */
export const uDaViagemFio = (k: number) => { const t = Math.max(0, Math.min(1, k)); return t < 0.08 ? (t * t) / 0.16 : 0.04 + (t - 0.08) * (0.96 / 0.92) * (0.85 + 0.15 * t); };

/** o quanto o buraco negro da pista está "perto" (0 longe → 1 no horizonte): a tempestade, o vento, o tremor */
export function pertoDoBuraco(f: FioCosmico, p: V3): number {
  const d = Math.hypot(p.x - f.bn.x, p.y - f.bn.y, p.z - f.bn.z) - f.bn.r;
  return Math.max(0, Math.min(1, 1 - d / FIO.zonaEfeito));
}
