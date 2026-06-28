"use client";
import { useEffect, useRef, useState } from "react";
import { BookMarked, Lightbulb, BookOpen, Layers } from "lucide-react";
import { useOmegaScholar } from "./OmegaScholarContext";
import OmegaScholarBar from "./OmegaScholarBar";
import ActivityThread from "./ActivityThread";
import GenerateResearchPanel from "@/components/research/GenerateResearchPanel";
import ReferencesModule from "./modules/ReferencesModule";
import ResultadosModule from "./modules/ResultadosModule";
import InsightsModule from "./modules/InsightsModule";
import PrereqsModule from "./modules/PrereqsModule";
import OmegaRelatedResearch from "./OmegaRelatedResearch";
import PastResearchList from "./PastResearchList";
import AuthGateNotice from "@/components/research/AuthGateNotice";

const TABS = [
  { id: "refs", label: "Referências", icon: BookMarked },
  { id: "results", label: "Resultados", icon: Layers },
  { id: "insights", label: "Insights", icon: Lightbulb },
  { id: "prereqs", label: "Base", icon: BookOpen },
];

export default function OmegaScholarWorkspace() {
  const { session, status, query, draft } = useOmegaScholar();
  const [mod, setMod] = useState("refs");
  const [history, setHistory] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/ai/scholar/sessions").then((r) => r.json())
      // Só pesquisas CONCLUÍDAS no histórico — as que falharam/ficaram a meio não devem
      // aparecer (clicar nelas "abria" como se tivesse dado certo).
      .then((d) => setHistory((d.sessions ?? []).filter((x: any) => x.status === "done")))
      .catch(() => {});
  }, [status]);

  const s = session;
  const seed = (query || draft || "").trim();

  // Reabrir uma pesquisa anterior: vai pra aba Referências e sobe ao topo.
  const handleOpened = () => {
    setMod("refs");
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div ref={containerRef} className="h-full overflow-y-auto custom-scrollbar p-6">
      {/* MODAL DA PESQUISA — bloco único destacado (cor da antiga barra do Omega): ⟁ + glitch
          + barra de busca + informes dos agentes, separado do fundo branco da página. */}
      <div className="mb-5 rounded-[1.8rem] bg-gradient-to-br from-violet-500/15 to-purple-500/5 border border-violet-300/30 dark:border-white/10 shadow-[0_18px_50px_-24px_rgba(124,58,237,0.45)] px-4 sm:px-5 pt-4 pb-1 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-violet-400/10 rounded-full blur-[55px] pointer-events-none" />
        <div className="relative z-10">
          <OmegaScholarBar collapsible flushTop />
          <ActivityThread />
          {/* "Gerar pesquisa" — logo abaixo da barra/resposta, só quando o estudo concluiu. */}
          {status === "done" && (
            <GenerateResearchPanel
              topic={seed}
              references={(s?.references ?? []).slice(0, 12).map((p: any) => `${p.title ?? ""}${p.year ? ` (${p.year})` : ""}${p.authors?.length ? ` — ${p.authors.slice(0, 3).join(", ")}` : ""}`.trim())}
            />
          )}
        </div>
      </div>

      {status === "unauthorized" && (
        <AuthGateNotice className="my-10 max-w-md mx-auto" />
      )}

      {s && (
        <>
          {/* Trilho de abas — pills soltas (sem a "pill maior" envolvendo) */}
          <div data-tour="result-tabs" className="mb-4 flex w-fit max-w-full overflow-x-auto no-scrollbar gap-1.5">
            {TABS.map((t) => {
              const Icon = t.icon; const on = mod === t.id;
              const count = t.id === "refs" ? s.references?.length : t.id === "results" ? s.results?.length : undefined;
              return (
                <button key={t.id} onClick={() => setMod(t.id)}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap px-3.5 py-2 rounded-xl transition-colors motion-reduce:transition-none ${on
                    ? "bg-gradient-to-b from-white/90 to-white/50 dark:from-white/20 dark:to-white/[0.07] text-slate-900 dark:text-white border border-white/70 dark:border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_6px_18px_-8px_rgba(139,92,246,0.7)]"
                    : "text-slate-500 dark:text-white/50 border border-transparent hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-slate-700 dark:hover:text-white/70"}`}>
                  <Icon size={13} strokeWidth={on ? 2.2 : 1.8} /> {t.label}{count != null ? ` (${count})` : ""}
                </button>
              );
            })}
          </div>
          {mod === "refs" && <ReferencesModule references={s.references ?? []} evidence={s.evidence ?? []} />}
          {mod === "results" && <ResultadosModule results={s.results ?? []} />}
          {mod === "insights" && <InsightsModule insights={s.insights} />}
          {mod === "prereqs" && <PrereqsModule />}

        </>
      )}

      {/* Pesquisas relacionadas — no final, logo acima do histórico */}
      {status !== "unauthorized" && <OmegaRelatedResearch />}

      <PastResearchList items={history} activeId={s?.id} onOpened={handleOpened} />
    </div>
  );
}
