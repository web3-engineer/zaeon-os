"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ISO_CSS } from "@/lib/anatomy/iso-kit";
import { CONSTRUCAO_SVG } from "@/lib/landing/construcaoIso";
import pt from "@/public/locales/pt/common.json";
import ConhecimentoShowcase from "./ConhecimentoShowcase";
import CartaVitrine from "@/components/estudos/CartaVitrine";
import type { ItemVitrine } from "@/lib/estudos/vitrine";
import "./timeline-ideia.css";

const CARTA_CHIP: ItemVitrine = {
  id: "chip-landing", titulo: "", subtitulo: "", tipo: "codigo",
  execucao: "dyom", modelo: "chip", autor: "", raridade: "epica",
  profundidade: 100, preco: 0, fracoes: { total: 1, vendidas: 0 },
  selos: { supervisionado: false, linksOk: false, codigoPrivado: false },
  entrega: [], tags: [],
};

const MARCOS: readonly { titulo: string; cor: string }[] = [
  { titulo: "papel", cor: "#f5c542" },
  { titulo: "conversa", cor: "#2bd47a" },
  { titulo: "blueprint", cor: "#2d6ae8" },
  { titulo: "prototipo", cor: "#8b5cf6" },
  { titulo: "realidade", cor: "#22d3ee" },
];
const N = MARCOS.length;

const DUR = 8200, HOLD = 34000, FADE = 800, TOTAL = DUR + HOLD + FADE;

