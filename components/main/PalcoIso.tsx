"use client";
/**
 * PalcoIso — um palco ISOMÉTRICO: estruturas de engenharia (usina solar, data center, braço robótico, satélite,
 * powertrain, reator) se MONTAM peça a peça e, depois de um tempo, se DESMONTAM — uma de cada vez, em loop. Em volta,
 * ícones de trabalhos científicos, peças e equipamentos flutuam. Tudo em SVG + CSS + framer-motion (leve, sem 3D).
 * As posições das peças saem do projetor iso (determinístico → sem mismatch de hidratação); a montagem/desmontagem é o
 * stagger de entrada/saída do framer-motion; a flutuação dos ícones e o parallax leve são CSS/rAF.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import "./palco-iso.css";

const VBW = 1000, VBH = 470;
const S = 25, OX = 500, OY = 300;            // unidade e origem do projetor iso
const iso = (x: number, y: number, z: number): [number, number] => [OX + (x - y) * 0.866 * S, OY + ((x + y) * 0.5 - z) * S];
const pt = (a: [number, number]) => `${a[0].toFixed(1)},${a[1].toFixed(1)}`;
const face = (pts: [number, number][], fill: string, stroke: string, key: string) =>
  <polygon key={key} points={pts.map(pt).join(" ")} fill={fill} stroke={stroke} strokeWidth={1} strokeLinejoin="round" />;

/** um bloco iso (3 faces visíveis: topo mais claro, direita média, esquerda escura) em traço de neon translúcido */
function cubo(x: number, y: number, z: number, w: number, d: number, h: number, cor: string, key: string): ReactNode {
  const edge = `color-mix(in srgb, ${cor} 80%, white)`;
  const top: [number, number][] = [iso(x, y, z + h), iso(x + w, y, z + h), iso(x + w, y + d, z + h), iso(x, y + d, z + h)];
  const right: [number, number][] = [iso(x + w, y, z + h), iso(x + w, y + d, z + h), iso(x + w, y + d, z), iso(x + w, y, z)];
  const left: [number, number][] = [iso(x, y + d, z + h), iso(x + w, y + d, z + h), iso(x + w, y + d, z), iso(x, y + d, z)];
  return (
    <g key={key}>
      {face(left, `color-mix(in srgb, ${cor} 16%, transparent)`, edge, "l")}
      {face(right, `color-mix(in srgb, ${cor} 30%, transparent)`, edge, "r")}
      {face(top, `color-mix(in srgb, ${cor} 52%, transparent)`, edge, "t")}
    </g>
  );
}

type Peca = { dx: number; dy: number; el: ReactNode };
type Estrutura = { nome: string; sub: string; cor: string; pecas: Peca[] };

