"use client";

/**
 * Karaokê da pesquisa — camada de LEITURA sobre o editor. Quando a pesquisa está sendo
 * lida em voz (botão ▶ da aba), mostra o texto em pedaços e DESTACA o pedaço que está
 * sendo falado agora, rolando ele pra vista. O `ttsController` quebra o texto nos MESMOS
 * pedaços (buildSpeechChunks) e expõe o pedaço atual em useTTS().activeText — então é só
 * casar por igualdade. Clicar "parar" encerra a leitura.
 */
import { useEffect, useMemo, useRef } from "react";
import { buildSpeechChunks } from "@/lib/voice/ttsController";
import useTTS from "@/lib/voice/useTTS";

export default function ResearchReadingView({
  text,
  onStop,
}: {
  text: string;
  onStop: () => void;
}) {
  const { activeText, loading } = useTTS();
  const chunks = useMemo(() => buildSpeechChunks([text]), [text]);
  const activeRef = useRef<HTMLSpanElement | null>(null);

  // Rola o pedaço destacado pra vista assim que ele muda.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeText]);

  // Acha o pedaço atual (o activeText vem do ttsController; "…" durante a curinga).
  const activeIdx = activeText ? chunks.findIndex((c) => c === activeText) : -1;

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-white dark:bg-[#0f172a]">
      {/* topo: preparando (curinga) + botão parar */}
      <div className="flex items-center justify-between px-8 md:px-12 py-3 shrink-0 border-b border-slate-100 dark:border-white/5">
        <span className="text-[11px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-300 inline-flex items-center gap-2">
          🔊 Lendo a pesquisa
          {(loading || activeIdx < 0) && <span className="text-slate-400 dark:text-white/40 normal-case font-medium">— preparando…</span>}
        </span>
        <button
          onClick={onStop}
          className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide px-3.5 py-1.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-black hover:scale-105 transition-transform"
        >
          ⏹ Parar
        </button>
      </div>

      {/* texto em pedaços, com o atual destacado */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-8 md:px-12 py-8">
        <p className="font-serif text-[18px] sm:text-[19px] leading-loose">
          {chunks.map((c, i) => {
            const on = i === activeIdx;
            return (
              <span
                key={i}
                ref={on ? activeRef : undefined}
                className={
                  on
                    ? "rounded-md bg-cyan-400/25 dark:bg-cyan-400/20 text-black dark:text-white px-0.5 transition-colors"
                    : "text-slate-400/80 dark:text-white/35 transition-colors"
                }
              >
                {c}{" "}
              </span>
            );
          })}
        </p>
      </div>
    </div>
  );
}
