"use client";

/**
 * GraficoDados — #749: o ```grafico de DADOS (barras) no chat. O desenho é o SVG do G3 (lib/agent/grafico): o mesmo
 * visual dos gráficos da resposta, claro e escuro pelo currentColor. `dangerouslySetInnerHTML` é seguro: o SVG é
 * montado por nós e todo texto do modelo (título, rótulos) passa por `escaparSvg`.
 */
import { useMemo } from "react";
import { svgDoGrafico } from "@/lib/agent/grafico";
import { parseGraficoDados } from "@/lib/chat/graficoDados";

export default function GraficoDados({ json }: { json: string }) {
  const r = useMemo(() => parseGraficoDados(json), [json]);
  const svg = useMemo(() => (r.ok ? svgDoGrafico(r.grafico) : null), [r]);
  if (!r.ok || !svg) {
    return (
      <div className="my-2 rounded-xl border border-amber-300/50 bg-amber-50/60 dark:bg-amber-400/[0.07] px-3 py-2 text-[12px] text-amber-800 dark:text-amber-200">
        Não consegui desenhar este gráfico ({r.ok ? "sem dados" : r.erro}).
      </div>
    );
  }
  const g = r.grafico;
  return (
    <figure data-grafico-dados className="my-3 w-full max-w-[560px] px-3.5 py-3 rounded-2xl bg-white/45 dark:bg-white/[0.045] border border-slate-200 dark:border-white/10">
      <figcaption className="text-[12.5px] font-semibold text-slate-900 dark:text-white mb-2">{g.titulo}</figcaption>
      <div className="text-slate-900 dark:text-white" dangerouslySetInnerHTML={{ __html: svg }} />
      <figcaption className="mt-1.5 text-[11px] text-slate-600 dark:text-white/60">Fonte: {g.fonte} · números citados pela Aura</figcaption>
    </figure>
  );
}
