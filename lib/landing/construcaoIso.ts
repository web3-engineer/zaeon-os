/**
 * construcaoIso — o VISUALIZADOR da landing: uma PLACA DE CIRCUITOS ÚNICA sobre VIDRO PRETO que se COMPLETA conforme a
 * barra avança. Estética inspirada nos elementos visuais da Solana (neon em vidro escuro, barras diagonais em gradiente,
 * brilho holográfico) mas com AS NOSSAS cores — o gradiente dos marcos da timeline, NA ORDEM:
 *   Papel #f5c542 (dourado) → Conversa #2bd47a (verde) → Blueprint #2d6ae8 (azul escuro) → Protótipo #8b5cf6 (roxo)
 *   → Mundo real #22d3ee (teal).
 * Há PROGRESSÃO DE COR além de elementos: cada trilha/pad nasce já na cor do seu ponto na timeline, então a cor varre
 * a placa em sincronia com a barra. Os 5 NANOCHIPS ficam espalhados (formato de placa de verdade) e a ordem é só de
 * COR e de APARIÇÃO: acendem um a cada marco (gold→verde→azul→roxo→teal), não pela posição em pixel. Sem sinais
 * viajando. Cada peça é um <g class="ci-part" data-at="0..0.9"> que a TimelineIdeia revela pela rampa de progresso.
 */

const W = 1000, H = 1000;

/* ---- as 5 cores da TIMELINE, NA ORDEM dos marcos da barra de baixo ---- */
const RAMP = ["#f5c542", "#2bd47a", "#2d6ae8", "#8b5cf6", "#22d3ee"] as const;

/* ---- tons do vidro escuro ---- */
const VIDRO1 = "#0b1322";
const VIDRO2 = "#070a12";
const NUCLEO = "#0c1626";   // corpo dos chips
const NUCLEO_B = "#1b2b42"; // bisel
const PINO = "#38506a";     // pininhos
const TRILHA_DIM = "#294a5e";

const r1 = (n: number) => Math.round(n * 10) / 10;

/* progressão de cor: interpola as 5 cores da timeline pelo ponto `at` (0→0.9 vira 0→1) */
const hx = (h: string, i: number) => parseInt(h.slice(i, i + 2), 16);
const lerp = (a: string, b: string, t: number) =>
  "#" + [1, 3, 5].map((i) => Math.round(hx(a, i) + (hx(b, i) - hx(a, i)) * t).toString(16).padStart(2, "0")).join("");
function cor(at: number): string {
  const t = Math.max(0, Math.min(0.9999, at / 0.9)) * (RAMP.length - 1);
  const i = Math.min(RAMP.length - 2, Math.floor(t));
  return lerp(RAMP[i]!, RAMP[i + 1]!, t - i);
}

/* coleta de peças */
type Peca = { at: number; svg: string; z?: number };
const pecas: Peca[] = [];
const add = (at: number, svg: string, z = 0) => pecas.push({ at: Math.min(0.9, Math.max(0, at)), svg, z });

/* ---------- helpers ---------- */
const dPath = (pts: [number, number][]) =>
  pts.map((p, i) => `${i ? "L" : "M"}${r1(p[0])},${r1(p[1])}`).join(" ");

// TRILHA de cobre numa cor fixa `c` (ou use cor(at) por fora)
function trilha(pts: [number, number][], c: string, w: number): string {
  return `<path d="${dPath(pts)}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="0.92"/>`;
}

// PAD / via: anel neon com miolo de vidro
function pad(x: number, y: number, r: number, c: string): string {
  return (
    `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>` +
    `<circle cx="${x}" cy="${y}" r="${r1(r * 0.42)}" fill="${VIDRO1}"/>`
  );
}

