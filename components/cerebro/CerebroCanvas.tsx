"use client";
/**
 * CerebroCanvas — a nuvem de partículas em forma de cérebro (porte do protótipo aprovado em
 * docs/prototypes/cerebro-particulas.html). Desktop-only, lazy, PAUSA fora de tela (IntersectionObserver)
 * e com a aba oculta. Cada nó do BACKBONE governa uma REGIÃO: laranja = a conquistar, âmbar = você está
 * aqui, azul = aprendido/aplicado, quase-branco = validado. Arraste pra girar.
 */
import { useEffect, useMemo, useRef } from "react";
import type { EstadoNo, MapaAresta, MapaNo } from "@/lib/map/tipos";

export type RegiaoVisual = {
  id: string; label: string; estado: EstadoNo; aqui?: boolean; gate?: boolean; recente?: boolean;
  /** MEMÓRIA (§4.3): quantos nós com gaveta vivem nesta região (→ sinapses azuis ao redor) e quantas gavetas no total. */
  memoria?: number; gavetas?: number;
};
/** Sinapse entre regiões = aresta de memória entre nós de regiões diferentes (azul pulsante). */
export type Sinapse = { a: number; b: number; peso: number };
const AMARELO = "#ffd56b", AZUL = "#49b6ff";

type Cor = "natocado" | "progresso" | "aprendido" | "aplicado" | "validado";
const SCOL: Record<Cor, string> = { natocado: "#e88a2e", progresso: "#ffbe54", aprendido: "#78beff", aplicado: "#aadcff", validado: "#e0f4ff" };
const ALPHA: Record<Cor, number> = { natocado: 0.55, progresso: 0.95, aprendido: 0.95, aplicado: 1, validado: 1 };
const corDe = (r: RegiaoVisual): Cor => (r.aqui && r.estado === "a_conquistar" ? "progresso" : r.estado === "a_conquistar" ? "natocado" : r.estado);

// Âncoras das regiões (coords locais do protótipo) + fibonacci pra backbones maiores.
const ANCORAS: [number, number, number][] = [[-0.6, 0.5, 0.72], [0.56, 0.56, 0.42], [-0.66, 0.16, -0.04], [0.66, 0.22, -0.46], [-0.34, -0.08, -0.82], [0.08, -0.5, -0.92]];
function ancora(i: number, n: number): [number, number, number] {
  if (i < ANCORAS.length && n <= ANCORAS.length) return ANCORAS[i]!;
  const k = i + 0.5, phi = Math.acos(1 - 2 * k / n), th = Math.PI * (1 + Math.sqrt(5)) * k;
  return [0.62 * Math.sin(phi) * Math.cos(th), 0.55 * Math.cos(phi) + 0.05, 1.0 * Math.sin(phi) * Math.sin(th)];
}

type P = { x: number; y: number; z: number; reg: number; b: number };
type Syn = { a: P; ctrl: { x: number; y: number; z: number }; b: P; reg: number; ph: number; cross: boolean };

