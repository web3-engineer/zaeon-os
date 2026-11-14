"use client";

/**
 * CursoArvoreView — a UI/UX BASE de todo curso de CÓDIGO (repo) da Zaeon: a ÁRVORE DA VIDA.
 * A jornada começa na RAIZ (semente = o repo, azul com glow constante), sobe pelo tronco e abre numa copa
 * de ramos curvos (módulos) e folhas (símbolos), simétrica, viva (balanço fluido contínuo) e com fluxo
 * pulsante de energia subindo da raiz. Os nós da copa são arrastáveis e voltam balançando pra casa.
 *
 * Motor MODULAR e imperativo (SVG + requestAnimationFrame) alimentado por layoutBotanico(curso.arvore),
 * que deriva tudo do grafo REAL (graphify → arvoreDoGrafo). Serve QUALQUER curso/skill com repositório:
 * basta a árvore — árvores maiores/menores se montam sozinhas. Sem o motor, degrada pro esqueleto (só
 * tronco + raiz), sem travar.
 */
import { useEffect, useRef } from "react";
import type { CursoRepo } from "@/lib/forja/tipos";
import { layoutBotanico, CANVAS } from "@/lib/forja/layoutBotanico";

const NS = "http://www.w3.org/2000/svg";
const el = (t: string, a: Record<string, string | number> = {}) => {
  const e = document.createElementNS(NS, t);
  for (const k in a) e.setAttribute(k, String(a[k]));
  return e;
};
const cut = (s: string, n: number) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "");

const CSS = `
  .cav-flow{stroke:#9bf3ff;stroke-linecap:round;fill:none;stroke-dasharray:3 24;opacity:.9}
  .cav-flow.up{animation:cavUp 1.5s linear infinite}
  .cav-flow.in{animation:cavIn 1.7s linear infinite}
  @keyframes cavUp{to{stroke-dashoffset:-27}}
  @keyframes cavIn{to{stroke-dashoffset:27}}
  .cav-halo{animation:cavBreathe 2.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
  @keyframes cavBreathe{0%,100%{opacity:.22;transform:scale(1)}50%{opacity:.55;transform:scale(1.5)}}
  .cav-node{cursor:grab}.cav-node:active{cursor:grabbing}
`;

type NoViz = {
  tipo: "mod" | "folha"; titulo: string; hx: number; hy: number; x: number; y: number;
  vx: number; vy: number; r: number; parent: { x: number; y: number }; drag?: boolean;
  phx: number; phy: number; ax: number; ay: number; sp: number;
};

