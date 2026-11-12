"use client";
/**
 * ContadorProjetos — o número GRANDE que conta até +433 quando entra na tela (conta pra cima, com desaceleração), com
 * um brilho que pulsa e uma régua de luz embaixo. Subheader: "Projetos criados pela comunidade." Fica abaixo da timeline.
 */
import { useEffect, useRef, useState } from "react";

const ALVO = 433;
const DUR = 1700;

export default function ContadorProjetos({ className = "" }: { className?: string }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const feito = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const calmo = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ease = (x: number) => 1 - Math.pow(1 - x, 3);
    const io = new IntersectionObserver((entradas) => {
      if (feito.current || !entradas.some((e) => e.isIntersecting)) return;
      feito.current = true;
      if (calmo) { setN(ALVO); return; }
      let t0 = 0, raf = 0;
      const passo = (now: number) => {
        if (!t0) t0 = now;
        const p = Math.min(1, (now - t0) / DUR);
        setN(Math.round(ease(p) * ALVO));
        if (p < 1) raf = requestAnimationFrame(passo);
      };
      raf = requestAnimationFrame(passo);
    }, { rootMargin: "-12% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`relative flex flex-col items-center text-center ${className}`}>
      <style>{`
        @keyframes zaeon-contador-brilho { 0%,100% { opacity:.5; transform:scale(.96); } 50% { opacity:.9; transform:scale(1.04); } }
        @keyframes zaeon-contador-regua { 0%,100% { opacity:.35; } 50% { opacity:.9; } }
        @media (prefers-reduced-motion: reduce){ .zaeon-contador-brilho,.zaeon-contador-regua{ animation:none !important; } }
      `}</style>
      {/* halo que pulsa atrás do número */}
      <div aria-hidden className="zaeon-contador-brilho pointer-events-none absolute -top-6 h-40 w-[min(520px,90%)] rounded-full"
        style={{ background: "radial-gradient(60% 60% at 50% 45%, rgba(34,211,238,0.28), rgba(139,92,246,0.14) 55%, transparent 75%)", filter: "blur(6px)", animation: "zaeon-contador-brilho 3.4s ease-in-out infinite" }} />
      <div className="relative flex items-start justify-center font-[family-name:var(--font-space)] font-black leading-none tabular-nums"
        style={{ fontSize: "clamp(3.5rem, 12vw, 7.5rem)" }}>
        <span className="mt-[0.18em] mr-1 text-cyan-300/90" style={{ fontSize: "0.5em" }}>+</span>
        <span className="bg-gradient-to-b from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_34px_rgba(34,211,238,0.45)]">
          {n.toLocaleString("pt-BR")}
        </span>
      </div>
      {/* régua de luz */}
      <div aria-hidden className="zaeon-contador-regua mt-3 h-[2px] w-[min(240px,60%)] rounded-full"
        style={{ background: "linear-gradient(90deg, transparent, #22d3ee, #8b5cf6, transparent)", animation: "zaeon-contador-regua 3.4s ease-in-out infinite" }} />
      <p className="mt-4 font-mono text-[12px] sm:text-[13px] uppercase tracking-[0.26em] text-cyan-100/70">
        Projetos criados pela comunidade
      </p>
    </div>
  );
}
