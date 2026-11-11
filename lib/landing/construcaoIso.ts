/**
 * construcaoIso — UMA estrutura 3D isométrica (kit do anatomy, lib/anatomy/iso-kit) que se CONSTRÓI peça a peça: do
 * alicerce até uma pequena estação solar (base → estrutura → deck → gabinete → bateria → engrenagem → mastro + placa
 * solar → antena). Todas as peças compartilham a MESMA projeção, então cada uma nasce no seu lugar final — a cena
 * "cresce" conforme as peças aparecem. Puro (sem DOM). Quem revela cada peça pelo progresso é a TimelineIdeia.
 *
 * Cada peça é um <g class="ci-part" data-at="<0..1>"> com a cor da sua etapa nas variáveis --anatomy-*.
 */
import {
  slabOf, cylinder, extrude, solidSvg, lineSvg, dotsSvg, dotGrid, knurl, ring, iso,
  figureSvg, fitProjection, boxCorners, type Plane, type Projection,
} from "@/lib/anatomy/iso-kit";

const W = 380, H = 360;
const proj: Projection = fitProjection(boxCorners({ x: -24, y: -24, w: 48, d: 48, r: 0 }, 0, 34), W, H, { pad: 20 });

/** cada peça vira um volume de VIDRO NEON na cor da etapa: faces translúcidas (topo mais claro), arestas acesas.
 *  O tema escuro do kit é quase preto e some no fundo da landing (também escuro) — por isso tingimos tudo. */
const B = "#06101c";
const tint = (cor: string) =>
  [
    `--anatomy-paper:color-mix(in srgb,${cor} 12%,${B})`,
    `--anatomy-face:color-mix(in srgb,${cor} 18%,${B})`,
    `--anatomy-top:color-mix(in srgb,${cor} 34%,${B})`,
    `--anatomy-shade-0:color-mix(in srgb,${cor} 11%,${B})`,
    `--anatomy-shade-1:color-mix(in srgb,${cor} 16%,${B})`,
    `--anatomy-shade-2:color-mix(in srgb,${cor} 24%,${B})`,
    `--anatomy-shade-3:color-mix(in srgb,${cor} 32%,${B})`,
    `--anatomy-hi:${cor}`,
    `--anatomy-mid:color-mix(in srgb,${cor} 72%,${B})`,
    `--anatomy-lo:color-mix(in srgb,${cor} 48%,${B})`,
    `--anatomy-faint:color-mix(in srgb,${cor} 28%,${B})`,
    `--anatomy-lit:#ffffff`,
    `--anatomy-dot:${cor}`,
    `--anatomy-weight:1px`,
  ].join(";");

/** uma engrenagem 3D centrada em (cx,cy) */
function engrenagem(cx: number, cy: number, z: number, h: number): string {
  const teeth = 9, Ro = 6, Ri = 4.4;
  const anel: Plane[] = [];
  for (let i = 0; i < teeth * 2; i++) { const a = (i / (teeth * 2)) * Math.PI * 2, r = i % 2 ? Ri : Ro; anel.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return solidSvg(extrude(anel, z, h, proj, { convex: false }), { tone: "hi" }) + lineSvg(ring(cx, cy, 1.8, z + h, proj, 18), { tone: "lo" });
}

type Peca = { at: number; cor: string; corpo: string };
const PECAS: readonly Peca[] = [
  // base
  { at: 0.00, cor: "#8b5cf6", corpo: solidSvg(slabOf({ x: -22, y: -22, w: 44, d: 44, r: 3 }, 0, 2.2, proj), { tone: "hi" }) + dotsSvg(dotGrid(-18, -18, 9, 9, 4.5, 2.2, proj), { tone: "faint", size: 0.45 }) },
  // estrutura (4 pilares)
  { at: 0.16, cor: "#6f7bff", corpo: [[-18, -18], [18, -18], [-18, 18], [18, 18]].map(([x, y]) => solidSvg(cylinder(x, y, 1.6, 2.2, 9, proj, 14), { tone: "mid" })).join("") },
  // deck
  { at: 0.30, cor: "#46b0ff", corpo: solidSvg(slabOf({ x: -20, y: -20, w: 40, d: 40, r: 2 }, 11.2, 2, proj), { tone: "hi" }) },
  // gabinete (corpo) com "tela" de pontos
  { at: 0.46, cor: "#38f0ff", corpo: solidSvg(slabOf({ x: -13, y: -13, w: 22, d: 20, r: 2 }, 13.2, 10, proj), { tone: "hi" }) + dotsSvg(dotGrid(-9, -9, 5, 4, 3.4, 23.2, proj), { tone: "mid", size: 0.6 }) },
  // bateria 18650 ao lado
  { at: 0.58, cor: "#49f2a0", corpo: solidSvg(cylinder(16, -7, 4.2, 13.2, 13, proj, 20), { tone: "hi" }) + solidSvg(cylinder(16, -7, 1.8, 26.2, 1.6, proj, 14), { tone: "hi" }) + lineSvg(knurl(16, -7, 4.2, 15, 25, 14, proj), { tone: "lo" }) },
  // engrenagem no deck
  { at: 0.68, cor: "#49f2a0", corpo: engrenagem(-14, 13, 13.2, 3) },
  // mastro + placa solar no topo do gabinete
  { at: 0.82, cor: "#ff9f45", corpo: solidSvg(cylinder(-8, -8, 1.1, 23.2, 7, proj, 12), { tone: "mid" }) + solidSvg(cylinder(4, 2, 1.1, 23.2, 7, proj, 12), { tone: "mid" }) + solidSvg(slabOf({ x: -16, y: -14, w: 30, d: 24, r: 1 }, 30.2, 1.3, proj), { tone: "hi" }) + dotsSvg(dotGrid(-12, -10, 6, 4, 4.5, 31.5, proj), { tone: "faint", size: 0.55 }) },
  // antena + luz
  { at: 0.94, cor: "#ffd36b", corpo: solidSvg(cylinder(11, -10, 0.6, 23.2, 9, proj, 10), { tone: "hi" }) + dotsSvg([iso([11, -10, 32.5], proj)], { tone: "hi", size: 1.4, pulse: true }) },
];

const body = PECAS.map((p) => `<g class="ci-part" data-at="${p.at}" style="${tint(p.cor)}">${p.corpo}</g>`).join("");

export const CONSTRUCAO_SVG = figureSvg({ width: W, height: H, label: "Uma ideia virando produto: a estrutura se constrói do alicerce à estação solar conforme o progresso avança", body, standalone: false, className: "ci-fig" });
export const CONSTRUCAO_PASSOS = PECAS.map((p) => p.at);