const EST: readonly Estrutura[] = [
  { nome: "Usina solar", sub: "captação fotovoltaica + MPPT", cor: "#46b0ff", pecas: [
    { dx: 0, dy: 80, el: cubo(-2, -2, 0, 4, 4, 0.4, "#46b0ff", "b") },
    { dx: -55, dy: -10, el: cubo(-1.7, -1.7, 0.4, 0.5, 0.5, 1.5, "#46b0ff", "p1") },
    { dx: 55, dy: -10, el: cubo(1.2, 1.2, 0.4, 0.5, 0.5, 1.5, "#46b0ff", "p2") },
    { dx: 0, dy: -80, el: cubo(-2, -2, 1.9, 4, 2.4, 0.22, "#46b0ff", "pan") },
  ] },
  { nome: "Data center", sub: "racks e refrigeração", cor: "#38f0ff", pecas: [
    { dx: 0, dy: 80, el: cubo(-1.6, -1.6, 0, 3.2, 3.2, 0.4, "#38f0ff", "b") },
    { dx: -65, dy: -20, el: cubo(-1.2, -1.2, 0.4, 2.4, 2.4, 0.9, "#38f0ff", "r1") },
    { dx: 65, dy: -40, el: cubo(-1.2, -1.2, 1.3, 2.4, 2.4, 0.9, "#38f0ff", "r2") },
    { dx: 0, dy: -90, el: cubo(-1.2, -1.2, 2.2, 2.4, 2.4, 0.7, "#38f0ff", "r3") },
  ] },
  { nome: "Braço robótico", sub: "6 eixos, torque real", cor: "#49f2a0", pecas: [
    { dx: 0, dy: 80, el: cubo(-1.3, -1.3, 0, 2.6, 2.6, 0.5, "#49f2a0", "b") },
    { dx: -45, dy: -30, el: cubo(-0.5, -0.5, 0.5, 1, 1, 1.4, "#49f2a0", "s1") },
    { dx: 60, dy: -55, el: cubo(-0.4, -0.4, 1.9, 0.8, 2.4, 0.4, "#49f2a0", "s2") },
    { dx: 0, dy: -90, el: cubo(-0.3, 1.6, 1.9, 0.6, 0.6, 0.7, "#49f2a0", "grip") },
  ] },
  { nome: "Satélite", sub: "telemetria + antena", cor: "#8b5cf6", pecas: [
    { dx: 0, dy: 80, el: cubo(-0.9, -0.9, 0.8, 1.8, 1.8, 1.6, "#8b5cf6", "body") },
    { dx: -90, dy: 0, el: cubo(-3, -0.6, 1.2, 2, 1.2, 0.14, "#8b5cf6", "wl") },
    { dx: 90, dy: 0, el: cubo(1, -0.6, 1.2, 2, 1.2, 0.14, "#8b5cf6", "wr") },
    { dx: 0, dy: -90, el: cubo(-0.4, -0.4, 2.4, 0.8, 0.8, 0.5, "#8b5cf6", "dish") },
  ] },
  { nome: "Powertrain", sub: "motor BLDC + bateria", cor: "#ff9f45", pecas: [
    { dx: 0, dy: 80, el: cubo(-2, -1.2, 0, 4, 2.4, 0.4, "#ff9f45", "b") },
    { dx: -55, dy: -30, el: cubo(-1.7, -0.8, 0.4, 1.4, 1.4, 1.2, "#ff9f45", "motor") },
    { dx: 55, dy: -30, el: cubo(0.4, -0.8, 0.4, 1.4, 1.4, 1, "#ff9f45", "bat") },
    { dx: 0, dy: -75, el: cubo(-0.3, -0.2, 1.6, 0.6, 0.4, 0.3, "#ff9f45", "term") },
  ] },
  { nome: "Reator", sub: "turbina + núcleo", cor: "#ff7ac6", pecas: [
    { dx: 0, dy: 80, el: cubo(-1.8, -1.8, 0, 3.6, 3.6, 0.4, "#ff7ac6", "b") },
    { dx: 0, dy: -65, el: cubo(-1, -1, 0.4, 2, 2, 1.6, "#ff7ac6", "core") },
    { dx: 0, dy: -95, el: cubo(-1.4, -1.4, 2, 2.8, 2.8, 0.3, "#ff7ac6", "cap") },
  ] },
];

/** ícones de trabalhos científicos, peças e equipamentos espalhados em volta (flutuam) */
const ICONES = [
  { e: "🔬", x: 95, y: 130 }, { e: "🧬", x: 300, y: 92 }, { e: "💡", x: 440, y: 70 }, { e: "📐", x: 690, y: 92 },
  { e: "⚙️", x: 850, y: 130 }, { e: "🔩", x: 925, y: 300 }, { e: "🛰️", x: 775, y: 392 }, { e: "🔭", x: 560, y: 420 },
  { e: "📊", x: 250, y: 430 }, { e: "🧪", x: 150, y: 370 }, { e: "📄", x: 95, y: 270 }, { e: "🧲", x: 905, y: 420 },
];

const cont: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.17, delayChildren: 0.06 } },
  exit: { transition: { staggerChildren: 0.12, staggerDirection: -1 } },
};
const pecaV: Variants = {
  hidden: (c: { dx: number; dy: number }) => ({ opacity: 0, x: c.dx, y: c.dy }),
  show: { opacity: 1, x: 0, y: 0, transition: { type: "spring", stiffness: 150, damping: 17 } },
  exit: (c: { dx: number; dy: number }) => ({ opacity: 0, x: c.dx, y: c.dy, transition: { duration: 0.32, ease: "easeIn" } }),
};

