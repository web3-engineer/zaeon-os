/**
 * Cyberespaço — LEVEL DESIGN das bases de estudo (HANDOFF lounge cósmico §2 e §5.4). PURO, sem three.
 * Uma base por pessoa, privada, FIXA e canônica: a posição só depende da ORDEM do membro na sala
 * (`members[]` do CollabDoc só cresce), então é a mesma pra todo mundo, em toda sessão, e a base
 * continua no mapa mesmo quando a pessoa sai. Com a cidade (Zaeon) na cena, TODAS as bases ficam NA ZAEON (out/2026: a
 * praça virou a ARENA PvP — lib/cyber/arena): os fundadores nos lugares deles e o resto num anel de vagas livres na ilha;
 * sem a cidade (marcos desligados), no anel em volta da praça, como antes.
 */
import { POIS, baseLivreDosPOIs, marcoNav, type POI } from "./landmarks";
import { CIDADE, colisoresDaCidade, escadaEm, mundo } from "./ceu";
import { MIRANTES } from "./terra";
import { PORTAL_PRACA } from "./praca";

export const BASE_COLLIDER_R = 2.4;   // raio sólido (plano XZ): o trono do computador (asas até ±2,4 m)
export const BASE_INTERACT_R = 3.4;   // raio de ativação do estudo + clique no monitor
export const BASE_PLATAFORMA_R = 3.4; // plataforma visível
export const PRACA_R = 9;             // raio do anel de bases em torno da praça (origem)
export const BASES_POR_ANEL = 5;      // = LIMITE_SALA
const ESPACO_ENTRE_ANEIS = 9;
/** Direção da base canônica do protótipo (6, -3). */
const ANG0 = Math.atan2(-3, 6);

/**
 * `nivel`: bases fora da praça — "ceu" = na ZAEON (a ilha no céu; base do dono/fundador) e "qg" = no salão da
 * RECEPÇÃO (o marco andável no piso da Zaeon: a mesa da Zaeon, a anfitriã — lib/cyber/agentes). Sem `nivel` = no anel
 * em volta do centro da PRAÇA (a ilha flutuante das bases, lib/cyber/praca).
 */
export type NivelBase = "ceu" | "qg";
export type LayoutBase = { x: number; z: number; rot: number; nivel?: NivelBase };

/** bases do dono na Zaeon (céu): locais (relativos ao centro da ilha), viradas pro centro; livres da cidadela e da doca da nave */
export const BASES_CEU_LOCAIS: { x: number; z: number }[] = [{ x: 0, z: 60 }, { x: 0, z: -60 }, { x: -60, z: -15 }].map((b) => ({ x: b.x * 1.25, z: b.z * 1.25 }));   // fora da capela (r 45), na Zaeon mega

/** `rot` tal que o +z local da base aponte de (x,z) para o alvo */
const virarPara = (de: { x: number; z: number }, para: { x: number; z: number }) => Math.atan2(para.x - de.x, para.z - de.z);

/** bases no céu (Zaeon), uma por fundador, na ordem */
export function baseNoCeu(i: number): LayoutBase {
  const l = BASES_CEU_LOCAIS[Math.min(i, BASES_CEU_LOCAIS.length - 1)]!, w = mundo(l);
  return { ...w, rot: virarPara(w, CIDADE.centro), nivel: "ceu" };
}
/** a MESA da Recepção: no CENTRO do salão do marco andável, virada pro portão (escada) — é a mesa da anfitriã */
export function baseNoQG(pois: POI[] = POIS): LayoutBase | null {
  const poi = pois.find((p) => p.nav && p.acesso === "dono"), mn = poi ? marcoNav(poi) : null;
  if (!mn) return null;
  const d = mn.nav.escada.dir;
  return { x: mn.x, z: mn.z, rot: Math.atan2(Math.cos(d), Math.sin(d)), nivel: "qg" };
}

/** as VAGAS de base na Zaeon pra quem não é fundador (local da ilha, mundo calculado na hora): anéis entre a capela e
 *  a borda, uma a cada ~16 m, só onde fica LIVRE de tudo — dos sólidos da cidade (com folga), das escadas das salas, do
 *  buraco negro e de onde se chega, das bases dos fundadores e dos MIRANTES (os telões e o lar da Zaeon). Determinístico */
