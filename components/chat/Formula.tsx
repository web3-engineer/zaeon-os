"use client";

/**
 * Formula — LaTeX renderizado com KaTeX no chat (inline ou em destaque). O katex já é dependência
 * (o Modo Revista usa nos destaques); aqui é carregado sob demanda, uma vez, e o HTML fica em cache.
 * Antes de carregar, mostra o LaTeX em fonte mono (nunca some). `trust:false` = sem \href/\url/html
 * vindo do modelo; `throwOnError:false` = expressão quebrada aparece marcada, não derruba a bolha.
 */
import { useEffect, useState } from "react";
import "katex/dist/katex.min.css";
import { virgulaDecimal } from "@/lib/chat/matematica";

type Katex = { renderToString(tex: string, opts: Record<string, unknown>): string };
let katexMod: Katex | null = null;
let promessa: Promise<Katex> | null = null;
function carregarKatex(): Promise<Katex> {
  // + mhchem: `\ce{2H2 + O2 -> 2H2O}` (reações e fórmulas químicas) vira notação química de verdade
  if (!promessa) promessa = import("katex").then(async (m) => {
    // @ts-expect-error — a extensão não tem tipos; ela só registra a macro \ce no katex
    await import("katex/contrib/mhchem").catch(() => {});
    return (katexMod = ((m as any).default ?? m) as Katex);
  });
  return promessa;
}

const cache = new Map<string, string>();
/** PURO (com o katex carregado): HTML da fórmula, memoizado. */
export function htmlDaFormula(katex: Katex, latex: string, display: boolean): string {
  const chave = `${display ? "D" : "I"}${latex}`;
  const pronto = cache.get(chave);
  if (pronto) return pronto;
  const html = katex.renderToString(virgulaDecimal(latex), { displayMode: display, throwOnError: false, trust: false, strict: "ignore", output: "htmlAndMathml", maxSize: 20, maxExpand: 200 });
  if (cache.size > 500) cache.clear();
  cache.set(chave, html);
  return html;
}

export default function Formula({ latex, display = false }: { latex: string; display?: boolean }) {
  const [, setPronto] = useState(!!katexMod);
  useEffect(() => {
    if (katexMod) return;
    let vivo = true;
    carregarKatex().then(() => { if (vivo) setPronto(true); }).catch(() => {});
    return () => { vivo = false; };
  }, []);

  if (!katexMod) {
    return display
      ? <div className="my-2 font-mono text-[0.92em] text-slate-600 dark:text-white/70">{latex}</div>
      : <code className="font-mono text-[0.92em]">{latex}</code>;
  }
  const html = htmlDaFormula(katexMod, latex, display);
  return display
    ? <div className="z-formula my-2.5 overflow-x-auto overflow-y-hidden py-1 text-[1.05em]" dangerouslySetInnerHTML={{ __html: html }} />
    : <span className="z-formula" dangerouslySetInnerHTML={{ __html: html }} />;
}
