"use client";
/**
 * TimelineIdeia — a linha do tempo HORIZONTAL da evolução de uma ideia, num eixo só: do papel científico esquecido,
 * passando pela conversa com as IAs e pelo blueprint, até o protótipo e o PRODUTO no mundo real (placa solar, bateria).
 * Os ÍCONES são 3D (isométricos, do kit do anatomy — lib/landing/iconesIso) e ficam ACIMA da linha; um pulso corre pela
 * linha da esquerda pra direita e, ao chegar em cada nó, o ícone daquela etapa APARECE (um por vez). Sem descrições.
 * Cada etapa tinge o próprio ícone sobrescrevendo as variáveis --anatomy-* do kit com a sua cor.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ISO_CSS } from "@/lib/anatomy/iso-kit";
import { ICONES_ISO } from "@/lib/landing/iconesIso";
import "./timeline-ideia.css";

type Etapa = { titulo: string; cor: string; svg: string };
const ETAPAS: readonly Etapa[] = [
  { titulo: "Papel científico", cor: "#8b5cf6", svg: ICONES_ISO[0]! },
  { titulo: "Conversa com as IAs", cor: "#46b0ff", svg: ICONES_ISO[1]! },
  { titulo: "Blueprint", cor: "#38f0ff", svg: ICONES_ISO[2]! },
  { titulo: "Protótipo e testes", cor: "#49f2a0", svg: ICONES_ISO[3]! },
  { titulo: "No mundo real", cor: "#ff9f45", svg: ICONES_ISO[4]! },
];

/** tinge o ícone com a cor da etapa (traços/brilho na cor; os volumes seguem escuros) */
const tint = (cor: string): CSSProperties => ({
  color: cor,
  "--anatomy-hi": cor,
  "--anatomy-mid": `color-mix(in srgb, ${cor} 60%, #0b0b0b)`,
  "--anatomy-lo": `color-mix(in srgb, ${cor} 38%, #0b0b0b)`,
  "--anatomy-faint": `color-mix(in srgb, ${cor} 22%, #0b0b0b)`,
  "--anatomy-lit": "#ffffff",
  "--anatomy-dot": cor,
} as CSSProperties);

const DUR = 7200, HOLD = 2200, FADE = 700, TOTAL = DUR + HOLD + FADE;
const N = ETAPAS.length;

export default function TimelineIdeia({ className = "" }: { className?: string }) {
  const [ativos, setAtivos] = useState(0);
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
      let n = 0;
      for (let i = 0; i < N; i++) if (p >= i / (N - 1) - 0.001) n = i + 1;
      setAtivos((a) => (a === n ? a : n));
      raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={`iso tl-wrap ${className}`}>
      <style>{ISO_CSS}</style>
      <div className="tl-stage">
        <div className="tl-line" />
        <div ref={fillRef} className="tl-fill" />
        <div ref={cometaRef} className="tl-comet" />
        <div className="tl-row">
          {ETAPAS.map((et, i) => (
            <div key={i} className={`tl-cell ${i < ativos ? "on" : ""}`} style={tint(et.cor)}>
              <div className="tl-ico" dangerouslySetInnerHTML={{ __html: et.svg }} />
              <span className="tl-node"><span className="tl-dot" /></span>
              <span className="tl-tit">{et.titulo}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