let vagasZaeon: { x: number; z: number }[] | null = null;
export function vagasDeBaseNaZaeon(): { x: number; z: number }[] {
  if (vagasZaeon) return vagasZaeon;
  const cs = colisoresDaCidade(), out: { x: number; z: number }[] = [], pt = CIDADE.portalTunel, ch = CIDADE.chegada;
  for (const r of [112, 134, 156]) {
    const n = Math.floor((2 * Math.PI * r) / 16);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + r * 0.013, l = { x: Math.cos(a) * r, z: Math.sin(a) * r }, w = mundo(l);
      if (cs.some((c) => Math.hypot(w.x - c.x, w.z - c.z) < c.r + BASE_PLATAFORMA_R + 2)) continue;
      if (escadaEm(l, BASE_PLATAFORMA_R + 4)) continue;
      if (Math.hypot(l.x - pt.x, l.z - pt.z) < 14 || Math.hypot(l.x - ch.x, l.z - ch.z) < 10) continue;
      if (BASES_CEU_LOCAIS.some((b) => Math.hypot(l.x - b.x, l.z - b.z) < 14)) continue;
      if (MIRANTES.some((m) => Math.hypot(l.x - m.x, l.z - m.z) < 62)) continue;
      if (out.some((o) => Math.hypot(l.x - o.x, l.z - o.z) < 13)) continue;
      out.push(l);
    }
  }
  return (vagasZaeon = out);
}
/** a base (na Zaeon) da vaga `i`, virada pro centro da ilha (as vagas acabando, volta a repetir — salas enormes) */
export function baseNaZaeon(i: number): LayoutBase {
  const vs = vagasDeBaseNaZaeon(), l = vs[Math.max(0, Math.floor(i)) % vs.length]!, w = mundo(l);
  return { ...w, rot: virarPara(w, CIDADE.centro), nivel: "ceu" };
}

/** `rot` deixa o +z local apontando pra praça (o monitor fica nas costas de quem entra). */
export function posicaoDaBase(indice: number): LayoutBase {
  const i = Math.max(0, Math.floor(indice));
  const anel = Math.floor(i / BASES_POR_ANEL), k = i % BASES_POR_ANEL;
  const r = PRACA_R + anel * ESPACO_ENTRE_ANEIS;
  const ang = ANG0 + k * ((2 * Math.PI) / BASES_POR_ANEL) + anel * (Math.PI / BASES_POR_ANEL);
  const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
  return { x, z, rot: Math.atan2(-x, -z) };
}

/**
 * userId → layout, pela ordem dos membros (sem repetidos). Slots do anel que cairiam DENTRO de um ponto de
 * interesse (ex.: a Zaeon em z=-34, a partir do 14º membro) são pulados — a ordem continua determinística.
 */
export function basesDosMembros(ids: string[], pois: POI[] = POIS, especiais: { ceu?: string[]; /** a cidade está na cena: todo mundo na Zaeon (a praça é a arena) */ todosNaZaeon?: boolean } = {}): Map<string, LayoutBase> {
  const m = new Map<string, LayoutBase>();
  // especiais: os fundadores na Zaeon (céu) — fora do anel. (O salão da Recepção não é mais base de ninguém: a
  // titularidade do Andrei saiu, a base dele é uma base comum no anel da praça.)
  (especiais.ceu ?? []).forEach((id, i) => { if (ids.includes(id) && !m.has(id)) m.set(id, baseNoCeu(i)); });
  let slot = 0;
  if (especiais.todosNaZaeon) { for (const id of ids) if (!m.has(id)) m.set(id, baseNaZaeon(slot++)); return m; }
  for (const id of ids) {
    if (m.has(id)) continue;
    let lay = posicaoDaBase(slot++);
    while (!baseLivreDosPOIs(lay, BASE_PLATAFORMA_R, pois) || Math.hypot(lay.x - PORTAL_PRACA.x, lay.z - PORTAL_PRACA.z) < PORTAL_PRACA.r + BASE_PLATAFORMA_R + 3) lay = posicaoDaBase(slot++);   // nem em cima do buraco negro da praça
    m.set(id, lay);
  }
  return m;
}

/** Onde a pessoa nasce no cyberespaço: no caminho entre o centro da praça e a própria base; fora dela, na frente da base. */
export function spawnDaBase(b: LayoutBase | undefined): { x: number; z: number } {
  if (b?.nivel) return localParaMundo(b, 0, 2.6);
  return b ? { x: b.x * 0.45, z: b.z * 0.45 } : { x: 0, z: 0 };
}

/** Pontos locais da base (mesa/tela/cadeira) → mundo. */
export function localParaMundo(b: LayoutBase, lx: number, lz: number): { x: number; z: number } {
  const c = Math.cos(b.rot), s = Math.sin(b.rot);
  return { x: b.x + lx * c + lz * s, z: b.z - lx * s + lz * c };
}

/** Pose canônica de alguém SENTADO na própria base (seed do avatar remoto antes da 1ª posição chegar). */
export function poseNoAssento(b: LayoutBase): { x: number; z: number; facing: number } {
  const s = localParaMundo(b, 0, -0.15);
  return { x: s.x, z: s.z, facing: b.rot + Math.PI };
}
