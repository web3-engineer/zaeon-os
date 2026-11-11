"use client";
/**
 * TimelineIdeia — a linha do tempo HORIZONTAL da evolução de uma ideia, alinhada num eixo só: do papel científico
 * esquecido, passando pela conversa com as IAs e pelo blueprint, até o protótipo e o PRODUTO no mundo real (placa
 * solar, bateria). Um pulso corre pela linha da esquerda pra direita ACENDENDO cada etapa, uma a uma; no fim segura e
 * recomeça. Tudo SVG + CSS (leve). O progresso (linha preenchida, cometa, etapa ativa) é um rAF determinístico.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import "./timeline-ideia.css";

const VBW = 1000, VBH = 300;
const X0 = 135, X1 = 865, Y = 118, L = X1 - X0;

/* ── ícones de neon (centrados em 0,0, traço = currentColor) ── */
const Papel = (
  <g fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round">
    <path d="M-9,-13 H5 L11,-7 V13 H-9 Z" />
    <path d="M5,-13 V-7 H11" />
    <line x1={-5} y1={-2} x2={7} y2={-2} /><line x1={-5} y1={3} x2={7} y2={3} /><line x1={-5} y1={8} x2={3} y2={8} />
  </g>
);
const Chat = (
  <g fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round">
    <path d="M-14,-11 H2 a3,3 0 0 1 3,3 V-1 a3,3 0 0 1 -3,3 H-7 L-12,6 V5 H-14 a3,3 0 0 1 -3,-3 V-8 a3,3 0 0 1 3,-3 Z" />
    <path d="M1,-3 H12 a3,3 0 0 1 3,3 V7 a3,3 0 0 1 -3,3 H6 L10,13 V10 H12" opacity={0.85} />
  </g>
);
const BlueprintIco = (
  <g fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round">
    <rect x={-13} y={-11} width={26} height={22} rx={2} />
    <path d="M-9,8 L0,-7 L9,8 Z" />
    <line x1={-13} y1={2} x2={13} y2={2} opacity={0.4} /><line x1={0} y1={-11} x2={0} y2={11} opacity={0.3} />
  </g>
);
const Engrenagem = (() => {
  const teeth = 8, Ro = 12, Ri = 8.5;
  let d = "";
  for (let i = 0; i < teeth * 2; i++) { const a = (i / (teeth * 2)) * Math.PI * 2, r = i % 2 === 0 ? Ro : Ri; d += `${i ? "L" : "M"}${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)} `; }
  d += "Z";
  return (
    <g fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round">
      <path d={d} /><circle r={4} />
    </g>
  );
})();
const Produto = (
  <g fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round">
    {/* placa solar (perspectiva) */}
    <g transform="translate(-6,0) skewX(-12)">
      <rect x={-9} y={-9} width={16} height={13} rx={1} />
      <line x1={-3.5} y1={-9} x2={-3.5} y2={4} opacity={0.5} /><line x1={1.5} y1={-9} x2={1.5} y2={4} opacity={0.5} />
      <line x1={-9} y1={-2.5} x2={7} y2={-2.5} opacity={0.5} />
    </g>
    {/* bateria */}
    <g transform="translate(9,1)">
      <rect x={-3} y={-8} width={9} height={16} rx={2} /><rect x={-1} y={-10} width={5} height={2.4} rx={1} />
      <line x1={-1} y1={2} x2={4} y2={2} /><line x1={-1} y1={-2} x2={4} y2={-2} opacity={0.6} />
    </g>
  </g>
);

type Etapa = { n: string; titulo: string; cap: string; cor: string; icon: ReactNode };
const ETAPAS: readonly Etapa[] = [
  { n: "01", titulo: "Papel científico", cap: "um paper parado na gaveta", cor: "#8b5cf6", icon: Papel },
  { n: "02", titulo: "Conversa com as IAs", cap: "você pergunta, refina, contesta", cor: "#46b0ff", icon: Chat },
  { n: "03", titulo: "Blueprint", cap: "o desenho técnico toma forma", cor: "#38f0ff", icon: BlueprintIco },
  { n: "04", titulo: "Protótipo e testes", cap: "mede, ajusta, melhora", cor: "#49f2a0", icon: Engrenagem },
  { n: "05", titulo: "No mundo real", cap: "placa solar, bateria — funcionando", cor: "#ff9f45", icon: Produto },
];
const posX = (i: number) => X0 + (i / (ETAPAS.length - 1)) * L;
const posP = (i: number) => i / (ETAPAS.length - 1);  // 0..1 de cada etapa na linha

