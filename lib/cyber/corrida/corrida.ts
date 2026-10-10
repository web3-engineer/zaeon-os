/**
 * Corridas de moto — a CORRIDA em si (PURO): a máquina de estados de uma corrida contra o relógio numa pista
 * (lib/cyber/corrida/pistas).
 *  - CONTAGEM (3 s): a moto fica no grid (o engine trava ela lá); bipes em 3, 2, 1;
 *  - CORRENDO: o relógio anda; os portões têm que ser cruzados EM ORDEM e no SENTIDO da pista (o segmento do quadro
 *    anterior pro atual atravessa o plano do portão dentro do anel); pulou um, ele continua sendo o próximo — tem que
 *    voltar. O de BOOST enche o tanque. Cruzar a largada depois do último portão fecha a VOLTA;
 *  - FIM: depois da última volta. O total e as voltas vão pro ranking (/api/cyber/corrida).
 * `parciais` = o tempo de corrida em cada portão (pra comparar com a melhor corrida: `delta`).
 */
import type { P3, Pista } from "./pistas";

export type FaseCorrida = "contagem" | "correndo" | "fim";
export type Corrida = {
  pista: string; fase: FaseCorrida;
  /** segundos desde o começo da contagem */
  t: number;
  /** a volta atual (0 = a 1ª) e o índice do PRÓXIMO portão (0 = a linha de chegada da volta) */
  volta: number; proximo: number;
  /** tempo de corrida (s, depois da largada) em que cada volta fechou, e em cada portão cruzado (na ordem) */
  voltas: number[]; parciais: number[];
  /** tempo total (s) — só no fim */
  total: number | null;
};
export type EventoCorrida =
  | { tipo: "contagem"; n: number } | { tipo: "largou" }
  | { tipo: "portao"; i: number; tempo: number; delta: number | null } | { tipo: "boost"; i: number }
  | { tipo: "volta"; n: number; tempo: number; delta: number | null } | { tipo: "fim"; total: number; voltas: number[] };

export const CONTAGEM = 3;
/** tolerância do anel (× o raio): a moto é larga e vem rápido */
const FOLGA = 1.15;

export const novaCorrida = (pista: Pista): Corrida => ({ pista: pista.id, fase: "contagem", t: 0, volta: 0, proximo: 1, voltas: [], parciais: [], total: null });
/** o tempo de corrida (s, a partir da largada) */
export const tempoDeCorrida = (c: Corrida) => (c.total ?? Math.max(0, c.t - CONTAGEM));

/** o segmento `de → para` cruzou o portão (no sentido dele, dentro do anel)? */
export function cruzou(g: { x: number; y: number; z: number; rumo: number; r: number }, de: P3, para: P3): boolean {
  const nx = Math.sin(g.rumo), nz = Math.cos(g.rumo);
  const d0 = (de.x - g.x) * nx + (de.z - g.z) * nz, d1 = (para.x - g.x) * nx + (para.z - g.z) * nz;
  if (!(d0 < 0 && d1 >= 0)) return false;   // só de trás pra frente
  const u = d0 / (d0 - d1), px = de.x + (para.x - de.x) * u, py = de.y + (para.y - de.y) * u, pz = de.z + (para.z - de.z) * u;
  return Math.hypot(px - g.x, py - g.y, pz - g.z) <= g.r * FOLGA;
}

/** um passo: o relógio + o portão cruzado entre `de` e `para` (a posição da moto no quadro anterior e no atual).
 *  `melhor` = as parciais da melhor corrida nessa pista (pro `delta`: < 0 = mais rápido que ela) */
export function passoCorrida(c: Corrida, pista: Pista, de: P3, para: P3, dt: number, melhor?: readonly number[] | null): { c: Corrida; eventos: EventoCorrida[] } {
  if (c.fase === "fim") return { c, eventos: [] };
  const ev: EventoCorrida[] = [], t = c.t + dt;
  let n = { ...c, t };
  if (c.fase === "contagem") {
    for (const k of [0, 1, 2]) if (c.t <= k && t > k) ev.push({ tipo: "contagem", n: CONTAGEM - k });
    if (t >= CONTAGEM) { n = { ...n, fase: "correndo" }; ev.push({ tipo: "largou" }); }
    return { c: n, eventos: ev };
  }
  const g = pista.portoes[c.proximo]!;
  if (!cruzou(g, de, para)) return { c: n, eventos: ev };
  const tempo = tempoDeCorrida(n), k = n.parciais.length, delta = melhor && melhor[k] !== undefined ? tempo - melhor[k]! : null;
  n = { ...n, parciais: [...n.parciais, tempo] };
  if (g.tipo === "boost") ev.push({ tipo: "boost", i: g.i });
  if (c.proximo !== 0) {   // um portão do meio
    ev.push({ tipo: "portao", i: g.i, tempo, delta });
    n.proximo = (c.proximo + 1) % pista.portoes.length;
    return { c: n, eventos: ev };
  }
  // a LARGADA: fecha a volta
  const tVolta = tempo - (n.voltas.length ? n.voltas.reduce((a, b) => a + b, 0) : 0);
  n.voltas = [...n.voltas, tVolta];
  ev.push({ tipo: "volta", n: n.voltas.length, tempo: tVolta, delta });
  if (n.voltas.length >= pista.voltas) { n.fase = "fim"; n.total = tempo; ev.push({ tipo: "fim", total: tempo, voltas: n.voltas }); return { c: n, eventos: ev }; }
  n.volta = n.voltas.length; n.proximo = 1;
  return { c: n, eventos: ev };
}

/** o MÍNIMO plausível de uma corrida (s): a pista toda no limite do boost (o tanque não dura a corrida toda, então
 *  ninguém chega nisso) — o servidor recusa tempos abaixo dele */
export function tempoMinimo(pista: Pista, velMax: number): number { return (pista.comprimento * pista.voltas) / velMax; }

/** formata segundos como "1:23.456" */
export function formatarTempo(s: number): string {
  const neg = s < 0, a = Math.abs(s), m = Math.floor(a / 60), r = a - m * 60;
  return `${neg ? "-" : ""}${m}:${r.toFixed(3).padStart(6, "0")}`;
}