export default function PalcoIso({ className = "" }: { className?: string }) {
  const [idx, setIdx] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const cenaRef = useRef<SVGGElement>(null);
  const iconesRef = useRef<SVGGElement>(null);

  // troca de estrutura em loop — cada uma monta, segura, desmonta e dá lugar à próxima
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % EST.length), 5200);
    return () => clearInterval(t);
  }, []);

  const grade = useMemo(() => {
    const ls: ReactNode[] = [];
    const R = 7;
    for (let i = -R; i <= R; i++) {
      ls.push(<line key={`a${i}`} x1={iso(i, -R, 0)[0]} y1={iso(i, -R, 0)[1]} x2={iso(i, R, 0)[0]} y2={iso(i, R, 0)[1]} />);
      ls.push(<line key={`b${i}`} x1={iso(-R, i, 0)[0]} y1={iso(-R, i, 0)[1]} x2={iso(R, i, 0)[0]} y2={iso(R, i, 0)[1]} />);
    }
    return ls;
  }, []);

  // parallax leve: a cena e os ícones deslizam um tiquinho com o mouse (ícones mais, por serem "da frente")
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    let raf = 0, ev: { x: number; y: number } | null = null;
    const aplicar = () => {
      raf = 0;
      const r = svg.getBoundingClientRect();
      const mx = ev && r.width ? ((ev.x - r.left) / r.width) * 2 - 1 : 0;
      const my = ev && r.height ? ((ev.y - r.top) / r.height) * 2 - 1 : 0;
      cenaRef.current?.setAttribute("transform", `translate(${(mx * 10).toFixed(1)} ${(my * 6).toFixed(1)})`);
      iconesRef.current?.setAttribute("transform", `translate(${(mx * 22).toFixed(1)} ${(my * 14).toFixed(1)})`);
    };
    const onMove = (e: PointerEvent) => { ev = { x: e.clientX, y: e.clientY }; if (!raf) raf = requestAnimationFrame(aplicar); };
    const onLeave = () => { ev = null; if (!raf) raf = requestAnimationFrame(aplicar); };
    svg.addEventListener("pointermove", onMove);
    svg.addEventListener("pointerleave", onLeave);
    return () => { svg.removeEventListener("pointermove", onMove); svg.removeEventListener("pointerleave", onLeave); if (raf) cancelAnimationFrame(raf); };
  }, []);

  const atual = EST[idx]!;
  return (
    <div className={`pi-wrap ${className}`}>
      <svg ref={svgRef} className="pi-svg" viewBox={`0 0 ${VBW} ${VBH}`} role="img" aria-label="Palco isométrico: estruturas de engenharia se montam e desmontam peça a peça — usina solar, data center, braço robótico, satélite, powertrain, reator">
        <g className="pi-grid" aria-hidden>{grade}</g>

        <g ref={iconesRef} aria-hidden>
          {ICONES.map((ic, i) => (
            <text key={i} className="pi-icon pi-float" x={ic.x} y={ic.y} textAnchor="middle" style={{ animationDelay: `${(i * -0.5).toFixed(1)}s`, opacity: 0.5 }}>{ic.e}</text>
          ))}
        </g>

        <g ref={cenaRef}>
          <AnimatePresence mode="wait">
            <motion.g key={idx} variants={cont} initial="hidden" animate="show" exit="exit">
              {atual.pecas.map((p, i) => (
                <motion.g key={i} custom={{ dx: p.dx, dy: p.dy }} variants={pecaV}>{p.el}</motion.g>
              ))}
            </motion.g>
          </AnimatePresence>
        </g>

        <text className="pi-label" x={34} y={VBH - 40} fontSize={18} fontWeight={700} fill={atual.cor}>{atual.nome}</text>
        <text className="pi-label pi-sub" x={34} y={VBH - 20} fontSize={12}>{atual.sub}</text>
      </svg>
    </div>
  );
}
