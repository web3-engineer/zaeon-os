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
  figureSvg, fitProjection, boxCorners, type Plane, type Point3, type Projection,
} from "@/lib/anatomy/iso-kit";

const W = 384, H = 448;
// headroom bem alto: o MUNDO HOLOGRÁFICO flutua destacado acima do gadget
const proj: Projection = fitProjection(boxCorners({ x: -24, y: -26, w: 48, d: 52, r: 0 }, 0, 28), W, H, { pad: 16, headroom: 150 });

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

/** um conector/flange nas pontas de um cabo */
function conector(x: number, y: number): string {
  return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.4" fill="#2a1d0a" stroke="#e8c468" stroke-width="1"/>`;
}
/** um CABO grosso (solarpunk) curvo entre dois pontos 3D: sombra + miolo cobre + brilho + conectores nas pontas */
function cabo(a: Point3, b: Point3, cor = "#c9872e", sag = 9): string {
  const [ax, ay] = iso(a, proj), [bx, by] = iso(b, proj);
  const mx = (ax + bx) / 2, my = (ay + by) / 2 + sag;
  const d = `M${ax.toFixed(1)} ${ay.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`;
  return `<path d="${d}" fill="none" stroke="#171006" stroke-width="5.2" stroke-linecap="round"/>`
    + `<path d="${d}" fill="none" stroke="${cor}" stroke-width="3.2" stroke-linecap="round"/>`
    + `<path d="${d}" fill="none" stroke="#ffeab0" stroke-width="0.9" stroke-linecap="round" opacity=".55"/>`
    + conector(ax, ay) + conector(bx, by);
}
/** uma VÁLVULA de roda (solarpunk) num ponto 3D */
function valvula(x: number, y: number, z: number, cor = "#86b06a"): string {
  const [cx, cy] = iso([x, y, z], proj), r = 5;
  let s = "";
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 8; s += `<line x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${(cx + Math.cos(a) * r).toFixed(1)}" y2="${(cy + Math.sin(a) * r).toFixed(1)}" stroke="${cor}" stroke-width="1.5"/>`; }
  return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r}" fill="#0a140c" stroke="${cor}" stroke-width="1.8"/>${s}<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="1.4" fill="${cor}"/>`;
}

/** uma torre em (cx,cy): duas caixas empilhadas (a de cima mais estreita) — os pilares das "conversas" */
function torre(cx: number, cy: number): string {
  return solidSvg(slabOf({ x: cx - 3.6, y: cy - 3.6, w: 7.2, d: 7.2, r: 1 }, 2, 7.4, proj), { tone: "hi" })
    + solidSvg(slabOf({ x: cx - 2.6, y: cy - 2.6, w: 5.2, d: 5.2, r: 1 }, 9.4, 4, proj), { tone: "hi" });
}

/** o EMISSOR: um disco projetor no topo do gadget, de onde sobe o feixe do holograma */
function emissor(): string {
  return solidSvg(cylinder(0, 0, 3.4, 24.4, 1.4, proj, 20), { tone: "hi" })
    + lineSvg(ring(0, 0, 2.2, 25.8, proj, 20), { tone: "lit" });
}

/** o MUNDO HOLOGRÁFICO: uma esfera grande, ciano e translúcida, flutuando DESTACADA acima do gadget — grade de
 *  meridianos/paralelos, continentes em contorno que rolam (o giro), scanlines, brilho, e o feixe do projetor subindo. */
