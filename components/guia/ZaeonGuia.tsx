"use client";

/**
 * ZaeonGuia — o avatar-guia da Zaeon na lição: um orbe pequeno num canto que, quando o motor do guia
 * (lib/guia) decide, abre um BALÃO DE QUADRINHOS pra conduzir o aluno. Fala em voz alta pela voz
 * avançada do app (useTTS → /api/ai/voice). Vidro líquido, discreto: some sozinho e não rouba a tela.
 *
 * A inteligência não mora aqui — mora nos COMPORTAMENTOS do motor (começando pela ociosidade). Este
 * componente só escuta o nudge corrente, mostra, fala, e some. A página pode mandar sinais ricos
 * (objetivo alcançado, trocou de fase) pelo callback `aoMontar(enviar)`.
 */
import { useEffect, useRef, useState } from "react";
import { useTTS } from "@/lib/voice/useTTS";
import { useGuia, type OpcoesUseGuia } from "@/lib/guia/useGuia";
import type { Nudge, Sinal, TomNudge } from "@/lib/guia/tipos";

const ACENTO: Record<TomNudge, string> = {
  incentivo: "#4aa6bd",
  dica: "#9a6a3a",
  celebra: "#e0a93f",
  retomada: "#4aa6bd",
};

export default function ZaeonGuia({
  aoMontar,
  duracaoMs = 7_000,
  ...opts
}: OpcoesUseGuia & { aoMontar?: (enviar: (s: Sinal) => void) => void; duracaoMs?: number }) {
  const { nudge, enviar } = useGuia(opts);
  const [visivel, setVisivel] = useState<Nudge | null>(null);
  const tts = useTTS();
  const montado = useRef(false);

  useEffect(() => {
    if (montado.current) return;
    montado.current = true;
    aoMontar?.(enviar);
  }, [aoMontar, enviar]);

  useEffect(() => {
    if (!nudge) return;
    setVisivel(nudge);
    if (nudge.voz) {
      let voice: string | undefined, gender: "f" | "m" | undefined;
      try {
        voice = localStorage.getItem("zaeon.voice.id") || undefined;
        gender = (localStorage.getItem("zaeon.voice.gender") as "f" | "m") || undefined;
      } catch { /* sem storage: voz padrão */ }
      tts.speak(nudge.texto, { voice, gender }).catch(() => {});
    }
    const t = setTimeout(() => setVisivel(null), duracaoMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nudge]);

  const falando = tts.speaking;
  const acento = visivel ? ACENTO[visivel.tom] : ACENTO.incentivo;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[110] flex flex-col items-end gap-2" aria-live="polite">
      {visivel && (
        <div
          className="pointer-events-auto relative max-w-[18rem] cursor-pointer rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-snug text-slate-800 dark:text-white/90"
          style={{
            background: "rgba(255,255,255,.62)",
            border: "1px solid rgba(255,255,255,.75)",
            backdropFilter: "blur(20px) saturate(1.4)",
            WebkitBackdropFilter: "blur(20px) saturate(1.4)",
            boxShadow: "0 10px 30px rgba(31,38,65,.18), inset 0 1px 0 rgba(255,255,255,.8)",
            borderLeft: `3px solid ${acento}`,
            animation: "guiaPop .26s cubic-bezier(.2,.9,.25,1.2)",
          }}
          onClick={() => { setVisivel(null); tts.stop(); }}
          role="status"
        >
          {visivel.texto}
          {/* rabicho do balão apontando pro orbe */}
          <span
            aria-hidden
            className="absolute -bottom-1.5 right-6 h-3 w-3 rotate-45"
            style={{ background: "rgba(255,255,255,.62)", borderRight: "1px solid rgba(255,255,255,.75)", borderBottom: "1px solid rgba(255,255,255,.75)" }}
          />
        </div>
      )}
      <button
        type="button"
        className="pointer-events-auto grid h-12 w-12 place-items-center rounded-full"
        aria-label="Zaeon, sua guia"
        onClick={() => { if (visivel) { setVisivel(null); tts.stop(); } }}
        style={{
          background: "radial-gradient(circle at 32% 30%, #bfe9f2, #4aa6bd 58%, #2b6d7e)",
          boxShadow: `0 6px 18px rgba(43,109,126,.45), inset 0 1px 2px rgba(255,255,255,.7)${falando ? ", 0 0 0 6px rgba(74,166,189,.18)" : ""}`,
          animation: falando ? "guiaPulso 1s ease-in-out infinite" : "none",
        }}
      >
        <span aria-hidden className="text-[18px]">✦</span>
      </button>
      <style>{`
        @keyframes guiaPop { from { opacity:0; transform: translateY(6px) scale(.96) } to { opacity:1; transform:none } }
        @keyframes guiaPulso { 0%,100% { transform: scale(1) } 50% { transform: scale(1.06) } }
        @media (prefers-reduced-motion: reduce) { [class*="guia"] { animation: none !important } }
      `}</style>
    </div>
  );
}
