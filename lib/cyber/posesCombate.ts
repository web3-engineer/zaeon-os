/**
 * Cyberespaço — as POSES DE AÇÃO do movimento turbinado (PURO; lib/cyber/movimento), no estilo HACK AND SLASH. Mesmo
 * formato das poses capturadas (lib/cyber/poses): a DIREÇÃO de cada segmento no referencial do corpo (frente, cima,
 * esquerda) — o avatar aponta os próprios ossos (components/cyber/AvatarLuz `apontar`), e o corpo VRM copia.
 *  - SPRINT ("corrida ninja"): o corpo todo inclina, o tronco mais ainda, os braços esticados PRA TRÁS — as pernas são
 *    da animação de corrida (mais rápida);
 *  - DASH: a INVESTIDA baixa — perna da frente dobrada, a de trás esticada, tronco projetado, braços abertos pra trás;
 *  - ALERTA (logo depois do dash): a GUARDA — joelhos dobrados, base larga (um pé à frente), cotovelos abertos e as mãos
 *    na frente do peito, respirando.
 * `lado` de cada membro: +1 = esquerdo (o eixo "esquerda" aponta pra fora dele), −1 = direito.
 */
import type { Dir3 } from "./poses";

export type PoseAcao = {
  /** inclinação do CORPO inteiro (rad, negativa = pra frente, girando no quadril) e quanto o quadril desce (m) */
  inclina: number; desce: number;
  tronco: Dir3; cabeca: Dir3;
  braco(lado: number): Dir3; ante(lado: number): Dir3;
  /** as pernas (null = deixa a animação — o sprint corre com as pernas da corrida) */
  coxa: ((lado: number) => Dir3) | null; canela: ((lado: number) => Dir3) | null; pe: ((lado: number) => Dir3) | null;
};
const n = (v: Dir3): Dir3 => { const m = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / m, v[1] / m, v[2] / m]; };

/** a corrida ninja: `t` (s) só balança os braços de leve (o vento) */
export function poseSprint(t: number): PoseAcao {
  const vento = 0.06 * Math.sin(t * 14);
  return {
    inclina: -0.24, desce: 0.06,
    tronco: n([0.36, 0.93, 0]), cabeca: n([0.3, 0.95, 0]),
    braco: (l) => n([-0.66, -0.68, 0.3 * l + vento * l]),
    ante: (l) => n([-0.92, -0.3, 0.22 * l]),
    coxa: null, canela: null, pe: null,
  };
}

/** a investida do dash (a perna ESQUERDA vai na frente) */
export function poseDash(): PoseAcao {
  return {
    inclina: -0.32, desce: 0.2,
    tronco: n([0.42, 0.9, 0]), cabeca: n([0.15, 0.99, 0]),
    braco: (l) => n([-0.55, -0.55, 0.62 * l]),
    ante: (l) => n([-0.85, -0.15, 0.5 * l]),
    coxa: (l) => (l > 0 ? n([0.72, -0.66, 0.1]) : n([-0.55, -0.83, -0.1])),
    canela: (l) => (l > 0 ? n([-0.18, -0.98, 0]) : n([-0.85, -0.52, 0])),
    pe: (l) => (l > 0 ? n([0.8, -0.6, 0]) : n([-0.25, -0.97, 0])),
  };
}

/** a GUARDA de alerta depois do dash — a "postura de poder" dos heróis de jogo de ação (referência do dono: o Delsin de
 *  inFAMOUS Second Son), pra passar sensação de PERIGO: tronco curvado pra frente (sem ficar ereto) com a cabeça baixa
 *  olhando por cima, BRAÇOS BEM ABERTOS (cotovelos pra fora) e DOBRADOS (antebraços pra frente), base larga e joelhos dobrados. A RESPIRAÇÃO OFEGANTE
 *  move o corpo todo: no inspirar o peito e os ombros sobem e os braços se ABREM e sobem; no expirar caem. E o peso
 *  balança devagar de um lado pro outro (o predador medindo o adversário). `tDesde` = s desde o esforço (o fôlego acalma) */
