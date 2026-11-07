"use client";

/**
 * EscritorioRoom — a Sala Escritório: os agentes da Zaeon como um lugar.
 *
 * O que esta primeira versão MOSTRA de verdade: quem são os agentes (vindos do
 * `MENTOR_SEED`, não de uma lista inventada), em que departamento cada um trabalha,
 * o que cada um sabe fazer, e qual deles está ocupado AGORA nesta aba.
 *
 * O que ela ainda NÃO mostra, e não vai fingir que mostra: as sete fases do harness
 * (`route · plan · gather · reason · draft · critique · finalize`). O `trajectory.ts`
 * emite essas fases, mas elas morrem no servidor — o canal Pusher `user_<id>` só carrega
 * `new-message` e `zaeon-notice`. Enquanto o harness não publicar as fases, animar o pod
 * como se ele estivesse "raciocinando" seria teatro. Ver o README do PR.
 *
 * O estado real que dá pra saber hoje vem daqui mesmo: quando o aluno manda uma pergunta
 * pra um mentor, o chat dispara `zaeon:agente` e o pod acende até a resposta chegar.
 */
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { montarEscritorio, porDepartamento, type EstadoPod } from "@/lib/office/mapa";

// A cena carrega três.js inteiro: fica fora do bundle inicial e nunca roda em SSR.
const OfficeScene = dynamic(() => import("@/components/office/OfficeScene"), {
  ssr: false,
  loading: () => <div className="w-full h-full grid place-items-center text-[12px] text-slate-500 dark:text-white/40">Abrindo o escritório…</div>,
});

/** Evento que o chat dispara quando fala com um mentor. */
export type EventoAgente = { slug: string; estado: EstadoPod };

export default function EscritorioRoom({ aoAbrirChat }: { aoAbrirChat?: (slug: string) => void }) {
  const pods = useMemo(() => montarEscritorio(), []);
  const grupos = useMemo(() => porDepartamento(pods), [pods]);
  const [estados, setEstados] = useState<Record<string, EstadoPod>>({});
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const semMovimento = useMemo(
    () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  useEffect(() => {
    const ouvir = (e: Event) => {
      const d = (e as CustomEvent<EventoAgente>).detail;
      if (!d?.slug) return;
      setEstados((prev) => ({ ...prev, [d.slug]: d.estado }));
    };
    window.addEventListener("zaeon:agente", ouvir);
    return () => window.removeEventListener("zaeon:agente", ouvir);
  }, []);

  const podSelecionado = pods.find((p) => p.slug === selecionado) ?? null;
  const ocupados = Object.entries(estados).filter(([, e]) => e !== "ocioso").length;

  return (
    <div className="w-full h-full flex flex-col lg:flex-row gap-4 p-4">
      {/* a sala */}
      <div data-tour="escritorio-3d" className="relative flex-1 min-h-[360px] rounded-[28px] overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-[#0b1620]">
        <OfficeScene
          pods={pods}
          estados={estados}
          selecionado={selecionado}
          aoSelecionar={setSelecionado}
          semMovimento={semMovimento}
        />
        <div className="absolute top-3 left-4 text-[11px] uppercase tracking-[0.18em] font-bold text-slate-500 dark:text-white/45 pointer-events-none">
          Escritório · {pods.length} agentes
          {ocupados > 0 && <span className="text-cyan-500 dark:text-cyan-300"> · {ocupados} trabalhando</span>}
        </div>
      </div>

      {/* painel lateral */}
      <aside className="lg:w-[320px] shrink-0 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
        {podSelecionado ? (
          <div className="rounded-2xl p-4 border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: podSelecionado.departamento.cor }}
                aria-hidden
              />
              <div>
                <p className="text-[15px] font-black text-slate-900 dark:text-white leading-tight">{podSelecionado.nome}</p>
                <p className="text-[11px] text-slate-500 dark:text-white/50">
                  {podSelecionado.curso} · {podSelecionado.departamento.nome}
                </p>
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-white/40 mb-1">Entrega</p>
              <div className="flex flex-wrap gap-1">
                {podSelecionado.artefatos.map((a) => (
                  <span key={a} className="px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-700 dark:text-white/75 border border-slate-200 dark:border-white/10">
                    {a}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={() => aoAbrirChat?.(podSelecionado.slug)}
              className="w-full py-2.5 rounded-full bg-black dark:bg-white text-white dark:text-black text-[12px] font-bold hover:scale-[1.02] transition-transform"
            >
              Falar com {podSelecionado.nome}
            </button>

            {/* Departamento com tela própria (hoje só a Anatomia) ganha a porta. Sai do DADO
                (Departamento.rota) e não de um `if` por slug: no dia do segundo, ele aparece
                sozinho. Sem rota, nenhum botão — não se oferece porta que não existe. */}
            {podSelecionado.departamento.rota && (
              <a
                href={podSelecionado.departamento.rota}
                className="block w-full py-2.5 rounded-full text-center text-[12px] font-bold border border-slate-200 dark:border-white/15 text-slate-700 dark:text-white/80 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
              >
                Abrir {podSelecionado.departamento.nome}
              </a>
            )}
          </div>
        ) : (
          <div className="rounded-2xl p-4 border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.03]">
            <p className="text-[13px] text-slate-700 dark:text-white/75 leading-relaxed">
              Cada bloco é um agente da Zaeon, no departamento onde ele trabalha.
              Clique num deles para ver o que entrega — e para conversar.
            </p>
          </div>
        )}

        {/* legenda por departamento — e o caminho acessível pro mesmo conteúdo */}
        <div data-tour="escritorio-departamentos" className="rounded-2xl p-4 border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] flex flex-col gap-3">
          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-white/40">Departamentos</p>
          {grupos.map(({ dep, pods: lista }) => (
            <div key={dep.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: dep.cor }} aria-hidden />
                <span className="text-[12px] font-bold text-slate-800 dark:text-white/85">{dep.nome}</span>
                <span className="text-[11px] text-slate-400 dark:text-white/35">{lista.length}</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-white/45 leading-snug pl-[18px]">{dep.descricao}</p>
              <ul className="pl-[18px] flex flex-wrap gap-1">
                {lista.map((p) => (
                  <li key={p.slug}>
                    <button
                      onClick={() => setSelecionado(p.slug)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                        selecionado === p.slug
                          ? "border-cyan-400/60 text-cyan-600 dark:text-cyan-300"
                          : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:border-cyan-400/40"
                      }`}
                    >
                      {p.nome}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
