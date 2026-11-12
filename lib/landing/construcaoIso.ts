/**
 * construcaoIso — UMA estrutura 3D isométrica (kit do anatomy, lib/anatomy/iso-kit) que se CONSTRÓI peça a peça: do
 * alicerce até uma pequena estação solar (base → estrutura → deck → gabinete → bateria → engrenagem → mastro + placa
 * solar → antena). Todas as peças compartilham a MESMA projeção, então cada uma nasce no seu lugar final — a cena
 * "cresce" conforme as peças aparecem. Puro (sem DOM). Quem revela cada peça pelo progresso é a TimelineIdeia.
 *
 * Cada peça é um <g class="ci-part" data-at="<0..1>"> com a cor da sua etapa nas variáveis --anatomy-*.
 */
import {
  slabOf, cylinder, extrude, solidSvg, lineSvg, lineOnTop, dotsSvg, dotGrid, knurl, ring, segment, iso,
  figureSvg, fitProjection, boxCorners, type Plane, type Projection,
} from "@/lib/anatomy/iso-kit";

const W = 380, H = 410;
// headroom em cima reserva espaço pro GLOBO (que fica acima do topo da estrutura)
const proj: Projection = fitProjection(boxCorners({ x: -24, y: -26, w: 48, d: 52, r: 0 }, 0, 32), W, H, { pad: 18, headroom: 54 });

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

/** um rótulo branco com contorno escuro num ponto 3D (legível sobre a cena) */
function rotulo(x: number, y: number, z: number, texto: string, size = 6): string {
  const [sx, sy] = iso([x, y, z], proj);
  return `<text x="${sx.toFixed(1)}" y="${sy.toFixed(1)}" text-anchor="middle" font-size="${size}" font-weight="700" font-family="ui-monospace,monospace" paint-order="stroke" stroke="#06101c" stroke-width="2.4" fill="#eafcff">${texto}</text>`;
}

/** uma torre em (cx,cy): duas caixas empilhadas (a de cima mais estreita) — os pilares das "conversas" */
function torre(cx: number, cy: number): string {
  return solidSvg(slabOf({ x: cx - 3.6, y: cy - 3.6, w: 7.2, d: 7.2, r: 1 }, 2, 7.4, proj), { tone: "hi" })
    + solidSvg(slabOf({ x: cx - 2.6, y: cy - 2.6, w: 5.2, d: 5.2, r: 1 }, 9.4, 4, proj), { tone: "hi" });
}

/** um fio de energia/dados que corre (data-flow) entre dois pontos 3D — o que faz a estrutura virar um organismo */
const fio = (a: [number, number, number], b: [number, number, number]) => lineSvg(segment(a, b, proj), { tone: "hi", flow: true });

/** o GLOBO girando (a Terra) no topo: mar + continentes que rolam (clip + translate), sombra de esfera e um meridiano */
function globo(): string {
  const [gx, gy] = iso([0, 0, 33], proj);
  const R = 26;
  const terra = (dx: number) =>
    `<path d="M${gx - 20 + dx},${gy - 7} q6,-8 15,-4 q7,3 2,10 q-9,5 -16,1 q-5,-4 -1,-7Z" fill="#3fa06a"/>`
    + `<ellipse cx="${gx - 5 + dx}" cy="${gy + 9}" rx="8" ry="4.5" fill="#46b57a"/>`
    + `<path d="M${gx + 9 + dx},${gy - 11} q8,-2 10,5 q1,6 -6,8 q-8,1 -9,-6 q0,-5 5,-7Z" fill="#3fa06a"/>`
    + `<ellipse cx="${gx + 17 + dx}" cy="${gy + 7}" rx="5" ry="6" fill="#46b57a"/>`;
  return `<defs>`
    + `<clipPath id="ci-globo-clip"><circle cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" r="${R}"/></clipPath>`
    + `<radialGradient id="ci-globo-sb" cx="36%" cy="30%" r="82%"><stop offset="0%" stop-color="#eaffff" stop-opacity=".4"/><stop offset="42%" stop-color="#22d3ee" stop-opacity="0"/><stop offset="100%" stop-color="#001018" stop-opacity=".62"/></radialGradient>`
    + `</defs>`
    + `<g clip-path="url(#ci-globo-clip)">`
    + `<rect x="${(gx - R).toFixed(1)}" y="${(gy - R).toFixed(1)}" width="${R * 2}" height="${R * 2}" fill="#0b4d6b"/>`
    + `<g class="ci-globo-spin">${terra(0)}${terra(R * 2)}</g>`
    + `<rect x="${(gx - R).toFixed(1)}" y="${(gy - R).toFixed(1)}" width="${R * 2}" height="${R * 2}" fill="url(#ci-globo-sb)"/>`
    + `</g>`
    + `<circle cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" r="${R}" fill="none" stroke="#7fe8ff" stroke-width="1" opacity=".85"/>`
    + `<ellipse cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" rx="${R}" ry="${(R * 0.36).toFixed(1)}" fill="none" stroke="#7fe8ff" stroke-width=".5" opacity=".35"/>`;
}