function construirNuvem(nReg: number): { P: P[]; SYN: Syn[] } {
  const R = 1.0, P: P[] = [], SYN: Syn[] = [];
  const anc = [...Array(nReg)].map((_, i) => ancora(i, nReg));
  const nearest = (x: number, y: number, z: number) => { let bi = 0, bd = 1e9; for (let i = 0; i < anc.length; i++) { const q = anc[i]!; const d = (x - q[0] * R) ** 2 + (y - q[1] * R) ** 2 + (z - q[2] * R) ** 2; if (d < bd) { bd = d; bi = i; } } return bi; };
  const noise = (a: number, b: number, c: number) => 0.5 * Math.sin(6 * a) * Math.sin(5 * b) + 0.3 * Math.sin(9 * c + 3 * a) + 0.2 * Math.sin(7 * b - 4 * c);
  const add = (x: number, y: number, z: number) => P.push({ x: x * R, y: y * R, z: z * R, reg: nearest(x, y, z), b: 0.45 + Math.random() * 0.5 });
  for (let i = 0; i < 4200; i++) {
    const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    const dx = Math.abs(r * Math.cos(th)), dy = u, dz = r * Math.sin(th);
    let x = dx * 0.60 * (1 - 0.16 * dz * dz), y = dy * 0.72, z = dz * 1.20;
    if (z > 0.55) x *= 0.88; if (z > 0.80) y *= 0.92; if (y < 0) y *= 0.64; y += 0.06;
    const gyri = 0.055 * Math.abs(Math.sin(7 * th + 3 * dz)) + 0.050 * Math.abs(Math.sin(5.5 * u * Math.PI)) + 0.030 * noise(th, u, dz) + (Math.random() - 0.5) * 0.02;
    const wr = 1 + gyri; x *= wr; y *= wr; z *= wr; x += 0.02;
    add(x, y, z); add(-x, y, z);
  }
  for (let i = 0; i < 700; i++) { const t = Math.random(), az = Math.random() * Math.PI * 2, rr = 0.13 * (0.7 + 0.3 * Math.random()); const cx = 0.50, cy = -0.30 - 0.05 * Math.sin(t * 3), cz = -0.25 + t * 0.95; let x = cx + Math.cos(az) * rr; const y = cy + Math.sin(az) * rr * 0.8, z = cz + Math.cos(az * 0.5) * 0.04; x *= 1 + 0.06 * Math.abs(Math.sin(9 * t)); add(x, y, z); add(-x, y, z); }
  for (let i = 0; i < 800; i++) { const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u); let x = Math.abs(r * Math.cos(th)) * 0.46, z = r * Math.sin(th) * 0.34; const y = u * 0.24; const foli = 1 + 0.15 * Math.abs(Math.sin(18 * u)) + 0.04 * Math.sin(9 * th); x *= foli; z *= foli; add(x, -0.30 + y, -0.72 + z); add(-x, -0.30 + y, -0.72 + z); }
  for (let i = 0; i < 150; i++) { const t = Math.random(); add((Math.random() - 0.5) * 0.13, -0.04 - t * 0.26, -0.58 - t * 0.14); }
  for (let i = 0; i < 150; i++) add((Math.random() - 0.5) * 0.10, -0.40 - Math.random() * 0.46, -0.50 + (Math.random() - 0.5) * 0.12);
  const mk = (a: P, b: P, cross: boolean) => { const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, mz = (a.z + b.z) / 2, len = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z); const pull = 0.55 + Math.random() * 0.25; SYN.push({ a, b, reg: a.reg, ph: Math.random(), cross, ctrl: { x: mx * (1 - pull) + (Math.random() - 0.5) * len * 0.12, y: my * (1 - pull) + (Math.random() - 0.5) * len * 0.12, z: mz * (1 - pull) + (Math.random() - 0.5) * len * 0.12 } }); };
  for (let k = 0; k < 450; k++) { const a = P[(Math.random() * P.length) | 0]!; let b: P | null = null, bd = 0.16; for (let t = 0; t < 30; t++) { const c = P[(Math.random() * P.length) | 0]!; const d = Math.hypot(a.x - c.x, a.y - c.y, a.z - c.z); if (d > 0.05 && d < bd) { bd = d; b = c; } } if (b && a.reg === b.reg) mk(a, b, false); }
  for (let k = 0; k < 90; k++) { const a = P[(Math.random() * P.length) | 0]!, b = P[(Math.random() * P.length) | 0]!; const d = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z); if (d > 0.5 && d < 1.4) mk(a, b, true); }
  return { P, SYN };
}

function glow(size: number, core: string): HTMLCanvasElement {
  const s = document.createElement("canvas"); s.width = s.height = size;
  const g = s.getContext("2d")!; const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, core); grd.addColorStop(0.35, core.replace(/[\d.]+\)$/, "0.45)")); grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd; g.beginPath(); g.arc(size / 2, size / 2, size / 2, 0, 7); g.fill(); return s;
}
const hexRgba = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };

