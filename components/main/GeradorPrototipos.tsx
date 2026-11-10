"use client";
/**
 * GeradorPrototipos — uma cena GENERATIVA de protótipos de engenharia (placa solar, motor BLDC, pack de bateria, PCB,
 * transmissão) desenhada em traço de neon, que REAGE AO MOUSE: a cena faz parallax e o protótipo mais perto do cursor
 * se ACENDE (com uma linha de varredura do cursor até ele e o nome embaixo). Nos moldes do gerador do anatomy, só que
 * de peças "com um pé na realidade". Puro SVG + CSS (sem 3D): leve pra landing. As posições saem pelo atributo
 * `transform` (nada de Math.random no render → sem mismatch de hidratação); só o parallax/destaque mexem no DOM, por rAF.
 */
import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import "./gerador-prototipos.css";

const VBW = 1000;
const VBH = 420;

type No = { id: string; nome: string; nota: string; cor: string; x: number; y: number; par: number; desenho: ReactNode };

/** placa solar: moldura + grade de células que cintilam + barramentos + pés de apoio (levemente em perspectiva) */
function PlacaSolar() {
  const cols = 6, rows = 4, w = 150, h = 96, cw = w / cols, ch = h / rows;
  return (
    <g transform="skewX(-14)">
      <rect className="fill" x={-w / 2} y={-h / 2} width={w} height={h} rx={3} />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={3} />
      {Array.from({ length: cols * rows }, (_, k) => {
        const c = k % cols, ro = Math.floor(k / cols);
        return <rect key={k} className="gp-shimmer" x={-w / 2 + c * cw + 1.5} y={-h / 2 + ro * ch + 1.5} width={cw - 3} height={ch - 3} fill="color-mix(in srgb, var(--cor) 18%, transparent)" style={{ animationDelay: `${-(((c + ro) % 5) * 0.6).toFixed(2)}s` }} />;
      })}
      {Array.from({ length: cols - 1 }, (_, c) => <line key={c} className="dim" x1={-w / 2 + (c + 1) * cw} y1={-h / 2} x2={-w / 2 + (c + 1) * cw} y2={h / 2} />)}
      <line x1={-22} y1={h / 2} x2={-30} y2={h / 2 + 24} />
      <line x1={22} y1={h / 2} x2={30} y2={h / 2 + 24} />
    </g>
  );
}

/** motor BLDC: estator com bobinas + rotor girando + eixo */
function MotorBLDC() {
  return (
    <g>
      <circle className="fill" r={46} />
      <circle r={46} />
      <circle className="dim" r={40} />
      {Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return <circle key={i} className="dim" cx={Math.cos(a) * 40} cy={Math.sin(a) * 40} r={5} />; })}
      <g className="gp-spin">
        <circle r={22} />
        <line x1={-22} y1={0} x2={22} y2={0} />
        <line x1={0} y1={-22} x2={0} y2={22} />
        <circle className="hot" r={6} />
      </g>
      <line x1={46} y1={0} x2={74} y2={0} />
      <line x1={70} y1={-6} x2={70} y2={6} />
    </g>
  );
}

/** pack de bateria: três células 18650 com terminais e segmentos de carga pulsando */
function PackBateria() {
  return (
    <g>
      {Array.from({ length: 3 }, (_, i) => (
        <g key={i} transform={`translate(${(i - 1) * 34},0)`}>
          <rect className="fill" x={-13} y={-40} width={26} height={80} rx={7} />
          <rect x={-13} y={-40} width={26} height={80} rx={7} />
          <rect x={-5} y={-46} width={10} height={6} rx={2} />
          {Array.from({ length: 5 }, (_, s) => <rect key={s} className="hot gp-pulse" x={-9} y={28 - s * 13} width={18} height={9} rx={2} style={{ animationDelay: `${(s * 0.25).toFixed(2)}s` }} />)}
        </g>
      ))}
    </g>
  );
}

