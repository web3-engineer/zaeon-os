"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { TituloSecao } from "@/components/layout/secao";
import CartaVitrine from "@/components/estudos/CartaVitrine";
import SolanaMark from "@/components/solana/SolanaMark";
import { mesclarCatalogo, type ItemVitrine } from "@/lib/estudos/vitrine";
import TrilhoCarrossel from "@/components/ui/TrilhoCarrossel";

export default function BlueprintsShowcase() {
  const { t, i18n } = useTranslation();
  const [itens, setItens] = useState<ItemVitrine[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/estudos/vitrine", { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) return;
        const dados = await res.json();
        if (!controller.signal.aborted && Array.isArray(dados.itens)) setItens(dados.itens);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  const catalogo = useMemo(() => mesclarCatalogo(itens), [itens]);

  return (
    <section id="blueprints" aria-labelledby="blueprints-titulo" className="relative z-40 w-full zaeon-borda py-12 md:py-16 scroll-mt-28">
      <TituloSecao className="mx-auto text-center font-display" forte={<span id="blueprints-titulo">{t("landing.blueprints.title", { defaultValue: "" })}{" "}
        <span className="inline-block text-cyan-700 dark:text-[#67d8f2]">{t("landing.blueprints.title_highlight", { defaultValue: "" })}</span>
      </span>} />
      <TrilhoCarrossel
        className="mt-6 md:mt-10"
        n={catalogo.length}
        rotuloSetas={{ anterior: t("landing.vitrine.anterior", { defaultValue: "" }), proximo: t("landing.vitrine.proximo", { defaultValue: "" }) }}
        render={(i) => {
          const it = catalogo[i]!;
          return (
            <div className="w-[min(69vw,230px)] shrink-0">
              <CartaVitrine forjada it={it} precoFree={!it.preco && !it.plugavel}
                precoNode={it.plugavel ? t("landing.vitrine.agente", { defaultValue: "" }) : it.preco
                  ? <><SolanaMark size={13} title="SOL" />{it.preco.toLocaleString(i18n.resolvedLanguage)}</>
                  : t("landing.vitrine.gratis", { defaultValue: "" })} />
            </div>
          );
        }}
      />
    </section>
  );
}