export default function CerebroCanvas({ regioes, sinapses = [], onRegiao }: { regioes: RegiaoVisual[]; sinapses?: Sinapse[]; onRegiao?: (r: RegiaoVisual) => void }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const regioesRef = useRef(regioes); regioesRef.current = regioes;
  const sinapsesRef = useRef(sinapses); sinapsesRef.current = sinapses;
  const nReg = Math.max(1, regioes.length);
  const nuvem = useMemo(() => (typeof window === "undefined" ? null : construirNuvem(nReg)), [nReg]);

  useEffect(() => {
    const cv = cvRef.current, wrap = wrapRef.current, labels = labelsRef.current;
    if (!cv || !wrap || !labels || !nuvem) return;
    const ctx = cv.getContext("2d")!;
    const { P, SYN } = nuvem;
    let W = 0, H = 0, raf = 0, visivel = true, oculto = false, drag = false, px = 0, py = 0, yaw = 0.6, pitch = -0.12;
    const resize = () => { const dpr = Math.min(devicePixelRatio || 1, 2); const r = cv.getBoundingClientRect(); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(cv);
    const SPR: Record<Cor, HTMLCanvasElement> = { natocado: glow(30, "rgba(232,138,46,1)"), progresso: glow(30, "rgba(255,190,84,1)"), aprendido: glow(30, "rgba(120,190,255,1)"), aplicado: glow(30, "rgba(170,220,255,1)"), validado: glow(30, "rgba(224,244,255,1)") };
    const gc: Record<string, HTMLCanvasElement> = {};
    const glowCache = (hex: string) => (gc[hex] ??= glow(34, hexRgba(hex, 0.98)));
    const chips = regioesRef.current.map(() => { const d = document.createElement("div"); d.className = "cerebro-node"; labels.appendChild(d); const h = document.createElement("div"); h.className = "cerebro-here"; h.textContent = "você está aqui"; h.style.opacity = "0"; labels.appendChild(h); return { el: d, here: h }; });
    chips.forEach((c, i) => { c.el.onclick = () => onRegiao?.(regioesRef.current[i]!); c.el.style.pointerEvents = onRegiao ? "auto" : "none"; });
    const project = (p: { x: number; y: number; z: number }) => { const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch); const x = p.x * cy - p.z * sy, z = p.x * sy + p.z * cy, y = p.y; const y2 = y * cp - z * sp, z2 = y * sp + z * cp; const f = 3.0, s = f / (f - z2), scale = Math.min(W, H) * 0.42; return { sx: W / 2 + x * scale * s, sy: H / 2 - y2 * scale * s, s, z: z2 }; };
    const bez = (a: P, c: { x: number; y: number; z: number }, b: P, t: number) => { const m = 1 - t, k0 = m * m, k1 = 2 * m * t, k2 = t * t; return { x: k0 * a.x + k1 * c.x + k2 * b.x, y: k0 * a.y + k1 * c.y + k2 * b.y, z: k0 * a.z + k1 * c.z + k2 * b.z }; };
    const anc = [...Array(nReg)].map((_, i) => ancora(i, nReg));
    const draw = () => {
      raf = requestAnimationFrame(draw);
      if (!visivel || oculto) return; // fora de tela / aba trocada: não gasta CPU
      const regs = regioesRef.current;
      if (!drag) yaw += 0.0024;
      ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = "rgba(2,4,10,0.32)"; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      const t = performance.now() * 0.004;
      const goal = regs.findIndex((r) => r.aqui);
      const cores = regs.map(corDe);
      for (let i = 0; i < P.length; i++) {
        const reg = Math.min(P[i]!.reg, regs.length - 1); if (reg < 0) continue;
        const st = cores[reg]!, pr = project(P[i]!), depth = (pr.z + 1.4) / 2.8;
        let a = (0.25 + depth * 0.75) * P[i]!.b * ALPHA[st], sz = (1.2 + depth * 2.6) * pr.s;
        if (st === "progresso" || st === "validado") { const pl = 1 + 0.18 * Math.sin(t + reg); a *= pl; sz *= pl; }
        if (reg === goal) a *= 0.6 + 0.4 * Math.sin(t * 1.3 + i * 0.01);
        if (regs[reg]!.recente) a *= 1.25;
        ctx.globalAlpha = Math.min(1, a); ctx.drawImage(SPR[st], pr.sx - sz / 2, pr.sy - sz / 2, sz, sz);
      }
      const SEG = 7;
      for (const s of SYN) {
        const reg = Math.min(s.reg, regs.length - 1); if (reg < 0) continue;
        const st = cores[reg]!, lit = st !== "natocado", col = lit ? SCOL[st] : s.cross ? "#2b4c82" : "#243a63";
        ctx.strokeStyle = col; ctx.lineWidth = lit ? 1.1 : 0.7; ctx.globalAlpha = lit ? 0.22 : 0.09; ctx.beginPath();
        for (let k = 0; k <= SEG; k++) { const pt = project(bez(s.a, s.ctrl, s.b, k / SEG)); k ? ctx.lineTo(pt.sx, pt.sy) : ctx.moveTo(pt.sx, pt.sy); }
        ctx.stroke();
        if (lit) { const f = Math.sin(t * 0.45 + s.ph * 6) * 0.5 + 0.5, pt = project(bez(s.a, s.ctrl, s.b, f)); ctx.globalAlpha = 0.95; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(pt.sx, pt.sy, 1.7, 0, 7); ctx.fill(); }
      }
      const proj = anc.map((p) => project({ x: p[0], y: p[1], z: p[2] }));
      // ── SINAPSES AZUIS (memória, §4.3): entre regiões ligadas por memória — curvas puxadas pro centro,
      //    pulsando de leve (vivo); e, ao redor de cada região, um pontinho azul por nó com gaveta.
      for (const s of sinapsesRef.current) {
        const A = anc[s.a], B = anc[s.b]; if (!A || !B || s.a >= regs.length || s.b >= regs.length) continue;
        const ctrl = { x: (A[0] + B[0]) * 0.25, y: (A[1] + B[1]) * 0.25, z: (A[2] + B[2]) * 0.25 };
        const pulso = 0.55 + 0.45 * Math.sin(t * 0.6 + (s.a + 1) * (s.b + 1));
        ctx.strokeStyle = AZUL; ctx.lineWidth = 1 + 1.2 * s.peso; ctx.globalAlpha = 0.18 + 0.32 * pulso; ctx.beginPath();
        for (let k = 0; k <= 10; k++) { const pt = project(bez({ x: A[0], y: A[1], z: A[2] } as P, ctrl, { x: B[0], y: B[1], z: B[2] } as P, k / 10)); k ? ctx.lineTo(pt.sx, pt.sy) : ctx.moveTo(pt.sx, pt.sy); }
        ctx.stroke();
        const f = (t * 0.25 + s.a * 0.37) % 1, pt = project(bez({ x: A[0], y: A[1], z: A[2] } as P, ctrl, { x: B[0], y: B[1], z: B[2] } as P, f));
        ctx.globalAlpha = 0.9; ctx.fillStyle = AZUL; ctx.beginPath(); ctx.arc(pt.sx, pt.sy, 2, 0, 7); ctx.fill();
      }
      regs.forEach((n, i) => {
        const m = Math.min(n.memoria ?? 0, 14); if (!m) return; const A = anc[i]!;
        for (let k = 0; k < m; k++) {
          const ang = (k / m) * Math.PI * 2 + i, r = 0.16 + 0.05 * ((k * 7) % 3);
          const pt = project({ x: A[0] + Math.cos(ang) * r, y: A[1] + Math.sin(ang * 1.3) * r * 0.6, z: A[2] + Math.sin(ang) * r });
          const pulso = 0.5 + 0.5 * Math.sin(t * 0.9 + k * 1.7 + i);
          ctx.globalAlpha = 0.35 + 0.5 * pulso; ctx.strokeStyle = AZUL; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(proj[i]!.sx, proj[i]!.sy); ctx.lineTo(pt.sx, pt.sy); ctx.stroke();
          ctx.fillStyle = AZUL; ctx.beginPath(); ctx.arc(pt.sx, pt.sy, 1.6 + 1.2 * pulso, 0, 7); ctx.fill();
        }
      });
      // ── PERCURSO AMARELO (pré-requisito: pra onde ir) ──
      ctx.globalAlpha = 0.9; ctx.lineWidth = 2.2; ctx.strokeStyle = AMARELO; ctx.shadowColor = AMARELO; ctx.shadowBlur = 8; ctx.beginPath();
      proj.slice(0, regs.length).forEach((q, i) => (i ? ctx.lineTo(q.sx, q.sy) : ctx.moveTo(q.sx, q.sy))); ctx.stroke(); ctx.shadowBlur = 0;
      // ── BOARDS (as palavras) FORA do mapa, ligados ao nó por uma linha: o mapa de partículas fica livre ──
      const cx = W / 2, cy = H / 2, rx = W * 0.43, ry = H * 0.4;
      const bx: number[] = [], by: number[] = [], bw: number[] = [];
      regs.forEach((_, i) => { const q = proj[i]; const c = chips[i]; if (!q || !c) { bx.push(0); by.push(0); bw.push(0); return; } const ang = Math.atan2(q.sy - cy, q.sx - cx); bx.push(cx + Math.cos(ang) * rx); by.push(cy + Math.sin(ang) * ry); bw.push(c.el.offsetWidth || 120); });
      // sem sobreposição: em cada lado (esq/dir), separa os boards verticalmente
      for (const lado of [-1, 1]) {
        const ids = regs.map((_, i) => i).filter((i) => (bx[i]! - cx) * lado >= 0).sort((p, q) => by[p]! - by[q]!);
        for (let k = 1; k < ids.length; k++) { const prev = ids[k - 1]!, cur = ids[k]!; if (by[cur]! - by[prev]! < 30) by[cur] = by[prev]! + 30; }
      }
      regs.forEach((n, i) => {
        const q = proj[i]; if (!q) return; const col = SCOL[cores[i]!];
        const puls = cores[i] === "progresso" || cores[i] === "validado" || i === goal ? 1 + 0.28 * Math.sin(t + i) : 1;
        const sz = 16 + 8 * puls; ctx.globalAlpha = 0.98; ctx.drawImage(glowCache(col), q.sx - sz / 2, q.sy - sz / 2, sz, sz);
        const vis = q.z > -0.95, c = chips[i]; if (!c) return;
        const hw = bw[i]! / 2, x = Math.min(W - hw - 8, Math.max(hw + 8, bx[i]!)), y = Math.min(H - 18, Math.max(18, by[i]!));
        // linha conectora: do nó até a borda do board mais próxima
        const ax = q.sx < x ? x - hw : x + hw;
        ctx.globalAlpha = vis ? 0.55 : 0.18; ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(q.sx, q.sy); ctx.lineTo(ax, y); ctx.stroke();
        c.el.style.opacity = vis ? "1" : "0.35"; c.el.style.color = col; c.el.style.left = x + "px"; c.el.style.top = y + "px";
        c.el.innerHTML = `<span class="dot"></span>${escapeHtml(n.label)}${n.gavetas ? ` <small style="color:${AZUL}">${n.gavetas} gaveta${n.gavetas > 1 ? "s" : ""}</small>` : ""}${n.gate ? ' <small>chancela</small>' : ""}${i === goal ? ' <span class="goal">◀ próximo</span>' : ""}`;
        c.here.style.left = q.sx + "px"; c.here.style.top = q.sy + "px"; c.here.style.opacity = n.aqui && vis ? "1" : "0";
      });
      ctx.globalAlpha = 1;
    };
    const io = new IntersectionObserver((es) => { visivel = es.some((e) => e.isIntersecting); }); io.observe(wrap);
    // Pausa quando a pessoa TROCA de aba (evento), não pelo estado inicial — painéis embutidos
    // podem reportar `hidden` no mount e o cérebro ficaria preto.
    const onVis = () => { oculto = document.visibilityState === "hidden"; };
    document.addEventListener("visibilitychange", onVis);
    const down = (e: PointerEvent) => { drag = true; px = e.clientX; py = e.clientY; cv.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => { if (!drag) return; yaw += (e.clientX - px) * 0.006; pitch = Math.max(-1.1, Math.min(1.1, pitch + (e.clientY - py) * 0.006)); px = e.clientX; py = e.clientY; };
    const up = () => { drag = false; };
    cv.addEventListener("pointerdown", down); cv.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener("visibilitychange", onVis); cv.removeEventListener("pointerdown", down); cv.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); labels.innerHTML = ""; };
  }, [nuvem, nReg, onRegiao]);

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden" style={{ background: "radial-gradient(1200px 820px at 50% 40%,#0a1430 0%,#060a1a 46%,#02040a 100%)" }}>
      <style>{`
        .cerebro-node{position:absolute;transform:translate(-50%,-50%);font-size:11.5px;white-space:nowrap;padding:4px 9px;border-radius:999px;border:1px solid currentColor;background:rgba(8,16,36,.6);backdrop-filter:blur(4px);transition:opacity .3s;font-weight:600;cursor:default}
        .cerebro-node .dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:currentColor;box-shadow:0 0 10px currentColor;margin-right:6px;vertical-align:middle}
        .cerebro-node small{color:#9fb6e0;font-weight:500;margin-left:5px;font-size:10px}
        .cerebro-node .goal{color:#bfe6ff;margin-left:6px;font-size:10px;font-weight:700}
        .cerebro-here{position:absolute;transform:translate(-50%,70%);pointer-events:none;color:#9fe0ff;font-size:11px;font-style:italic;font-weight:700;text-shadow:0 0 10px rgba(110,190,255,.6)}
      `}</style>
      <canvas ref={cvRef} className="block h-full w-full touch-none" aria-label="Mapa de conhecimento: um nó por tópico do percurso" />
      <div ref={labelsRef} className="pointer-events-none absolute inset-0 [&>.cerebro-node]:pointer-events-auto" />
    </div>
  );
}

