/**
 * construcaoIso — UMA estrutura 3D isométrica (kit do anatomy, lib/anatomy/iso-kit) que se CONSTRÓI peça a peça: do
 * alicerce até uma pequena estação solar (base → estrutura → deck → gabinete → bateria → engrenagem → mastro + placa
 * solar → antena). Todas as peças compartilham a MESMA projeção, então cada uma nasce no seu lugar final — a cena
 * "cresce" conforme as peças aparecem. Puro (sem DOM). Quem revela cada peça pelo progresso é a TimelineIdeia.
 *
 * Cada peça é um <g class="ci-part" data-at="<0..1>"> com a cor da sua etapa nas variáveis --anatomy-*.
 */
import {
  slabOf, cylinder, extrude, solidSvg, lineSvg, lineOnTop, dotsSvg, dotGrid, knurl, ring, iso,
  figureSvg, fitProjection, boxCorners, type Plane, type Projection,
} from "@/lib/anatomy/iso-kit";

const W = 380, H = 380;
const proj: Projection = fitProjection(boxCorners({ x: -24, y: -26, w: 48, d: 50, r: 0 }, 0, 40), W, H, { pad: 20 });

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

/** uma torre em (cx,cy): duas caixas empilhadas (a de cima mais estreita) — as "conversas subindo" */
function torre(cx: number, cy: number): string {
  return solidSvg(slabOf({ x: cx - 3.6, y: cy - 3.6, w: 7.2, d: 7.2, r: 1 }, 2, 7.4, proj), { tone: "hi" })
    + solidSvg(slabOf({ x: cx - 2.6, y: cy - 2.6, w: 5.2, d: 5.2, r: 1 }, 9.4, 4, proj), { tone: "hi" });
}

// a PASTA (amarela) e o PAPEL (branco) são peças separadas porque têm cores diferentes
const PASTA_CORPO =
  solidSvg(slabOf({ x: -19, y: -19, w: 38, d: 40, r: 2 }, 0, 2, proj), { tone: "hi" })        // corpo da pasta
  + solidSvg(slabOf({ x: 3, y: -23, w: 13, d: 5, r: 1 }, 0, 2, proj), { tone: "hi" });         // aba de índice
const PAPEL =
  solidSvg(slabOf({ x: -13, y: -13, w: 26, d: 30, r: 0.8 }, 2, 0.5, proj), { tone: "hi" })     // a folha
  + [0, 1, 2, 3].map((i) => lineSvg(lineOnTop([-8, -7 + i * 6], [12, -7 + i * 6], 2.5, proj), { tone: "mid" })).join(""); // as linhas

/** tinta da PASTA amarela (faces amarelas, aresta acesa) e do PAPEL branco (faces claras, linhas cinza) */
const AMARELA = "--anatomy-paper:#7a5c10;--anatomy-face:#9c7510;--anatomy-top:#e0ad22;--anatomy-shade-0:#6e5210;--anatomy-shade-1:#8a680f;--anatomy-shade-2:#b88c16;--anatomy-shade-3:#d2a01e;--anatomy-hi:#ffe08a;--anatomy-mid:#dcb23a;--anatomy-lo:#b8902a;--anatomy-lit:#fff3c4;--anatomy-dot:#ffe08a;--anatomy-weight:1px";
const BRANCA = "--anatomy-paper:#e9edf2;--anatomy-face:#dde3ea;--anatomy-top:#f8fafc;--anatomy-shade-0:#c6cdd7;--anatomy-shade-1:#d4dbe3;--anatomy-shade-2:#dde3ea;--anatomy-shade-3:#e9edf2;--anatomy-hi:#64748b;--anatomy-mid:#94a3b8;--anatomy-lo:#cbd5e1;--anatomy-lit:#334155;--anatomy-dot:#64748b;--anatomy-weight:0.8px";

type Peca = { at: number; cor: string; corpo: string; estilo?: string };
const PECAS: readonly Peca[] = [
  // 01 — papel científico: a PASTA amarela e um PAPEL branco (de verdade) em cima
  { at: 0.00, cor: "#f5c542", estilo: AMARELA, corpo: PASTA_CORPO },
  { at: 0.04, cor: "#ffffff", estilo: BRANCA, corpo: PAPEL },
  // 02 — conversas com as IAs: TORRES subindo
  { at: 0.20, cor: "#46b0ff", corpo: [[-14, -14], [14, -14], [-14, 14], [14, 14]].map(([x, y]) => torre(x, y)).join("") },
  // 03 — blueprint: o deck (plataforma) sobre as torres
  { at: 0.42, cor: "#38f0ff", corpo: solidSvg(slabOf({ x: -18, y: -18, w: 36, d: 36, r: 2 }, 13.4, 2, proj), { tone: "hi" }) },
  // 03 — blueprint: o gabinete com "tela" de pontos
  { at: 0.50, cor: "#38f0ff", corpo: solidSvg(slabOf({ x: -12, y: -12, w: 20, d: 18, r: 2 }, 15.4, 9, proj), { tone: "hi" }) + dotsSvg(dotGrid(-8, -8, 5, 4, 3, 24.4, proj), { tone: "mid", size: 0.6 }) },
  // 04 — protótipo e testes (ROXO): bateria 18650
  { at: 0.62, cor: "#8b5cf6", corpo: solidSvg(cylinder(15, -6, 4, 15.4, 12, proj, 20), { tone: "hi" }) + solidSvg(cylinder(15, -6, 1.7, 27.4, 1.6, proj, 14), { tone: "hi" }) + lineSvg(knurl(15, -6, 4, 17, 26, 14, proj), { tone: "lo" }) },
  // 04 — protótipo e testes (ROXO): engrenagem no deck
  { at: 0.70, cor: "#8b5cf6", corpo: engrenagem(-13, 12, 15.4, 3) },
  // 05 — no mundo real (azul ciano): mastro + placa solar
  { at: 0.84, cor: "#22d3ee", corpo: solidSvg(cylinder(-7, -7, 1.1, 24.4, 6, proj, 12), { tone: "mid" }) + solidSvg(cylinder(4, 2, 1.1, 24.4, 6, proj, 12), { tone: "mid" }) + solidSvg(slabOf({ x: -15, y: -13, w: 28, d: 22, r: 1 }, 30.4, 1.3, proj), { tone: "hi" }) + dotsSvg(dotGrid(-11, -9, 6, 4, 4.2, 31.7, proj), { tone: "faint", size: 0.55 }) },
  // 05 — no mundo real: antena + luz
  { at: 0.94, cor: "#22d3ee", corpo: solidSvg(cylinder(10, -9, 0.6, 24.4, 8, proj, 10), { tone: "hi" }) + dotsSvg([iso([10, -9, 32.4], proj)], { tone: "hi", size: 1.4, pulse: true }) },
];

const body = PECAS.map((p) => `<g class="ci-part" data-at="${p.at}" style="${p.estilo ?? tint(p.cor)}">${p.corpo}</g>`).join("");

export const CONSTRUCAO_SVG = figureSvg({ width: W, height: H, label: "Uma ideia virando produto: a estrutura se constrói do alicerce à estação solar conforme o progresso avança", body, standalone: false, className: "ci-fig" });
export const CONSTRUCAO_PASSOS = PECAS.map((p) => p.at);
