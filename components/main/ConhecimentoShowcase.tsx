"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import CartaVitrine from "@/components/estudos/CartaVitrine";
import type { ItemVitrine } from "@/lib/estudos/vitrine";
import { ROTA_MARKETPLACE } from "@/lib/ui/marketplaceRota";

const exemplos = [
  { id: "coracao", skin: "dossie", tipo: "pesquisa", modelo: "pasta", imagem: "/models/coracao-landing.webp" },
  { id: "recife", skin: "historia", tipo: "curso", modelo: "predio" },
  { id: "bacias", skin: "geografia", tipo: "curso", modelo: "livro" },
  { id: "safra", skin: "agronomia", tipo: "curso", modelo: "graos" },
  { id: "astronomia", skin: "caderno", tipo: "curso", modelo: "livro", imagem: "/videos/visio-blackhole.jpg" },
  { id: "clima", skin: "dados", tipo: "pesquisa", modelo: "livro" },
  { id: "habitat", skin: "portfolio", tipo: "negocio", modelo: "predio", imagem: "/assets/intro-poster-desktop.jpg" },
] as const satisfies readonly Pick<ItemVitrine, "id" | "skin" | "tipo" | "modelo" | "imagem">[];

export default function ConhecimentoShowcase({ principal }: { principal: ReactNode }) {
  const { t } = useTranslation();
  const router = useRouter();
  const faixa = useRef<HTMLUListElement>(null);
  useLayoutEffect(() => {
    const lista = faixa.current;
    const centro = lista?.querySelector<HTMLElement>(".ci-carrossel-principal");
    if (!lista || !centro) return;
    lista.scrollLeft = centro.offsetLeft + (centro.offsetWidth - lista.clientWidth) / 2;
  }, []);

  useEffect(() => {
    const lista = faixa.current;
    if (!lista || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let direcao = 1;
    const timer = window.setInterval(() => {
      if (lista.matches(":hover, :focus-within")) return;
      const primeiro = lista.firstElementChild;
      if (!primeiro) return;
      const passo = primeiro.getBoundingClientRect().width + parseFloat(getComputedStyle(lista).columnGap);
      if (lista.scrollLeft >= lista.scrollWidth - lista.clientWidth - 2) direcao = -1;
      else if (lista.scrollLeft <= 2) direcao = 1;
      lista.scrollBy({ left: direcao * passo, behavior: "smooth" });
    }, 2550);
    return () => window.clearInterval(timer);
  }, []);

  const renderCarta = (exemplo: (typeof exemplos)[number], lado: "esquerda" | "direita") => {
          const it: ItemVitrine = {
            ...exemplo, titulo: t(`landing.knowledge_cards.${exemplo.id}.title`), subtitulo: t(`landing.knowledge_cards.${exemplo.id}.summary`),
            execucao: "dyom", autor: "", raridade: "comum", profundidade: 0, preco: 0,
            fracoes: { total: 1, vendidas: 0 }, selos: { supervisionado: false, linksOk: false, codigoPrivado: false },
            entrega: [], tags: [],
          };
          return <li key={exemplo.id} className="ci-carrossel-item" data-lado={lado}>
            <CartaVitrine it={it} precoNode={null} className="!block [&_.vt-type]:hidden [&_.vt-pr]:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500" onClick={() => router.push(ROTA_MARKETPLACE)} />
          </li>;
  };

  return (
    <section aria-label={t("landing.knowledge_cards.label")} className="ci-carrossel">
      <ul ref={faixa} className="ci-carrossel-faixa">
        {exemplos.slice(0, 3).map((exemplo) => renderCarta(exemplo, "esquerda"))}
        <li className="ci-carrossel-principal">{principal}</li>
        {exemplos.slice(3).map((exemplo) => renderCarta(exemplo, "direita"))}
      </ul>
    </section>
  );
}
