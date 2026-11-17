/**
 * construcaoIso — o VISUALIZADOR da landing: uma PLACA DE CIRCUITOS ÚNICA sobre VIDRO PRETO que se COMPLETA conforme a
 * barra avança. Estética inspirada nos elementos visuais da Solana (neon em vidro escuro, barras diagonais em gradiente,
 * brilho holográfico) mas com AS NOSSAS cores — o gradiente dos marcos da timeline, NA ORDEM:
 *   Papel #f5c542 (dourado) → Conversa #2bd47a (verde) → Blueprint #2d6ae8 (azul escuro) → Protótipo #8b5cf6 (roxo)
 *   → Mundo real #22d3ee (teal).
 * Há PROGRESSÃO DE COR além de elementos: cada trilha/pad nasce já na cor do seu ponto na timeline, então a cor varre
 * a placa em sincronia com a barra. Os marcos, na ordem:
 *   1. BASE CIENTÍFICA (ouro) = a BASE DO CHIP: a faixa e os dedos do conector na borda de baixo — a 1ª coisa a acender;
 *   2. CONVERSA COM AS IAs (verde) = os FIOS que sobem da base até o núcleo;
 *   3–5. Propriedade intelectual/Blueprint (azul), Protótipo (roxo) e Mundo real (teal) = NANOCHIPS espalhados (formato de
 *   placa de verdade), na ordem só de COR e de APARIÇÃO, não pela posição em pixel.
 * Sem sinais viajando. Cada peça é um <g class="ci-part" data-at="0..0.9"> que a TimelineIdeia revela pela rampa de
 * progresso.
 */

const W = 1000, H = 1000;

/* ---- as 5 cores da TIMELINE, NA ORDEM dos marcos da barra de baixo ---- */
const RAMP = ["#f5c542", "#2bd47a", "#2d6ae8", "#8b5cf6", "#22d3ee"] as const;
/** o ouro da BASE CIENTÍFICA (a base do chip) e o verde da CONVERSA COM AS IAs (os fios que sobem dela) */
const OURO = RAMP[0];
const VERDE = RAMP[1];

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
const add = (at: number, svg: string, z = 0) => pecas.push({ at: Math.min(0.94, Math.max(0, at)), svg, z });

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
  `<rect x="0" y="0" width="${W}" height="${H}" rx="26" fill="url(#cs-placa-metal)" stroke="#71818b" stroke-width="2"/>` +
  `<rect x="8" y="8" width="${W - 16}" height="${H - 16}" rx="22" fill="url(#cs-glass)" stroke="#0d171e" stroke-width="3"/>` +
  `<rect x="9" y="9" width="${W - 18}" height="${H - 18}" rx="20" fill="url(#cs-escovado)" opacity=".23"/>` +
  `<rect x="0" y="0" width="${W}" height="${H}" rx="26" fill="url(#cs-grid)" opacity="0.07"/>` +
  `<rect x="0" y="0" width="${W}" height="${H}" rx="26" fill="url(#cs-center)"/>`, -10);
add(0.02,
  `<rect x="18" y="18" width="${W - 36}" height="${H - 36}" rx="20" fill="none" stroke="url(#cs-borda)" stroke-width="2" opacity="0.8"/>` +
  fiducial(58, 58) + fiducial(W - 58, 58) + fiducial(58, H - 58) + fiducial(W - 58, H - 58), -9);

