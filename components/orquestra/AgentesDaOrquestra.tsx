"use client";
/**
 * components/orquestra/AgentesDaOrquestra.tsx — os AGENTES DA ORQUESTRA na Loja (/plugin-store, aba Agentes).
 *
 * Cada cartão é um motor de outro laboratório (DeepSeek, Alibaba, Moonshot) ou uma equipe mista, com o que ele
 * faz e o estado PRA ESTE ALUNO (GET /api/orquestra/agentes): liberado (adicionar), exige plano (cadeado),
 * aguardando chave ou orquestra pausada (em breve). Adicionar usa o MESMO trilho do Octa Code
 * (lib/plugins/chatPlugins): o agente aparece no seletor do chat, e o turno pede o motor dele à orquestra.
 */
import { useEffect, useState } from "react";
import { plugar, desplugar, usePluginsChat } from "@/lib/plugins/chatPlugins";
import type { AgenteNaLoja } from "@/lib/orquestra/loja";

export default function AgentesDaOrquestra({ busca = "" }: { busca?: string }) {
  const [agentes, setAgentes] = useState<AgenteNaLoja[] | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const plugados = usePluginsChat();

  useEffect(() => {
    let vivo = true;
    fetch("/api/orquestra/agentes", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivo) setAgentes(Array.isArray(d?.agentes) ? d.agentes : []); })
      .catch(() => { if (vivo) setAgentes([]); });
    return () => { vivo = false; };
  }, []);

  const q = busca.trim().toLowerCase();
  const lista = (agentes ?? []).filter((a) => !q || `${a.nome} ${a.laboratorio} ${a.resumo}`.toLowerCase().includes(q));
  if (agentes && !lista.length) return null;

  return (
    <section className="mb-12" aria-label="Agentes da orquestra">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-600 dark:text-cyan-400">Orquestra Zaeon</p>
          <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white">Agentes de outros laboratórios, trabalhando pra você</h2>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-slate-600 dark:text-white/60">
            Adicione e escolha no rosto do agente, no chat. A Zaeon entrega o seu pedido a ele, com as mesmas fontes e a mesma
            conferência de citações de sempre. Conversa rápida continua com a Aura.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {agentes === null
          ? Array.from({ length: 4 }, (_, i) => <div key={i} className="h-64 animate-pulse rounded-2xl border border-white/10 bg-black/60" />)
          : lista.map((a) => {
            const plugado = plugados.includes(a.id);
            const liberado = a.estado === "liberado";
            return (
              <article key={a.id} className="dark group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/80 p-5 text-white shadow-[0_16px_44px_-20px_rgba(0,0,0,0.75)] backdrop-blur-xl transition-all duration-300 hover:border-cyan-500/50 hover:shadow-[0_18px_50px_-20px_rgba(34,211,238,0.45)]">
                <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-30 blur-2xl" style={{ background: a.cor }} />
                <div className="relative flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-mono text-[13px] font-black ring-1 ring-white/20" style={{ background: `linear-gradient(135deg, ${a.cor}, #0b1020)` }}>{a.sigla}</span>
                  <div className="min-w-0">
                    <h3 className="truncate text-[15px] font-black">{a.nome}</h3>
                    <p className="text-[11px] text-white/50">{a.laboratorio}</p>
                  </div>
                </div>
                <div className="relative mt-3 flex flex-wrap gap-1.5">
                  <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white/70">
                    {a.formato === "enxame" ? "equipe de agentes" : "pesquisa profunda"}
                  </span>
                  <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-200">
                    plano {a.minPlan}
                  </span>
                </div>
                <p className="relative mt-3 text-[13px] leading-relaxed text-white/80">{a.resumo}</p>
                <button type="button" onClick={() => setAberto(aberto === a.id ? null : a.id)} className="relative mt-2 self-start text-[11px] font-bold text-cyan-300 hover:text-cyan-200">
                  {aberto === a.id ? "menos" : "como trabalha"}
                </button>
                {aberto === a.id && <p className="relative mt-1 text-[12px] leading-relaxed text-white/60">{a.comoTrabalha}</p>}
                <div className="relative mt-auto pt-4">
                  {liberado ? (
                    plugado ? (
                      <button type="button" onClick={() => desplugar(a.id)} className="w-full rounded-full border border-emerald-300/60 bg-emerald-300/10 px-4 py-2 font-mono text-[12px] font-black text-emerald-100 hover:bg-emerald-300/20">
                        ✓ nos seus agentes · remover
                      </button>
                    ) : (
                      <button type="button" onClick={() => plugar(a.id)} className="w-full rounded-full bg-gradient-to-b from-cyan-200 to-cyan-400 px-4 py-2 font-mono text-[12px] font-black text-slate-950 hover:brightness-110">
                        ⬡ adicionar aos meus agentes
                      </button>
                    )
                  ) : (
                    <div className="w-full rounded-full border border-white/15 bg-white/5 px-4 py-2 text-center font-mono text-[11px] font-bold text-white/60" role="status">
                      {a.estado === "exige_plano" ? "🔒 " : "⏳ "}{a.aviso}
                    </div>
                  )}
                  {plugado && !liberado && (
                    <button type="button" onClick={() => desplugar(a.id)} className="mt-2 w-full text-center text-[11px] font-bold text-white/50 underline hover:text-white/80">remover dos meus agentes</button>
                  )}
                </div>
              </article>
            );
          })}
      </div>
    </section>
  );
}
