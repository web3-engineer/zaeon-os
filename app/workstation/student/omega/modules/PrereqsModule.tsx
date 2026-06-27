"use client";
import { useEffect, useState } from "react";
import { BookOpen, RefreshCw, Play, Loader2, Check } from "lucide-react";

import { useOmegaScholar } from "../OmegaScholarContext";
import ThinkingStream from "@/components/research/ThinkingStream";
import GlitchReveal from "@/components/research/GlitchReveal";
import SpeakButton from "@/components/voice/SpeakButton";

const DEPTH_STYLES: Record<string, string> = {
  "básico": "text-teal-300 bg-teal-400/10 border-teal-400/25",
  "intermediário": "text-cyan-300 bg-cyan-400/10 border-cyan-400/25",
  "avançado": "text-amber-300 bg-amber-400/10 border-amber-400/30",
};

const BASES_KEY = "zaeon.study.basesGenerated";

export default function PrereqsModule() {
  const { session, status, prereqs, prereqsSummary, loadingPrereqs, fetchPrereqs } = useOmegaScholar();

  // Play da Base: gera um ESTUDO em "Meus Estudos" a partir do título+contexto da base,
  // em background (sem sair daqui), com loading no botão e marca de "já gerado".
  const [busy, setBusy] = useState<{ area: string; topic: string } | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());

  // Gera sob demanda ao abrir a aba (lazy); cacheia na sessão (não re-busca em troca de aba).
  useEffect(() => {
    if (session && status === "done" && !prereqs && !loadingPrereqs) void fetchPrereqs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status]);

  // Carrega as bases que já viraram estudo (persistido por título).
  useEffect(() => {
    try { const raw = localStorage.getItem(BASES_KEY); if (raw) setDone(new Set(JSON.parse(raw))); } catch { /* ignore */ }
  }, []);

  // Quando o feed termina de gerar, solta o loading e marca a base como gerada.
  useEffect(() => {
    const onDone = (e: any) => {
      const topic = e?.detail?.topic;
      setBusy((b) => {
        if (!b || (topic && topic !== b.topic)) return b;
        if (!e?.detail?.error) {
          setDone((prev) => {
            const next = new Set(prev); next.add(b.area);
            try { localStorage.setItem(BASES_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
            return next;
          });
        }
        return null;
      });
    };
    window.addEventListener("zaeon:study:done", onDone);
    return () => window.removeEventListener("zaeon:study:done", onDone);
  }, []);

  // Dispara a geração do estudo (o MeusEstudosFeed escuta e cria em background).
  const playBase = (p: { area: string; why?: string }) => {
    if (busy) return; // um de cada vez
    const topic = `${p.area}${p.why ? ` — ${p.why}` : ""}`.slice(0, 300);
    setBusy({ area: p.area, topic });
    try { window.dispatchEvent(new CustomEvent("zaeon:study:run", { detail: { topic } })); } catch { /* ignore */ }
    // trava de segurança: se o feed estiver ocupado e ignorar o pedido, libera o botão.
    setTimeout(() => setBusy((b) => (b?.area === p.area ? null : b)), 90000);
  };

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
              <div className="flex items-center gap-2 min-w-0">
                {/* Play: gera um estudo disso em "Meus Estudos" (background). Loading enquanto
                    processa; fica verde quando esse conhecimento já virou estudo. */}
                <button
                  onClick={() => playBase(p)}
                  disabled={!!busy}
                  title={
                    busy?.area === p.area ? "Gerando seu estudo…"
                      : done.has(p.area) ? "Já virou estudo em Meus Estudos — gerar de novo"
                      : "Estudar isso: gerar um estudo em Meus Estudos"
                  }
                  className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:cursor-not-allowed ${
                    busy?.area === p.area ? "bg-cyan-500/15 text-cyan-500"
                      : done.has(p.area) ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25"
                      : "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 hover:bg-cyan-500/20"
                  } ${busy && busy.area !== p.area ? "opacity-50" : ""}`}
                >
                  {busy?.area === p.area ? <Loader2 size={14} className="animate-spin" />
                    : done.has(p.area) ? <Check size={14} />
                    : <Play size={14} className="ml-0.5" />}
                </button>
                <p className="font-bold text-sm text-slate-800 dark:text-white truncate">{p.area}</p>
              </div>
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