export function poseAlerta(t: number, tDesde = 1): PoseAcao {
  const folego = 0.5 + 0.5 * Math.exp(-tDesde * 0.9), r = Math.sin(t * 11) * folego;   // ~1,75 respirações/s
  const balanco = Math.sin(t * 1.6) * 0.07;
  return {
    inclina: -0.15 - 0.03 * r, desce: 0.24 + 0.03 * r,
    tronco: n([0.4 - 0.07 * r, 0.91, balanco]), cabeca: n([-0.16, 0.99, -balanco * 0.5]),
    // os braços ABERTOS (cotovelos pra fora) mas DOBRADOS: o antebraço vem pra frente (~70° no cotovelo) — garras prontas
    braco: (l) => n([0.05, -0.5 + 0.17 * r, (0.86 + 0.06 * r) * l]),
    ante: (l) => n([0.82 - 0.04 * r, -0.28 + 0.14 * r, (0.38 + 0.05 * r) * l]),
    coxa: (l) => (l > 0 ? n([0.3, -0.74, 0.6]) : n([-0.16, -0.77, -0.62])),
    canela: (l) => n([-0.3, -0.94, 0.14 * l]),
    pe: (l) => (l > 0 ? n([0.88, -0.4, 0.25]) : n([0.6, -0.5, -0.62])),
  };
}

/** o HERO LANDING (o pouso de super-herói, só de queda ALTA): joelho direito no chão, o pé esquerdo plantado à frente,
 *  o punho direito no chão, o braço esquerdo aberto pra trás, tronco debruçado e a cabeça baixa */
export function poseHeroi(): PoseAcao {
  return {
    inclina: -0.3, desce: 0.47,
    tronco: n([0.72, 0.69, 0]), cabeca: n([0.45, 0.89, 0]),
    braco: (l) => (l > 0 ? n([-0.5, -0.42, 0.76]) : n([0.42, -0.9, -0.12])),
    ante: (l) => (l > 0 ? n([-0.72, -0.25, 0.65]) : n([0.12, -0.99, 0])),
    coxa: (l) => (l > 0 ? n([0.95, -0.2, 0.22]) : n([0.1, -0.99, -0.12])),
    canela: (l) => (l > 0 ? n([0.02, -1, 0]) : n([-0.98, -0.18, 0])),
    pe: (l) => (l > 0 ? n([0.9, -0.42, 0.05]) : n([-0.6, 0.3, 0])),
  };
}
/** quanto o HERO LANDING pesa `t` s depois do impacto: crava na hora, segura e levanta */
export const HEROI = { segura: 0.6, levanta: 0.5, trava: 0.45, alturaMin: 9 } as const;
export function pesoHeroi(t: number): number {
  if (t < 0) return 0;
  const entra = Math.min(1, t / 0.05), sai = t < HEROI.segura ? 1 : Math.max(0, 1 - (t - HEROI.segura) / HEROI.levanta);
  return entra * sai * sai * (3 - 2 * sai);
}

/** a DECOLAGEM com impulso: agacha `espera` s (parado mais, correndo quase nada — o embalo continua) e lança. Os braços
 *  vão pra trás no agachamento e sobem na hora do impulso. `tD` = s desde o comando */
export const DECOLAGEM = { esperaParado: 0.16, esperaAndando: 0.07, impulso: 12 } as const;
export function bracosDaDecolagem(tD: number, espera: number): { braco(l: number): Dir3; ante(l: number): Dir3; w: number } {
  const u = tD - espera, lanca = Math.max(0, Math.min(1, u / 0.12));
  const w = tD < espera ? Math.min(1, tD / Math.max(0.03, espera * 0.6)) : Math.max(0, 1 - Math.max(0, u - 0.25) / 0.3);
  const mistura = (a: Dir3, b: Dir3): Dir3 => n([a[0] + (b[0] - a[0]) * lanca, a[1] + (b[1] - a[1]) * lanca, a[2] + (b[2] - a[2]) * lanca]);
  return { w, braco: (l) => mistura([-0.5, -0.83, 0.22 * l], [0.45, 0.55, 0.32 * l]), ante: (l) => mistura([-0.55, -0.82, 0.1 * l], [0.25, 0.95, 0.1 * l]) };
}

/** os PESOS das poses de ação no instante: o sprint segue a velocidade; o dash acende rápido e solta em 0,15 s depois
 *  do arranque; o alerta entra quando o dash acaba, fica `ALERTA.dura` s e sai em `ALERTA.sai` s */
