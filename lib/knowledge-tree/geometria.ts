/**
 * lib/knowledge-tree/geometria.ts — a GEOMETRIA neuronal (PURA, sem DOM): layout radial com a raiz no
 * centro, axônios como polígonos AFILADOS preenchidos (nunca traço tracejado), fibras paralelas,
 * colaterais com botão sináptico, arborização terminal e dendritos. O componente só pinta as strings.
 */
import { rngDe } from "./rng";
import { filhosDe } from "./progresso";
import type { IndiceArvore } from "./tipos";

export type Pt = { x: number; y: number };
export type PosNo = Pt & { ang: number; prof: number };

const f1 = (v: number) => (Math.round(v * 10) / 10).toString();
const r2 = (v: number, k = 100) => Math.round(v * k) / k;

// ─────────────────────────── bézier cúbica ───────────────────────────
export function bezier(p0: Pt, c1: Pt, c2: Pt, p1: Pt, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p1.x,
    y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p1.y,
  };
}
export function bezierDeriv(p0: Pt, c1: Pt, c2: Pt, p1: Pt, t: number): Pt {
  const u = 1 - t;
  return {
    x: 3 * u * u * (c1.x - p0.x) + 6 * u * t * (c2.x - c1.x) + 3 * t * t * (p1.x - c2.x),
    y: 3 * u * u * (c1.y - p0.y) + 6 * u * t * (c2.y - c1.y) + 3 * t * t * (p1.y - c2.y),
  };
}
export const caminhoBezier = (p0: Pt, c1: Pt, c2: Pt, p1: Pt): string =>
  `M${f1(p0.x)} ${f1(p0.y)}C${f1(c1.x)} ${f1(c1.y)} ${f1(c2.x)} ${f1(c2.y)} ${f1(p1.x)} ${f1(p1.y)}`;

// ─────────────────────────── taper ───────────────────────────
export type OpcoesTaper = { n?: number; ondulacao?: number; frequencia?: number; fase?: number };

/** Os pontos do polígono afilado: n+1 de um lado, n+1 do outro (volta) = 2*(n+1). */
export function taperPontos(p0: Pt, c1: Pt, c2: Pt, p1: Pt, w0: number, w1: number, o: OpcoesTaper = {}): Pt[] {
  const n = Math.max(2, Math.floor(o.n ?? 26));
  const amp = o.ondulacao ?? 0.12, freq = o.frequencia ?? 3, fase = o.fase ?? 0;
  const esq: Pt[] = [], dir: Pt[] = [];
  let ultimaNormal: Pt = { x: 0, y: 1 };
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = bezier(p0, c1, c2, p1, t);
    const d = bezierDeriv(p0, c1, c2, p1, t);
    const len = Math.hypot(d.x, d.y);
    const nor = len > 1e-9 ? { x: -d.y / len, y: d.x / len } : ultimaNormal;
    ultimaNormal = nor;
    const w = Math.max(0.12, (w0 + (w1 - w0) * t) * (1 + amp * Math.sin(t * Math.PI * 2 * freq + fase)));
    esq.push({ x: p.x + nor.x * w / 2, y: p.y + nor.y * w / 2 });
    dir.push({ x: p.x - nor.x * w / 2, y: p.y - nor.y * w / 2 });
  }
  return [...esq, ...dir.reverse()];
}

/** O polígono afilado como `d` de <path> (fechado, para preencher). */
export function taper(p0: Pt, c1: Pt, c2: Pt, p1: Pt, w0: number, w1: number, o: OpcoesTaper = {}): string {
  const pts = taperPontos(p0, c1, c2, p1, w0, w1, o);
  return "M" + pts.map((p) => f1(p.x) + " " + f1(p.y)).join("L") + "Z";
}

// ─────────────────────────── regras de energia → forma ───────────────────────────
export const fibrasDe = (e: number): number => (e < 2.5 ? 1 : e < 4 ? 2 : 3);
export const colateraisDe = (e: number): number => Math.round(e * 0.8);
export const ramosTerminaisDe = (e: number): number => 2 + Math.round(e / 2);
export const dendritosDe = (e: number): number => 3 + Math.round(e * 0.8);
export const larguraDe = (e: number): { w0: number; w1: number } => ({ w0: 1.5 + e * 1.05, w1: 0.55 + e * 0.32 });
export const crepita = (e: number): boolean => e >= 4;

// ─────────────────────────── layout radial (raiz no centro) ───────────────────────────
export type OpcoesLayout = { raio?: number; separacao?: number };

