"use client";

import { useEffect, useRef, type ReactNode } from "react";
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
  useEffect(() => {
    const lista = faixa.current;
    if (!lista || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      if (lista.matches(":hover, :focus-within")) return;
      const primeiro = lista.firstElementChild;
      if (!primeiro) return;
      const passo = primeiro.getBoundingClientRect().width + parseFloat(getComputedStyle(lista).columnGap);
      if (lista.scrollLeft >= lista.scrollWidth - lista.clientWidth - 2) return;
      lista.scrollBy({ left: passo, behavior: "smooth" });
    }, 1900);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section aria-label={t("landing.knowledge_cards.label")} className="ci-carrossel">
      <ul ref={faixa} className="ci-carrossel-faixa">
        <li className="ci-carrossel-principal">{principal}</li>
        {exemplos.map((exemplo) => {
          const it: ItemVitrine = {
            ...exemplo, titulo: t(`landing.knowledge_cards.${exemplo.id}.title`), subtitulo: t(`landing.knowledge_cards.${exemplo.id}.summary`),
            execucao: "dyom", autor: "", raridade: "comum", profundidade: 0, preco: 0,
            fracoes: { total: 1, vendidas: 0 }, selos: { supervisionado: false, linksOk: false, codigoPrivado: false },
            entrega: [], tags: [],
          };
          return <li key={exemplo.id} className="ci-carrossel-item">
            <CartaVitrine it={it} precoNode={null} className="!block [&_.vt-type]:hidden [&_.vt-pr]:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500" onClick={() => router.push(ROTA_MARKETPLACE)} />
          </li>;
        })}
      </ul>
    </section>
  );
}