const DUR = 6800, HOLD = 2000, FADE = 700, TOTAL = DUR + HOLD + FADE;

export default function TimelineIdeia({ className = "" }: { className?: string }) {
  const [ativos, setAtivos] = useState(0);
  const fillRef = useRef<SVGLineElement>(null);
  const cometaRef = useRef<SVGGElement>(null);

  useEffect(() => {
    let raf = 0, inicio = 0;
    const passo = (now: number) => {
      if (!inicio) inicio = now;
      const e = (now - inicio) % TOTAL;
      let p: number, op: number;
      if (e < DUR) { p = e / DUR; op = 1; }
      else if (e < DUR + HOLD) { p = 1; op = 1; }
      else { p = 1; op = 1 - (e - DUR - HOLD) / FADE; }
      if (fillRef.current) { fillRef.current.setAttribute("stroke-dashoffset", (L * (1 - p)).toFixed(1)); fillRef.current.style.opacity = String(op); }
      if (cometaRef.current) { cometaRef.current.setAttribute("transform", `translate(${(X0 + p * L).toFixed(1)} ${Y})`); cometaRef.current.style.opacity = String(e < DUR ? op : 0); }
      let n = 0;
      for (let i = 0; i < ETAPAS.length; i++) if (p >= posP(i) - 0.001) n = i + 1;
      setAtivos((a) => (a === n ? a : n));
      raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={`tl-wrap ${className}`}>
      <svg className="tl-svg" viewBox={`0 0 ${VBW} ${VBH}`} role="img" aria-label="Linha do tempo da evolução de uma ideia: papel científico, conversa com as IAs, blueprint, protótipo e testes, e o produto no mundo real (placa solar, bateria)">
        <defs>
          <linearGradient id="tl-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8b5cf6" /><stop offset="28%" stopColor="#46b0ff" /><stop offset="52%" stopColor="#38f0ff" /><stop offset="76%" stopColor="#49f2a0" /><stop offset="100%" stopColor="#ff9f45" />
          </linearGradient>
        </defs>

        {/* o eixo: a linha base apagada + a linha que "preenche" com o pulso */}
        <line className="tl-base" x1={X0} y1={Y} x2={X1} y2={Y} />
        <line ref={fillRef} x1={X0} y1={Y} x2={X1} y2={Y} stroke="url(#tl-grad)" strokeWidth={3} strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L} style={{ filter: "drop-shadow(0 0 5px rgba(127,232,255,0.6))" }} />

        {/* o cometa que corre pela linha */}
        <g ref={cometaRef} transform={`translate(${X0} ${Y})`} style={{ opacity: 0 }}>
          <circle r={14} fill="none" stroke="#eafcff" strokeWidth={1} opacity={0.5} />
          <circle r={5} fill="#eafcff" style={{ filter: "drop-shadow(0 0 8px #bdfcff)" }} />
        </g>

        {/* as ETAPAS, alinhadas no eixo */}
        {ETAPAS.map((et, i) => (
          <g key={i} className={`tl-st ${i < ativos ? "on" : ""}`} style={{ color: et.cor }}>
            {/* a POSIÇÃO fica no grupo de fora (atributo); o .head só recebe o scale do CSS — senão o scale do CSS
                sobrescreve o translate do atributo e a etapa ativa "pula" pro canto (0,0). */}
            <g transform={`translate(${posX(i)} ${Y})`}>
              <g className="head">
                <circle className="ring" r={24} />
                <g className="ico">{et.icon}</g>
                <text className="num" x={0} y={-31} textAnchor="middle" fontSize={10}>{et.n}</text>
              </g>
            </g>
            <text className="tit" x={posX(i)} y={Y + 54} textAnchor="middle" fontSize={13}>{et.titulo}</text>
            <text className="cap" x={posX(i)} y={Y + 72} textAnchor="middle" fontSize={10.5}>{et.cap}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