export const ALERTA = { dura: 1.5, sai: 0.45 } as const;
export function pesoAlerta(tDesdeFimDash: number): number {
  if (tDesdeFimDash < 0) return 0;
  const entra = Math.min(1, tDesdeFimDash / 0.12), sai = tDesdeFimDash < ALERTA.dura ? 1 : Math.max(0, 1 - (tDesdeFimDash - ALERTA.dura) / ALERTA.sai);
  return entra * sai;
}

// ── a ESPADA na mão: as poses dos GOLPES do combo (lib/cyber/combate) e a empunhadura ───────────────────────────────
/** a pose da espada: o braço DIREITO segura (o esquerdo equilibra), a direção da LÂMINA e a normal do plano do corte
 *  (a lâmina corta de fio: a face larga fica pra essa normal) — tudo no referencial do corpo (frente, cima, esquerda) */
export type PoseEspada = {
  inclina: number; desce: number; tronco: Dir3;
  bracoD: Dir3; anteD: Dir3; bracoE: Dir3; anteE: Dir3;
  lamina: Dir3; plano: Dir3;
  /** as pernas (só no golpe pesado — a investida); null = as da caminhada/guarda */
  pernas: { coxa(l: number): Dir3; canela(l: number): Dir3; pe(l: number): Dir3 } | null;
};
const mix = (a: Dir3, b: Dir3, t: number): Dir3 => n([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
const suave = (x: number) => { const c = Math.max(0, Math.min(1, x)); return c * c * (3 - 2 * c); };
/** no plano horizontal do corpo: ângulo `th` a partir da frente rumo à ESQUERDA, `el` = quanto sobe */
const horiz = (th: number, el = 0): Dir3 => n([Math.cos(th), el, Math.sin(th)]);
/** no plano frente–cima: ângulo `fi` a partir da frente rumo a CIMA (um pouco pra direita, do lado do braço) */
const vert = (fi: number): Dir3 => n([Math.cos(fi), Math.sin(fi), -0.12]);

/** o braço esquerdo, aberto e dobrado (o mesmo da guarda) — equilibra os golpes */
const ESQ_ABERTO = { braco: n([0.05, -0.5, 0.86]), ante: n([0.82, -0.28, 0.38]) };
/** a GUARDA com a montante (~3 m): o BRAÇO ABAIXADO, a espada ARRASTANDO atrás à direita, a ponta rente ao chão — é
 *  daqui que todo golpe parte (ergue até o ombro no preparo) e pra onde volta (o dono, out/2026) */
export function poseEmpunhaGuarda(): PoseEspada {
  return { inclina: 0, desce: 0, tronco: n([0.38, 0.92, 0]), bracoD: n([-0.05, -0.97, -0.25]), anteD: n([0.2, -0.95, -0.24]), ...{ bracoE: ESQ_ABERTO.braco, anteE: ESQ_ABERTO.ante }, lamina: n([-0.82, -0.3, -0.48]), plano: n([0, 1, 0]), pernas: null };
}
/** andando com a montante: APOIADA NO OMBRO direito (a lâmina pra cima e pra trás) — arrastada, cravaria no chão */
export function poseEmpunhaSolta(): PoseEspada {
  return { inclina: 0, desce: 0, tronco: n([0.12, 0.99, 0]), bracoD: n([0.2, -0.62, -0.76]), anteD: n([0.35, 0.88, -0.32]), bracoE: n([0, -0.98, 0.2]), anteE: n([0.25, -0.95, 0.15]), lamina: n([-0.6, 0.7, -0.38]), plano: n([0, 0, 1]), pernas: null };
}
/** um ARCO por vários pontos (direções): a lâmina passa por cada um, girando pelo caminho mais curto entre eles */
function arco(pontos: Dir3[], k: number): Dir3 {
  const segs = pontos.length - 1, x = Math.max(0, Math.min(0.9999, k)) * segs, i = Math.floor(x), f = x - i, a = pontos[i]!, b = pontos[i + 1]!;
  const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])), om = Math.acos(dot);
  if (om < 1e-4) return a;
  const sa = Math.sin((1 - f) * om) / Math.sin(om), sb = Math.sin(f * om) / Math.sin(om);
  return n([a[0] * sa + b[0] * sb, a[1] * sa + b[1] * sb, a[2] * sa + b[2] * sb]);
}
/** gira de `a` pra `b` pelo caminho mais curto, e PASSA do ponto se `f` > 1 (a inércia do golpe pesado) */
function alem(a: Dir3, b: Dir3, f: number): Dir3 {
  const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])), om = Math.acos(dot);
  if (om < 1e-4) return b;
  const sa = Math.sin((1 - f) * om) / Math.sin(om), sb = Math.sin(f * om) / Math.sin(om);
  return n([a[0] * sa + b[0] * sb, a[1] * sa + b[1] * sb, a[2] * sa + b[2] * sb]);
}
const cruz = (a: Dir3, b: Dir3): Dir3 => n([a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]);
/** os quadros-chave de um braço (direito) ao longo do golpe: preparo → meio → fim */
const chaves = (lista: Dir3[], k: number) => arco(lista, k);

