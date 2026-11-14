/**
 * lib/forja/layoutBotanico.ts — transforma a base de conhecimento (ArvoreEntendimento) numa ÁRVORE DA VIDA:
 * simétrica e circular, tronco central, copa radial de ramos que curvam e preenchem o alto, RAÍZES espelhando
 * a copa embaixo, folhas nas pontas, tudo dentro de um anel. Puro e determinístico — a view só desenha e anima.
 *
 * Mapa: raiz da árvore = a semente (base do tronco); filhos nível 1 = ramos (módulos do código), distribuídos
 * simétricos pela copa; filhos nível 2 = folhas (símbolos). O 1º ramo é o "comece por aqui".
 */
import type { ArvoreEntendimento, NoEntendimento } from "./tipos";

export const CANVAS = { w: 1040, h: 760 };
const CX = CANVAS.w / 2;
const CENTRO = { x: CX, y: 392 };
const R_ANEL = 338;
const BASE_Y = 648;            // tronco encontra o solo
const TRONCO_TOPO_Y = 404;     // onde a copa começa
const COPA = { x: CX, y: 286 };
const R_COPA = 226;
const R_RAIZ = 124;

const d2r = (d: number) => (d * Math.PI) / 180;

export type Folha = { id: string; titulo: string; x: number; y: number };
export type Ramo = {
  id: string; titulo: string;
  path: string;          // curva do ramo, do tronco até a ponta
  x: number; y: number;  // a ponta (nó do módulo)
  folhas: Folha[];
};
export type Raiz = { d: string };
export type LayoutBotanico = {
  centro: { x: number; y: number }; rAnel: number;
  semente: { id: string; titulo: string; x: number; y: number };
  troncoPath: string;
  ramos: Ramo[];
  raizes: Raiz[];
};

export function layoutBotanico(arvore: ArvoreEntendimento): LayoutBotanico {
  const modulos = (arvore.raiz.filhos ?? []).slice(0, 8);
  const n = Math.max(1, modulos.length);
  const topo = { x: CX, y: TRONCO_TOPO_Y };
  const meioAngulo = 92; // graus de abertura da copa, simétrico ao redor do "para cima"

  const ramos: Ramo[] = modulos.map((m: NoEntendimento, i) => {
    const f = n > 1 ? i / (n - 1) : 0.5;
    const ang = d2r(-meioAngulo + f * 2 * meioAngulo);  // 0 = para cima
    const dir = { x: Math.sin(ang), y: -Math.cos(ang) };
    const perp = { x: Math.cos(ang), y: Math.sin(ang) };
    const px = COPA.x + R_COPA * dir.x;
    const py = COPA.y + R_COPA * dir.y;

    // curva em S: sobe do tronco e abre até a ponta
    const c1 = { x: topo.x + (px - topo.x) * 0.14, y: topo.y - 76 };
    const c2 = { x: px - (px - topo.x) * 0.16, y: py + 54 };
    const path = `M ${topo.x} ${topo.y} C ${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${px.toFixed(1)} ${py.toFixed(1)}`;

    const folhasNos = (m.filhos ?? []).slice(0, 4);
    const k = Math.max(1, folhasNos.length);
    const folhas: Folha[] = folhasNos.map((s, j) => {
      const along = 46;                          // bem além do nó, pra não colar no rótulo do módulo
      const across = (j - (k - 1) / 2) * 40;
      return {
        id: s.id, titulo: s.titulo,
        x: px + dir.x * along + perp.x * across,
        y: py + dir.y * along + perp.y * across,
      };
    });
    return { id: m.id, titulo: m.titulo, path, x: px, y: py, folhas };
  });

  // raízes: espelham a copa, descendo do tronco pro solo, simétricas
  const nRaiz = Math.min(7, Math.max(5, n + 1));
  const meioRaiz = 68;
  const raizes: Raiz[] = Array.from({ length: nRaiz }, (_, i) => {
    const f = nRaiz > 1 ? i / (nRaiz - 1) : 0.5;
    const a = d2r(-meioRaiz + f * 2 * meioRaiz);
    const dir = { x: Math.sin(a), y: Math.cos(a) };
    const rx = CX + R_RAIZ * dir.x, ry = BASE_Y + R_RAIZ * dir.y;
    const c1 = { x: CX + dir.x * 18, y: BASE_Y + 42 };
    const c2 = { x: rx - dir.x * 30, y: ry - 22 };
    return { d: `M ${CX} ${BASE_Y} C ${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${rx.toFixed(1)} ${ry.toFixed(1)}` };
  });

  return {
    centro: CENTRO, rAnel: R_ANEL,
    semente: { id: arvore.raiz.id, titulo: arvore.raiz.titulo, x: CX, y: BASE_Y },
    troncoPath: `M ${CX} ${BASE_Y} L ${topo.x} ${topo.y}`,
    ramos,
    raizes,
  };
}
