"use client";

/**
 * ForjaView — a Sala de Estudos de um REPOSITÓRIO/entregável, desenhada como um BOARD estilo n8n:
 * cards-módulo conectados em ordem (entender → espelho → entregar) + o regulador de 🌡️ temperatura
 * (básico/médio/avançado), que sobe o quanto a Zaeon explica E o quanto cobra. Reusa o motor puro da
 * Forja (lib/forja/curso + temperatura) e o molde de aba do caderno (DocumentoArtefato).
 *
 * Recebe o CursoRepo (esqueleto curado ou já preenchido pelo engine) via `data`; só com `artifactId`
 * (reaberta do servidor), busca em /api/studio/[id], como a CadernoView.
 */
import { useEffect, useMemo, useState } from "react";
import { conexoesDoBoard } from "@/lib/forja/curso";
import { cobrancaDaTemperatura, arvoreNaTemperatura } from "@/lib/forja/temperatura";
import { TEMPERATURAS } from "@/lib/forja/tipos";
import type { CursoRepo, ModuloBoard, Temperatura, TipoLicao } from "@/lib/forja/tipos";

const EMOJI_PAPEL: Record<string, string> = { entender: "📖", espelho: "🪞", entregar: "🚀" };
const ROTULO_TEMP: Record<Temperatura, string> = { basico: "Básico", medio: "Médio", avancado: "Avançado" };
const ROTULO_LICAO: Record<TipoLicao, string> = {
  leetcode: "desafios", review: "code review", perguntas: "perguntas", teste: "testes", entrevista: "entrevista", codebox: "digitar (sem colar)",
};

function Card({ m }: { m: ModuloBoard }) {
  return (
    <div className={`relative min-w-[150px] flex-1 rounded-2xl border p-3 ${
      m.passivo
        ? "border-white/40 bg-white/40 opacity-70 dark:border-white/10 dark:bg-white/[0.03]"
        : "border-cyan-400/40 bg-white/70 dark:border-cyan-300/20 dark:bg-[#0b1324]/80"
    }`}>
      <div className="text-[18px]">{EMOJI_PAPEL[m.papel] || "⟁"}</div>
      <div className="mt-1 text-[13px] font-black tracking-tight text-[#0b3a66] dark:text-white">{m.titulo}</div>
      <div className="mt-[2px] text-[11px] uppercase tracking-wide text-slate-400">{m.papel}</div>
      {m.passivo && <span className="absolute right-2 top-2 rounded-full bg-slate-500/10 px-2 py-[2px] text-[10px] text-slate-400">base</span>}
    </div>
  );
}