// NANOCHIP: corpo de vidro com contorno/LED/mini-barras numa cor da timeline, pininhos e brilho
function nanochip(x: number, y: number, w: number, h: number, c: string): string {
  let s =
    `<g filter="url(#cs-glow)">` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${NUCLEO}" stroke="${c}" stroke-width="1.6" stroke-opacity="0.9"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${r1(h * 0.3)}" rx="7" fill="${NUCLEO_B}" opacity="0.5"/>`;
  // três mini-barras diagonais (eco Solana) na cor do chip
  const bw = w * 0.5, bx = x + w * 0.24, by = y + h * 0.3, bh = h * 0.12, gap = h * 0.2;
  for (let k = 0; k < 3; k++) {
    const yy = by + k * gap;
    s += `<path d="M${r1(bx + bh)},${r1(yy)} l${r1(bw)},0 l${r1(-bh)},${r1(bh)} l${r1(-bw)},0 z" fill="${c}" opacity="${0.92 - k * 0.12}"/>`;
  }
  s += `<circle class="cs-luz" cx="${r1(x + w - 12)}" cy="${r1(y + 11)}" r="4.5" fill="${c}"/>`;
  const np = Math.max(3, Math.round(w / 18));
  for (let i = 0; i < np; i++) {
    const px = r1(x + (w * (i + 0.5)) / np);
    s += `<rect x="${px - 2}" y="${y + h}" width="4" height="5" fill="${PINO}"/>`;
  }
  return s + `</g>`;
}

const smd = (x: number, y: number, c: string) =>
  `<rect x="${x}" y="${y}" width="16" height="8" rx="1.5" fill="${NUCLEO}"/><rect x="${x}" y="${y}" width="4" height="8" fill="${c}"/><rect x="${x + 12}" y="${y}" width="4" height="8" fill="${c}"/>`;

const fiducial = (x: number, y: number) =>
  `<g stroke="${TRILHA_DIM}" stroke-width="1.4" opacity="0.7"><path d="M${x - 10},${y} L${x + 10},${y}"/><path d="M${x},${y - 10} L${x},${y + 10}"/><circle cx="${x}" cy="${y}" r="5" fill="none"/></g>`;

/* =================== montagem da placa =================== */

// — vidro preto translúcido + grade + borda neon + fiduciais
add(0,
  `<rect x="0" y="0" width="${W}" height="${H}" rx="26" fill="url(#cs-glass)" opacity="0.82"/>` +
  `<rect x="0" y="0" width="${W}" height="${H}" rx="26" fill="url(#cs-grid)" opacity="0.10"/>` +
  `<rect x="0" y="0" width="${W}" height="${H}" rx="26" fill="url(#cs-center)"/>`, -10);
add(0.02,
  `<rect x="18" y="18" width="${W - 36}" height="${H - 36}" rx="20" fill="none" stroke="url(#cs-borda)" stroke-width="2" opacity="0.8"/>` +
  fiducial(58, 58) + fiducial(W - 58, 58) + fiducial(58, H - 58) + fiducial(W - 58, H - 58), -9);

// — o NÚCLEO central estilo Solana (três barras diagonais em gradiente + brilho) + pininhos
const PX = 400, PY = 400, PW = 200, PH = 200;
add(0.06, (() => {
  let s = `<g filter="url(#cs-glow)">`;
  s += `<rect class="cs-luz2" x="${PX - 16}" y="${PY - 16}" width="${PW + 32}" height="${PH + 32}" rx="22" fill="#2d6ae8" opacity="0.14"/>`;
  s += `<rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" rx="14" fill="${NUCLEO}" stroke="url(#cs-solana)" stroke-width="2"/>`;
  const bw = 120, bx = PX + 40, by = PY + 56, bh = 20, gap = 36, sk = 18;
  for (let k = 0; k < 3; k++) {
    const yy = by + k * gap;
    s += `<path d="M${bx + sk},${yy} l${bw},0 l${-sk},${bh} l${-bw},0 z" fill="url(#cs-solana)"/>`;
  }
  const n = 8;
  for (let i = 0; i < n; i++) {
    const t = PX + (PW * (i + 0.5)) / n, u = PY + (PH * (i + 0.5)) / n;
    s += `<rect x="${r1(t) - 2}" y="${PY - 6}" width="4" height="6" fill="${PINO}"/>`;
    s += `<rect x="${r1(t) - 2}" y="${PY + PH}" width="4" height="6" fill="${PINO}"/>`;
    s += `<rect x="${PX - 6}" y="${r1(u) - 2}" width="6" height="4" fill="${PINO}"/>`;
    s += `<rect x="${PX + PW}" y="${r1(u) - 2}" width="6" height="4" fill="${PINO}"/>`;
  }
  return s + `</g>`;
})(), 5);