// a PASTA (amarela) e o PAPEL (documento branco) são peças separadas porque têm cores diferentes
const PASTA_CORPO =
  solidSvg(slabOf({ x: -19, y: -19, w: 38, d: 40, r: 2 }, 0, 2, proj), { tone: "hi" })        // corpo da pasta
  + solidSvg(slabOf({ x: 3, y: -23, w: 13, d: 5, r: 1 }, 0, 2, proj), { tone: "hi" });         // aba de índice
const PAPEL =
  solidSvg(slabOf({ x: -13, y: -14, w: 26, d: 32, r: 0.8 }, 2, 0.5, proj), { tone: "hi" })                 // a folha
  + solidSvg(slabOf({ x: -10, y: -11, w: 14, d: 3, r: 0.3 }, 2.5, 0.16, proj), { tone: "mid" })            // barra de título
  + solidSvg(slabOf({ x: 4.5, y: -11.5, w: 5, d: 5, r: 0.5 }, 2.5, 0.18, proj), { tone: "lo" })            // um selo/figura
  + [0, 1, 2, 3, 4].map((i) => lineSvg(lineOnTop([-9, -4 + i * 3.4], [9, -4 + i * 3.4], 2.5, proj), { tone: "mid" })).join("") // linhas de texto
  + lineSvg(lineOnTop([-9, 13], [2, 13], 2.5, proj), { tone: "mid" })                                       // última linha curta
  + lineSvg(lineOnTop([1, 16], [9, 16], 2.5, proj), { tone: "lo" });                                        // linha de assinatura

/** tinta da PASTA amarela (faces amarelas, aresta acesa) e do PAPEL branco (faces claras, linhas cinza) */
const AMARELA = "--anatomy-paper:#7a5c10;--anatomy-face:#9c7510;--anatomy-top:#e0ad22;--anatomy-shade-0:#6e5210;--anatomy-shade-1:#8a680f;--anatomy-shade-2:#b88c16;--anatomy-shade-3:#d2a01e;--anatomy-hi:#ffe08a;--anatomy-mid:#dcb23a;--anatomy-lo:#b8902a;--anatomy-lit:#fff3c4;--anatomy-dot:#ffe08a;--anatomy-weight:1px";
const BRANCA = "--anatomy-paper:#e9edf2;--anatomy-face:#dde3ea;--anatomy-top:#f8fafc;--anatomy-shade-0:#c6cdd7;--anatomy-shade-1:#d4dbe3;--anatomy-shade-2:#dde3ea;--anatomy-shade-3:#e9edf2;--anatomy-hi:#64748b;--anatomy-mid:#94a3b8;--anatomy-lo:#cbd5e1;--anatomy-lit:#334155;--anatomy-dot:#64748b;--anatomy-weight:0.8px";

