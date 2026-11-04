/**
 * Cyberespaço — as NAVES COWORKING por REGIÃO (PURO): uma nave (lib/cyber/naveCoworking) pra cada região real
 * (lib/cyber/regiaoUsuario), cada uma estacionada no seu ponto do espaço, longe de tudo — cada uma é um NÍVEL próprio
 * (lib/cyber/nivelAtivo): quem está numa nave só vê quem está nela. Todo mundo que não é novato começa na nave da sua
 * região; o portal da popa leva pra central da Zaeon.
 *
 * Aqui: onde cada nave fica, de que nave é um ponto, o PISO (os dois andares + a escada em caracol) e a COLISÃO (o
 * casco, as divisórias, os móveis, o guarda-corpo do terraço, as paredes do lounge com a porta, o vão da escada).
 * A nave não gira: local = mundo − a origem da nave.
 */
import type { P2 } from "./colisao";
import { CIDADE } from "./ceu";
import { ANDAR2, ESCADA_CW, NAVE_COWORK, contornoDoCasco, contornoDoLounge, moveisDaNave, moveisDoAndar2, noCasco, paredesDaNave } from "./naveCoworking";
import { REGIOES, type Regiao } from "./regiaoUsuario";
import { empurrarDasParedes, empurrarDosRetangulos, type Parede } from "./universidade";

/** a distância (m) das naves até o centro da Zaeon e a altura delas acima do piso da cidade */
const RAIO = 2600, ACIMA = 260;
/** a origem de cada nave no mundo (o piso do 1º andar): em leque em volta da Zaeon, uma a cada 60° */
export const NAVES: Record<Regiao, { x: number; y: number; z: number }> = Object.fromEntries(REGIOES.map((r, i) => {
  const a = Math.PI / 6 + (i / REGIOES.length) * Math.PI * 2;
  return [r, { x: CIDADE.centro.x + Math.cos(a) * RAIO, y: CIDADE.pisoY + ACIMA, z: CIDADE.centro.z + Math.sin(a) * RAIO }];
})) as Record<Regiao, { x: number; y: number; z: number }>;

/** o id do nível de uma nave e a região de um id de nível */
export type IdNivelNave = `nave-${Regiao}`;
export const nivelDaNave = (r: Regiao): IdNivelNave => `nave-${r}`;
export const IDS_NIVEIS_NAVE: readonly IdNivelNave[] = REGIOES.map(nivelDaNave);
export const regiaoDoNivel = (id: string | null | undefined): Regiao | null => (id && id.startsWith("nave-") && (REGIOES as readonly string[]).includes(id.slice(5)) ? (id.slice(5) as Regiao) : null);

export const paraLocal = (r: Regiao, p: P2): P2 => ({ x: p.x - NAVES[r].x, z: p.z - NAVES[r].z });
export const paraMundo = (r: Regiao, p: P2): P2 => ({ x: p.x + NAVES[r].x, z: p.z + NAVES[r].z });

/** a nave de um ponto do mundo (dentro da caixa dela, do fundo da quilha ao alto do 2º andar), ou null */
export function naveDoPonto(p: P2, y: number): Regiao | null {
  for (const r of REGIOES) { const n = NAVES[r], lx = p.x - n.x, lz = p.z - n.z;
    if (Math.abs(lx) < NAVE_COWORK.a + 30 && Math.abs(lz) < NAVE_COWORK.b + 40 && y > n.y - 30 && y < n.y + 40) return r; }
  return null;
}

/** onde se nasce na nave (o anel do átrio), no mundo, e pra onde se olha */
export const chegadaDaNave = (r: Regiao) => { const c = NAVE_COWORK.chegada; return { ...paraMundo(r, c), y: NAVES[r].y, rumo: c.rumo }; };
/** o anel do portal da popa, no mundo */
export const portalDaNave = (r: Regiao) => ({ ...paraMundo(r, NAVE_COWORK.portal), y: NAVES[r].y, r: NAVE_COWORK.portal.r });
/** pisou no anel do portal? (local, no 1º andar) */
export const noPortalDaNave = (l: P2, yRel: number) => yRel < 1.5 && Math.hypot(l.x - NAVE_COWORK.portal.x, l.z - NAVE_COWORK.portal.z) < NAVE_COWORK.portal.r;