function mundoHolografico(): string {
  const [ex, ey] = iso([0, 0, 25.8], proj);   // o emissor
  const gx = ex, gy = ey - 118, R = 52;        // o mundo flutua bem acima, grande
  const terra = (dx: number) =>
    `<path d="M${(gx - 34 + dx).toFixed(1)} ${(gy - 10).toFixed(1)} q11,-14 25,-7 q11,6 4,17 q-15,8 -27,1 q-8,-7 -2,-12Z" fill="none" stroke="#9af0ff" stroke-width="1.2" opacity=".8"/>`
    + `<ellipse cx="${(gx - 8 + dx).toFixed(1)}" cy="${(gy + 16).toFixed(1)}" rx="14" ry="7.5" fill="none" stroke="#9af0ff" stroke-width="1" opacity=".7"/>`
    + `<path d="M${(gx + 16 + dx).toFixed(1)} ${(gy - 18).toFixed(1)} q14,-4 17,8 q1,11 -11,14 q-14,1 -16,-10 q0,-10 10,-12Z" fill="none" stroke="#9af0ff" stroke-width="1.2" opacity=".75"/>`;
  let scan = "";
  for (let y = gy - R; y <= gy + R; y += 3.4) scan += `<line x1="${(gx - R).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(gx + R).toFixed(1)}" y2="${y.toFixed(1)}" stroke="#7fe8ff" stroke-width=".4" opacity=".1"/>`;
  const grade =
    `<ellipse cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" rx="${R}" ry="${(R * 0.32).toFixed(1)}" fill="none" stroke="#7fe8ff" stroke-width=".6" opacity=".4"/>`
    + `<ellipse cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" rx="${R}" ry="${(R * 0.66).toFixed(1)}" fill="none" stroke="#7fe8ff" stroke-width=".45" opacity=".28"/>`
    + `<ellipse cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" rx="${(R * 0.58).toFixed(1)}" ry="${R}" fill="none" stroke="#7fe8ff" stroke-width=".5" opacity=".3"/>`
    + `<ellipse cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" rx="${(R * 0.9).toFixed(1)}" ry="${R}" fill="none" stroke="#7fe8ff" stroke-width=".45" opacity=".2"/>`;
  return `<defs>`
    + `<clipPath id="ci-globo-clip"><circle cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" r="${R}"/></clipPath>`
    + `<radialGradient id="ci-globo-sb" cx="40%" cy="36%" r="78%"><stop offset="0%" stop-color="#bff6ff" stop-opacity=".28"/><stop offset="55%" stop-color="#22d3ee" stop-opacity=".1"/><stop offset="100%" stop-color="#22d3ee" stop-opacity=".02"/></radialGradient>`
    + `<linearGradient id="ci-beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="#7fe8ff" stop-opacity="0"/><stop offset="100%" stop-color="#7fe8ff" stop-opacity=".22"/></linearGradient>`
    + `</defs>`
    // o feixe do projetor (cone de luz) do emissor até o mundo
    + `<path d="M${(ex - 4).toFixed(1)} ${ey.toFixed(1)} L${(gx - R * 0.7).toFixed(1)} ${(gy + R * 0.55).toFixed(1)} L${(gx + R * 0.7).toFixed(1)} ${(gy + R * 0.55).toFixed(1)} L${(ex + 4).toFixed(1)} ${ey.toFixed(1)} Z" fill="url(#ci-beam)"/>`
    // a esfera (brilho translúcido) + continentes que rolam + scanlines, recortados no círculo
    + `<circle cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" r="${R}" fill="url(#ci-globo-sb)"/>`
    + `<g clip-path="url(#ci-globo-clip)"><g class="ci-globo-spin">${terra(0)}${terra(R * 2)}</g>${scan}</g>`
    + grade
    + `<circle cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" r="${R}" fill="none" stroke="#7fe8ff" stroke-width="1.4" opacity=".9" style="filter:drop-shadow(0 0 7px #22d3ee)"/>`;
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
  // 04 — protótipo e testes (ROXO): bateria 18650
  { at: 0.56, cor: "#8b5cf6", corpo: solidSvg(cylinder(15, -6, 4, 15.4, 12, proj, 20), { tone: "hi" }) + solidSvg(cylinder(15, -6, 1.7, 27.4, 1.6, proj, 14), { tone: "hi" }) + lineSvg(knurl(15, -6, 4, 17, 26, 14, proj), { tone: "lo" }) },
  // 04 — protótipo e testes (ROXO): engrenagem no deck
  { at: 0.64, cor: "#8b5cf6", corpo: engrenagem(-13, 12, 15.4, 3) },
  // — o GADGET se fecha: CABOS grossos (cobre) e VÁLVULAS ligam a bateria, a engrenagem e os pilares ao núcleo
  { at: 0.74, cor: "#c9872e", corpo:
    cabo([15, -6, 19], [7, -4, 22]) + valvula(11, -5, 20.5)
    + cabo([-13, 12, 17], [-5, 2, 18]) + valvula(-9, 7, 17.5)
    + cabo([14, 14, 12], [7, 7, 15], "#9fae6a", 6) + cabo([-14, -14, 12], [-7, -7, 15], "#9fae6a", 6)
    + valvula(0, -9, 23, "#c9872e") },
  // 05 — no mundo real: o EMISSOR do holograma no topo do gadget
  { at: 0.82, cor: "#22d3ee", corpo: emissor() },
  // 05 — no mundo real: o MUNDO HOLOGRÁFICO, grande e girando, flutuando acima
  { at: 0.90, cor: "#22d3ee", corpo: mundoHolografico() },
];

const body = PECAS.map((p) => `<g class="ci-part" data-at="${p.at}" style="${p.estilo ?? tint(p.cor)}">${p.corpo}</g>`).join("");

export const CONSTRUCAO_SVG = figureSvg({ width: W, height: H, label: "Uma ideia virando produto: a estrutura se constrói do alicerce à estação solar conforme o progresso avança", body, standalone: false, className: "ci-fig" });
export const CONSTRUCAO_PASSOS = PECAS.map((p) => p.at);