type Peca = { at: number; cor: string; corpo: string; estilo?: string };
const PECAS: readonly Peca[] = [
  // 01 — papel científico: a PASTA amarela e um PAPEL branco (de verdade) em cima
  { at: 0.00, cor: "#f5c542", estilo: AMARELA, corpo: PASTA_CORPO },
  { at: 0.04, cor: "#ffffff", estilo: BRANCA, corpo: PAPEL },
  // 02 — conversas com as IAs: TORRES subindo (os pilares da base)
  { at: 0.20, cor: "#46b0ff", corpo: torre(-14, -14) + torre(14, -14) + torre(-14, 14) + torre(14, 14) },
  // 03 — blueprint: o deck (plataforma) sobre as torres
  { at: 0.42, cor: "#38f0ff", corpo: solidSvg(slabOf({ x: -18, y: -18, w: 36, d: 36, r: 2 }, 13.4, 2, proj), { tone: "hi" }) },
  // 03 — blueprint: o gabinete (o núcleo) com "tela" de pontos
  { at: 0.50, cor: "#38f0ff", corpo: solidSvg(slabOf({ x: -12, y: -12, w: 20, d: 18, r: 2 }, 15.4, 9, proj), { tone: "hi" }) + dotsSvg(dotGrid(-8, -8, 5, 4, 3, 24.4, proj), { tone: "mid", size: 0.6 }) },
  // — os SELOS das IAs sobre os pilares (desenhados por cima, nos cantos do deck): GPT, Claude, Gemini, Grok
  { at: 0.54, cor: "#46b0ff", corpo: rotulo(-16, -16, 16.2, "GPT") + rotulo(16, -16, 16.2, "Claude") + rotulo(-16, 16, 16.2, "Gemini") + rotulo(16, 16, 16.2, "Grok") },
  // 04 — protótipo e testes (ROXO): bateria 18650
  { at: 0.60, cor: "#8b5cf6", corpo: solidSvg(cylinder(15, -6, 4, 15.4, 12, proj, 20), { tone: "hi" }) + solidSvg(cylinder(15, -6, 1.7, 27.4, 1.6, proj, 14), { tone: "hi" }) + lineSvg(knurl(15, -6, 4, 17, 26, 14, proj), { tone: "lo" }) },
  // 04 — protótipo e testes (ROXO): engrenagem no deck
  { at: 0.68, cor: "#8b5cf6", corpo: engrenagem(-13, 12, 15.4, 3) },
  // — as LIGAÇÕES: os selos das IAs e a bateria alimentam o núcleo, e o núcleo manda pro globo (vira um organismo)
  { at: 0.76, cor: "#7fe8ff", corpo: fio([-14, -14, 13.4], [-6, -6, 24.4]) + fio([14, -14, 13.4], [6, -6, 24.4]) + fio([-14, 14, 13.4], [-6, 6, 24.4]) + fio([14, 14, 13.4], [6, 6, 24.4]) + fio([15, -6, 15.4], [9, -4, 22]) + fio([0, 0, 24.4], [0, 0, 32]) },
  // 05 — no mundo real (azul ciano): o mastro
  { at: 0.82, cor: "#22d3ee", corpo: solidSvg(cylinder(0, 0, 1, 24.4, 8, proj, 12), { tone: "mid" }) },
  // 05 — no mundo real: o GLOBO girando (a Terra)
  { at: 0.90, cor: "#22d3ee", corpo: globo() },
];

const body = PECAS.map((p) => `<g class="ci-part" data-at="${p.at}" style="${p.estilo ?? tint(p.cor)}">${p.corpo}</g>`).join("");

export const CONSTRUCAO_SVG = figureSvg({ width: W, height: H, label: "Uma ideia virando produto: a estrutura se constrói do alicerce à estação solar conforme o progresso avança", body, standalone: false, className: "ci-fig" });
export const CONSTRUCAO_PASSOS = PECAS.map((p) => p.at);