export default function ForjaView({ data, artifactId }: { data?: CursoRepo | null; artifactId?: string }) {
  const [curso, setCurso] = useState<CursoRepo | null>(data ?? null);
  const [temp, setTemp] = useState<Temperatura>("basico");

  useEffect(() => {
    if (curso || !artifactId) return;
    let vivo = true;
    fetch(`/api/studio/${artifactId}`).then((r) => r.json()).then((j) => { if (vivo && j?.meta) setCurso(j.meta as CursoRepo); }).catch(() => {});
    return () => { vivo = false; };
  }, [artifactId, curso]);

  const modulos = useMemo(() => (curso ? [...curso.modulos].sort((a, b) => a.ordem - b.ordem) : []), [curso]);
  const conexoes = useMemo(() => (curso ? conexoesDoBoard(curso.modulos) : []), [curso]);
  const cobranca = useMemo(() => cobrancaDaTemperatura(temp), [temp]);
  const arvore = useMemo(() => (curso ? arvoreNaTemperatura(curso.arvore, temp) : null), [curso, temp]);

  if (!curso) return <div className="grid h-full place-items-center text-[13px] text-slate-400">Carregando o estudo…</div>;
  const semEngine = curso.grafo.nos.length === 0;

  return (
    <div className="h-full overflow-y-auto bg-[#f4f7fb] p-4 dark:bg-[#070d1a] sm:p-6">
      <div className="mx-auto max-w-[820px]">
        <div className="text-[12px] font-mono text-cyan-500">{curso.repo}</div>
        <h1 className="mt-1 text-[26px] font-black tracking-tight text-[#0b3a66] dark:text-white">{curso.arvore.raiz.titulo}</h1>
        <p className="mt-1 max-w-[56ch] text-[13.5px] text-slate-500 dark:text-white/60">{curso.arvore.raiz.resumo}</p>
        <div className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">
          modo {curso.modo === "curso" ? "curso (hiper-detalhado)" : "entregável (engines como base)"}
        </div>

        {/* o board: cards conectados em ordem (estilo n8n) */}
        <div className="mt-5 flex flex-wrap items-stretch gap-2 sm:flex-nowrap" data-testid="forja-board">
          {modulos.map((m, i) => (
            <div key={m.id} className="flex flex-1 items-center gap-2">
              <Card m={m} />
              {i < modulos.length - 1 && <span aria-hidden className="shrink-0 text-cyan-400/70">→</span>}
            </div>
          ))}
        </div>
        <div className="mt-1 text-[11px] text-slate-400">{conexoes.length} conexão(ões) no fluxo</div>

        {/* o regulador de temperatura */}
        <div className="mt-6 rounded-2xl border border-white/60 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex items-center gap-2">
            <span className="text-[16px]">🌡️</span>
            <span className="text-[13px] font-bold text-[#0b3a66] dark:text-white">Temperatura</span>
            <span className="text-[11px] text-slate-400">quanto mais quente, mais explica e mais cobra</span>
          </div>
          <div className="mt-3 inline-flex rounded-full bg-slate-500/10 p-1" role="tablist" aria-label="temperatura">
            {TEMPERATURAS.map((t) => (
              <button key={t} type="button" role="tab" aria-selected={temp === t} onClick={() => setTemp(t)}
                className={`rounded-full px-4 py-[6px] text-[12.5px] font-semibold transition-colors ${
                  temp === t ? "bg-cyan-500 text-white" : "text-slate-500 hover:text-cyan-500 dark:text-white/60"
                }`}>
                {ROTULO_TEMP[t]}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
            <span className="text-slate-400">cobra:</span>
            {cobranca.licoes.map((l) => (
              <span key={l} className="rounded-full bg-cyan-500/10 px-2.5 py-[3px] text-cyan-700 dark:text-cyan-300">{ROTULO_LICAO[l]}</span>
            ))}
            {cobranca.exigeDigitar && <span className="rounded-full bg-amber-500/15 px-2.5 py-[3px] text-amber-700 dark:text-amber-300">⌨️ exige digitação</span>}
          </div>
        </div>

        {/* a tour de entendimento, filtrada pela temperatura — ou o aviso de que o engine ainda não rodou */}
        <div className="mt-5">
          <div className="mb-2 text-[13px] font-bold text-[#0b3a66] dark:text-white">Entendimento no nível {ROTULO_TEMP[temp]}</div>
          {semEngine || !arvore?.raiz.filhos.length ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-[12.5px] text-slate-500 dark:border-white/10 dark:text-white/50">
              O mapa do código entra aqui quando o motor analisar o repositório (Graphify + Understand-Anything).
              Por enquanto, o board e a temperatura já definem a jornada.
            </div>
          ) : (
            <ol className="space-y-2">
              {arvore.raiz.filhos.map((n) => (
                <li key={n.id} className="rounded-xl border border-white/60 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="text-[13px] font-semibold text-[#0b3a66] dark:text-white">{n.titulo}</div>
                  {n.resumo && <div className="text-[12px] text-slate-500 dark:text-white/60">{n.resumo}</div>}
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* atribuição das licenças dos engines (obrigatória, sempre alcançável) */}
        {curso.licencas.length > 0 && (
          <div className="mt-6 border-t border-slate-200 pt-3 text-[11px] text-slate-400 dark:border-white/10">
            Motores:{" "}
            {curso.licencas.map((l, i) => (
              <span key={i}>
                {i > 0 && " · "}
                {l.url ? <a href={l.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-cyan-500">{l.titular || l.spdx}</a> : (l.titular || l.spdx)} ({l.spdx})
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