function escapeHtml(s: string): string { return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)); }

/**
 * Regiões visuais a partir do mapa: os nós do backbone (ou os mais pesados, sem backbone), com a
 * memória agregada por região (nós com gaveta cuja `regiao` é a da região) e as sinapses entre regiões.
 */
export function regioesDoMapa(nos: MapaNo[], backbone: string[], proximoId: string | null, gateHumano: boolean, recentes: string[] = [], arestas: MapaAresta[] = []): { regioes: RegiaoVisual[]; sinapses: Sinapse[] } {
  const porId = new Map(nos.map((n) => [n.id, n]));
  const base = backbone.length ? backbone.map((id) => porId.get(id)).filter((n): n is MapaNo => !!n) : [...nos].sort((a, b) => b.peso - a.peso).slice(0, 6);
  const idxRegiao = new Map(base.map((n, i) => [n.id, i]));
  const regiaoDe = (n: MapaNo): number | undefined => idxRegiao.get(n.id) ?? (n.regiao ? idxRegiao.get(n.regiao) : undefined);
  const memoria = base.map(() => ({ nos: 0, gavetas: 0 }));
  for (const n of nos) { const g = n.drawers?.length ?? 0; if (!g) continue; const r = regiaoDe(n); if (r === undefined) continue; memoria[r]!.nos++; memoria[r]!.gavetas += g; }
  const vistas = new Map<string, Sinapse>();
  for (const a of arestas) {
    if ((a.tipoVisual ?? (a.relacao === "pre_requisito" ? "percurso" : "memoria")) !== "memoria") continue;
    const x = porId.get(a.de), y = porId.get(a.para); if (!x || !y) continue;
    const ra = regiaoDe(x), rb = regiaoDe(y); if (ra === undefined || rb === undefined || ra === rb) continue;
    const k = ra < rb ? `${ra}-${rb}` : `${rb}-${ra}`;
    const s = vistas.get(k); const peso = a.peso ?? 0.5;
    if (s) s.peso = Math.min(1, s.peso + peso * 0.3); else vistas.set(k, { a: Math.min(ra, rb), b: Math.max(ra, rb), peso: Math.min(1, peso) });
  }
  return {
    regioes: base.map((n, i) => ({ id: n.id, label: n.label, estado: n.estado, aqui: n.id === proximoId, gate: gateHumano && i === base.length - 1, recente: recentes.includes(n.id), memoria: memoria[i]!.nos, gavetas: memoria[i]!.gavetas })),
    sinapses: [...vistas.values()],
  };
}
