"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import CartaVitrine from "@/components/estudos/CartaVitrine";
import type { ItemVitrine } from "@/lib/estudos/vitrine";
import { ROTA_MARKETPLACE } from "@/lib/ui/marketplaceRota";
import "./timeline-ideia.css";

const exemplos = [
  { id: "codigo", skin: "tecnologia", tipo: "codigo", modelo: "chip" },
  { id: "hardware", skin: "tecnologia", tipo: "codigo", modelo: "chip" },
  { id: "hortas", skin: "agronomia", tipo: "curso", modelo: "planta", imagem: "/assets/landing/estudos/hortas.webp" },
  { id: "ecovilas", skin: "geografia", tipo: "curso", modelo: "planta", imagem: "/assets/landing/estudos/ecovilas.webp" },
  { id: "comunidades", skin: "historia", tipo: "curso", modelo: "livro", imagem: "/assets/landing/estudos/comunidades.webp" },
  { id: "cisternas", skin: "caderno", tipo: "curso", modelo: "livro", imagem: "/assets/landing/estudos/cisternas.webp" },
  { id: "coracao", skin: "dossie", tipo: "pesquisa", modelo: "pasta", imagem: "/models/coracao-landing.webp" },
  { id: "recife", skin: "historia", tipo: "curso", modelo: "predio" },
  { id: "bacias", skin: "geografia", tipo: "curso", modelo: "livro" },
  { id: "safra", skin: "agronomia", tipo: "curso", modelo: "graos" },
  { id: "clima", skin: "dados", tipo: "pesquisa", modelo: "livro" },
  { id: "literatura", skin: "caderno", tipo: "curso", modelo: "livro" },
  { id: "ecologia", skin: "dossie", tipo: "pesquisa", modelo: "planta" },
  { id: "direito", skin: "historia", tipo: "curso", modelo: "livro", imagem: "/assets/forja-capas-editoriais.jpg" },
  { id: "comunicacao", skin: "estudo", tipo: "curso", modelo: "livro", imagem: "/assets/forja-capas-editoriais.jpg" },
  { id: "educacao", skin: "estudo", tipo: "curso", modelo: "livro", imagem: "/assets/forja-capas-editoriais.jpg" },
  { id: "musica", skin: "portfolio", tipo: "curso", modelo: "ondas" },
  { id: "artes", skin: "portfolio", tipo: "curso", modelo: "livro", imagem: "/models/anatomia-landing.webp" },
  { id: "marketing", skin: "dados", tipo: "curso", modelo: "livro" },
  { id: "astronomia", skin: "caderno", tipo: "curso", modelo: "livro", imagem: "/videos/visio-blackhole.jpg" },
  { id: "habitat", skin: "portfolio", tipo: "negocio", modelo: "predio", imagem: "/assets/intro-poster-desktop.jpg" },
  { id: "matematica", skin: "dados", tipo: "curso", modelo: "livro" },
  { id: "arquitetura", skin: "portfolio", tipo: "curso", modelo: "predio" },
  { id: "economia", skin: "dados", tipo: "curso", modelo: "graos" },
  { id: "veterinaria", skin: "agronomia", tipo: "curso", modelo: "planta" },
] as const satisfies readonly Pick<ItemVitrine, "id" | "skin" | "tipo" | "modelo" | "imagem">[];

export default function ConhecimentoShowcase({ principal }: { principal?: React.ReactNode }) {
  const { t } = useTranslation();
  const router = useRouter();
  const faixa = useRef<HTMLUListElement>(null);
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
          const arte = exemplo.id === "codigo"
            ? <span className="ci-simbolo-chip" aria-hidden="true"><i /><i /><i /></span>
            : exemplo.id === "hardware" ? (
              <svg className="ci-placa-hardware" viewBox="0 0 96 74" aria-hidden="true">
                <rect x="3" y="3" width="90" height="68" rx="8" fill="#123c39" stroke="#65b4a0" strokeWidth="2" />
                <path d="M10 19h13l12 12h8m-33 23h12l13-13h8m47-22H75L63 31h-9m36 23H75L62 41h-8M48 11v14m0 24v14" stroke="#d6b472" strokeWidth="2" fill="none" />
                <rect x="34" y="23" width="28" height="28" rx="4" fill="#16202c" stroke="#a7bcc8" strokeWidth="2" />
                <rect x="40" y="29" width="16" height="16" rx="2" fill="#344958" />
                <path d="M18 60h8m44-47h8M14 12h5m59 50h5" stroke="#a2efc3" strokeWidth="3" strokeLinecap="round" />
              </svg>
            ) : undefined;
          return <li key={exemplo.id} className="ci-carrossel-item" data-lado={lado}>
            <CartaVitrine it={it} arteNode={arte} precoNode={null} className={`ci-carrossel-card ci-capa-${exemplo.id} !block [&_.vt-type]:hidden [&_.vt-pr]:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500`} onClick={() => router.push(ROTA_MARKETPLACE)} />
          </li>;
  };

  const meio = 9;

  return (
    <section aria-label={t("landing.knowledge_cards.label")} className={principal ? "ci-carrossel" : "ci-carrossel ci-carrossel-autonomo"}>
      <ul ref={faixa} className="ci-carrossel-faixa">
        {exemplos.slice(0, meio).map((exemplo) => renderCarta(exemplo, "esquerda"))}
        {principal && <li className="ci-carrossel-principal">{principal}</li>}
        {exemplos.slice(meio).map((exemplo) => renderCarta(exemplo, "direita"))}
      </ul>
    </section>
  );
}
