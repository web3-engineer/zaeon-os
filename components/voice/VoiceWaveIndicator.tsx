"use client";

/**
 * VoiceWaveIndicator — barrinha de ondas sonoras que acende quando a Zaeon fala.
 * Assina o controlador global de voz (useTTS). Clicar = parar a fala.
 *
 * - horizontal (default): barras lado a lado (cabe no slot da navbar).
 * - vertical: barras empilhadas (modo foco, encaixa na sidebar acima do "Layout").
 *
 * Quando não há fala, fica num estado discreto (⟁) — não ocupa/atrapalha.
 */
import useTTS from "@/lib/voice/useTTS";

export default function VoiceWaveIndicator({
  vertical = false,
  size = 18,
  className = "",
}: {
  vertical?: boolean;
  size?: number;
  className?: string;
}) {
  const { speaking, loading, stop } = useTTS();
  // Ondas SÓ quando o áudio realmente está saindo (speaking && !loading). Durante o
  // carregamento (loading) fica no estado discreto ⟁ — nada de ondas antes do som.
  const active = speaking && !loading;
  const bars = [0, 1, 2, 3, 4, 5, 6, 7, 8]; // mais barras = onda mais detalhada
  // alturas-base variadas (perfil de onda), além da animação
  const profile = [0.45, 0.8, 0.55, 1, 0.65, 0.9, 0.5, 0.75, 0.4];

  if (!active) {
    // estado de repouso: ⟁ discreto (a voz toca por si quando há resposta)
    return (
      <div
        className={`flex items-center justify-center text-cyan-500/70 dark:text-cyan-300/70 ${className}`}
        style={{ width: vertical ? size + 8 : undefined, height: vertical ? undefined : size + 8 }}
        title="Voz da Zaeon"
        aria-hidden
      >
        <span className="text-[13px] leading-none">&#10177;</span>
      </div>
    );
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); stop(); }}
      title="Zaeon falando — toque para parar"
      aria-label="Parar a voz"
      className={`flex items-center justify-center gap-[3px] ${vertical ? "flex-col" : "flex-row"} ${className}`}
      style={{ width: vertical ? size + 10 : undefined, height: vertical ? undefined : size + 8 }}
    >
      {/* núcleo (círculo) — distinto das ondas, pulsa enquanto fala */}
      <span
        className="rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 zaeon-wavecore shrink-0"
        style={{ width: 6, height: 6, marginRight: vertical ? 0 : 2, marginBottom: vertical ? 2 : 0 }}
      />
      {bars.map((i) => (
        <span
          key={i}
          className="rounded-full bg-gradient-to-t from-violet-500 to-cyan-400 zaeon-wavebar"
          style={{
            width: vertical ? `${40 + profile[i] * 60}%` : 2.5,
            height: vertical ? 2.5 : `${40 + profile[i] * 60}%`,
            // @ts-expect-error CSS custom prop p/ o keyframe
            "--d": `${0.6 + (i % 4) * 0.16}s`,
            animationDelay: `${i * 0.07}s`,
          }}
        />
      ))}
      <style jsx global>{`
        @keyframes zaeonWaveH { 0%,100% { transform: scaleY(0.35); } 50% { transform: scaleY(1); } }
        @keyframes zaeonWaveV { 0%,100% { transform: scaleX(0.35); } 50% { transform: scaleX(1); } }
        @keyframes zaeonCore { 0%,100% { transform: scale(0.7); opacity: .65; } 50% { transform: scale(1.25); opacity: 1; } }
        .zaeon-wavebar { transform-origin: center; animation: zaeonWaveH var(--d, .8s) ease-in-out infinite; }
        .flex-col > .zaeon-wavebar { animation-name: zaeonWaveV; }
        .zaeon-wavecore { animation: zaeonCore 1.1s ease-in-out infinite; box-shadow: 0 0 6px rgba(34,211,238,0.55); }
        @media (prefers-reduced-motion: reduce) { .zaeon-wavebar, .zaeon-wavecore { animation: none; } }
      `}</style>
    </button>
  );
}
