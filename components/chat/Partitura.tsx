"use client";

/**
 * Partitura — a melodia da skill `partitura-abc` desenhada E TOCADA no chat. Quem desenha e toca é o
 * abcjs (MIT, Paul Rosen e Gregory Dyke), carregado sob demanda: a biblioteca é grande e o áudio só
 * entra na página de quem recebe uma partitura, e só quando o aluno aperta "ouvir" (o navegador
 * exige um gesto pra ligar o som).
 *
 * O JSON vem do modelo e passa por lib/chat/partitura (as quatro chaves, cara de ABC). Antes de a
 * biblioteca carregar, e se ela falhar, o ABC cru continua visível num <details>: a partitura nunca
 * some em silêncio.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { parsePartitura } from "@/lib/chat/partitura";

/** O pedaço da API do abcjs que este componente usa (casado no import dinâmico, como o JSXGraph). */
type VisualObj = unknown;
type Sintetizador = {
  init(o: { visualObj: VisualObj; audioContext?: AudioContext; options?: Record<string, unknown> }): Promise<unknown>;
  prime(): Promise<unknown>;
  start(): void;
  stop(): void;
};
type AbcMod = {
  renderAbc(el: HTMLElement, abc: string, opts?: Record<string, unknown>): VisualObj[];
  synth: { supportsAudio(): boolean; CreateSynth: new () => Sintetizador };
};

const carregarAbc = async (): Promise<AbcMod> => {
  const m = await import("abcjs");
  return ((m as unknown as { default?: AbcMod }).default ?? (m as unknown as AbcMod));
};

export default function Partitura({ json }: { json: string }) {
  const r = parsePartitura(json);
  const alvo = useRef<HTMLDivElement>(null);
  const visual = useRef<VisualObj | null>(null);
  const synth = useRef<Sintetizador | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const [desenho, setDesenho] = useState<"carregando" | "pronto" | "falhou">("carregando");
  const [audio, setAudio] = useState<"indisponivel" | "parado" | "preparando" | "tocando">("parado");

  const ok = r.ok;
  const abc = r.ok ? r.abc : "";

  // DESENHO: renderiza no <div> quando a partitura é válida. Guarda o visualObj pro áudio reusar.
  useEffect(() => {
    if (!ok || !alvo.current) return;
    let vivo = true;
    setDesenho("carregando");
    carregarAbc()
      .then((abcjs) => {
        if (!vivo || !alvo.current) return;
        const v = abcjs.renderAbc(alvo.current, abc, { responsive: "resize", add_classes: true, paddingtop: 6, paddingbottom: 6 });
        visual.current = Array.isArray(v) ? v[0] : v;
        setDesenho("pronto");
        if (!abcjs.synth.supportsAudio()) setAudio("indisponivel");
      })
      .catch(() => { if (vivo) setDesenho("falhou"); });
    return () => { vivo = false; };
  }, [ok, abc]);

  // limpeza do áudio ao sair
  useEffect(() => () => {
    try { synth.current?.stop(); } catch { /* já parado */ }
    try { void audioCtx.current?.close(); } catch { /* já fechado */ }
  }, []);

  const tocar = useCallback(async () => {
    if (audio === "tocando") { try { synth.current?.stop(); } catch { /* ok */ } setAudio("parado"); return; }
    if (!visual.current) return;
    setAudio("preparando");
    try {
      const abcjs = await carregarAbc();
      // AudioContext criado DENTRO do gesto do clique: é o que o navegador exige pra deixar o som sair.
      if (!audioCtx.current) audioCtx.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      await audioCtx.current.resume().catch(() => undefined);
      const s = new abcjs.synth.CreateSynth();
      await s.init({ visualObj: visual.current, audioContext: audioCtx.current });
      await s.prime();
      synth.current = s;
      s.start();
      setAudio("tocando");
    } catch {
      setAudio("indisponivel");
    }
  }, [audio]);

  if (!r.ok) {
    return (
      <div data-partitura-erro className="my-2 rounded-xl border border-amber-300/50 bg-amber-50/60 dark:bg-amber-400/[0.07] px-3 py-2 text-[12px] text-amber-800 dark:text-amber-200">
        Não consegui montar esta partitura ({r.erro}).
      </div>
    );
  }

  return (
    <figure data-partitura aria-label={`Partitura: ${r.titulo} (tom ${r.tom})`} className="my-3 w-full max-w-[640px]">
      <figcaption className="mb-1 flex items-center gap-2 text-[12px] text-slate-600 dark:text-white/60">
        <span className="font-semibold text-slate-800 dark:text-white/85">{r.titulo}</span>
        <span className="rounded bg-black/[0.06] px-1.5 py-0.5 font-mono dark:bg-white/10">tom {r.tom}</span>
        {audio !== "indisponivel" && (
          <button
            type="button"
            onClick={() => void tocar()}
            disabled={desenho !== "pronto" || audio === "preparando"}
            className="ml-auto inline-flex items-center gap-1 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-0.5 text-[11.5px] font-semibold text-cyan-800 transition-colors hover:bg-cyan-500/20 disabled:opacity-50 dark:text-cyan-200"
            aria-label={audio === "tocando" ? "Parar" : "Ouvir a partitura"}
          >
            {audio === "tocando" ? "◼ parar" : audio === "preparando" ? "carregando…" : "▶ ouvir"}
          </button>
        )}
      </figcaption>
      <div
        ref={alvo}
        data-partitura-pauta
        /* text-slate-900: o abcjs desenha com `currentColor`; sem isto ele herda a cor clara do tema
           e as notas somem na pauta branca. */
        className={`w-full overflow-x-auto rounded-xl border border-slate-200 bg-white px-2 py-1 text-slate-900 dark:border-white/10 ${desenho === "falhou" ? "hidden" : ""}`}
      />
      {r.conceito && <p className="mt-1.5 text-[12px] italic text-slate-600 dark:text-white/60">{r.conceito}</p>}
      <details open={desenho === "falhou"} className="mt-1 text-[12px] text-slate-600 dark:text-white/60">
        <summary className="cursor-pointer select-none">{desenho === "falhou" ? "Não foi possível desenhar; veja o ABC" : "Ver o ABC"}</summary>
        <pre data-partitura-abc className="mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-black/[0.04] p-2 font-mono text-[11.5px] dark:bg-white/5">{r.abc}</pre>
      </details>
    </figure>
  );
}