/** Posição de cada nó visível: a raiz em (0,0); cada filho num setor proporcional às folhas visíveis dele. */
export function layoutRadial(idx: IndiceArvore, visiveis: readonly string[], o: OpcoesLayout = {}): Map<string, PosNo> {
  const R = o.raio ?? 170, sep = o.separacao ?? 64;
  const vis = new Set(visiveis);
  const filhosVis = (id: string) => filhosDe(idx, id).filter((f) => vis.has(f));
  const folhas = new Map<string, number>();
  const contar = (id: string): number => {
    const fs = filhosVis(id);
    const n = fs.length ? fs.reduce((s, f) => s + contar(f), 0) : 1;
    folhas.set(id, n);
    return n;
  };
  const raiz = idx.raiz.id;
  contar(raiz);
  // raio por profundidade: cresce com a lotação do anel, nunca encolhe pra dentro do anterior
  const porNivel = new Map<number, number>();
  for (const id of visiveis) { const d = idx.profundidade.get(id) ?? 0; porNivel.set(d, (porNivel.get(d) ?? 0) + 1); }
  const raios: number[] = [0];
  const maxProf = Math.max(0, ...porNivel.keys());
  for (let d = 1; d <= maxProf; d++) {
    const lotado = ((porNivel.get(d) ?? 0) * sep) / (2 * Math.PI);
    raios[d] = Math.max(R * d, lotado, (raios[d - 1] ?? 0) + R * 0.8);
  }
  const pos = new Map<string, PosNo>();
  pos.set(raiz, { x: 0, y: 0, ang: -Math.PI / 2, prof: 0 });
  const colocar = (id: string, a0: number, a1: number) => {
    const fs = filhosVis(id);
    const tot = folhas.get(id) ?? 1;
    let a = a0;
    for (const f of fs) {
      const fatia = ((a1 - a0) * (folhas.get(f) ?? 1)) / tot;
      const ang = a + fatia / 2;
      const d = idx.profundidade.get(f) ?? 1;
      const r = raios[d] ?? R * d;
      // arredondado: servidor e navegador calculam seno/cosseno com diferença no último dígito (hidratação)
      pos.set(f, { x: r2(Math.cos(ang) * r), y: r2(Math.sin(ang) * r), ang: r2(ang, 1e4), prof: d });
      colocar(f, a, a + fatia);
      a += fatia;
    }
  };
  // um filho só sobe; mais de um abrem a volta inteira a partir do topo
  const start = -Math.PI / 2 - Math.PI;
  colocar(raiz, start, start + 2 * Math.PI);
  return pos;
}

/** A caixa que contém todos os nós (com margem). */
export function caixaDe(pos: Iterable<Pt>, margem = 90): { x: number; y: number; w: number; h: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pos) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  if (!Number.isFinite(x0)) { x0 = y0 = -100; x1 = y1 = 100; }
  return { x: x0 - margem, y: y0 - margem, w: x1 - x0 + margem * 2, h: y1 - y0 + margem * 2 };
}

// ─────────────────────────── uma aresta inteira ───────────────────────────
export type Ramo = { d: string; botao: Pt & { r: number } };
export type GeoAresta = {
  /** a linha central (o trilho do sinal e do brilho) */
  eixo: string;
  /** os axônios afilados, 1–3 fibras paralelas */
  fibras: string[];
  /** o núcleo interno claro (fino, na fibra principal) */
  nucleo: string;
  colaterais: Ramo[];
  terminais: Ramo[];
  comprimento: number;
};

const unit = (a: number): Pt => ({ x: Math.cos(a), y: Math.sin(a) });

/** um ramo curto e afilado a partir de `de`, na direção `ang`, terminando num botão sináptico. */
function ramoCurto(de: Pt, ang: number, len: number, w0: number, rng: () => number): Ramo {
  const curva = (rng() - 0.5) * 0.9;
  const u = unit(ang), v = unit(ang + curva);
  const fim = { x: de.x + v.x * len, y: de.y + v.y * len };
  const c1 = { x: de.x + u.x * len * 0.35, y: de.y + u.y * len * 0.35 };
  const c2 = { x: fim.x - v.x * len * 0.35, y: fim.y - v.y * len * 0.35 };
  return { d: taper(de, c1, c2, fim, w0, w0 * 0.25, { n: 10, ondulacao: 0.08, fase: rng() * 6 }), botao: { x: r2(fim.x), y: r2(fim.y), r: r2(1.2 + w0 * 0.55) } };
}

/**
 * A aresta pai→filho com a energia do FILHO. `rPai`/`rFilho` = raio dos nós (o axônio sai da borda).
 * `simples` (celular): 1 fibra, sem colaterais.
 */
