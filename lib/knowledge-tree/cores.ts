/**
 * lib/knowledge-tree/cores.ts — a cor de um axônio/nó pela ENERGIA (1..5) e pelo estado. PURO.
 *
 *   pendente:  violeta (1) → magenta (3) → rosa-branco (5)
 *   concluído: azul    (1) → ciano   (3) → quase branco (5)
 */
export type RGB = readonly [number, number, number];

export const PENDENTE: readonly RGB[] = [[124, 58, 237], [232, 62, 190], [255, 226, 244]];
export const CONCLUIDO: readonly RGB[] = [[37, 99, 235], [34, 211, 238], [226, 250, 255]];

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** Interpola 3 paradas igualmente espaçadas em e ∈ [1, 5]. */
export function rgbDaEnergia(e: number, paradas: readonly RGB[]): RGB {
  const x = (Math.min(5, Math.max(1, Number.isFinite(e) ? e : 3)) - 1) / 4; // 0..1
  const seg = x <= 0.5 ? 0 : 1;
  const k = seg === 0 ? x / 0.5 : (x - 0.5) / 0.5;
  const a = paradas[seg]!, b = paradas[seg + 1]!;
  return [Math.round(lerp(a[0], b[0], k)), Math.round(lerp(a[1], b[1], k)), Math.round(lerp(a[2], b[2], k))];
}

export const rgbCss = (c: RGB, alfa?: number): string =>
  alfa === undefined ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${alfa})`;

/** A cor do axônio (e do nó) — concluído em azul, pendente em violeta, interpolada pela energia. */
export function corEnergia(e: number, concluida: boolean, alfa?: number): string {
  return rgbCss(rgbDaEnergia(e, concluida ? CONCLUIDO : PENDENTE), alfa);
}

/** Um tom mais claro (o núcleo interno do axônio): mistura com branco. */
export function corNucleo(e: number, concluida: boolean, mistura = 0.55): string {
  const c = rgbDaEnergia(e, concluida ? CONCLUIDO : PENDENTE);
  return rgbCss([Math.round(lerp(c[0], 255, mistura)), Math.round(lerp(c[1], 255, mistura)), Math.round(lerp(c[2], 255, mistura))]);
}
