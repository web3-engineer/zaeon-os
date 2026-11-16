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
  { id: "ecologia", skin: "dossie", tipo: "pesquisa", modelo: "planta" },
  { id: "matematica", skin: "dados", tipo: "curso", modelo: "livro" },
  { id: "arquitetura", skin: "portfolio", tipo: "curso", modelo: "predio" },
  { id: "economia", skin: "dados", tipo: "curso", modelo: "graos" },
  { id: "direito", skin: "historia", tipo: "curso", modelo: "livro" },
  { id: "literatura", skin: "caderno", tipo: "curso", modelo: "livro" },
  { id: "musica", skin: "portfolio", tipo: "curso", modelo: "ondas" },
  { id: "educacao", skin: "estudo", tipo: "curso", modelo: "livro" },
  { id: "comunicacao", skin: "estudo", tipo: "curso", modelo: "livro" },
  { id: "veterinaria", skin: "agronomia", tipo: "curso", modelo: "planta" },
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
    let quadro = 0;
    let anterior = 0;
    let decorrido = 0;
    let velocidade = 0;
    let direcao = 1;
    let posicao = lista.scrollLeft;
    let ultimaRolagem = lista.scrollLeft;
    const mover = (agora: number) => {
      const delta = anterior ? Math.min((agora - anterior) / 1000, .05) : 0;
      anterior = agora;
      decorrido += delta;
      const limite = lista.scrollWidth - lista.clientWidth;
      const pausado = decorrido < 1.7 || lista.matches(":hover, :focus-within");
      if (pausado || lista.scrollLeft !== ultimaRolagem) {
        posicao = lista.scrollLeft;
        velocidade = 0;
      }
      if (!pausado && limite > 0) {
        if (posicao >= limite - 2) direcao = -1;
        if (posicao <= 2) direcao = 1;
        const distancia = direcao > 0 ? limite - posicao : posicao;
        velocidade = Math.min(72, Math.sqrt(150 * distancia), velocidade + delta * 75);
        posicao = Math.max(0, Math.min(limite, posicao + direcao * velocidade * delta));
        lista.scrollLeft = posicao;
      }
      ultimaRolagem = lista.scrollLeft;
      quadro = requestAnimationFrame(mover);
    };
    quadro = requestAnimationFrame(mover);
    return () => cancelAnimationFrame(quadro);
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

  const meio = Math.floor(exemplos.length / 2);

  return (
    <section aria-label={t("landing.knowledge_cards.label")} className="ci-carrossel">
      <ul ref={faixa} className="ci-carrossel-faixa">
        {exemplos.slice(0, meio).map((exemplo) => renderCarta(exemplo, "esquerda"))}
        <li className="ci-carrossel-principal">{principal}</li>
        {exemplos.slice(meio).map((exemplo) => renderCarta(exemplo, "direita"))}
      </ul>
    </section>
  );
}
