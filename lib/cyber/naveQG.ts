/**
 * Cyberespaço — a NAVE-QG do dono (PURO, sem three): o disco voador virou o QG dele — ~68 m de diâmetro, ESTACIONÁRIO
 * (para no ar em qualquer lugar do mapa e dá pra sair com ela pairando) e com um CONVÉS de verdade por dentro:
 *  - em CIMA, a CABINE DE COMANDO (um mezanino logo abaixo da redoma do topo): o leme (F = pilotar), consoles e o
 *    TERMINAL DE ESTUDOS (F = estudar). Largou o leme (F), a REDOMA ABRE — dá pra sair voando de mochila por ela;
 *    desceu a escada, ela fecha (só abre com alguém de pé lá em cima, sem pilotar);
 *  - EMBAIXO, a CASA: o HALL da escada no centro e, em volta, SALA DE ESTAR na proa (receber convidados), SERVIDORES a
 *    estibordo, SALA DE REUNIÕES a bombordo, BANHEIRO e SALA DO MOTOR (o reator) atrás;
 *  - um CORREDOR do hall até a PORTA de trás (F = sair; lá fora, perto da porta/rampa, F = entrar).
 * Qualquer pessoa entra (é a casa dele — convidados são bem-vindos); só o dono pilota (servidor confere).
 *
 * Coordenadas LOCAIS da nave em metros: +z = a frente (proa), x = estibordo; y = altura acima da origem do grupo (o
 * ponto de apoio no chão, com as pernas abaixadas). O convés fica a `deck` m da origem. Sem hangar: a nave mora
 * PAIRANDO ao lado da ilha da Zaeon (a doca), com a porta virada pra borda da ilha.
 */
import type { P2 } from "./colisao";
import { empurrarParaFora } from "./colisao";
import { CIDADE, DOCA_ANGULO, ILHOTAS, mundo, naIlhaPrincipal } from "./ceu";
export { DOCA_ANGULO };
import { empurrarDasParedes, empurrarDosRetangulos, paredesDoRetangulo, type Parede } from "./universidade";

/** o modelo do disco tem ~7,56 m de diâmetro em 1× (components/cyber/Nave.ts); a nave-QG tem ~68 m */
export const ESCALA_NAVE_QG = 9.0;
/** a planta do convés foi desenhada pra escala 6,3 — `K` estica os CÔMODOS e as posições (os móveis ficam do
 *  tamanho de gente: só o lugar deles escala) */
const K = ESCALA_NAVE_QG / 6.3;
const P = (x: number, z: number) => ({ x: x * K, z: z * K });
export const NAVE_QG = {
  /** raio do casco (a aba), a altura do convés acima da origem e o raio do casco na altura do convés (a porta) */
  raio: 3.78 * ESCALA_NAVE_QG, deck: (1 - 0.222) * ESCALA_NAVE_QG, cascoNoConves: 3.17 * ESCALA_NAVE_QG,
  /** raio útil do convés (dentro do casco) e a altura das paredes internas */
  interiorR: 15.5 * K, pe: 4.2,
  /** a altura do piso da CABINE DE COMANDO acima do convés: lá em cima, ~1 m abaixo do aro da redoma retrátil — os
   *  controles ficam na altura dela (o aro da redoma está a (1 + 0,86) × escala da origem) */
  cabine: (1 + 0.86) * ESCALA_NAVE_QG - (1 - 0.222) * ESCALA_NAVE_QG - 1.0,
  leme: { x: 1.5, z: 2.6 },    // a cadeira do piloto, lá em cima (o avatar senta aqui)
  emPe: { x: 1.5, z: 0.8 },    // onde se fica de pé ao largar o leme (atrás da cadeira)
  portaDentro: P(0, -13.6),    // o pé da porta, por dentro
  saida: P(0, -27.5),          // lá fora, no fim da rampa (atrás da nave)
  alcance: 2.4,                // perto o bastante pra usar algo (F)
  alcanceEntrada: 8,           // perto da saída, lá fora, pra entrar
} as const;
const N = NAVE_QG;

