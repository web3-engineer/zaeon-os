"use client";

/**
 * LanguageFlagToggle — UMA bandeira só, que cicla o idioma ao clicar
 * (Brasil → EUA → Espanha → Brasil…). A bandeira exibida é derivada direto do
 * i18n.language, então é 100% reativa. Com `startAtBrazil`, força o Português
 * ao montar (a tela inicial deve sempre começar pela bandeira do Brasil).
 */

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import FlagIcon, { type FlagCode } from "@/components/ui/FlagIcon";

const LANGS: { lng: string; code: FlagCode; label: string }[] = [
  { lng: "pt", code: "br", label: "Português" },
  { lng: "en", code: "us", label: "English" },
  { lng: "es", code: "es", label: "Español" },
];

export default function LanguageFlagToggle({
  size = 44,
  className = "",
  startAtBrazil = false,
}: {
  size?: number;
  className?: string;
  startAtBrazil?: boolean;
}) {
  const { t, i18n } = useTranslation();

  // Sempre inicia pelo Brasil quando pedido (tela inicial).
  useEffect(() => {
    if (startAtBrazil) i18n.changeLanguage("pt");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const idx = Math.max(0, LANGS.findIndex((l) => (i18n.language || "pt").startsWith(l.lng)));
  const cur = LANGS[idx] || LANGS[0];

  const cycle = (e: React.MouseEvent) => {
    e.stopPropagation();
    i18n.changeLanguage(LANGS[(idx + 1) % LANGS.length].lng);
  };

  return (
    <button
      type="button"
      onClick={cycle}
      title={t("siteNav.languageTitle", { name: cur.label })}
      aria-label={t("siteNav.languageAria", { name: cur.label })}
      style={{ width: size, height: size }}
      className={`rounded-full overflow-hidden border border-black/10 dark:border-white/15 shadow-sm transition-all hover:scale-110 active:scale-95 cursor-pointer ${className}`}
    >
      <FlagIcon code={cur.code} className="w-full h-full" />
    </button>
  );
}
