"use client";
/**
 * TimelineIdeia — a evolução de uma ideia num VISUALIZADOR ÚNICO e grande que se CONSTRÓI e CRESCE conforme a barra de
 * progresso avança: do alicerce até uma pequena estação solar (base → estrutura → deck → gabinete → bateria →
 * engrenagem → mastro + placa solar → antena). A estrutura 3D é isométrica (kit do anatomy, lib/landing/construcaoIso);
 * cada peça nasce no seu lugar final quando o pulso da barra passa do seu ponto. Embaixo, a barra com os 5 marcos.
 */
import { useEffect, useRef, useState } from "react";
import { ISO_CSS } from "@/lib/anatomy/iso-kit";
import { CONSTRUCAO_SVG } from "@/lib/landing/construcaoIso";
import "./timeline-ideia.css";

const MARCOS: readonly { titulo: string; cor: string }[] = [
  { titulo: "Papel científico", cor: "#8b5cf6" },
  { titulo: "Conversa com as IAs", cor: "#46b0ff" },
  { titulo: "Blueprint", cor: "#38f0ff" },
  { titulo: "Protótipo e testes", cor: "#49f2a0" },
  { titulo: "No mundo real", cor: "#22d3ee" },
];
const N = MARCOS.length;

const DUR = 8200, HOLD = 2600, FADE = 800, TOTAL = DUR + HOLD + FADE;

export default function TimelineIdeia({ className = "" }: { className?: string }) {
  const [ativos, setAtivos] = useState(0);
  const vizRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const cometaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0, inicio = 0;
    const passo = (now: number) => {
      if (!inicio) inicio = now;
      const e = (now - inicio) % TOTAL;
      let p: number, op: number;
      if (e < DUR) { p = e / DUR; op = 1; }
      else if (e < DUR + HOLD) { p = 1; op = 1; }
      else { p = 1; op = 1 - (e - DUR - HOLD) / FADE; }
      if (fillRef.current) { fillRef.current.style.width = `${(p * 80).toFixed(2)}%`; fillRef.current.style.opacity = String(op); }
      if (cometaRef.current) { cometaRef.current.style.left = `${(10 + p * 80).toFixed(2)}%`; cometaRef.current.style.opacity = String(e < DUR ? op : 0); }
      // revela as peças da construção conforme o progresso passa do ponto de cada uma — a OPACIDADE é uma rampa que o
      // próprio laço calcula (nada de transição do CSS, que brigava com o valor setado a cada quadro). Reconsulta os
      // <g> a cada quadro: o SVG vem por innerHTML e os nós são estáveis, então é barato e nunca pega captura vazia.
      const partes = vizRef.current?.querySelectorAll<SVGGElement>(".ci-part");
      if (partes) for (const g of partes) {
        const op = Math.max(0, Math.min(1, (p - Number(g.dataset.at)) / 0.1));
        g.style.opacity = op.toFixed(3);
        g.style.transform = `translateY(${((1 - op) * 9).toFixed(1)}px)`;
      }
      let n = 0;
      for (let i = 0; i < N; i++) if (p >= i / (N - 1) - 0.001) n = i + 1;
      setAtivos((a) => (a === n ? a : n));
      raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={`iso ci-wrap ${className}`}>
      <style>{ISO_CSS}</style>
      <div className="ci-stage">
        {/* o VISUALIZADOR único: a estrutura 3D que cresce peça a peça */}
        <div ref={vizRef} className="ci-viz" dangerouslySetInnerHTML={{ __html: CONSTRUCAO_SVG }} />

        {/* a BARRA de progresso com os 5 marcos */}
        <div className="ci-bar">
          <div className="ci-line" />
          <div ref={fillRef} className="ci-fill" />
          <div ref={cometaRef} className="ci-comet" />
          <div className="ci-row">
            {MARCOS.map((m, i) => (
              <div key={i} className={`ci-cell ${i < ativos ? "on" : ""}`} style={{ color: m.cor }}>
                <span className="ci-node"><span className="ci-dot" /></span>
                <span className="ci-tit">{m.titulo}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
