/**
 * Cyberespaço — a ARENA PvP (PURO): a antiga PRAÇA inteira virou arena (out/2026 — as bases foram pra Zaeon,
 * lib/cyber/bases). Aqui: onde ela começa e termina, os PILARES da borda, os BONECOS DE TREINO (pra testar golpes e
 * esquivas sozinho — um deles ataca de volta, com aviso) e onde se RENASCE depois de cair.
 * A praça continua sendo a mesma ilha (lib/cyber/praca: chão, borda, o buraco negro de chegada).
 */
import { PRACA, PORTAL_PRACA } from "./praca";

export const ARENA = { x: PRACA.x, z: PRACA.z, r: PRACA.r - 3, y: PRACA.y } as const;
/** está dentro da arena (no chão da praça, longe da borda)? */
export const naArena = (p: { x: number; z: number }) => Math.hypot(p.x - ARENA.x, p.z - ARENA.z) <= ARENA.r;

/** os PILARES de energia na borda (8, a cada 45°, deixando livre o lado do buraco negro) */
export const PILARES_ARENA = Array.from({ length: 8 }, (_, k) => { const a = (k / 8) * Math.PI * 2 + Math.PI / 8, r = ARENA.r - 1.5; return { x: ARENA.x + Math.cos(a) * r, z: ARENA.z + Math.sin(a) * r, r: 1.2 }; })
  .filter((p) => Math.hypot(p.x - PORTAL_PRACA.x, p.z - PORTAL_PRACA.z) > 9);

/** os BONECOS DE TREINO: hologramas que apanham (mostram o dano) — o "sparring" ataca quem chega perto (o golpe vem
 *  com um AVISO vermelho de `aviso` s: dá pra desviar no dash) */
export type Boneco = { id: string; x: number; z: number; rumo: number; sparring: boolean };
export const BONECOS: readonly Boneco[] = [
  { id: "boneco-1", x: -9, z: 6, rumo: Math.PI * 0.75, sparring: false },
  { id: "boneco-2", x: 9, z: 6, rumo: -Math.PI * 0.75, sparring: false },
  { id: "boneco-3", x: 0, z: 13, rumo: Math.PI, sparring: false },
  { id: "sparring", x: 0, z: -10, rumo: 0, sparring: true },
];
export const SPARRING = { alcance: 3.2, aviso: 0.6, intervalo: 2.4, dano: 10, empurra: 5 } as const;

/** onde se RENASCE na arena (depois de cair): na borda, do lado oposto de quem derrubou (ou num ponto fixo) */
export function pontoDeRenascer(de: { x: number; z: number } | null): { x: number; z: number; rumo: number } {
  const a = de ? Math.atan2(-(de.z - ARENA.z), -(de.x - ARENA.x)) : Math.PI / 2, r = ARENA.r - 8;
  const x = ARENA.x + Math.cos(a) * r, z = ARENA.z + Math.sin(a) * r;
  return { x, z, rumo: Math.atan2(ARENA.x - x, ARENA.z - z) };
}
