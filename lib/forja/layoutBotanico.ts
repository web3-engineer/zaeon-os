/**
 * lib/forja/layoutBotanico.ts — motor MODULAR da Árvore da Vida. Recebe a base de conhecimento
 * (ArvoreEntendimento) e devolve as "casas" (posições de repouso, simétricas e determinísticas) de cada
 * elemento: a semente na raiz (início da jornada), o tronco, as raízes espelhadas, os ramos (módulos) na
 * copa e as folhas (símbolos) nas pontas, dentro de um anel. Puro e determinístico — escala pra árvores de
 * vários tamanhos/complexidades (a geometria deriva da quantidade de módulos/folhas). A CursoArvoreView
 * consome as casas e adiciona o movimento (balanço fluido, mola, arraste) e o fluxo pulsante.
 */
import type { ArvoreEntendimento, NoEntendimento } from "./tipos";

export const CANVAS = { w: 1040, h: 760 };
const GEO = { cx: CANVAS.w / 2, baseY: 628, anchorY: 410, copaY: 282 };
const R_ANEL = 330;

const d2r = (d: number) => (d * Math.PI) / 180;

export type Folha = { id: string; titulo: string; hx: number; hy: number };
export type Ramo = { id: string; titulo: string; hx: number; hy: number; folhas: Folha[] };
export type Raiz = { d: string };
export type LayoutBotanico = {
  centro: { x: number; y: number }; rAnel: number;
  semente: { id: string; titulo: string; x: number; y: number };
  anchor: { x: number; y: number };
  troncoPath: string;
  ramos: Ramo[];
  raizes: Raiz[];
};

/** Monta as casas simétricas da Árvore da Vida a partir da base de conhecimento. PURA. */
export function layoutBotanico(arvore: ArvoreEntendimento): LayoutBotanico {
  const modulos = (arvore.raiz.filhos ?? []).slice(0, 10);
  const n = Math.max(1, modulos.length);
  const anchor = { x: GEO.cx, y: GEO.anchorY };

  // geometria derivada do tamanho: copa mais larga e módulos mais próximos quando há muitos
  const half = Math.min(104, 52 + n * 8);
  const rCopa = Math.min(250, 150 + n * 14);

  const ramos: Ramo[] = modulos.map((m: NoEntendimento, i) => {
    const f = n > 1 ? i / (n - 1) : 0.5;
    const ang = d2r(-half + f * 2 * half);              // 0 = para cima
    const dir = { x: Math.sin(ang), y: -Math.cos(ang) };
    const perp = { x: Math.cos(ang), y: Math.sin(ang) };
    const hx = GEO.cx + rCopa * dir.x;
    const hy = GEO.copaY + rCopa * 0.86 * dir.y;
    const folhasNos = (m.filhos ?? []).slice(0, 4);
    const k = Math.max(1, folhasNos.length);
    const folhas: Folha[] = folhasNos.map((s, j) => {
      const across = (j - (k - 1) / 2) * 34, along = 42;
      return { id: s.id, titulo: s.titulo, hx: hx + dir.x * along + perp.x * across, hy: hy + dir.y * along + perp.y * across };
    });
    return { id: m.id, titulo: m.titulo, hx, hy, folhas };
  });

  // raízes SIMÉTRICAS (pares espelhados) + raiz central
  const raizes: Raiz[] = [];
  for (let i = 1; i <= 3; i++) {
    const ext = 28 + i * 30, prof = 70 + i * 14;
    for (const lado of [-1, 1] as const) {
      const rx = GEO.cx + lado * ext, ry = GEO.baseY + prof;
      raizes.push({ d: `M ${GEO.cx} ${GEO.baseY} C ${GEO.cx + lado * 8} ${GEO.baseY + 32} ${rx - lado * 16} ${ry - 24} ${rx} ${ry}` });
    }
  }
  raizes.push({ d: `M ${GEO.cx} ${GEO.baseY} L ${GEO.cx} ${GEO.baseY + 108}` });

  return {
    centro: { x: GEO.cx, y: 372 }, rAnel: R_ANEL,
    semente: { id: arvore.raiz.id, titulo: arvore.raiz.titulo, x: GEO.cx, y: GEO.baseY },
    anchor,
    troncoPath: `M ${GEO.cx} ${GEO.baseY} Q ${GEO.cx + 10} ${(GEO.baseY + anchor.y) / 2} ${anchor.x} ${anchor.y}`,
    ramos,
    raizes,
  };
}
