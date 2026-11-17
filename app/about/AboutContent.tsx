"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { PLAN_INFO } from "@/lib/plans";
import PilaresAbout from "@/components/about/PilaresAbout";
import PdaEquipe from "@/components/about/PdaEquipe";
import MarCardumes from "@/components/sub/MarCardumes";
import pt from "@/public/locales/pt/common.json";
import "@/src/i18n";

export default function AboutContent() {
  const { t } = useTranslation();
  const texto = pt.about.apresentacao;

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
        <MarCardumes continuo />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/75 to-background" />
      </div>

      <div className="zaeon-borda mx-auto flex flex-col gap-20 pb-20 pt-28 sm:pt-36 md:gap-28">
        <header className="mx-auto flex min-h-[52svh] max-w-4xl flex-col items-center justify-center text-center">
          <h1 className="text-balance font-display text-[clamp(2.5rem,6.3vw,5.2rem)] font-medium leading-[1.05] tracking-tight text-slate-950 dark:text-white">
            {t("about.apresentacao.titulo", texto.titulo)}
          </h1>
          <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-slate-800 dark:text-slate-100 md:text-xl">
            {t("about.apresentacao.resumo", texto.resumo)}
          </p>
          <Link href="/#amostra-estudo" className="mt-8 rounded-full bg-cyan-800 px-6 py-3 font-semibold text-white transition-colors hover:bg-cyan-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-600">
            {t("about.apresentacao.ver_amostra", texto.ver_amostra)}
          </Link>
        </header>

        <PilaresAbout />

        <div id="planos" className="relative max-w-6xl mx-auto scroll-mt-24">
            <div className="text-center mb-12">
                <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter drop-shadow-2xl">{t("about.plans.title", "Planos")}</h2>
                <p className="text-cyan-300/70 text-sm font-bold uppercase tracking-[0.25em] mt-3">{t("about.plans.subtitle")}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {PLAN_INFO.map((p) => {
                    const featured = p.id === "plus";
                    return (
                        <div key={p.id}
                            className={`relative rounded-[1.8rem] p-[1.5px] ${featured ? "bg-gradient-to-br from-violet-500 to-cyan-400 shadow-[0_20px_60px_-20px_rgba(34,211,238,0.6)]" : "bg-white/10"}`}>
                            <div className="h-full rounded-[1.7rem] bg-[#0b1120]/90 backdrop-blur-2xl border border-white/5 p-6 flex flex-col">
                                {featured && <span className="self-start mb-2 text-[9px] font-black uppercase tracking-widest text-white px-2 py-0.5 rounded-full" style={{ background: "linear-gradient(135deg,#7c3aed,#06b6d4)" }}>{t("about.plans.popular", "Mais popular")}</span>}
                                <h3 className="text-xl font-black text-white">{p.name}</h3>
                                <p className="text-[11px] text-white/50 uppercase tracking-widest mt-0.5">{p.tagline}</p>
                                <div className="my-4 text-cyan-300 font-black text-lg">{p.price}</div>
                                <ul className="flex flex-col gap-2 flex-1">
                                    {p.perks.map((perk) => (
                                        <li key={perk} className="flex items-start gap-2 text-[12px] text-white/75 leading-snug">
                                            <span className="text-cyan-400 mt-0.5">✦</span> {perk}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>


        <PdaEquipe titulo={t("about.team.title", "Conheça a equipe")} subtitulo={t("about.team.subtitle", "")} />
        <Link href="/about/about-us" className="self-center text-center font-semibold text-cyan-800 underline underline-offset-4 dark:text-cyan-200">
          {t("about.apresentacao.tecnica", texto.tecnica)}
        </Link>
      </div>
    </main>
  );
}
