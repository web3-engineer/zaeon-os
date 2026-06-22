"use client";

/**
 * VoicePlayButton — botão simples de Ouvir: disco de vidro liquid-glass com
 * ícone de PLAY (parado) / PAUSE (tocando) / spinner (carregando). Sem ondas/aura/
 * anel (era poluído). Controlado por props (playing/loading) — casa com o ttsController.
 */
import { Play, Pause, Loader2 } from "lucide-react";

interface Props {
  playing: boolean;
  loading?: boolean;
  onClick: () => void;
  disabled?: boolean;
  /** diâmetro em px (default 52) */
  size?: number;
  label?: string;
}

export default function VoicePlayButton({ playing, loading = false, onClick, disabled, size = 52, label }: Props) {
  const title = label || (playing ? "Pausar a leitura" : "Ouvir em voz");
  const icon = Math.round(size * 0.4);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={playing}
      className="relative inline-flex items-center justify-center rounded-full transition-transform duration-200 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ width: size, height: size }}
    >
      {/* disco de vidro */}
      <span
        className="absolute inset-0 rounded-full backdrop-blur-xl border shadow-[0_8px_24px_-8px_rgba(37,99,235,.5)]"
        style={{
          background: playing
            ? "linear-gradient(135deg, rgba(224,242,254,.92), rgba(237,233,254,.85))"
            : "linear-gradient(135deg, rgba(255,255,255,.92), rgba(224,240,255,.78))",
          borderColor: playing ? "rgba(34,211,238,.5)" : "rgba(255,255,255,.9)",
        }}
      />
      <span aria-hidden className="absolute rounded-full bg-white" style={{ top: 4, left: "50%", transform: "translateX(-50%)", width: size * 0.48, height: size * 0.15, opacity: 0.6, filter: "blur(2px)" }} />

      <span className="relative z-10 flex items-center justify-center text-cyan-600 dark:text-cyan-300">
        {loading ? (
          <Loader2 size={icon} className="animate-spin" />
        ) : playing ? (
          <Pause size={icon} fill="currentColor" />
        ) : (
          <Play size={icon} className="ml-[2px]" fill="currentColor" />
        )}
      </span>
    </button>
  );
}
