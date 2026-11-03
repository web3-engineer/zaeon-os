"use client";
/**
 * SalaRea — a lista dos BLUEPRINTS REA (engenharia reversa) da pessoa na Sala de Estudos. Cada um nasce de uma conversa
 * de "como X funciona por dentro". Clicar abre o módulo (ReaBlueprintView). lib/rea-blueprint, flag NEXT_PUBLIC_REA_BLUEPRINT.
 */
import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Microscope, Loader2, ChevronLeft } from "lucide-react";
import type { ResumoRea } from "@/lib/rea-blueprint/tipos";

const ReaBlueprintView = dynamic(() => import("@/components/rea/ReaBlueprintView"), { ssr: false });

export default function SalaRea() {
  const [lista, setLista] = useState<ResumoRea[] | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try { const r = await fetch("/api/rea", { cache: "no-store" }); if (r.ok) setLista((await r.json()).blueprints ?? []); else setLista([]); }
    catch { setLista([]); }
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);

  if (aberto) return (
    <div className="h-full">
      <button onClick={() => setAberto(null)} className="flex items-center gap-1 px-4 py-2 text-[12px] text-slate-400 hover:text-slate-200"><ChevronLeft size={14} /> voltar</button>
      <div className="h-[calc(100%-36px)]"><ReaBlueprintView id={aberto} /></div>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-4 flex items-center gap-2">
        <Microscope size={18} className="text-emerald-400" />
        <h2 className="text-[15px] font-bold text-slate-100">Engenharia reversa</h2>
      </div>
      {lista === null ? <div className="flex items-center gap-2 text-slate-400"><Loader2 className="animate-spin" size={16} /> carregando…</div>
        : lista.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-[13px] text-slate-400">
            Nenhum blueprint ainda. No chat, peça pra entender algo <span className="text-emerald-300">por dentro</span> — &ldquo;faz a engenharia reversa de como o X funciona&rdquo; — e a Zaeon monta aqui um blueprint: o mecanismo, os achados (observação · derivação · inferência · desconhecido) e os passos pra reconstruir.
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {lista.map((b) => (
              <li key={b.id}>
                <button onClick={() => setAberto(b.id)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left transition hover:border-emerald-400/30 hover:bg-emerald-400/[0.05]">
                  <span className="text-lg">🔬</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold text-slate-100">{b.titulo}</span>
                    <span className="block text-[11.5px] text-slate-500">{b.alvo ? `${b.alvo} · ` : ""}{b.achados} achados · {b.incertezas} em aberto</span>
                  </span>
                  <span className="text-[11px] text-emerald-300">abrir →</span>
                </button>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}