// — os 5 NANOCHIPS num layout espalhado (formato de placa de verdade). A ORDEM é só de COR e de APARIÇÃO: cada chip
// acende no seu marco (at 0.10→0.88, cor gold→verde→azul→roxo→teal), independente de onde está na placa.
// [x, y, w, h, ci(cor/ordem), at(≈ limiar do marco), traço de ligação ao núcleo]
const chips: { x: number; y: number; w: number; h: number; ci: number; at: number; liga: [number, number][] }[] = [
  { x: 232, y: 150, w: 150, h: 72, ci: 0, at: 0.10, liga: [[382, 186], [430, 186], [430, 300], [470, 340], [470, PY]] }, // dourado, topo-esq
  { x: 716, y: 236, w: 150, h: 86, ci: 1, at: 0.30, liga: [[716, 300], [640, 300], [600, 340], [PX + PW, 452]] },        // verde, topo-dir
  { x: 122, y: 606, w: 150, h: 92, ci: 2, at: 0.50, liga: [[272, 652], [360, 652], [400, 616], [PX, 560]] },             // azul, baixo-esq
  { x: 708, y: 642, w: 160, h: 92, ci: 3, at: 0.70, liga: [[708, 688], [640, 688], [600, 648], [PX + PW, 540]] },        // roxo, baixo-dir
  { x: 420, y: 138, w: 150, h: 68, ci: 4, at: 0.88, liga: [[495, 206], [495, 300], [520, 340], [520, PY]] },             // teal, topo-centro
];
for (const c of chips) {
  add(Math.max(0, c.at - 0.08), trilha(c.liga, RAMP[c.ci]!, 3)); // o traço chega um pouco antes do chip acender
  add(c.at, nanochip(c.x, c.y, c.w, c.h, RAMP[c.ci]!), 3);
}

// — barramentos laterais e inferior (cor pela progressão) + pads
for (let i = 0; i < 6; i++) { // esquerda
  const y = 430 + i * 24, x0 = 120 + (i % 2) * 18, at = 0.14 + i * 0.016;
  add(at, trilha([[x0, y], [x0 + 60, y], [PX, y]], cor(at), 3) + pad(x0, y, 6, cor(at)));
}
for (let i = 0; i < 6; i++) { // direita
  const y = 430 + i * 24, x1 = 862 - (i % 2) * 16, at = 0.17 + i * 0.016;
  add(at, trilha([[PX + PW, y], [PX + PW + 48, y], [x1, y]], cor(at), 3) + pad(x1, y, 6, cor(at)));
}
for (let i = 0; i < 6; i++) { // baixo → dedos do conector
  const x = 418 + i * 30, at = 0.3 + i * 0.016;
  add(at, trilha([[x, PY + PH], [x, 640], [x + (i - 3) * 6, 700], [360 + i * 56, 760], [360 + i * 56, 890]], cor(at), 3) + pad(x, PY + PH + 8, 4, cor(at)));
}

// — bobina/indutor em espiral
add(0.64, (() => {
  const cx = 290, cy = 775; let d = `M${cx},${cy}`, a = 0, rr = 4;
  for (let s = 0; s < 44; s++) { a += 0.5; rr += 1.1; d += ` L${r1(cx + Math.cos(a) * rr)},${r1(cy + Math.sin(a) * rr)}`; }
  return `<path d="${d}" fill="none" stroke="${cor(0.64)}" stroke-width="3" stroke-linecap="round"/>` + pad(cx, cy, 5, cor(0.64));
})(), 2);

// — campo de VIAS/pads preenchendo vazios
const vias: [number, number, number][] = [
  [150, 320, 0.24], [690, 300, 0.28], [860, 340, 0.3], [880, 560, 0.34], [150, 540, 0.22],
  [820, 700, 0.5], [640, 760, 0.52], [470, 720, 0.46], [540, 785, 0.58], [250, 560, 0.4],
  [760, 450, 0.42], [700, 560, 0.48], [200, 700, 0.54], [120, 620, 0.44], [400, 760, 0.56],
  [620, 620, 0.5], [780, 820, 0.64], [940, 460, 0.36], [90, 440, 0.26], [905, 250, 0.3],
];
for (const [x, y, at] of vias) add(at, pad(x, y, 5, cor(at)));