export default function CursoArvoreView({ curso, titulo, onFechar }: { curso: CursoRepo; titulo?: string; onFechar?: () => void }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const cabecalho = (titulo || curso.arvore.raiz.titulo || "").trim();
  const semMapa = (curso.arvore.raiz.filhos?.length ?? 0) === 0;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const L = layoutBotanico(curso.arvore);
    const GEO = { cx: CANVAS.w / 2, baseY: L.semente.y };

    // defs + css
    const defs = el("defs");
    const filtro = el("filter", { id: "cav-glow", x: "-60%", y: "-60%", width: "220%", height: "220%" });
    const blur = el("feGaussianBlur", { stdDeviation: 3, result: "b" });
    const merge = el("feMerge"); merge.appendChild(el("feMergeNode", { in: "b" })); merge.appendChild(el("feMergeNode", { in: "SourceGraphic" }));
    filtro.appendChild(blur); filtro.appendChild(merge); defs.appendChild(filtro);
    const grad = el("radialGradient", { id: "cav-aura", cx: "50%", cy: "50%" });
    grad.appendChild(el("stop", { offset: "0%", "stop-color": "rgba(34,211,238,.13)" }));
    grad.appendChild(el("stop", { offset: "100%", "stop-color": "rgba(34,211,238,0)" }));
    defs.appendChild(grad); svg.appendChild(defs);
    const style = el("style"); style.textContent = CSS; svg.appendChild(style);

    // anel + aura
    svg.appendChild(el("circle", { cx: L.centro.x, cy: L.centro.y, r: L.rAnel, fill: "none", stroke: "#22d3ee", "stroke-width": 1.4, "stroke-opacity": 0.2 }));
    svg.appendChild(el("circle", { cx: L.centro.x, cy: 300, r: 250, fill: "url(#cav-aura)" }));

    // raízes simétricas + fluxo entrando
    const gRaiz = el("g"); svg.appendChild(gRaiz);
    L.raizes.forEach((r, i) => {
      gRaiz.appendChild(el("path", { d: r.d, fill: "none", stroke: "#1b6f86", "stroke-width": i < 2 ? 3.2 : i < 4 ? 2.7 : i < 6 ? 2.2 : 3, "stroke-linecap": "round", "stroke-opacity": 0.8 }));
      const fw = el("path", { d: r.d, class: "cav-flow in" }); gRaiz.appendChild(fw);
    });

    // tronco (levemente curvo) + fluxo subindo
    const gT = el("g"); svg.appendChild(gT);
    gT.appendChild(el("path", { d: L.troncoPath, fill: "none", stroke: "#2b8fa6", "stroke-width": 9, "stroke-linecap": "round" }));
    gT.appendChild(el("path", { d: L.troncoPath, class: "cav-flow up" }));

    // nós móveis (copa)
    const gLinks = el("g"), gFlow = el("g"), gNodes = el("g");
    svg.appendChild(gLinks); svg.appendChild(gFlow); svg.appendChild(gNodes);
    let seed = 1; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const nodes: NoViz[] = [];
    L.ramos.forEach((ramo) => {
      const mod: NoViz = { tipo: "mod", titulo: ramo.titulo, hx: ramo.hx, hy: ramo.hy, x: ramo.hx, y: ramo.hy, vx: 0, vy: 0, r: L.ramos.length > 8 ? 7 : 9, parent: L.anchor, phx: rnd() * 6.28, phy: rnd() * 6.28, ax: 7 + rnd() * 4, ay: 6 + rnd() * 3, sp: 0.0005 + rnd() * 0.0004 };
      nodes.push(mod);
      ramo.folhas.forEach((lf) => {
        nodes.push({ tipo: "folha", titulo: lf.titulo, hx: lf.hx, hy: lf.hy, x: lf.hx, y: lf.hy, vx: 0, vy: 0, r: 5, parent: mod, phx: rnd() * 6.28, phy: rnd() * 6.28, ax: 5 + rnd() * 3, ay: 5 + rnd() * 3, sp: 0.0006 + rnd() * 0.0005 });
      });
    });

    const draw = new Map<NoViz, { ln: SVGElement; fw: SVGElement; g: SVGElement; c: SVGElement; t: SVGElement }>();
    const cleanups: (() => void)[] = [];
    nodes.forEach((nn) => {
      const ehMod = nn.tipo === "mod";
      const ln = el("path", { fill: "none", stroke: "#22d3ee", "stroke-width": ehMod ? 3 : 1.6, "stroke-opacity": ehMod ? 0.85 : 0.5 }); gLinks.appendChild(ln);
      const fw = el("path", { class: "cav-flow up" }); if (!ehMod) (fw as SVGElement).setAttribute("style", "animation-duration:2.1s"); gFlow.appendChild(fw);
      const g = el("g", { class: "cav-node" });
      const c = el("circle", { r: nn.r, fill: ehMod ? "#22d3ee" : "#0e2a3a", stroke: ehMod ? "#a5f3fc" : "#22d3ee", "stroke-width": ehMod ? 2 : 1.5, filter: "url(#cav-glow)" });
      const t = el("text", { "text-anchor": "middle", fill: ehMod ? "#fff" : "rgba(165,243,252,.72)", "font-size": ehMod ? 12 : 10, "font-weight": ehMod ? 700 : 400 });
      t.textContent = cut(nn.titulo, ehMod ? 20 : 16); (t as SVGElement).style.pointerEvents = "none";
      g.appendChild(c); g.appendChild(t); gNodes.appendChild(g);
      draw.set(nn, { ln, fw, g, c, t });

      const svgPt = (ev: PointerEvent) => { const p = svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; return p.matrixTransform(svg.getScreenCTM()!.inverse()); };
      const down = (e: PointerEvent) => { nn.drag = true; g.setPointerCapture(e.pointerId); e.preventDefault(); };
      const move = (e: PointerEvent) => { if (!nn.drag) return; const p = svgPt(e); nn.x = p.x; nn.y = p.y; nn.vx = 0; nn.vy = 0; };
      const up = () => { nn.drag = false; };
      g.addEventListener("pointerdown", down); g.addEventListener("pointermove", move); g.addEventListener("pointerup", up); g.addEventListener("pointercancel", up);
      cleanups.push(() => { g.removeEventListener("pointerdown", down); g.removeEventListener("pointermove", move); g.removeEventListener("pointerup", up); g.removeEventListener("pointercancel", up); });
    });

    // nó-raiz = INÍCIO: azul, glow constante
    const gR = el("g"); svg.appendChild(gR);
    gR.appendChild(el("circle", { cx: GEO.cx, cy: GEO.baseY, r: 16, fill: "#22d3ee", class: "cav-halo" }));
    gR.appendChild(el("circle", { cx: GEO.cx, cy: GEO.baseY, r: 13, fill: "#0b3a66", stroke: "#a5f3fc", "stroke-width": 2.5, filter: "url(#cav-glow)" }));
    gR.appendChild(el("circle", { cx: GEO.cx, cy: GEO.baseY, r: 5, fill: "#a5f3fc" }));
    const st = el("text", { x: GEO.cx, y: GEO.baseY + 30, "text-anchor": "middle", fill: "#a5f3fc", "font-size": 13, "font-weight": 800 }); st.textContent = cut(L.semente.titulo, 34); gR.appendChild(st);
    const aq = el("text", { x: GEO.cx, y: GEO.baseY + 48, "text-anchor": "middle", fill: "#22d3ee", "font-size": 11, "font-weight": 700 }); aq.textContent = "comece por aqui — pela raiz"; gR.appendChild(aq);

    // física fluida: mola macia pra uma casa que balança devagar (vivo, não volátil)
    const curva = (a: { x: number; y: number }, b: NoViz, ehMod: boolean) => {
      if (ehMod) { const c1x = a.x + (b.x - a.x) * 0.16, c1y = a.y - 72, c2x = b.x - (b.x - a.x) * 0.14, c2y = b.y + 46; return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`; }
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, px = -dy / len, py = dx / len, side = b.x >= GEO.cx ? 1 : -1;
      const mx = (a.x + b.x) / 2 + px * len * 0.26 * side, my = (a.y + b.y) / 2 + py * len * 0.26 * side;
      return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
    };
    const t0 = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const t = now - t0;
      for (const nn of nodes) {
        if (!nn.drag) {
          const tx = nn.hx + Math.sin(t * nn.sp + nn.phx) * nn.ax;
          const ty = nn.hy + Math.cos(t * nn.sp * 0.8 + nn.phy) * nn.ay;
          nn.vx += (tx - nn.x) * 0.045; nn.vy += (ty - nn.y) * 0.045;
          for (const o of nodes) { if (o === nn) continue; const dx = nn.x - o.x, dy = nn.y - o.y, d2 = dx * dx + dy * dy; if (d2 > 1 && d2 < 1400) { const ff = 220 / d2, d = Math.sqrt(d2); nn.vx += (dx / d) * ff; nn.vy += (dy / d) * ff; } }
          nn.vx *= 0.84; nn.vy *= 0.84; nn.x += nn.vx; nn.y += nn.vy;
        }
        const s = draw.get(nn)!, ehMod = nn.tipo === "mod", d = curva(nn.parent, nn, ehMod);
        s.ln.setAttribute("d", d); s.fw.setAttribute("d", d);
        s.c.setAttribute("cx", String(nn.x)); s.c.setAttribute("cy", String(nn.y));
        s.t.setAttribute("x", String(nn.x)); s.t.setAttribute("y", String(nn.y - nn.r - 6));
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => { cancelAnimationFrame(raf); cleanups.forEach((f) => f()); while (svg.firstChild) svg.removeChild(svg.firstChild); };
  }, [curso.arvore]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#060b16]">
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 34%, rgba(34,211,238,0.12), transparent 60%)" }} />
      <div className="absolute left-5 top-4 z-20">
        <div className="font-mono text-[12px] text-cyan-400/90">{curso.repo}</div>
        <div className="text-[18px] font-black tracking-tight text-white">{cabecalho}</div>
      </div>
      {onFechar && (
        <button type="button" onClick={onFechar} aria-label="voltar"
          className="absolute right-4 top-4 z-30 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[12px] text-white/70 hover:text-white">← voltar</button>
      )}
      <svg ref={svgRef} viewBox={`0 0 ${CANVAS.w} ${CANVAS.h}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet" style={{ touchAction: "none" }} />
      <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 text-[11px] text-cyan-100/50">a jornada começa na raiz ↓ · arraste os nós da copa pra explorar</div>
      {semMapa && (
        <div className="pointer-events-none absolute bottom-10 left-1/2 z-20 -translate-x-1/2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] text-amber-200/80">
          a copa ganha galhos quando o motor analisar o repositório
        </div>
      )}
    </div>
  );
}