export type Comodo = { id: "hall" | "corredor" | "estar" | "servidores" | "reunioes" | "banheiro" | "motor"; nome: string; x0: number; x1: number; z0: number; z1: number };
/** os cômodos (retângulos dentro do círculo útil) — o corredor liga todos */
const C = (c: Comodo): Comodo => ({ ...c, x0: c.x0 * K, x1: c.x1 * K, z0: c.z0 * K, z1: c.z1 * K });
export const COMODOS: Comodo[] = ([
  { id: "hall", nome: "Hall da escada", x0: -4.5, x1: 4.5, z0: -4.5, z1: 4.5 },
  { id: "estar", nome: "Sala de estar", x0: -8.5, x1: 8.5, z0: 4.5, z1: 12.6 },
  { id: "servidores", nome: "Servidores", x0: 4.5, x1: 13, z0: -4.5, z1: 4.5 },
  { id: "reunioes", nome: "Sala de reuniões", x0: -13, x1: -4.5, z0: -4.5, z1: 4.5 },
  { id: "corredor", nome: "Corredor", x0: -2, x1: 2, z0: -14.4, z1: -4.5 },
  { id: "banheiro", nome: "Banheiro", x0: -9.5, x1: -2, z0: -11.5, z1: -4.5 },
  { id: "motor", nome: "Sala do motor", x0: 2, x1: 9.5, z0: -11.5, z1: -4.5 },
] as Comodo[]).map(C);

/** as paredes internas (locais): cada cômodo com a porta pro corredor; o corredor com a porta de trás (pra fora) */
let paredesCache: Parede[] | null = null;
export function paredesDaNave(): Parede[] {
  if (paredesCache) return paredesCache;
  const c = (id: Comodo["id"]) => COMODOS.find((x) => x.id === id)!, alt = N.pe, esp = 0.25;
  const p = c("hall"), e = c("estar"), s = c("servidores"), rn = c("reunioes"), b = c("banheiro"), m = c("motor"), k = c("corredor");
  const g = (c: number, w: number) => ({ c: c * K, w });
  paredesCache = [
    // o hall: uma porta em cada lado (proa → estar, estibordo → servidores, bombordo → reuniões, popa → corredor)
    ...paredesDoRetangulo(p.x0, p.x1, p.z0, p.z1, esp, alt, { n: [g(0, 3.2)], l: [g(0, 3.2)], o: [g(0, 3.2)], s: [g(0, 3.4)] }),
    ...paredesDoRetangulo(e.x0, e.x1, e.z0, e.z1, esp, alt, { s: [g(0, 3.2)] }),
    ...paredesDoRetangulo(s.x0, s.x1, s.z0, s.z1, esp, alt, { o: [g(0, 3.2)] }),
    ...paredesDoRetangulo(rn.x0, rn.x1, rn.z0, rn.z1, esp, alt, { l: [g(0, 3.2)] }),
    ...paredesDoRetangulo(b.x0, b.x1, b.z0, b.z1, esp, alt, { l: [g(-8, 2)] }),
    ...paredesDoRetangulo(m.x0, m.x1, m.z0, m.z1, esp, alt, { o: [g(-8, 3.2)] }),
    ...paredesDoRetangulo(k.x0, k.x1, k.z0, k.z1, esp, alt, { n: [g(0, 3.4)], o: [g(-8, 2)], l: [g(-8, 3.2)], s: [g(0, 2.8)] }),
  ];
  return paredesCache;
}

export type MovelNave = { tipo: "console" | "leme" | "terminal" | "sofa" | "mesinha" | "poltrona" | "bar" | "tela" | "rack" | "vaso" | "pia" | "chuveiro" | "painel" | "mesa"; x0: number; x1: number; z0: number; z1: number; alt: number; solido?: boolean };
/** um móvel: o CENTRO escala com a planta (K), o tamanho não (é de gente) */
const r = (tipo: MovelNave["tipo"], x0: number, x1: number, z0: number, z1: number, alt: number, solido = true): MovelNave => {
  const cx = ((x0 + x1) / 2) * K, cz = ((z0 + z1) / 2) * K, hx = (x1 - x0) / 2, hz = (z1 - z0) / 2;
  return { tipo, x0: cx - hx, x1: cx + hx, z0: cz - hz, z1: cz + hz, alt, solido };
};
/** a casa é LEVE: lá embaixo só o que é motor e computador — o painel de controle do reator (o reator é redondo —
 *  REATOR); os cômodos ficam livres (computadores de verdade estão na cabine, lá em cima) */
