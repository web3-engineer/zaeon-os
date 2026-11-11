"use client";

/**
 * GraficoDados — o ```grafico de DADOS (barras) no chat.
 *
 * #756: as barras são TEXTO da página, não uma imagem SVG de largura fixa. A imagem encolhia inteira no celular (a letra
 * ficava com uns 4 px) e só a maior barra tinha número. Agora:
 *  - no celular o nome vai em cima e a barra usa a largura toda; do `sm` pra cima o nome fica do lado, como antes;
 *  - TODA barra tem o número, com a unidade ("84,8 mi"), e número grande tem ponto de milhar ("84.847.187");
 *  - a letra é em `em`, então acompanha o A−/A+ do chat;
 *  - barra de valor pequeno nunca some (largura mínima), e zero não desenha barra (só o "0").
 * Mesma cor do G3 (COR_SERIE), mesma ponta arredondada, mesmo quadro, título e "Fonte: … · números citados pela Aura".
 * Os gráficos automáticos da resposta (G3, svgDoGrafico) continuam SVG — este componente é só o que a pessoa PEDE.
 */
import { useMemo } from "react";
import { COR_SERIE } from "@/lib/agent/grafico";
import { numeroBR, parseGraficoDados } from "@/lib/chat/graficoDados";

export default function GraficoDados({ json }: { json: string }) {
  const r = useMemo(() => parseGraficoDados(json), [json]);
  if (!r.ok) {
    return (
      <div className="my-2 rounded-xl border border-amber-300/50 bg-amber-50/60 dark:bg-amber-400/[0.07] px-3 py-2 text-[12px] text-amber-800 dark:text-amber-200">
        Não consegui desenhar este gráfico ({r.erro}).
      </div>
    );
  }
  const g = r.grafico;
  const max = Math.max(...g.pontos.map((p) => p.valor));
  const u = (g.unidade ?? "").trimEnd();
  return (
    <figure data-grafico-dados className="my-3 w-full max-w-[560px] px-3.5 py-3 rounded-2xl bg-white/45 dark:bg-white/[0.045] border border-slate-200 dark:border-white/10">
      <figcaption className="text-[0.8em] font-semibold text-slate-900 dark:text-white mb-2.5">{g.titulo}</figcaption>
      <ul className="m-0 p-0 list-none flex flex-col gap-2 sm:gap-1.5" aria-label={g.titulo}>
        {g.pontos.map((p, i) => {
          const pct = max > 0 ? (p.valor / max) * 100 : 0;
          const valor = `${numeroBR(p.valor)}${u}`;
          return (
            <li key={i} data-barra className="grid grid-cols-1 sm:grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] sm:items-center gap-x-2.5 gap-y-0.5">
              <span className="text-[0.82em] text-slate-600 dark:text-white/65 sm:text-right truncate" title={p.label}>{p.label}</span>
              <span className="flex items-center gap-2 min-w-0">
                <span className="flex-1 min-w-0" aria-hidden="true">
                  {p.valor > 0 && (
                    <span data-barra-cheia className="block h-3 rounded-r-[4px]" style={{ width: `${pct.toFixed(2)}%`, minWidth: 3, background: COR_SERIE }} />
                  )}
                </span>
                <span className="shrink-0 text-[0.82em] font-semibold tabular-nums text-slate-900 dark:text-white">{valor}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="m-0 mt-2 text-[0.72em] text-slate-600 dark:text-white/60">Fonte: {g.fonte} · números citados pela Aura</p>
    </figure>
  );
}
