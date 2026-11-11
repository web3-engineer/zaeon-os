/**
 * iconesIso — os ícones 3D (isométricos) das etapas da TimelineIdeia, desenhados com o kit do anatomy
 * (lib/anatomy/iso-kit): sólidos sombreados (slab, cilindro, extrude), em string SVG. Puro, sem DOM. As cores vêm por
 * fora (as variáveis --anatomy-* que a TimelineIdeia sobrescreve por etapa), então aqui é só a FORMA.
 *
 * Papel científico · Conversa com as IAs · Blueprint · Protótipo · Produto no mundo real (placa solar + bateria).
 */
import {
  slabOf, cylinder, extrude, solidSvg, lineSvg, lineOnTop, dotsSvg, dotGrid, knurl, ring,
  figureSvg, fitProjection, boxCorners, type Plan, type Plane, type Projection,
} from "@/lib/anatomy/iso-kit";

const W = 152, H = 142;

function mk(label: string, caixa: Plan, z0: number, z1: number, desenho: (p: Projection) => string): string {
  const proj = fitProjection(boxCorners(caixa, z0, z1), W, H, { pad: 16 });
  return figureSvg({ width: W, height: H, label, body: desenho(proj), standalone: false, className: "tli-fig" });
}

/** 01 — pilha de folhas (papel científico), com linhas na de cima */
const papel = mk("Papel científico", { x: -22, y: -28, w: 48, d: 58, r: 3 }, 0, 4, (p) => {
  const parts: string[] = [];
  for (let k = 0; k < 3; k++) parts.push(solidSvg(slabOf({ x: -20 + k * 3, y: -26 + k * 2.4, w: 40, d: 52, r: 3 }, k * 1.0, 0.7, p), { tone: "hi" }));
  const tz = 2 * 1.0 + 0.7;
  for (let i = 0; i < 5; i++) parts.push(lineSvg(lineOnTop([-8, -14 + i * 7], [22, -14 + i * 7], tz, p), { tone: "mid" }));
  return parts.join("");
});

/** 02 — duas cartas de conversa flutuando em alturas diferentes, com "texto" em pontos */
const chat = mk("Conversa com as IAs", { x: -24, y: -18, w: 50, d: 42, r: 4 }, 0, 10, (p) => {
  const parts: string[] = [];
  parts.push(solidSvg(slabOf({ x: -22, y: -14, w: 30, d: 22, r: 5 }, 0, 2.2, p), { tone: "hi" }));
  parts.push(solidSvg(slabOf({ x: -6, y: 2, w: 28, d: 20, r: 5 }, 7, 2.2, p), { tone: "hi" }));
  parts.push(dotsSvg(dotGrid(-18, -10, 5, 3, 5, 2.2, p), { tone: "mid", size: 0.75 }));
  parts.push(dotsSvg(dotGrid(-2, 6, 5, 3, 5, 9.2, p), { tone: "mid", size: 0.75 }));
  return parts.join("");
});

/** 03 — folha de blueprint (grade de pontos) com um cubo nascendo em cima (a ideia tomando forma) */
const blueprint = mk("Blueprint", { x: -28, y: -22, w: 56, d: 44, r: 1 }, 0, 12, (p) => {
  const parts: string[] = [];
  parts.push(solidSvg(slabOf({ x: -26, y: -20, w: 52, d: 40, r: 1 }, 0, 0.6, p), { tone: "mid", crease: "faint" }));
  parts.push(dotsSvg(dotGrid(-22, -16, 9, 6, 5, 0.6, p), { tone: "faint", size: 0.5 }));
  parts.push(solidSvg(slabOf({ x: -7, y: -7, w: 16, d: 16, r: 1 }, 0.6, 11, p), { tone: "hi" }));
  return parts.join("");
});

/** 04 — engrenagem 3D de verdade (anel dentado extrudado) + cubo central + furo */
const gear = mk("Protótipo e testes", { x: -17, y: -17, w: 34, d: 34, r: 0 }, 0, 7, (p) => {
  const teeth = 10, Ro = 15, Ri = 11.5;
  const anel: Plane[] = [];
  for (let i = 0; i < teeth * 2; i++) { const a = (i / (teeth * 2)) * Math.PI * 2, r = i % 2 ? Ri : Ro; anel.push([Math.cos(a) * r, Math.sin(a) * r]); }
  const parts: string[] = [];
  parts.push(solidSvg(extrude(anel, 0, 5, p, { convex: false }), { tone: "hi" }));
  parts.push(solidSvg(cylinder(0, 0, 4.6, 5, 1.4, p, 22), { tone: "hi" }));
  parts.push(lineSvg(ring(0, 0, 2.3, 6.4, p, 22), { tone: "lo" }));
  return parts.join("");
});

/** 05 — o produto: placa solar sobre pés + bateria 18650, lado a lado */
const produto = mk("No mundo real", { x: -30, y: -16, w: 58, d: 34, r: 0 }, 0, 22, (p) => {
  const bx = 16, by = 2;
  const parts: string[] = [];
  // bateria
  parts.push(solidSvg(cylinder(bx, by, 6, 0, 20, p, 22), { tone: "hi" }));
  parts.push(solidSvg(cylinder(bx, by, 2.6, 20, 2, p, 16), { tone: "hi" }));
  parts.push(lineSvg(knurl(bx, by, 6, 2.5, 17.5, 16, p), { tone: "lo" }));
  parts.push(lineSvg(ring(bx, by, 6, 13, p, 24), { tone: "mid" }));
  // placa solar sobre dois pés
  parts.push(solidSvg(cylinder(-22, -8, 1.4, 0, 11, p, 12), { tone: "mid" }));
  parts.push(solidSvg(cylinder(-8, 4, 1.4, 0, 11, p, 12), { tone: "mid" }));
  parts.push(solidSvg(slabOf({ x: -28, y: -12, w: 24, d: 20, r: 1 }, 11, 1.2, p), { tone: "hi" }));
  parts.push(dotsSvg(dotGrid(-24, -8, 4, 3, 5, 12.2, p), { tone: "faint", size: 0.6 }));
  return parts.join("");
});

export const ICONES_ISO: readonly string[] = [papel, chat, blueprint, gear, produto];
