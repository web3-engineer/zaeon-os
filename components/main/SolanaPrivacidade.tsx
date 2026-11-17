"use client";

import { useTranslation } from "react-i18next";
import { ArrowRightIcon, CheckBadgeIcon, DocumentTextIcon, LockClosedIcon, EnvelopeIcon, ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import SolanaMark from "@/components/solana/SolanaMark";
import "./solana-pipeline.css";
import "./privacidade-vitrine.css";

function FluxoPrivacidade() {
  const { t } = useTranslation();
  return (
    <ol className="pv-fluxo">
      <li>
        <span className="pv-onda" aria-hidden="true" />
        <div className="pv-cena pv-cofre" aria-hidden="true">
          <div className="pv-chat"><ChatBubbleLeftRightIcon /><i /><i /></div>
          <div className="pv-documentos"><DocumentTextIcon /><LockClosedIcon className="pv-cadeado" /></div>
        </div>
        <h3>{t("landing.privacidade_fluxo.conta")}</h3>
        <p>{t("landing.privacidade_fluxo.conta_detalhe")}</p>
      </li>
      <li>
        <span className="pv-onda" aria-hidden="true" />
        <ArrowRightIcon className="pv-seta" aria-hidden="true" />
        <div className="pv-cena pv-vitrine" aria-hidden="true">
          <div className="pv-artefato"><CheckBadgeIcon /><i /><i /><span className="pv-scan" /></div>
          <span className="pv-selo"><SolanaMark size={19} /></span>
        </div>
        <h3>{t("landing.privacidade_fluxo.vitrine")}</h3>
        <p>{t("landing.privacidade_fluxo.vitrine_detalhe")}</p>
      </li>
      <li>
        <span className="pv-onda" aria-hidden="true" />
        <ArrowRightIcon className="pv-seta" aria-hidden="true" />
        <div className="pv-cena pv-proposta" aria-hidden="true">
          <div className="pv-envelope"><EnvelopeIcon /><span className="pv-termos"><i /><i /></span><LockClosedIcon className="pv-cadeado" /></div>
        </div>
        <h3>{t("landing.privacidade_fluxo.proposta")}</h3>
        <p>{t("landing.privacidade_fluxo.proposta_detalhe")}</p>
      </li>
    </ol>
  );
}

export default function SolanaPrivacidade() {
  const { t } = useTranslation();
  return (
    <section id="privacidade" aria-label={t("landing.privacidade_titulo")} className="zaeon-borda relative z-40 w-full scroll-mt-28 py-12 md:py-16">
      <FluxoPrivacidade />
      {/* o selo da Solana logo após o módulo */}
      <div className="mx-auto mt-6 flex w-fit items-center gap-3 rounded-full border border-white/15 bg-black/80 px-4 py-2 shadow-[0_0_30px_rgba(220,31,255,0.15)]">
        <SolanaMark size={15} wordmark />
        <span className="h-4 w-px bg-white/15" />
        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-white/80">{t("landing.solana.credenciais", { defaultValue: "" })}</span>
      </div>
      <article className="mx-auto mt-6 max-w-3xl rounded-2xl border border-cyan-700/20 bg-sky-50/75 p-6 dark:border-cyan-300/20 dark:bg-[#0b1733]/80 md:p-8">
        <p className="mx-auto max-w-2xl text-center text-base leading-relaxed text-slate-800 dark:text-slate-100 md:text-lg">
          {t("landing.solana.talento", { defaultValue: "" })}
        </p>
        <div className="sol-ranking" role="img" aria-label={t("landing.solana.ranking", { defaultValue: "" })}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((nivel) => <i key={nivel} aria-hidden="true" />)}
          <span className="sol-ranking-beija-flor" aria-hidden="true">
            <i className="sol-ranking-asa-distante" />
            <i className="sol-ranking-corpo" />
            <i className="sol-ranking-asa" />
          </span>
          <span className="sol-ranking-flor" aria-hidden="true" />
        </div>
      </article>
    </section>
  );
}