// — o NÚCLEO central estilo Solana (três barras diagonais em gradiente + brilho) + pininhos
const PX = 400, PY = 400, PW = 200, PH = 200;
add(0.94, (() => {
  let s = `<g>
    <rect x="393" y="401" width="214" height="213" rx="13" fill="#03070d" opacity=".75"/>
    <rect x="395" y="395" width="210" height="210" rx="8" fill="#18362f" stroke="#4a685e" stroke-width="1.5"/>
    <path d="M414 409H585L593 417V580L580 593H419L407 581V417Z" fill="url(#cs-metal)" stroke="#a3afbc" stroke-width="1.4"/>
    <path d="M414 409H585L593 417V580L580 593H419L407 581V417Z" fill="url(#cs-escovado)"/>
    <path d="M414 412H584L590 418M410 419V579" fill="none" stroke="#eff5f6" opacity=".73"/>
    <rect x="428" y="436" width="144" height="131" rx="6" fill="#0a111a" stroke="#65717d"/>
    <rect x="431" y="439" width="138" height="122" rx="4" fill="url(#cs-janela)" stroke="#b9d5e2" stroke-opacity=".62"/>
  `;
  for (let i = 0; i < 10; i++) {
    const pos = 419 + i * 18;
    s += `<path d="M${pos} 396v8m0 191v8M396 ${pos}h8m191 0h8" stroke="url(#cs-ouro)" stroke-width="3"/>`;
  }
  s += `<path d="M398 412v-12h12Z" fill="#f1cc7b"/>`;
  const bw = 90, bx = PX + 55, by = PY + 65, bh = 13, gap = 27, sk = 13;
  for (let k = 0; k < 3; k++) {
    const yy = by + k * gap;
    s += `<path d="M${bx + sk},${yy} l${bw},0 l${-sk},${bh} l${-bw},0 z" fill="url(#cs-solana)"/>`;
  }
  s += `<rect x="431" y="439" width="138" height="122" rx="4" fill="url(#cs-reflexo-chip)"/>
    <path d="M436 441H564M433 445V553" fill="none" stroke="#dceefa" stroke-width="1.5" opacity=".48"/>
    <path d="M435 563H565" stroke="#6d94ae" stroke-width="2" opacity=".48"/>`;

  s += `<path d="M433 442h106l-63 116h-43Z" fill="#daf4ff" opacity=".08"/>`;
  return s + `</g>`;
})(), 5);