// — SMDs espalhados
const smds: [number, number, number][] = [
  [160, 420, 0.44], [800, 400, 0.5], [690, 480, 0.52], [250, 660, 0.56], [560, 300, 0.48],
  [820, 640, 0.6], [430, 700, 0.58], [160, 560, 0.5], [740, 800, 0.66], [120, 380, 0.4],
];
for (const [x, y, at] of smds) add(at, smd(x, y, cor(at)));

// — trilhas FINAS de preenchimento
const finas: [[number, number][], number][] = [
  [[[150, 320], [150, 540], [120, 620]], 0.66], [[[690, 300], [860, 300], [880, 560]], 0.64],
  [[[880, 560], [820, 700], [780, 820]], 0.7], [[[250, 560], [250, 660]], 0.68],
  [[[470, 720], [540, 785], [620, 620]], 0.72], [[[760, 450], [700, 560]], 0.7],
  [[[200, 700], [400, 760]], 0.74], [[[640, 760], [820, 700]], 0.76],
];
for (const [pts, at] of finas) add(at, trilha(pts, cor(at), 1.6));

// — dedos do CONECTOR na borda de baixo (gradiente da timeline na ordem)
let fingers = "";
for (let i = 0; i < 11; i++) fingers += `<rect x="${360 + i * 26}" y="896" width="16" height="70" rx="2" fill="${cor(i / 10 * 0.9)}" opacity="0.92"/>`;
add(0.78, fingers, 3);

// — pontinhos/decoração por último
const dots: [number, number, number, number][] = [
  [930, 920, 10, 0.82], [70, 920, 12, 0.86], [930, 80, 8, 0.1], [60, 760, 7, 0.88],
  [940, 440, 6, 0.5], [500, 940, 6, 0.7],
];
for (let i = 0; i < dots.length; i++) {
  const [x, y, r, at] = dots[i]!;
  add(0.82 + i * 0.01, `<circle class="cs-dot" style="animation-delay:${(i * 0.4).toFixed(2)}s" cx="${x}" cy="${y}" r="${r}" fill="${cor(at)}" opacity="0.85"/>`);
}

/* ---------- SVG final ---------- */
const defs = `
  <defs>
    <linearGradient id="cs-glass" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stop-color="${VIDRO1}"/>
      <stop offset="100%" stop-color="${VIDRO2}"/>
    </linearGradient>
    <linearGradient id="cs-solana" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f5c542"/>
      <stop offset="28%" stop-color="#2bd47a"/>
      <stop offset="52%" stop-color="#2d6ae8"/>
      <stop offset="76%" stop-color="#8b5cf6"/>
      <stop offset="100%" stop-color="#22d3ee"/>
    </linearGradient>
    <linearGradient id="cs-borda" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#22d3ee" stop-opacity="0.9"/>
      <stop offset="50%" stop-color="#8b5cf6" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#2bd47a" stop-opacity="0.9"/>
    </linearGradient>
    <radialGradient id="cs-center" cx="50%" cy="46%" r="60%">
      <stop offset="0%" stop-color="#1a2b44" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <pattern id="cs-grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40,0 L0,0 L0,40" fill="none" stroke="#2bd4ee" stroke-width="0.6"/>
    </pattern>
    <filter id="cs-glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.3" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <clipPath id="cs-clip"><rect x="0" y="0" width="${W}" height="${H}" rx="26"/></clipPath>
  </defs>`;

const body = pecas
  .map((p, i) => ({ ...p, i }))
  .sort((a, b) => (a.z ?? 0) - (b.z ?? 0) || a.i - b.i)
  .map((p) => `<g class="ci-part" data-at="${p.at}">${p.svg}</g>`)
  .join("");

export const CONSTRUCAO_SVG =
  `<svg class="ci-fig" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" ` +
  `aria-label="Uma placa de circuitos em vidro escuro que se completa, com a cor varrendo o gradiente da timeline conforme a ideia vira realidade">` +
  defs +
  `<g clip-path="url(#cs-clip)">${body}</g>` +
  `</svg>`;

export const CONSTRUCAO_PASSOS = [0, 0.25, 0.5, 0.72, 0.88];
