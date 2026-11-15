"use client";

import { useTranslation } from "react-i18next";
import TextoRevelado from "@/components/ui/TextoRevelado";
import LoungeJanela from "@/components/lounge/LoungeJanela";
import { BORDA, TituloSecao } from "@/components/layout/secao";

const CONCEITOS = ["moeda", "pessoas", "agentes"] as const;

export default function CyberespacoExplica() {
  const { t } = useTranslation();
  return (
    <section id="cyberespaco" aria-labelledby="cyberespaco-titulo" className={`${BORDA} relative z-10 scroll-mt-28 py-12 md:py-16`}>
      <div id="cyberespaco-titulo">
        <TituloSecao className="mx-auto text-center font-display" forte={t("landing.interface.cyber_titulo", { defaultValue: "" })} />
      </div>
      <p className="mx-auto mt-6 max-w-[620px] text-center font-display text-base md:text-lg font-light leading-relaxed text-slate-900 dark:text-white">
        <TextoRevelado texto={t("landing.interface.cyber_intro", { defaultValue: "" })} delay={0.2} />
      </p>

      <LoungeJanela destaque />

      {/* os conceitos na POSIÇÃO do Figma: três cards compactos, lado a lado, logo embaixo do painel */}
      <ul className="mt-4 grid auto-cols-[min(75vw,280px)] grid-flow-col gap-3 overflow-x-auto snap-x snap-mandatory pb-2 md:auto-cols-auto md:grid-flow-row md:grid-cols-3 md:gap-4 md:pb-0">
        {CONCEITOS.map((c) => (
          <li
            key={c}
            className="snap-start rounded-xl text-center border border-slate-200 bg-white/60 px-5 py-4 backdrop-blur dark:border-white/[0.08] dark:bg-[#0c111b]/80"
          >
            <h3 className="font-display text-[15px] font-semibold text-slate-900 dark:text-white">{t(`landing.interface.cyber_${c}`, { defaultValue: "" })}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-slate-700 dark:text-slate-400">{t(`landing.interface.cyber_${c}_texto`, { defaultValue: "" })}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
