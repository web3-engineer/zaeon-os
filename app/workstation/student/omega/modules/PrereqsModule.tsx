"use client";
import { useEffect } from "react";
import { BookOpen, RefreshCw } from "lucide-react";

import { useOmegaScholar } from "../OmegaScholarContext";
import ThinkingStream from "@/components/research/ThinkingStream";
import GlitchReveal from "@/components/research/GlitchReveal";
import SpeakButton from "@/components/voice/SpeakButton";

const DEPTH_STYLES: Record<string, string> = {
  "básico": "text-teal-300 bg-teal-400/10 border-teal-400/25",
  "intermediário": "text-cyan-300 bg-cyan-400/10 border-cyan-400/25",
  "avançado": "text-amber-300 bg-amber-400/10 border-amber-400/30",
};

export default function PrereqsModule() {
  const { session, status, prereqs, prereqsSummary, loadingPrereqs, fetchPrereqs } = useOmegaScholar();

  // Gera sob demanda ao abrir a aba (lazy); cacheia na sessão (não re-busca em troca de aba).
  useEffect(() => {
    if (session && status === "done" && !prereqs && !loadingPrereqs) void fetchPrereqs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status]);

  if (!session || status !== "done") {
    return (
      <div className="text-center text-slate-400 dark:text-white/30 text-sm py-12">
        <BookOpen size={20} className="mx-auto mb-2 opacity-50" />
        Faça uma pesquisa — aqui o Omega recomenda o que estudar antes pra entender o assunto a fundo.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold text-slate-500 dark:text-white/50 inline-flex items-center gap-1.5">
          <BookOpen size={13} className="text-cyan-400" /> Conhecimentos prévios para entender esta pesquisa
        </p>
        <div className="flex items-center gap-2 shrink-0">
          {prereqsSummary && <SpeakButton text={prereqsSummary} size={14} title="Ouvir a base" />}
          {prereqs && !loadingPrereqs && (
            <button
              onClick={() => void fetchPrereqs()}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-600 dark:text-violet-300 hover:underline"
            >
              <RefreshCw size={12} /> recalcular
            </button>
          )}
        </div>
      </div>

      {loadingPrereqs && <ThinkingStream running label="mapeando o que você precisa saber" />}

      {prereqsSummary && !loadingPrereqs && (
        <p className="text-lg md:text-xl text-cyan-700/80 dark:text-cyan-300/70 leading-relaxed">
          <GlitchReveal text={prereqsSummary} />
        </p>
      )}

      {!loadingPrereqs &&
        prereqs?.map((p, i) => (
          <div key={i} className="rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-black/8 dark:border-white/12 p-4">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="font-bold text-sm text-slate-800 dark:text-white">📘 {p.area}</p>
              <span className={`shrink-0 text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${DEPTH_STYLES[p.depth] ?? DEPTH_STYLES["intermediário"]}`}>
                {p.depth}
              </span>
            </div>
            <p className="text-base md:text-lg text-slate-500 dark:text-white/55 leading-relaxed">
              <span className="text-slate-400 dark:text-white/35">por quê: </span>
              {p.why}
            </p>
          </div>
        ))}

      {!loadingPrereqs && prereqs && prereqs.length === 0 && (
        <p className="text-center text-slate-400 dark:text-white/30 text-xs py-8">
          Nenhuma recomendação gerada.{" "}
          <button onClick={() => void fetchPrereqs()} className="font-bold underline">
            Tentar de novo
          </button>
        </p>
      )}
    </div>
  );
}
