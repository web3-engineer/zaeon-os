/**
 * Cyberespaço — LEVEL DESIGN das bases de estudo (HANDOFF lounge cósmico §2 e §5.4). PURO, sem three.
 * Uma base por pessoa, privada, FIXA e canônica: a posição só depende da ORDEM do membro na sala
 * (`members[]` do CollabDoc só cresce), então é a mesma pra todo mundo, em toda sessão, e a base
 * continua no mapa mesmo quando a pessoa sai. Bases ficam num anel em volta da praça: próximas, mas espaçadas.
 */
export const BASE_COLLIDER_R = 1.5;   // raio sólido (plano XZ): plataforma + mesa
export const BASE_INTERACT_R = 3.4;   // raio de ativação do estudo + clique no monitor
export const BASE_PLATAFORMA_R = 3.4; // plataforma visível
export const PRACA_R = 9;             // raio do anel de bases em torno da praça (origem)
export const BASES_POR_ANEL = 5;      // = LIMITE_SALA
const ESPACO_ENTRE_ANEIS = 9;
/** Direção da base canônica do protótipo (6, -3). */
const ANG0 = Math.atan2(-3, 6);

export type LayoutBase = { x: number; z: number; rot: number };

/** `rot` deixa o +z local apontando pra praça (o monitor fica nas costas de quem entra). */
export function posicaoDaBase(indice: number): LayoutBase {
  const i = Math.max(0, Math.floor(indice));
  const anel = Math.floor(i / BASES_POR_ANEL), k = i % BASES_POR_ANEL;
  const r = PRACA_R + anel * ESPACO_ENTRE_ANEIS;
  const ang = ANG0 + k * ((2 * Math.PI) / BASES_POR_ANEL) + anel * (Math.PI / BASES_POR_ANEL);
  const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
  return { x, z, rot: Math.atan2(-x, -z) };
}

/** userId → layout, pela ordem dos membros (sem repetidos). */
export function basesDosMembros(ids: string[]): Map<string, LayoutBase> {
  const m = new Map<string, LayoutBase>();
  for (const id of ids) if (!m.has(id)) m.set(id, posicaoDaBase(m.size));
  return m;
}

/** Onde a pessoa nasce no cyberespaço: no caminho entre a praça e a própria base. */
export function spawnDaBase(b: LayoutBase | undefined): { x: number; z: number } {
  return b ? { x: b.x * 0.45, z: b.z * 0.45 } : { x: 0, z: 0 };
}

/** Pontos locais da base (mesa/tela/cadeira) → mundo. */
export function localParaMundo(b: LayoutBase, lx: number, lz: number): { x: number; z: number } {
  const c = Math.cos(b.rot), s = Math.sin(b.rot);
  return { x: b.x + lx * c + lz * s, z: b.z - lx * s + lz * c };
}