/** PCB: placa + CI com pernas + traços + pads + capacitor */
function Placa() {
  return (
    <g>
      <rect className="fill" x={-72} y={-50} width={144} height={100} rx={4} />
      <rect x={-72} y={-50} width={144} height={100} rx={4} />
      <rect className="dim" x={-20} y={-16} width={40} height={32} rx={2} />
      {Array.from({ length: 6 }, (_, i) => <line key={`l${i}`} className="dim" x1={-20} y1={-12 + i * 5} x2={-30} y2={-12 + i * 5} />)}
      {Array.from({ length: 6 }, (_, i) => <line key={`r${i}`} className="dim" x1={20} y1={-12 + i * 5} x2={30} y2={-12 + i * 5} />)}
      <polyline className="dim" points="-62,-32 -36,-32 -36,-10" />
      <polyline className="dim" points="62,32 40,32 40,14" />
      <polyline className="dim" points="-62,36 -10,36 -10,18" />
      <circle className="dim" cx={-52} cy={-34} r={7} />
      {Array.from({ length: 8 }, (_, i) => <circle key={`p${i}`} className="hot gp-pulse" cx={-56 + i * 16} cy={42} r={2.4} style={{ animationDelay: `${(i * 0.2).toFixed(2)}s` }} />)}
    </g>
  );
}

/** transmissão: uma engrenagem girando com raios e furo central */
function Engrenagem() {
  const teeth = 10, Ro = 44, Ri = 35;
  let d = "";
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2, rr = i % 2 === 0 ? Ro : Ri;
    d += `${i ? "L" : "M"}${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr).toFixed(1)} `;
  }
  d += "Z";
  return (
    <g className="gp-spin-fast">
      <path d={d} />
      <circle r={14} />
      {Array.from({ length: 5 }, (_, i) => { const a = (i / 5) * Math.PI * 2; return <line key={i} className="dim" x1={Math.cos(a) * 15} y1={Math.sin(a) * 15} x2={Math.cos(a) * 30} y2={Math.sin(a) * 30} />; })}
    </g>
  );
}

const NOS: readonly No[] = [
  { id: "solar", nome: "Placa solar", nota: "célula fotovoltaica + MPPT", cor: "#46b0ff", x: 185, y: 205, par: 26, desenho: <PlacaSolar /> },
  { id: "motor", nome: "Motor BLDC", nota: "estator, bobinas e rotor", cor: "#49f2a0", x: 440, y: 150, par: 18, desenho: <MotorBLDC /> },
  { id: "bateria", nome: "Pack de bateria 18650", nota: "células, BMS e carga", cor: "#ff9f45", x: 645, y: 245, par: 22, desenho: <PackBateria /> },
  { id: "pcb", nome: "Placa de circuito", nota: "CI, traços e pads", cor: "#8b5cf6", x: 850, y: 150, par: 14, desenho: <Placa /> },
  { id: "engren", nome: "Transmissão", nota: "engrenagem e eixo", cor: "#38f0ff", x: 560, y: 325, par: 30, desenho: <Engrenagem /> },
];

