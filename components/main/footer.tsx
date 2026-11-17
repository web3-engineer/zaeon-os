import { useTranslation } from "react-i18next";
import Link from "next/link";

/**
 * Footer clássico da Zaeon (inspirado no da ChipFlow): blurb da marca + colunas de
 * links + linha final com o ano. Auto-contido (sem depender de @/constants) e no
 * visual da casa. Links legais (Termos, Privacidade) e âncoras da própria landing.
 */

type FooterLink = { label: string; href: string; external?: boolean };
type FooterCol = { title: string; links: FooterLink[] };

const COLS: FooterCol[] = [
  {
    title: "plataforma",
    links: [
      { label: "jogar", href: "/#cyberespaco" },
      { label: "funcionamento", href: "/#como-funciona" },
      { label: "amostra_estudo", href: "/#amostra-estudo" },
      { label: "laboratorio", href: "/research-lab" },
      { label: "marketplace", href: "/marketplace" },
    ],
  },
  {
    title: "recursos",
    links: [
      { label: "privacidade_landing", href: "/#privacidade" },
      { label: "apoio", href: "/#modelos" },
      { label: "duvidas", href: "/#faq" },
      { label: "noticias", href: "/news" },
    ],
  },
  {
    title: "empresa",
    links: [
      { label: "sobre", href: "/about" },
      { label: "documentacao", href: "/docs" },
      { label: "contato", href: "mailto:contato@zaeon.com.br", external: true },
    ],
  },
  {
    title: "legal",
    links: [
      { label: "termos", href: "/termos" },
      { label: "privacidade", href: "/privacidade" },
    ],
  },
];

export const Footer = () => {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  return (
    <footer className="w-full border-t border-slate-200 dark:border-white/10 bg-white/40 dark:bg-black/30 backdrop-blur-md text-slate-600 dark:text-gray-400">
      <div className="zaeon-borda py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Colunas de links */}
          {COLS.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-gray-500 mb-4">
                {t(`landing.interface.${col.title}`, { defaultValue: "" })}
              </h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      {...(link.external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
                      className="text-sm text-slate-600 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors"
                    >
                      {t(`landing.interface.${link.label}`, { defaultValue: "" })}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Linha final */}
        <div className="border-t border-slate-200 dark:border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-400 dark:text-gray-600">
          <span>&copy; {year} Zaeon. {t("landing.interface.direitos", { defaultValue: "" })}</span>
          <span className="text-[12px] uppercase tracking-widest">{t("landing.interface.lema", { defaultValue: "" })}</span>
        </div>
      </div>
    </footer>
  );
};
