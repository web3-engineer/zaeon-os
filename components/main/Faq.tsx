"use client";

import { useTranslation } from "react-i18next";
import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Rotulo, TituloSecao } from "@/components/layout/secao";

/**
 * FAQ da landing — accordion acessível (baseado no padrão da ChipFlow), no visual
 * da Zaeon: vidro azul glossy no claro, esfumado no escuro. Cada item abre/fecha
 * de forma independente. <button> nativo + aria-expanded/controls pra teclado e
 * leitor de tela; altura anima pelo truque grid-rows 0fr→1fr.
 */

type QA = { q: string; a: string };

const ITENS = [1, 7, 5, 2, 3, 4, 6] as const;

function Item({ item }: { item: QA }) {
  const respostaId = useId();
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-blue-200/60 dark:border-white/10 last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={respostaId}
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-4 px-5 py-5 text-left text-[15px] font-semibold transition-colors
          ${open ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-white/80 hover:text-slate-900 dark:hover:text-white"}`}
      >
        <span>{item.q}</span>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className={`flex-shrink-0 text-cyan-600 dark:text-cyan-400 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div id={respostaId} aria-hidden={!open} className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <p className="px-5 pb-5 pt-0 text-sm leading-relaxed text-slate-800 dark:text-white/90">
            {item.a}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Faq() {
  const { t } = useTranslation();
  return (
    <section id="faq" className="relative z-40 w-full bg-transparent py-12 md:py-16 scroll-mt-24">
      <div className="zaeon-borda text-center">
        <Rotulo>{t("landing.interface.faq_rotulo", { defaultValue: "" })}</Rotulo>
        <TituloSecao className="mx-auto" forte={t("landing.interface.faq_titulo", { defaultValue: "" })} fraco={t("landing.interface.faq_subtitulo", { defaultValue: "" })} />

        {/* Painel vidro-azul glossy no claro; esfumado no escuro. */}
        <div className="mx-auto mt-10 max-w-[760px] text-left rounded-2xl overflow-hidden backdrop-blur-sm
          bg-gradient-to-b from-sky-100/70 to-blue-200/50 dark:from-transparent dark:to-transparent dark:bg-white/[0.04]
          border border-blue-300/60 dark:border-white/10
          shadow-[0_20px_50px_-24px_rgba(37,99,235,0.25),inset_0_1px_0_0_rgba(255,255,255,0.7)] dark:shadow-[0_20px_50px_-24px_rgba(0,0,0,0.6)]">
          {ITENS.map((it) => (
            <Item key={it} item={{ q: t(`landing.faq.${it}.q`, { defaultValue: "" }), a: t(`landing.faq.${it}.a`, { defaultValue: "" }) }} />
          ))}
        </div>
      </div>
    </section>
  );
}