/** os GOLPES A DUAS MÃOS, no estilo dos jogos de ação (referência do dono: o combo da espada do Dante em Devil May Cry):
 *  ANTECIPAÇÃO longa (a espada sobe, o corpo carrega), o CORTE rápido e a RECUPERAÇÃO que segura o peso. A mão direita
 *  segura perto da guarda; a ESQUERDA vai no cabo, logo abaixo (o avatar faz o IK — `duasMaos`).
 *  1 — DIAGONAL descendo: de cima do ombro direito até embaixo à esquerda, com um passo;
 *  2 — DIAGONAL subindo de volta: de baixo à esquerda até o alto à direita, o tronco girando;
 *  3 — o PESADO por cima: a espada lá no alto (o corpo arqueia pra trás) e ESMAGA pra frente-baixo (agacha, investe) */
export function poseGolpe(nGolpe: 1 | 2 | 3, u: number, ativo: [number, number]): PoseEspada & { duasMaos: number } {
  const [a0, a1] = ativo;
  // o PESO da montante: a ANTECIPAÇÃO chega lá em cima antes e SEGURA (a carga); o CORTE começa devagar e ganha
  // embalo (a massa acelerando); depois do corte a lâmina PASSA DO PONTO (inércia) e o corpo é puxado junto; a volta
  // pra guarda é lenta (levantar o peso de novo)
  const x = u < a0 ? 0 : u < a1 ? (u - a0) / (a1 - a0) : 1, kc = x * x * (2.2 - 1.2 * x);
  const prep = suave(u / Math.max(0.01, a0 * 0.78)), volta = suave((u - a1 - 0.1) / Math.max(0.05, 1 - a1 - 0.1));
  const inercia = u > a1 ? Math.sin(Math.PI * Math.min(1, (u - a1) / 0.22)) * (u - a1 < 0.22 ? 1 : 0) : 0;   // 0 → 1 → 0 logo depois do corte
  const G = poseEmpunhaGuarda();
  type Quadro = { tronco: Dir3; bracoD: Dir3; anteD: Dir3; lamina: Dir3; inclina: number; desce: number };
  let ini: Quadro, meio: Quadro, fim: Quadro, pernas: PoseEspada["pernas"] = null;
  if (nGolpe === 1) {
    ini = { tronco: n([0.15, 0.97, -0.2]), bracoD: n([0.1, 0.55, -0.83]), anteD: n([-0.2, 0.95, -0.25]), lamina: n([-0.45, 0.75, -0.48]), inclina: 0.04, desce: 0.1 };
    meio = { tronco: n([0.35, 0.93, 0]), bracoD: n([0.75, -0.3, -0.58]), anteD: n([0.95, 0.08, 0.25]), lamina: n([0.96, 0.18, 0.2]), inclina: -0.12, desce: 0.18 };
    fim = { tronco: n([0.5, 0.85, 0.2]), bracoD: n([0.55, -0.65, 0.5]), anteD: n([0.5, -0.62, 0.6]), lamina: n([0.42, -0.32, 0.85]), inclina: -0.2, desce: 0.24 };   // (a montante para RENTE ao chão)
    pernas = { coxa: (l) => (l > 0 ? n([0.45, -0.75, 0.48]) : n([-0.3, -0.78, -0.55])), canela: (l) => n([-0.3, -0.94, 0.14 * l]), pe: (l) => (l > 0 ? n([0.88, -0.4, 0.25]) : n([0.55, -0.55, -0.62])) };
  } else if (nGolpe === 2) {
    ini = { tronco: n([0.5, 0.85, 0.22]), bracoD: n([0.55, -0.65, 0.5]), anteD: n([0.5, -0.62, 0.6]), lamina: n([0.42, -0.32, 0.85]), inclina: -0.18, desce: 0.22 };
    meio = { tronco: n([0.3, 0.94, 0]), bracoD: n([0.85, -0.15, -0.5]), anteD: n([0.95, 0.15, -0.28]), lamina: n([0.95, -0.02, -0.3]), inclina: -0.1, desce: 0.15 };
    fim = { tronco: n([0.05, 0.98, -0.25]), bracoD: n([0.35, 0.6, -0.72]), anteD: n([0.1, 0.95, -0.3]), lamina: n([-0.1, 0.85, -0.5]), inclina: 0.05, desce: 0.08 };
    pernas = { coxa: (l) => (l > 0 ? n([0.25, -0.8, 0.55]) : n([-0.15, -0.8, -0.58])), canela: (l) => n([-0.25, -0.95, 0.1 * l]), pe: (l) => (l > 0 ? n([0.85, -0.45, 0.3]) : n([0.5, -0.55, -0.65])) };
  } else {
    ini = { tronco: n([-0.12, 0.98, 0]), bracoD: n([0.15, 0.95, -0.25]), anteD: n([-0.25, 0.96, -0.1]), lamina: n([-0.85, 0.5, -0.1]), inclina: 0.12, desce: 0.05 };
    meio = { tronco: n([0.2, 0.97, 0]), bracoD: n([0.45, 0.85, -0.25]), anteD: n([0.5, 0.85, -0.1]), lamina: n([0.15, 0.99, -0.05]), inclina: 0, desce: 0.1 };
    fim = { tronco: n([0.68, 0.73, 0]), bracoD: n([0.82, -0.52, -0.22]), anteD: n([0.85, -0.52, -0.05]), lamina: n([0.93, -0.36, 0]), inclina: -0.42, desce: 0.34 };   // (a PONTA bate no chão lá na frente)
    pernas = { coxa: (l) => (l > 0 ? n([0.75, -0.6, 0.18]) : n([-0.55, -0.8, -0.2])), canela: (l) => (l > 0 ? n([-0.2, -0.98, 0]) : n([-0.85, -0.5, 0])), pe: (l) => (l > 0 ? n([0.8, -0.6, 0]) : n([-0.25, -0.97, 0])) };
  }
  // o CORPO segue o golpe: na antecipação vai da guarda até o preparo; no corte, preparo → meio → fim; volta pra guarda
  const quadro = (q: (x: Quadro) => Dir3) => (u < a0 ? mix(q({ tronco: G.tronco, bracoD: G.bracoD, anteD: G.anteD, lamina: G.lamina, inclina: 0, desce: 0 }), q(ini), prep) : chaves([q(ini), q(meio), q(fim)], kc));
  const num = (q: (x: Quadro) => number) => (u < a0 ? q(ini) * prep : kc < 0.5 ? q(ini) + (q(meio) - q(ini)) * kc * 2 : q(meio) + (q(fim) - q(meio)) * (kc - 0.5) * 2);
  const w = u > a1 ? 1 - volta : 1;
  const m = (a: Dir3, b: Dir3) => mix(a, b, w);
  const lam0 = quadro((x) => x.lamina), lam = inercia > 0 ? alem(meio.lamina, fim.lamina, 1 + 0.16 * inercia) : lam0;
  return {
    inclina: (num((x) => x.inclina) - 0.06 * inercia) * w, desce: (num((x) => x.desce) + 0.05 * inercia) * w,
    tronco: m(G.tronco, quadro((x) => x.tronco)), bracoD: m(G.bracoD, quadro((x) => x.bracoD)), anteD: m(G.anteD, quadro((x) => x.anteD)),
    bracoE: G.bracoE, anteE: G.anteE,
    lamina: w >= 1 ? lam : m(G.lamina, lam), plano: cruz(ini.lamina, fim.lamina),
    pernas: w > 0.05 ? pernas : null,
    duasMaos: w,
  };
}
