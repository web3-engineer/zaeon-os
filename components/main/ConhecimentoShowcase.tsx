"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

export default function ConhecimentoShowcase() {
  const { t } = useTranslation();
  const router = useRouter();
  const faixa = useRef<HTMLUListElement>(null);
  const mover = (direcao: number) => {
    const lista = faixa.current;
    if (!lista?.firstElementChild) return;
    const passo = lista.firstElementChild.getBoundingClientRect().width + parseFloat(getComputedStyle(lista).columnGap);
    lista.scrollBy({ left: direcao * passo, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };

  return (
    <section aria-label={t("landing.knowledge_cards.label")} className="relative mt-4 md:mt-7">
      <ul ref={faixa} className="grid snap-x snap-mandatory auto-cols-[min(58vw,210px)] grid-flow-col gap-4 overflow-x-auto px-1 py-5 md:auto-cols-[220px] md:gap-5">
        {exemplos.map((exemplo) => {
          const it: ItemVitrine = {
            ...exemplo, titulo: t(`landing.knowledge_cards.${exemplo.id}.title`), subtitulo: t(`landing.knowledge_cards.${exemplo.id}.summary`),
            execucao: "dyom", autor: "", raridade: "comum", profundidade: 0, preco: 0,
            fracoes: { total: 1, vendidas: 0 }, selos: { supervisionado: false, linksOk: false, codigoPrivado: false },
            entrega: [], tags: [],
          };
          return <li key={exemplo.id} className="min-w-0 snap-start">
            <CartaVitrine it={it} precoNode={null} className="!block [&_.vt-type]:hidden [&_.vt-pr]:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500" onClick={() => router.push(ROTA_MARKETPLACE)} />
          </li>;
        })}
      </ul>
      <div className="mt-1 flex justify-end gap-2">
        <button type="button" aria-label={t("landing.knowledge_cards.previous")} onClick={() => mover(-1)} className="grid size-10 place-items-center rounded-full border border-current/20 text-foreground hover:bg-foreground/10"><ChevronLeft size={18} aria-hidden /></button>
        <button type="button" aria-label={t("landing.knowledge_cards.next")} onClick={() => mover(1)} className="grid size-10 place-items-center rounded-full border border-current/20 text-foreground hover:bg-foreground/10"><ChevronRight size={18} aria-hidden /></button>
      </div>
    </section>
  );
}