export function geometriaAresta(pai: PosNo, filho: PosNo, e: number, id: string, rPai: number, rFilho: number, simples = false): GeoAresta {
  const rng = rngDe(id, "aresta");
  const dx = filho.x - pai.x, dy = filho.y - pai.y;
  const dist = Math.hypot(dx, dy) || 1;
  const dirPF = { x: dx / dist, y: dy / dist };
  const perp = { x: -dirPF.y, y: dirPF.x };
  // a saída do pai e a chegada no filho puxam pra direção da aresta (o radial só tempera): sem laço pra trás
  const mistura = (a: Pt, b: Pt, k: number): Pt => { const x = a.x * (1 - k) + b.x * k, y = a.y * (1 - k) + b.y * k, l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l }; };
  const saiPai = pai.prof === 0 ? dirPF : mistura(dirPF, unit(pai.ang), 0.3);
  const chegaFilho = mistura(dirPF, unit(filho.ang), 0.4);
  const p0 = { x: pai.x + dirPF.x * rPai, y: pai.y + dirPF.y * rPai };
  const p1 = { x: filho.x - dirPF.x * (rFilho + 2), y: filho.y - dirPF.y * (rFilho + 2) };
  const torce = (rng() - 0.5) * 0.22 * dist;
  const c1 = { x: p0.x + saiPai.x * dist * 0.38 + perp.x * torce, y: p0.y + saiPai.y * dist * 0.38 + perp.y * torce };
  const c2 = { x: p1.x - chegaFilho.x * dist * 0.34 - perp.x * torce * 0.4, y: p1.y - chegaFilho.y * dist * 0.34 - perp.y * torce * 0.4 };
  const { w0, w1 } = larguraDe(e);
  const nFib = simples ? 1 : fibrasDe(e);
  const esp = 2.4 + e * 0.7;
  const fibras: string[] = [];
  for (let k = 0; k < nFib; k++) {
    const off = (k - (nFib - 1) / 2) * esp;
    const larg = k === Math.floor(nFib / 2) ? 1 : 0.55;
    fibras.push(taper(
      p0,
      { x: c1.x + perp.x * off, y: c1.y + perp.y * off },
      { x: c2.x + perp.x * off, y: c2.y + perp.y * off },
      p1,
      w0 * larg, w1 * larg,
      { n: 26, ondulacao: 0.12, fase: rng() * 6.28 },
    ));
  }
  const nucleo = taper(p0, c1, c2, p1, Math.max(0.5, w0 * 0.32), Math.max(0.25, w1 * 0.3), { n: 26, ondulacao: 0.05 });
  const colaterais: Ramo[] = [];
  if (!simples) {
    const nCol = colateraisDe(e);
    for (let i = 0; i < nCol; i++) {
      const t = 0.22 + (0.56 * (i + 0.5)) / Math.max(1, nCol) + (rng() - 0.5) * 0.06;
      const p = bezier(p0, c1, c2, p1, t), d = bezierDeriv(p0, c1, c2, p1, t);
      const ang = Math.atan2(d.y, d.x) + (i % 2 ? 1 : -1) * (0.7 + rng() * 0.5);
      colaterais.push(ramoCurto(p, ang, 10 + rng() * 10 + e * 1.6, 0.6 + e * 0.18, rng));
    }
  }
  // arborização terminal: do fim do axônio, abre em leque em volta do nó filho
  const terminais: Ramo[] = [];
  const nTerm = simples ? 2 : ramosTerminaisDe(e);
  const pt = bezier(p0, c1, c2, p1, 0.9);
  const angChega = Math.atan2(filho.y - pt.y, filho.x - pt.x);
  for (let i = 0; i < nTerm; i++) {
    const abre = ((i - (nTerm - 1) / 2) / Math.max(1, nTerm - 1)) * 1.6;
    terminais.push(ramoCurto(pt, angChega + abre, rFilho * 0.9 + 6 + rng() * 5, 0.5 + e * 0.12, rng));
  }
  let comprimento = 0, ant = p0;
  for (let i = 1; i <= 12; i++) { const q = bezier(p0, c1, c2, p1, i / 12); comprimento += Math.hypot(q.x - ant.x, q.y - ant.y); ant = q; }
  return { eixo: caminhoBezier(p0, c1, c2, p1), fibras, nucleo, colaterais, terminais, comprimento };
}

/** Dendritos afilados em volta de um nó: 3+round(e*0.8); os 2 primeiros com um sub-ramo. */
export function dendritos(c: Pt, r: number, e: number, id: string): string[] {
  const rng = rngDe(id, "dendritos");
  const n = dendritosDe(e);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + rng() * 0.6;
    const de = { x: c.x + Math.cos(ang) * r * 0.85, y: c.y + Math.sin(ang) * r * 0.85 };
    const len = 7 + rng() * 9 + e * 1.2;
    const ramo = ramoCurto(de, ang, len, 1.1 + e * 0.22, rng);
    out.push(ramo.d);
    if (i < 2) {
      const meio = { x: de.x + Math.cos(ang) * len * 0.55, y: de.y + Math.sin(ang) * len * 0.55 };
      out.push(ramoCurto(meio, ang + (rng() > 0.5 ? 0.8 : -0.8), len * 0.5, 0.6 + e * 0.1, rng).d);
    }
  }
  return out;
}