export default function TimelineIdeia({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const [carrossel, setCarrossel] = useState(false);
  const [ativos, setAtivos] = useState(0);
  const vizRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const cometaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      vizRef.current?.querySelectorAll<SVGGElement>(".ci-part").forEach((part) => {
        part.style.opacity = "1";
      });
      if (fillRef.current) fillRef.current.style.width = "80%";
      vizRef.current?.setAttribute("data-carta-em-destaque", "");
      setCarrossel(true);
      setAtivos(N);
      return;
    }
    let raf = 0, inicio = 0, exibindo = false;
    const passo = (now: number) => {
      if (!inicio) inicio = now;
      const e = (now - inicio) % TOTAL;
      let p: number, op: number;
      if (e < DUR) { p = e / DUR; op = 1; }
      else if (e < DUR + HOLD) { p = 1; op = 1; }
      else { p = 1; op = 1 - (e - DUR - HOLD) / FADE; }
      if (fillRef.current) { fillRef.current.style.width = `${(p * 80).toFixed(2)}%`; fillRef.current.style.opacity = String(op); }
      if (cometaRef.current) { cometaRef.current.style.left = `${(10 + p * 80).toFixed(2)}%`; cometaRef.current.style.opacity = String(e < DUR ? op : 0); }
      // revela as peças da construção conforme o progresso passa do ponto de cada uma — a OPACIDADE é uma rampa que o
      // próprio laço calcula (nada de transição do CSS, que brigava com o valor setado a cada quadro). Reconsulta os
      // <g> a cada quadro: o SVG vem por innerHTML e os nós são estáveis, então é barato e nunca pega captura vazia.
      const limitar = (valor: number) => Math.max(0, Math.min(1, valor));
      const suavizar = (valor: number) => valor * valor * (3 - 2 * valor);
      const encaixe = limitar((e - DUR) / 1450);
      const desdeContato = e - DUR - 1450;
      const impacto = desdeContato >= 0 ? (1 - limitar(desdeContato / 650)) ** 2 : 0;
      const carga = 1 - (1 - limitar(desdeContato / 1850)) ** 2;
      const compressao = suavizar(limitar((desdeContato - 1850) / 1550));
      const abertura = suavizar(limitar((desdeContato - 3450) / 950));
      const carta = suavizar(limitar((desdeContato - 2600) / 1200));
      const viz = vizRef.current;
      const pronto = desdeContato >= 4520;
      viz?.style.setProperty("--carrossel-op", String(op));
      if (exibindo !== pronto) { exibindo = pronto; setCarrossel(pronto); }
      if (viz) viz.toggleAttribute("data-carta-em-destaque", carta > .22);
      viz?.style.setProperty("--prensa-x", `${-340 * (1 - encaixe) ** 1.35 + 232 * compressao - 575 * abertura}px`);
      viz?.style.setProperty("--prensa-op", String((e >= DUR ? 1 : 0) * op));
      viz?.style.setProperty("--energia-op", String(limitar(desdeContato / 180) * (1 - abertura) * op));
      viz?.style.setProperty("--energia-offset", String(-Math.max(0, desdeContato) * 25 / 560));
      viz?.style.setProperty("--impacto-op", String(impacto * op));
      viz?.style.setProperty("--carga", `${carga * 242}px`);
      // As duas formas dividem o mesmo centro durante a troca de foco.
      const desfoque = 10 * carta * (1 - carta);
      const faiscas = limitar((desdeContato - 2480) / 1200);
      viz?.style.setProperty("--forja-faiscas", String(Math.sin(faiscas * Math.PI) * op));
      viz?.style.setProperty("--forja-expansao", String(.45 + faiscas * 1.25));
      viz?.style.setProperty("--forja-clarao", String(Math.max(impacto * .48, 4 * carta * (1 - carta)) * op));
      viz?.style.setProperty("--forja-blur", `${desfoque.toFixed(2)}px`);
      viz?.style.setProperty("--placa-op", String(1 - carta));
      viz?.style.setProperty("--placa-escala", String(1 - .44 * compressao));
      const impactoCarta = limitar((desdeContato - 3130) / 620);
      const choque = Math.sin(impactoCarta * Math.PI) * (1 - impactoCarta);
      const recuo = Math.sin(impactoCarta * Math.PI * 7) * (1 - impactoCarta) ** 2;
      viz?.style.setProperty("--carta-recuo", `${recuo * 16}px`);
      viz?.style.setProperty("--carta-impacto", String(Math.min(1, choque * 3.7)));
      viz?.style.setProperty("--forja-onda", String(choque * 2.4 * op));
      viz?.style.setProperty("--forja-onda-escala", String(.55 + impactoCarta * 1.85));
      viz?.style.setProperty("--carta-op", String(pronto ? 0 : carta * op));
      viz?.style.setProperty("--carta-escala", String(.72 + .28 * carta));
      const fadeDaCena = op;
      const partes = vizRef.current?.querySelectorAll<SVGGElement>(".ci-part");
      if (partes) for (const g of partes) {
        const inicioPeca = Number(g.dataset.at);
        const rampa = Math.min(0.18, 1 - inicioPeca);
        const x = Math.max(0, Math.min(1, (p - inicioPeca) / rampa));
        const op = x * x * (3 - 2 * x);
        g.style.opacity = (op * fadeDaCena).toFixed(3);
        g.style.transform = `translateY(${((1 - op) * 4).toFixed(2)}px)`;
      }
      let n = 0;
      for (let i = 0; i < N; i++) if (p >= i / (N - 1) - 0.001) n = i + 1;
      setAtivos((a) => (a === n ? a : n));
      raf = requestAnimationFrame(passo);
    };
    const viz = vizRef.current;
    if (!viz) return;
    const observador = new IntersectionObserver(([entrada]) => {
      cancelAnimationFrame(raf);
      if (entrada.isIntersecting) {
        inicio = 0;
        exibindo = false;
        setCarrossel(false);
        raf = requestAnimationFrame(passo);
      }
    }, { threshold: .15 });
    observador.observe(viz);
    return () => {
      observador.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  const cartaForjada = (
    <CartaVitrine forjada it={{ ...CARTA_CHIP, titulo: t("landing.timeline.propriedade_intelectual", { defaultValue: pt.landing.timeline.propriedade_intelectual }) }} precoNode={null}
      arteNode={<span className="ci-simbolo-chip"><i /><i /><i /></span>} />
  );

  return (
    <div className={`iso ci-wrap ${className}`}>
      <style>{ISO_CSS}</style>
      <div className="ci-stage">
        {/* o VISUALIZADOR único: a estrutura 3D que cresce peça a peça */}
        <div ref={vizRef} className="ci-viz">
          <div className="ci-placa" role="img" aria-label={t("landing.timeline.placa")}
            onPointerMove={(event) => {
              if (event.pointerType !== "mouse" || !(event.target instanceof SVGElement)) return;
              const limites = event.target.ownerSVGElement?.getBoundingClientRect() ?? event.target.getBoundingClientRect();
              const x = (event.clientX - limites.left) / limites.width - .5;
              const y = (event.clientY - limites.top) / limites.height - .5;
              event.currentTarget.style.setProperty("--inclina-x", `${-y * 9}deg`);
              event.currentTarget.style.setProperty("--inclina-y", `${x * 11}deg`);
            }}
            onPointerLeave={(event) => {
              event.currentTarget.style.removeProperty("--inclina-x");
              event.currentTarget.style.removeProperty("--inclina-y");
            }}
            dangerouslySetInnerHTML={{ __html: CONSTRUCAO_SVG }} />
          <div className="ci-forja-clarao" aria-hidden="true" />
          <div className="ci-forja-onda" aria-hidden="true" />
          <svg className="ci-forja-faiscas" viewBox="0 0 240 240" aria-hidden="true">
            {[8, 22, 39, 63, 110, 138, 164, 188, 202, 219, 243, 290, 318, 344].map((angulo, i) => (
              <path key={angulo} transform={`rotate(${angulo} 120 120)`}
                d={`M${164 + i % 3 * 8} 120h${8 + i % 4 * 4}`} />
            ))}
          </svg>
          <div className="ci-carta-forjada" aria-hidden="true">
            {cartaForjada}
          </div>
          {carrossel && <ConhecimentoShowcase principal={cartaForjada} />}
        </div>

        {/* a BARRA de progresso com os 5 marcos */}
        <div className="ci-bar">
          <div className="ci-line" />
          <div ref={fillRef} className="ci-fill" />
          <div ref={cometaRef} className="ci-comet" />
          <div className="ci-row">
            {MARCOS.map((m, i) => (
              <div key={i} className={`ci-cell ${i < ativos ? "on" : ""}`} style={{ color: m.cor }}>
                <span className="ci-node"><span className="ci-dot" /></span>
                <span className="ci-tit">{t(`landing.timeline.${m.titulo}`)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