// ── o PISO ──
const E = ESCADA_CW;
/** a altura da escada no ponto (local), a volta mais perto de `yRel` — ou null fora do vão dela */
export function alturaNaEscada(l: P2, yRel: number): number | null {
  const dx = l.x - E.cx, dz = l.z - E.cz, r = Math.hypot(dx, dz);
  if (r < E.rIn || r > E.rOut + 0.05) return null;
  const a = Math.atan2(dx, dz), base = ((a - E.a0) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
  let melhor: number | null = null;
  for (let esc = base; esc <= E.giro + 1e-6; esc += Math.PI * 2) { const y = (esc / E.giro) * ANDAR2.y; if (melhor === null || Math.abs(y - yRel) < Math.abs(melhor - yRel)) melhor = y; }
  return melhor;
}
/** o piso (y local) debaixo do ponto: a escada (se se está nela), o 2º andar (o lounge e o terraço, pra quem está lá
 *  em cima) ou o 1º; fora do casco, null (o vazio) */
export function pisoNaNave(l: P2, yRel: number): number | null {
  const esc = alturaNaEscada(l, yRel);
  if (esc !== null && esc <= yRel + 0.55) return esc;   // (degrau de até ~0,5 m: sobe andando)
  const dentro = Math.abs(l.x / (NAVE_COWORK.a * 1.04)) ** NAVE_COWORK.n + Math.abs(l.z / (NAVE_COWORK.b * 1.04)) ** NAVE_COWORK.n <= 1;
  if (!dentro) return null;
  if (yRel > ANDAR2.y - 1.2) return Math.hypot(l.x - E.cx, l.z - E.cz) < E.rOut + 0.15 ? (esc ?? 0) : ANDAR2.y;   // (o vão da escada lá em cima: cai nela)
  return 0;
}

// ── a COLISÃO ──
const anelDeParedes = (pts: P2[], alt: number, esp: number, pular?: (a: P2, b: P2) => boolean): Parede[] =>
  pts.flatMap((a, i) => { const b = pts[(i + 1) % pts.length]!; return pular?.(a, b) ? [] : [{ ax: a.x, az: a.z, bx: b.x, bz: b.z, esp, alt }]; });
let cache: { andar1: Parede[]; andar2: Parede[] } | null = null;
function paredes() {
  if (cache) return cache;
  const casco = contornoDoCasco(96, 0.15), porta = (a: P2, b: P2) => a.z > ANDAR2.z + ANDAR2.b * 0.6 && b.z > ANDAR2.z + ANDAR2.b * 0.6 && Math.abs((a.x + b.x) / 2) < ANDAR2.porta.meia;
  const vao = Array.from({ length: 24 }, (_, k) => { const a = (k / 24) * Math.PI * 2; return { x: E.cx + Math.sin(a) * (E.rOut + 0.15), z: E.cz + Math.cos(a) * (E.rOut + 0.15) }; });
  cache = {
    andar1: [...anelDeParedes(casco, 9, 0.3), ...paredesDaNave()],
    andar2: [...anelDeParedes(contornoDoCasco(96, 0.5), 9, 0.2), ...anelDeParedes(contornoDoLounge(64), 9, 0.2, porta),
      ...anelDeParedes(vao, 9, 0.12, (a, b) => Math.abs(Math.atan2((a.x + b.x) / 2 - E.cx, (a.z + b.z) / 2 - E.cz)) < 0.55)],   // (o anel do vão aberto pra proa: onde a escada chega)
  };
  return cache;
}
/** traz pra dentro do casco (com folga `m`) um ponto que escapou dele — na reta até o meio da nave */
function dentroDoCasco(p: P2, m: number): P2 {
  if (noCasco(p.x, p.z, m)) return p;
  let lo = 0, hi = 1; for (let k = 0; k < 18; k++) { const s = (lo + hi) / 2; if (noCasco(p.x * s, p.z * s, m)) lo = s; else hi = s; }
  return { x: p.x * lo, z: p.z * lo };
}
/** empurra o ponto (local) pra fora do que é sólido no andar em que se está (`yRel` = a altura dos pés) */
export function resolverNaNave(l0: P2, yRel: number, raio = 0.4): P2 {
  const l = dentroDoCasco(l0, yRel > ANDAR2.y - 1.2 ? 0.5 + raio : 0.15 + raio);
  const naEscada = alturaNaEscada(l, yRel) !== null && yRel > 0.3 && yRel < ANDAR2.y - 0.3;
  if (naEscada) { const dx = l.x - E.cx, dz = l.z - E.cz, r = Math.hypot(dx, dz) || 1, rr = Math.min(Math.max(r, E.rIn + raio * 0.6), E.rOut - 0.1); return { x: E.cx + (dx / r) * rr, z: E.cz + (dz / r) * rr }; }
  const p = paredes();
  if (yRel > ANDAR2.y - 1.2) return empurrarDosRetangulos(empurrarDasParedes(l, p.andar2, raio), moveisDoAndar2(), raio);
  // (no 1º andar, a coluna da escada é sólida; e os degraus mais baixos que a cabeça, fora do pé dela, também — só
  //  se entra na escada pelo começo, onde o degrau é baixo)
  let q = empurrarDosRetangulos(empurrarDasParedes(l, p.andar1, raio), moveisDaNave(), raio);
  const dx = q.x - E.cx, dz = q.z - E.cz, d = Math.hypot(dx, dz), y = alturaNaEscada(q, yRel);
  const min = y !== null && y > yRel + 0.55 && y < yRel + 2 ? E.rOut + raio : E.rIn + raio;
  if (d < min) q = d > 1e-6 ? { x: E.cx + (dx / d) * min, z: E.cz + (dz / d) * min } : { x: E.cx, z: E.cz + min };
  return q;
}