// — os NANOCHIPS dos marcos 3–5 num layout espalhado (formato de placa de verdade). A ORDEM é só de COR e de APARIÇÃO:
// cada chip acende no seu marco (at 0.50→0.88, azul→roxo→teal), independente de onde está na placa. O marco 1 (Base
// científica, ouro) é a BASE e o marco 2 (Conversa com as IAs, verde) são os FIOS que sobem dela — logo abaixo.
// [x, y, w, h, ci(cor/ordem), at(≈ limiar do marco), traço de ligação ao núcleo]
const chips: { x: number; y: number; w: number; h: number; ci: number; at: number; liga: [number, number][] }[] = [
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
for (let i = 0; i < 6; i++) { // a CONVERSA COM AS IAs: os fios VERDES que sobem da base científica (ouro) até o núcleo
  const x = 418 + i * 30, at = 0.2 + i * 0.012;
  add(at, trilha([[x, PY + PH], [x, 640], [x + (i - 3) * 6, 700], [360 + i * 56, 760], [360 + i * 56, 884]], VERDE, 3) + pad(x, PY + PH + 8, 4, VERDE));
}

// — campo de VIAS/pads preenchendo vazios
const vias: [number, number, number][] = [
  [150, 320, 0.24], [690, 300, 0.28], [860, 340, 0.3], [880, 560, 0.34], [150, 540, 0.22],
  [820, 700, 0.5], [640, 760, 0.52], [470, 720, 0.46], [540, 785, 0.58], [250, 560, 0.4],
  [760, 450, 0.42], [700, 560, 0.48], [200, 700, 0.54], [120, 620, 0.44], [400, 760, 0.56],
  [620, 620, 0.5], [780, 820, 0.64], [940, 460, 0.36], [90, 440, 0.26], [905, 250, 0.3],
];
for (const [x, y, at] of vias) add(at, pad(x, y, 5, cor(at)));
// — MAIS PONTOS: um campo denso de vias menores, preenchendo os vazios (o canto de cima, as laterais e o pé da placa)
const viasFinas: [number, number, number][] = [
  [110, 120, 0.12], [170, 150, 0.14], [240, 110, 0.16], [120, 205, 0.15], [205, 255, 0.2], [300, 240, 0.18],
  [335, 168, 0.22], [262, 330, 0.24], [360, 300, 0.26], [360, 382, 0.28], [620, 110, 0.3], [702, 142, 0.32],
  [782, 120, 0.34], [880, 172, 0.36], [652, 222, 0.4], [640, 382, 0.42], [905, 382, 0.38], [92, 722, 0.46],
  [170, 802, 0.5], [242, 862, 0.52], [318, 822, 0.54], [300, 722, 0.56], [262, 775, 0.55], [900, 762, 0.6],
  [862, 862, 0.62], [702, 862, 0.64], [942, 642, 0.66], [580, 700, 0.6], [940, 300, 0.4], [60, 300, 0.2],
  [60, 600, 0.44], [500, 360, 0.3], [130, 880, 0.58], [910, 920, 0.7],
];
for (const [x, y, at] of viasFinas) add(at, `<circle cx="${x}" cy="${y}" r="3.6" fill="${cor(at)}" opacity="0.9"/>`);

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

// — a BASE DO CHIP = a BASE CIENTÍFICA (ouro): a faixa e os dedos do conector na borda de baixo. É o 1º marco, então
// é a primeira coisa a acender — o núcleo e o resto da placa crescem a partir dela.
let base = `<g filter="url(#cs-glow)"><rect x="344" y="882" width="312" height="10" rx="3" fill="url(#cs-ouro)"/>`;
for (let i = 0; i < 11; i++) base += `<rect x="${360 + i * 26}" y="896" width="16" height="70" rx="2" fill="url(#cs-ouro)" opacity="0.95"/>`;
add(0.08, base + `</g>`, 3);

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
    <linearGradient id="cs-placa-metal" x2="20%" y2="100%">
      <stop stop-color="#879aa3"/>
      <stop offset=".3" stop-color="#465960"/>
      <stop offset=".65" stop-color="#25373d"/>
      <stop offset="1" stop-color="#607681"/>
    </linearGradient>
    <linearGradient id="cs-metal" x2="28%" y2="100%">
      <stop stop-color="#e0e6ea"/>
      <stop offset=".21" stop-color="#8997a5"/>
      <stop offset=".43" stop-color="#c5cdd3"/>
      <stop offset=".7" stop-color="#65717d"/>
      <stop offset="1" stop-color="#aebbc5"/>
    </linearGradient>
    <pattern id="cs-escovado" width="19" height="7" patternUnits="userSpaceOnUse">
      <path d="M0 1h19M4 4h11" stroke="#fff" stroke-width=".42" opacity=".33"/>
      <path d="M0 6h19" stroke="#233541" stroke-width=".5" opacity=".35"/>
    </pattern>
    <linearGradient id="cs-janela" x2="100%" y2="100%">
      <stop stop-color="#375369"/>
      <stop offset=".48" stop-color="#102131"/>
      <stop offset="1" stop-color="#263f60"/>
    </linearGradient>
    <linearGradient id="cs-reflexo-chip" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop stop-color="#e7f7ff" stop-opacity=".32"/>
      <stop offset=".36" stop-color="#a8d9fa" stop-opacity=".08"/>
      <stop offset=".52" stop-color="#e5f6ff" stop-opacity=".16"/>
      <stop offset=".68" stop-color="#8ab5d2" stop-opacity="0"/>
      <stop offset="1" stop-color="#b9dcef" stop-opacity=".12"/>
    </linearGradient>
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
    <linearGradient id="cs-ouro" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffe08a"/>
      <stop offset="45%" stop-color="#f5c542"/>
      <stop offset="100%" stop-color="#b8860b"/>
    </linearGradient>
    <linearGradient id="cs-borda" x2="100%" y2="100%">
      <stop stop-color="#a2b7bd" stop-opacity=".6"/>
      <stop offset=".56" stop-color="#3a575f"/>
      <stop offset="1" stop-color="#718d95" stop-opacity=".65"/>
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

const prensa = `
  <g class="ci-prensa">
    <path d="M-164 354H-19M-164 500H-19M-164 646H-19" stroke="#24374c" stroke-width="14" stroke-linecap="round"/>
    <path d="M-160 351H-19M-160 497H-19M-160 643H-19" stroke="#7290aa" stroke-width="3"/>
    <rect x="-22" y="293" width="22" height="414" rx="5" fill="#14263b" stroke="#527d9a" stroke-width="2"/>
    <path d="M-2 306V694" stroke="#57d7ee" stroke-opacity=".55" stroke-width="4"/>
    <path class="ci-impacto" d="M0 306V694" stroke="#e8ffff" stroke-width="9" stroke-linecap="round"/>
    <path class="ci-energia" d="M-162 354H-12M-162 500H-12M-162 646H-12" fill="none" stroke="#80efff" stroke-width="4"/>
  </g>`;

export const CONSTRUCAO_SVG =
  `<svg class="ci-fig" viewBox="-122 0 ${W + 244} ${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
  defs +
  `<g class="ci-placa-corpo"><g clip-path="url(#cs-clip)">${body}</g></g>${prensa}<g transform="translate(${W} 0) scale(-1 1)">${prensa}</g><g class="ci-carga"><rect x="379" y="948" width="242" height="8" rx="4" fill="#0e2c47"/><rect class="ci-carga-fill" x="379" y="948" width="0" height="8" rx="4" fill="#8bf7ff"/></g>` +
  `</svg>`;

export const CONSTRUCAO_PASSOS = [0, 0.25, 0.5, 0.72, 0.88];