export default function GeradorPrototipos({ className = "" }: { className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const rootRef = useRef<SVGGElement>(null);
  const scanRef = useRef<SVGLineElement>(null);
  const cursorRef = useRef<SVGGElement>(null);
  const nomeRef = useRef<SVGTextElement>(null);
  const notaRef = useRef<SVGTextElement>(null);
  const nodeRefs = useRef<(SVGGElement | null)[]>([]);

  const grade = useMemo(() => {
    const ls: ReactNode[] = [];
    for (let x = 0; x <= VBW; x += 40) ls.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={VBH} />);
    for (let y = 0; y <= VBH; y += 40) ls.push(<line key={`h${y}`} x1={0} y1={y} x2={VBW} y2={y} />);
    return ls;
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    let raf = 0;
    let ev: { clientX: number; clientY: number } | null = null;
    const aplicar = () => {
      raf = 0;
      const rect = svg.getBoundingClientRect();
      const temMouse = !!ev && rect.width > 0;
      const px = temMouse ? ((ev!.clientX - rect.left) / rect.width) * VBW : VBW * 0.18;
      const py = temMouse ? ((ev!.clientY - rect.top) / rect.height) * VBH : VBH * 0.5;
      const mx = temMouse ? ((ev!.clientX - rect.left) / rect.width) * 2 - 1 : 0;
      const my = temMouse ? ((ev!.clientY - rect.top) / rect.height) * 2 - 1 : 0;
      rootRef.current?.setAttribute("transform", `translate(${(mx * 16).toFixed(1)} ${(my * 10).toFixed(1)})`);
      let best = 0, bd = Infinity;
      NOS.forEach((n, i) => { const dx = px - n.x, dy = py - n.y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } });
      NOS.forEach((n, i) => {
        const g = nodeRefs.current[i];
        if (!g) return;
        g.setAttribute("transform", `translate(${(n.x + mx * n.par).toFixed(1)} ${(n.y + my * n.par).toFixed(1)})`);
        g.classList.toggle("ativo", i === best);
      });
      const bn = NOS[best]!;
      const bx = bn.x + mx * bn.par, by = bn.y + my * bn.par;
      if (scanRef.current) {
        scanRef.current.setAttribute("x1", px.toFixed(1)); scanRef.current.setAttribute("y1", py.toFixed(1));
        scanRef.current.setAttribute("x2", bx.toFixed(1)); scanRef.current.setAttribute("y2", by.toFixed(1));
        scanRef.current.style.opacity = temMouse ? "0.55" : "0";
      }
      if (cursorRef.current) { cursorRef.current.setAttribute("transform", `translate(${px.toFixed(1)} ${py.toFixed(1)})`); cursorRef.current.style.opacity = temMouse ? "0.8" : "0"; }
      if (nomeRef.current) nomeRef.current.textContent = bn.nome;
      if (notaRef.current) notaRef.current.textContent = bn.nota;
    };
    const onMove = (e: PointerEvent) => { ev = { clientX: e.clientX, clientY: e.clientY }; if (!raf) raf = requestAnimationFrame(aplicar); };
    const onLeave = () => { ev = null; if (!raf) raf = requestAnimationFrame(aplicar); };
    svg.addEventListener("pointermove", onMove);
    svg.addEventListener("pointerleave", onLeave);
    aplicar();
    return () => { svg.removeEventListener("pointermove", onMove); svg.removeEventListener("pointerleave", onLeave); if (raf) cancelAnimationFrame(raf); };
  }, []);

  return (
    <div className={`gp-wrap ${className}`}>
      <svg ref={svgRef} className="gp-svg" viewBox={`0 0 ${VBW} ${VBH}`} role="img" aria-label="Protótipos de engenharia generativos que reagem ao mouse: placa solar, motor, bateria, placa de circuito e transmissão">
        <g className="gp-grid" aria-hidden>{grade}</g>
        <line ref={scanRef} className="gp-scan" x1={0} y1={0} x2={0} y2={0} style={{ opacity: 0 } as CSSProperties} />
        <g ref={rootRef}>
          {NOS.map((n, i) => (
            <g key={n.id} ref={(el) => { nodeRefs.current[i] = el; }} className="gp-node" style={{ "--cor": n.cor } as CSSProperties} transform={`translate(${n.x} ${n.y})`}>
              <g className="gp-float" style={{ animationDelay: `${(i * -1.3).toFixed(1)}s` }}>{n.desenho}</g>
            </g>
          ))}
        </g>
        <g ref={cursorRef} className="gp-cursor" style={{ opacity: 0 } as CSSProperties} aria-hidden>
          <circle r={9} />
          <line x1={-15} y1={0} x2={15} y2={0} />
          <line x1={0} y1={-15} x2={0} y2={15} />
        </g>
        <text ref={nomeRef} className="gp-label" x={34} y={VBH - 42} fontSize={18} fontWeight={700}>{NOS[0]!.nome}</text>
        <text ref={notaRef} className="gp-label nota" x={34} y={VBH - 22} fontSize={12}>{NOS[0]!.nota}</text>
      </svg>
    </div>
  );
}
