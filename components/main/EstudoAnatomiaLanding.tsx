"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "./estudo-anatomia-landing.css";

import { desenharAnatomia, DURACAO_ANATOMIA, linhaAnatomica, pontosAnatomicos } from "./anatomia-movimento";

export default function EstudoAnatomiaLanding() {
  const { t } = useTranslation();
  const cena = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const indicadores = useRef<HTMLDivElement>(null);
  const [pontos, setPontos] = useState<Int16Array | null>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const elemento = cena.current;
    if (!elemento) return;
    if (!("IntersectionObserver" in window)) {
      setVisivel(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio >= .2) setVisivel(true);
      else if (!entry.isIntersecting || entry.intersectionRatio < .02) setVisivel(false);
    }, { threshold: [0, .02, .2] });
    observer.observe(elemento);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visivel || pontos || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const requisicao = new AbortController();
    fetch("/models/anatomia-landing-pontos.bin", { signal: requisicao.signal })
      .then((resposta) => {
        if (!resposta.ok) throw new Error("Anatomy preview unavailable");
        return resposta.arrayBuffer();
      })
      .then((bytes) => {
        if (!requisicao.signal.aborted && bytes.byteLength > 0 && bytes.byteLength % 8 === 0) {
          setPontos(new Int16Array(bytes));
        }
      })
      .catch(() => { /* A imagem do atlas permanece disponível. */ });
    return () => requisicao.abort();
  }, [visivel, pontos]);

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    const rotulos = indicadores.current;
    const mensagens = cena.current;
    if (!visivel || !pontos || !ctx || !rotulos || !mensagens) return;
    const marcadores = Array.from(rotulos.querySelectorAll("circle"));
    const linhas = Array.from(rotulos.querySelectorAll("path"));
    mensagens.dataset.animado = "true";
    let quadro = 0;
    let inicio: number | undefined;
    let ultimoQuadro = -Infinity;
    const renderizar = (agora: number) => {
      inicio ??= agora;
      const tempo = Math.min(DURACAO_ANATOMIA, ((agora - inicio) / 1000) * 1.15);
      if (tempo >= 14.15) mensagens.dataset.bird = "true";
      if (agora - ultimoQuadro >= 1000 / 31 || tempo === DURACAO_ANATOMIA) {
        desenharAnatomia(ctx, pontos, tempo, rotulos, linhas, marcadores, mensagens);
        ultimoQuadro = agora;
      }
      if (tempo < DURACAO_ANATOMIA) quadro = requestAnimationFrame(renderizar);
    };
    desenharAnatomia(ctx, pontos, 0, rotulos, linhas, marcadores, mensagens);
    if (canvas.current) canvas.current.dataset.pronto = "true";
    mensagens.dataset.emCena = "true";
    quadro = requestAnimationFrame(renderizar);
    return () => {
      cancelAnimationFrame(quadro);
      mensagens.dataset.emCena = "false";
      delete mensagens.dataset.bird;
    };
  }, [visivel, pontos]);

  return (
    <section id="amostra-estudo" className="zaeon-borda estudo-anatomia-secao scroll-mt-24" aria-labelledby="estudo-anatomia-titulo" ref={cena}>
      <div className="estudo-anatomia-palco">
        <div className="estudo-anatomia-anotacoes" aria-hidden="true">
          <span>∫ f(x) dx</span>
          <span>V = I · R</span>
          <span>∇ × E = −∂B/∂t</span>
          <span>const samples = signal.map(normalize);</span>
          <span>for (const point of mesh) iterate(point);</span>
          <span>σ = F / A</span>
          <svg viewBox="0 0 100 64"><path d="M5 50h90M8 50l18-32 23 32 23-32 20 32M26 18h46M26 18v32m46-32v32" /></svg>
          <svg viewBox="0 0 100 64"><path d="M8 55V8m0 47h85M9 49c18-44 28 7 42-19s26-22 42-11" /></svg>
          <span>E = mc²</span>
          <span>P(A | B) = P(A ∩ B) / P(B)</span>
          <svg viewBox="0 0 100 64"><path d="M12 52h78M19 51V40h12v11m9 0V30h12v21m9 0V15h12v36M19 33l26-11 23-14m-9 0h9v9" /></svg>
          <svg viewBox="0 0 100 64"><path d="M19 12h62v40H19zM19 24h62M33 24v28m20-28v28M19 38h62" /></svg>
          <span>ROI = (gain − cost) / cost</span>
          <span>Σ xᵢ / n</span>
        </div>
        <div className="estudo-anatomia-frases">
          <h2 id="estudo-anatomia-titulo">{t("landing.anatomia_amostra.saber")}</h2>
          <p className="estudo-anatomia-convite">
            <span>{t("landing.anatomia_amostra.provar")} <strong>{t("landing.anatomia_amostra.proximo")}</strong></span>
          </p>
        </div>
        <div className="estudo-anatomia">
          <p className="estudo-anatomia-frase-chip">{t("landing.anatomia_amostra.prova")}</p>
          <span className="estudo-anatomia-beija-flor" aria-hidden="true">
            <i className="estudo-asa-distante" />
            <i className="estudo-beija-flor-corpo" />
            <i className="estudo-asa-proxima" />
          </span>
          <canvas ref={canvas} className="estudo-anatomia-modelo" width={680} height={950} aria-hidden="true" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="estudo-anatomia-fallback" src="/models/anatomia-landing.webp" width={680} height={950} loading="lazy" decoding="async" alt="" />
          <figure className="estudo-anatomia-partes">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/models/cerebro-landing.webp" alt="" loading="lazy" decoding="async" />
            <figcaption>H₂O · O₂ · ATP</figcaption>
          </figure>
          <div ref={indicadores}>
            <svg className="estudo-anatomia-linhas" viewBox="0 0 680 950" aria-hidden="true">
              <g stroke="currentColor" fill="none">
                {pontosAnatomicos.map((ponto) => <path key={ponto.nome} d={linhaAnatomica(ponto, 340 + ponto.x * 500)} />)}
              </g>
              <g fill="currentColor">
                {pontosAnatomicos.map((ponto) => <circle key={ponto.nome} cx={340 + ponto.x * 500} cy={ponto.y} r="5" />)}
              </g>
            </svg>
            {pontosAnatomicos.map(({ nome, lado, linhaY }) => (
              <span key={nome} className="estudo-anatomia-rotulo" data-lado={lado} style={{ top: `${linhaY / 9.5}%` }}>
                {t(`landing.anatomia_amostra.${nome}`)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