export const MOVEIS_NAVE: MovelNave[] = [
  r("painel", 8.4, 9.2, -11, -9.4, 1.2),
];
/** o reator da sala do motor (sólido, redondo) */
export const REATOR = { ...P(5.6, -8), r: 2.4 };

// ───────────── a CABINE DE COMANDO (em cima) e a ESCADA (do hall até ela) ─────────────
/** o mezanino da cabine (a mesma planta do hall, `NAVE_QG.cabine` m acima do convés) */
export const CABINE = (() => { const h = COMODOS.find((c) => c.id === "hall")!; return { x0: h.x0, x1: h.x1, z0: h.z0, z1: h.z1 }; })();
/** a ESCADA EM CARACOL: em volta de uma coluna, num canto do hall (livre das 4 portas). O PÉ fica virado pro meio do
 *  hall; sobe girando (2 voltas inteiras) até o TOPO, que sai virado pro mesmo lado — o meio da cabine, o leme. O vão dela (o círculo) fura o piso da cabine. */
export const ESCADA = { cx: -3.7, cz: 3.7, rIn: 0.55, rOut: 2.4, voltas: 2 };
const ESC_A0 = Math.atan2(0 - ESCADA.cz, 0 - ESCADA.cx);   // o pé: o ângulo virado pro meio do hall
const ESC_TOTAL = ESCADA.voltas * Math.PI * 2;
const angEsc = (l: P2) => Math.atan2(l.z - ESCADA.cz, l.x - ESCADA.cx);
const difAng = (a: number) => { let d = a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
const naColunaDaEscada = (l: P2, folga = 0) => Math.hypot(l.x - ESCADA.cx, l.z - ESCADA.cz) < ESCADA.rOut + folga;
/** um ponto da escada: `esc` = quanto já girou desde o pé (0..total), no raio do meio dos degraus */
export function pontoDaEscada(esc: number, r = (ESCADA.rIn + ESCADA.rOut) / 2): P2 { const a = ESC_A0 + esc; return { x: ESCADA.cx + Math.cos(a) * r, z: ESCADA.cz + Math.sin(a) * r }; }
export const TOTAL_ESCADA = ESC_TOTAL;
/** os móveis da cabine (alturas acima do piso dela): o console curvo na frente do leme, a cadeira, o DESKTOP de
 *  estudos (a mesa com os monitores — F abre o laboratório), do lado OPOSTO ao leme, e um console lateral */
export const MOVEIS_CABINE: MovelNave[] = [
  { tipo: "console", x0: -1.0, x1: 4.0, z0: 4.4, z1: 5.1, alt: 1.1 },
  { tipo: "leme", x0: 1.05, x1: 1.95, z0: 2.2, z1: 3.05, alt: 1.2, solido: false },
  { tipo: "terminal", x0: -0.6, x1: 3.6, z0: -5.9, z1: -5.0, alt: 0.78 },   // o MEU DESKTOP (onde se abre o laboratório): no fundo, do lado oposto ao leme
  { tipo: "console", x0: 5.4, x1: 6.2, z0: 1.4, z1: 3.0, alt: 1.15 },
];
/** o guarda-corpo da cabine (as bordas do mezanino) e o do vão da escada (aberto só no topo dela) */
let paredesCabCache: Parede[] | null = null;
export function paredesDaCabine(): Parede[] {
  if (paredesCabCache) return paredesCabCache;
  const a = 1.1, esp = 0.15;
  paredesCabCache = paredesDoRetangulo(CABINE.x0, CABINE.x1, CABINE.z0, CABINE.z1, esp, a, {});   // (o vão da escada tem guarda-corpo redondo: ver andarNaNave)
  return paredesCabCache;
}


const dentroDe = (l: P2, c: Comodo, folga = 0) => l.x > c.x0 + folga && l.x < c.x1 - folga && l.z > c.z0 + folga && l.z < c.z1 - folga;
/** o cômodo em que `l` está; `folga` negativa = aceita o vão da porta entre dois cômodos (a soleira) */
export const comodoEm = (l: P2, folga = 0): Comodo | null => COMODOS.find((c) => dentroDe(l, c, folga)) ?? null;

/** onde se está a bordo: posição LOCAL e o nível (0 = a casa, no convés — inclusive subindo a escada; 1 = a cabine) */
export type Bordo = { x: number; z: number; nivel: 0 | 1; esc?: number };   // `esc`: na escada, quanto já girou desde o pé
/** a altura acima do convés: na cabine, o piso dela; na escada, sobe junto com o degrau; na casa, 0 */
export function alturaNoBordo(b: Bordo, queda: number = N.deck): number {
  if (b.nivel === 1) return N.cabine;
  if (b.esc === undefined) return naRampa(b) ? alturaDaRampa(b.z, queda) : 0;
  return N.cabine * Math.min(1, Math.max(0, b.esc / ESC_TOTAL));
}

// ───────────── a RAMPA de trás (do corredor, pelo túnel, até lá fora) ─────────────
/** a rampa é chão firme com CORRIMÃO dos dois lados (quem cai dela é porque pulou de mochila): o túnel (até o casco)
 *  é plano; dali ela desce `queda` m até o fim (`saida`) — a queda se ajusta a onde a nave está (`rampaDaNave`). */
export const RAMPA = { meia: 1.3, z0: N.saida.z, z1: COMODOS.find((c) => c.id === "corredor")!.z0, zCasco: -N.cascoNoConves };
export const naRampa = (l: P2) => Math.abs(l.x) < RAMPA.meia && l.z < RAMPA.z1 + 0.4 && l.z > RAMPA.z0 - 0.4;
/** a altura do piso da rampa (relativa ao convés): 0 no túnel, descendo até −queda no fim */
export function alturaDaRampa(z: number, queda: number = N.deck): number { return -queda * Math.min(1, Math.max(0, (RAMPA.zCasco - z) / (RAMPA.zCasco - RAMPA.z0))); }
/** a rampa conforme onde a nave está: na DOCA ela vira uma PASSARELA plana até o piso da Zaeon (desce-se na ilha);
 *  POUSADA no chão, desce até o chão; PAIRANDO no ar, desce o padrão e o fim é guarda-corpo (desce null) */
export function rampaDaNave(p: PoseNave): { queda: number; desce: "ilha" | "chao" | null } {
  const conves = alturaDoConves(p);
  if (naIlhaPrincipal(paraMundo(p, N.saida)) && Math.abs(conves - CIDADE.pisoY) < 1.5) return { queda: conves - CIDADE.pisoY, desce: "ilha" };
  if (p.y < 1.5) return { queda: conves, desce: "chao" };
  return { queda: N.deck, desce: null };
}
/** no trecho da rampa FORA do casco (dá pra pular de mochila dali) */
export const naRampaLaFora = (b: Bordo | null) => !!b && b.nivel === 0 && b.esc === undefined && naRampa(b) && b.z < RAMPA.zCasco;
/** encostado no corrimão do fim da rampa (pousada no chão, dali se desce) */
export const naPontaDaRampa = (b: Bordo | null) => !!b && b.nivel === 0 && b.esc === undefined && naRampa(b) && b.z <= RAMPA.z0 + 0.7;
/** o raio do vão da redoma (o aro dela, em metros) — de mochila, por ele se cai direto na cabine */
export const RAIO_REDOMA = 1.32 * ESCALA_NAVE_QG;

/** POUSO DE MOCHILA na nave (local; alturas relativas ao convés): pelo vão da REDOMA aberta cai-se no piso da cabine;
 *  na RAMPA (lá fora), pousa-se nela. Senão, null. */
export function pousoNaNave(l: P2, yAnt: number, y: number, redomaAberta: boolean, queda: number = N.deck): Bordo | null {
  if (redomaAberta && Math.hypot(l.x, l.z) < RAIO_REDOMA && yAnt >= N.cabine - 0.05 && y <= N.cabine) {
    const q = { x: Math.min(CABINE.x1 - 0.6, Math.max(CABINE.x0 + 0.6, l.x)), z: Math.min(CABINE.z1 - 0.6, Math.max(CABINE.z0 + 0.6, l.z)) };
    return naColunaDaEscada(q, 0.5) ? { ...N.emPe, nivel: 1 } : { ...q, nivel: 1 };
  }
  if (Math.abs(l.x) < RAMPA.meia && l.z < RAMPA.zCasco && l.z > RAMPA.z0) {
    const h = alturaDaRampa(l.z, queda);
    if (yAnt >= h - 0.05 && y <= h) return { x: Math.max(-RAMPA.meia + 0.4, Math.min(RAMPA.meia - 0.4, l.x)), z: l.z, nivel: 0 };
  }
  return null;
}

/** um passo a pé DENTRO da nave (local → local): paredes, móveis, reator, a escada (entra só pelo pé, do hall; no
 *  topo vira a cabine) e o mezanino (guarda-corpo; o vão da escada desce). Nunca sai — a saída é a porta (F) */
export function andarNaNave(l: P2, ant: Bordo): Bordo {
  const meioR = (ESCADA.rIn + ESCADA.rOut) / 2, PORTA_ANG = 0.5;   // a "porta" do pé e a do topo: ±0,5 rad
  if (ant.esc !== undefined) {   // NA ESCADA EM CARACOL: o giro do passo vira subir/descer; o raio fica entre a coluna e o corrimão
    const esc = ant.esc + difAng(angEsc(l) - angEsc(ant));
    const rr = Math.min(ESCADA.rOut - 0.45, Math.max(ESCADA.rIn + 0.45, Math.hypot(l.x - ESCADA.cx, l.z - ESCADA.cz)));
    if (esc >= ESC_TOTAL) { const p = pontoDaEscada(ESC_TOTAL, ESCADA.rOut + 0.5); return { ...p, nivel: 1 }; }   // chegou no topo: a cabine
    if (esc <= 0) { const p = pontoDaEscada(0, ESCADA.rOut + 0.5); return { ...p, nivel: 0 }; }                    // desceu: o hall
    const a = ESC_A0 + esc; return { x: ESCADA.cx + Math.cos(a) * rr, z: ESCADA.cz + Math.sin(a) * rr, nivel: 0, esc };
  }
  if (ant.nivel === 1) {   // na CABINE (mezanino): guarda-corpo nas bordas e em volta do vão da escada (aberto no topo)
    let q = empurrarDasParedes(l, paredesDaCabine()); q = empurrarDosRetangulos(q, MOVEIS_CABINE);
    q = { x: Math.min(CABINE.x1 - 0.4, Math.max(CABINE.x0 + 0.4, q.x)), z: Math.min(CABINE.z1 - 0.4, Math.max(CABINE.z0 + 0.4, q.z)) };
    if (naColunaDaEscada(q, 0.35)) {
      const noTopo = Math.abs(difAng(angEsc(q) - (ESC_A0 + ESC_TOTAL))) < PORTA_ANG;
      if (noTopo && !naColunaDaEscada(ant, 0.35)) return { ...pontoDaEscada(ESC_TOTAL - 0.05, meioR), nivel: 0, esc: ESC_TOTAL - 0.05 };   // pelo topo: desce
      q = { x: ant.x, z: ant.z };   // o resto do vão é guarda-corpo
    }
    return { ...q, nivel: 1 };
  }
  let q = empurrarDasParedes(l, paredesDaNave());
  q = empurrarDosRetangulos(q, MOVEIS_NAVE);
  q = empurrarParaFora(q, [REATOR]);
  if (naColunaDaEscada(q, 0.35)) {   // a escada: entra só pelo PÉ (virado pro meio do hall); o resto é a coluna/os degraus
    const noPe = Math.abs(difAng(angEsc(q) - ESC_A0)) < PORTA_ANG;
    if (noPe && !naColunaDaEscada(ant, 0.35)) return { ...pontoDaEscada(0.05, meioR), nivel: 0, esc: 0.05 };
    q = { x: ant.x, z: ant.z };
  }
  if (naRampa(q) && !comodoEm(q, -0.4)) {   // na RAMPA: corrimão dos lados e no fim
    if (!naRampa(ant) && !comodoEm(ant, -0.4)) q = { ...N.portaDentro };
    return { x: Math.max(-RAMPA.meia + 0.4, Math.min(RAMPA.meia - 0.4, q.x)), z: Math.max(RAMPA.z0 + 0.4, q.z), nivel: 0 };
  }
  if (!comodoEm(q, -0.4)) q = comodoEm(ant, -0.4) || naRampa(ant) ? { x: ant.x, z: ant.z } : { ...N.portaDentro };   // escapou pela fresta de uma quina: volta
  return { ...q, nivel: 0 };
}

const perto = (a: P2, b: P2, d: number) => Math.hypot(a.x - b.x, a.z - b.z) < d;
/** onde se fica pra usar o terminal: na frente dele, do lado do meio da cabine */
export function pontoDoTerminal(): P2 {
  const t = MOVEIS_CABINE.find((m) => m.tipo === "terminal")!, cx = (t.x0 + t.x1) / 2, cz = (t.z0 + t.z1) / 2, d = Math.hypot(cx, cz) || 1;
  return { x: cx - (cx / d) * 1.3, z: cz - (cz / d) * 1.3 };
}
/** o que dá pra fazer a bordo (F): pilotar (dono, SÓ na cabine, no leme), estudar no terminal (cabine), sair pela porta (casa) */
export function acaoNaNave(b: Bordo, dono: boolean): "pilotar" | "estudar" | "sair" | null {
  if (b.nivel === 1 && dono && perto(b, N.leme, N.alcance + 0.6)) return "pilotar";
  if (b.nivel === 1 && perto(b, pontoDoTerminal(), N.alcance)) return "estudar";
  if (b.nivel === 0 && perto(b, N.portaDentro, N.alcance)) return "sair";
  return null;
}
/** a redoma abre só com alguém de pé NA CABINE (sem pilotar) */
export const redomaAberta = (b: Bordo | null, pilotando: boolean) => !pilotando && !!b && b.nivel === 1;

// ───────────── a nave no mundo ─────────────
export type PoseNave = { x: number; y: number; z: number; yaw: number };
/** local → mundo (plano) e mundo → local, pela pose da nave */
export function paraMundo(p: PoseNave, l: P2): P2 { const c = Math.cos(p.yaw), s = Math.sin(p.yaw); return { x: p.x + l.x * c + l.z * s, z: p.z - l.x * s + l.z * c }; }
export function paraLocal(p: PoseNave, w: P2): P2 { const dx = w.x - p.x, dz = w.z - p.z, c = Math.cos(p.yaw), s = Math.sin(p.yaw); return { x: dx * c - dz * s, z: dx * s + dz * c }; }
/** a altura do convés no mundo */
export const alturaDoConves = (p: PoseNave) => p.y + N.deck;
/** perto da SAÍDA (lá fora, atrás da nave) e mais ou menos na altura do convés → dá pra entrar */
export function pertoDaEntrada(p: PoseNave, w: P2, alt: number): boolean {
  const fimRampa = paraMundo(p, N.saida), naPorta = paraMundo(p, { x: 0, z: -N.cascoNoConves - 3 });   // o fim da rampa e logo atrás da porta (pairando)
  return (perto(w, fimRampa, N.alcanceEntrada) || perto(w, naPorta, N.alcanceEntrada)) && Math.abs(alt - alturaDoConves(p)) < 9;
}

/** a DOCA: a nave pairando ao lado da ilha da Zaeon (no lugar do antigo hangar), a proa pra fora e a porta (popa)
 *  na borda da ilha — da borda, F entra. Entre as ilhotas (não encosta em nenhuma). */
export function poseDaDoca(): PoseNave {
  const dir = { x: Math.cos(DOCA_ANGULO), z: Math.sin(DOCA_ANGULO) }, d = CIDADE.andavelR - 1 - N.saida.z;   // a saída fica logo antes da borda andável
  const c = mundo({ x: dir.x * d, z: dir.z * d });
  return { x: c.x, y: CIDADE.pisoY - N.deck, z: c.z, yaw: Math.atan2(dir.x, dir.z) };
}
/** sanidade: o casco da nave na doca não encosta em nenhuma ilhota */
export const docaLivre = () => { const p = poseDaDoca(); return ILHOTAS.every((il) => Math.hypot(mundo(il).x - p.x, mundo(il).z - p.z) > N.raio + il.r + 2); };
