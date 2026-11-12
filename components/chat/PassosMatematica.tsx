"use client";

/**
 * PassosMatematica — a resolução da skill `formulas-katex` na tela: um passo por linha, a fórmula
 * tipografada pelo KaTeX (o mesmo `Formula` do resto do chat, com `trust:false`) e a regra aplicada
 * embaixo. O JSON vem do modelo e passa por lib/chat/passos.
 */
import { useMemo } from "react";
import Formula from "@/components/chat/Formula";
import { parsePassos } from "@/lib/chat/passos";

export default function PassosMatematica({ json }: { json: string }) {
  const r = useMemo(() => parsePassos(json), [json]);
  if (!r.ok) {
    return (
      <div data-passos-erro className="my-2 rounded-xl border border-amber-300/50 bg-amber-50/60 dark:bg-amber-400/[0.07] px-3 py-2 text-[12px] text-amber-800 dark:text-amber-200">
        Não consegui mostrar esta resolução ({r.erro}).
      </div>
    );
  }
  return (
    <ol data-passos className="my-3 w-full max-w-[640px] space-y-2">
      {r.passos.map((p) => (
        <li key={p.passo} data-passo className="flex gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/[0.03] px-3 py-2">
          <span aria-hidden className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-600/10 text-[12px] font-semibold text-cyan-800 dark:bg-cyan-300/10 dark:text-cyan-200">{p.passo}</span>
          <div className="min-w-0 flex-1">
            <span className="sr-only">Passo {p.passo}: </span>
            <Formula latex={p.latex} display />
            {p.explicacao && <p className="mt-0.5 text-[13px] leading-[1.5] text-slate-600 dark:text-white/65">{p.explicacao}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
