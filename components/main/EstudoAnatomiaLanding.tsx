"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "./estudo-anatomia-landing.css";

export default function EstudoAnatomiaLanding() {
  const { t } = useTranslation();
  const cena = useRef<HTMLDivElement>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const elemento = cena.current;
    if (!elemento) return;
    if (!("IntersectionObserver" in window)) {
      setVisivel(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setVisivel(entry.isIntersecting), { threshold: .15 });
    observer.observe(elemento);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="amostra-estudo" className="zaeon-borda scroll-mt-24 py-12 md:py-16" aria-labelledby="estudo-anatomia-titulo">
      <h2 id="estudo-anatomia-titulo" className="text-center font-display text-3xl font-semibold md:text-4xl">
        {t("landing.anatomia_amostra.titulo")}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-slate-700 dark:text-slate-300">
        {t("landing.anatomia_amostra.descricao")}
      </p>
      <div ref={cena} className="estudo-anatomia mt-8" data-visivel={visivel}>
        <div className="estudo-anatomia-modelo" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/models/anatomia-landing.webp" width={680} height={950} loading="lazy" decoding="async" alt="" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/models/anatomia-landing-tres-quartos.webp" width={680} height={950} loading="lazy" decoding="async" alt="" />
        </div>
        <svg className="estudo-anatomia-linhas" viewBox="0 0 680 950" aria-hidden="true">
          <g stroke="currentColor" fill="none">
            <path pathLength="1" d="M340 98H243L181 147H74" />
            <path pathLength="1" d="M350 266H430L492 224H606" />
          </g>
          <g fill="currentColor">
            <circle cx="340" cy="98" r="6" />
            <circle cx="350" cy="266" r="6" />
          </g>
        </svg>
        <span className="estudo-anatomia-rotulo estudo-anatomia-cerebro">{t("landing.anatomia_amostra.cerebro")}</span>
        <span className="estudo-anatomia-rotulo estudo-anatomia-coracao">{t("landing.anatomia_amostra.coracao")}</span>
      </div>
    </section>
  );
}
