/**
 * construcaoIso — UMA estrutura 3D isométrica (kit do anatomy, lib/anatomy/iso-kit) que se CONSTRÓI peça a peça: do
 * alicerce até uma pequena estação solar (base → estrutura → deck → gabinete → bateria → engrenagem → mastro + placa
 * solar → antena). Todas as peças compartilham a MESMA projeção, então cada uma nasce no seu lugar final — a cena
 * "cresce" conforme as peças aparecem. Puro (sem DOM). Quem revela cada peça pelo progresso é a TimelineIdeia.
 *
 * Cada peça é um <g class="ci-part" data-at="<0..1>"> com a cor da sua etapa nas variáveis --anatomy-*.
 */
import {
  slabOf, cylinder, extrude, solidSvg, lineSvg, lineOnTop, knurl, ring, iso, axisVector,
  figureSvg, fitProjection, boxCorners, type Plane, type Projection,
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

const bv = axisVector(proj, [1, 0, 0]);   // o eixo X da esteira, projetado em tela (direção que os produtos correm)
const REP = 6;                            // o período (em unidades) do laço da esteira

/** a ESTEIRA: o leito + os dois rolos nas pontas */
function esteira(): string {
  return solidSvg(slabOf({ x: -14, y: -3.5, w: 28, d: 7, r: 1 }, 15.4, 1.6, proj), { tone: "hi" })
    + solidSvg(cylinder(-13, 0, 2.2, 15.4, 1.6, proj, 16), { tone: "mid" })
    + solidSvg(cylinder(13, 0, 2.2, 15.4, 1.6, proj, 16), { tone: "mid" });
}

/** a superfície da esteira RODANDO: setas (chevrons) e produtos que correm, recortados na tampa (clip) */
function esteiraRolando(): string {
  const q = [iso([-14, -3.5, 17], proj), iso([14, -3.5, 17], proj), iso([14, 3.5, 17], proj), iso([-14, 3.5, 17], proj)];
  const clip = `<clipPath id="ci-esteira-clip"><polygon points="${q.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ")}"/></clipPath>`;
  let conteudo = "";
  for (let x = -22; x <= 22; x += 2) {
    const a = iso([x - 0.8, -2.2, 17.05], proj), b = iso([x + 0.6, 0, 17.05], proj), c = iso([x - 0.8, 2.2, 17.05], proj);
    conteudo += `<polyline points="${a[0].toFixed(1)},${a[1].toFixed(1)} ${b[0].toFixed(1)},${b[1].toFixed(1)} ${c[0].toFixed(1)},${c[1].toFixed(1)}" fill="none" stroke="#bff3ff" stroke-width="1" opacity=".5"/>`;
  }
  for (let x = -18; x <= 18; x += REP) conteudo += solidSvg(slabOf({ x: x - 1.6, y: -1.6, w: 3.2, d: 3.2, r: 0.4 }, 17.1, 2.6, proj), { tone: "hi", lit: true });
  return `<defs>${clip}</defs><g clip-path="url(#ci-esteira-clip)"><g class="ci-esteira" style="--ex:${(bv[0] * REP).toFixed(1)}px;--ey:${(bv[1] * REP).toFixed(1)}px">${conteudo}</g></g>`;
}

/** a PRENSA sobre a esteira: pórtico (dois postes + viga) e a cabeça que desce e sobe (ci-prensa) */
function prensa(): string {
  return solidSvg(cylinder(-7, -4.5, 0.8, 15.4, 9, proj, 10), { tone: "mid" })
    + solidSvg(cylinder(-7, 4.5, 0.8, 15.4, 9, proj, 10), { tone: "mid" })
    + solidSvg(slabOf({ x: -8.6, y: -5.5, w: 3.2, d: 11, r: 0.5 }, 24, 1.2, proj), { tone: "hi" })
    + `<g class="ci-prensa">${solidSvg(slabOf({ x: -8, y: -2.6, w: 2.6, d: 5.2, r: 0.4 }, 19, 2.6, proj), { tone: "hi" })}</g>`;
}

/** uma torre em (cx,cy): duas caixas empilhadas (a de cima mais estreita) — os pilares das "conversas" */
function torre(cx: number, cy: number): string {
  return solidSvg(slabOf({ x: cx - 3.6, y: cy - 3.6, w: 7.2, d: 7.2, r: 1 }, 2, 7.4, proj), { tone: "hi" })
    + solidSvg(slabOf({ x: cx - 2.6, y: cy - 2.6, w: 5.2, d: 5.2, r: 1 }, 9.4, 4, proj), { tone: "hi" });
}

/** o EMISSOR: um mastro atrás da esteira com um disco projetor, de onde sobe o feixe do holograma */
function emissor(): string {
  return solidSvg(cylinder(0, -9, 1.4, 15.4, 5.5, proj, 12), { tone: "mid" })
    + solidSvg(cylinder(0, -9, 2.8, 20.9, 1.3, proj, 18), { tone: "hi" })
    + lineSvg(ring(0, -9, 1.8, 22.2, proj, 18), { tone: "lit" });
}

/** o MUNDO HOLOGRÁFICO: uma esfera grande, ciano e translúcida, flutuando DESTACADA acima do gadget — grade de
 *  meridianos/paralelos, continentes em contorno que rolam (o giro), scanlines, brilho, e o feixe do projetor subindo. */
function mundoHolografico(): string {
  const [ex, ey] = iso([0, -9, 22.2], proj);   // o emissor (atrás da esteira)
  const gx = ex, gy = ey - 112, R = 52;         // o mundo flutua bem acima, grande
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
  // 03 — blueprint: a MÁQUINA começa — a ESTEIRA (leito + rolos) sobre o deck
  { at: 0.48, cor: "#38f0ff", corpo: esteira() },
  // 03 — blueprint: a esteira RODANDO (setas + produtos correndo)
  { at: 0.54, cor: "#38f0ff", corpo: esteiraRolando() },
  // 04 — protótipo e testes (ROXO): a PRENSA que desce e sobe sobre a esteira
  { at: 0.60, cor: "#8b5cf6", corpo: prensa() },
  // 04 — protótipo e testes (ROXO): a engrenagem MOTRIZ (gira) na ponta da esteira
  { at: 0.66, cor: "#8b5cf6", corpo: `<g class="ci-giro">${engrenagem(13, 5, 15.4, 3)}</g>` },
  // 04 — protótipo e testes (ROXO): a bateria que alimenta a máquina
  { at: 0.72, cor: "#8b5cf6", corpo: solidSvg(cylinder(-14, 10, 3.4, 15.4, 10, proj, 18), { tone: "hi" }) + solidSvg(cylinder(-14, 10, 1.5, 25.4, 1.4, proj, 14), { tone: "hi" }) + lineSvg(knurl(-14, 10, 3.4, 16.8, 24.4, 14, proj), { tone: "lo" }) },
  // 05 — no mundo real: o EMISSOR do holograma no topo do gadget
  { at: 0.82, cor: "#22d3ee", corpo: emissor() },
  // 05 — no mundo real: o MUNDO HOLOGRÁFICO, grande e girando, flutuando acima
  { at: 0.90, cor: "#22d3ee", corpo: mundoHolografico() },
];

const body = PECAS.map((p) => `<g class="ci-part" data-at="${p.at}" style="${p.estilo ?? tint(p.cor)}">${p.corpo}</g>`).join("");

export const CONSTRUCAO_SVG = figureSvg({ width: W, height: H, label: "Uma ideia virando produto: a estrutura se constrói do alicerce à estação solar conforme o progresso avança", body, standalone: false, className: "ci-fig" });
export const CONSTRUCAO_PASSOS = PECAS.map((p) => p.at);
