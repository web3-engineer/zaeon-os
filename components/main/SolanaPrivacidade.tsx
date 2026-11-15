"use client";

/**
 * SolanaPrivacidade — a seção "Seu conhecimento, sua prova." da página inicial.
 *
 * O desenho (SVG, animado com SMIL — leve, sem JS por quadro): uma IMPRESSÃO DIGITAL no centro, a marca OFICIAL
 * da Solana se fecha por cima dela (a identidade some atrás da prova) e, daí, ARQUIVOS saem distribuídos entre
 * nós QUADRADOS (sólidos) e HOLOGRÁFICOS (aramados), que acendem ao receber. Loop contínuo.
 *
 * Copy comercial, mas verdadeira (ancorada no que o código faz — ver app/about/about-us e /docs#privacidade):
 * nada de dado pessoal na cadeia; credencial soulbound na carteira do aluno; validação por gente.
 */
import Link from "next/link";
import { useId } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import SolanaMark from "@/components/solana/SolanaMark";
import { TituloSecao } from "@/components/layout/secao";
import "./solana-pipeline.css";
import TextoRevelado from "@/components/ui/TextoRevelado";

/* ───────── o desenho ───────── */
function EsteiraSolana() {
  const { t } = useTranslation();
  return (
    <div className="sol-pipeline" role="img" aria-label={t("landing.solana.esteira", { defaultValue: "" })}>
      <div className="sol-pipeline-trilho" aria-hidden="true" />
      {[0, 1, 2].map((i) => (
        <div className="sol-pipeline-item" key={i} aria-hidden="true">
          <span className="sol-pipeline-carta"><i /></span>
          <span className="sol-pipeline-sol">SOL</span>
          <span className="sol-pipeline-usdc">USDC</span>
        </div>
      ))}
    </div>
  );
}

function ImpressaoSolana() {
  const { t } = useTranslation();
  const id = useId().replace(/:/g, "");
  const g = `sg-${id}`, h = `hg-${id}`, glow = `gl-${id}`;
  // nós: 3 quadrados (sólidos) e 3 holográficos (aramados), em volta do centro
  const nos = [
    { x: 70, y: 70, tipo: "quad" }, { x: 430, y: 70, tipo: "holo" }, { x: 70, y: 330, tipo: "holo" },
    { x: 430, y: 330, tipo: "quad" }, { x: 250, y: 36, tipo: "holo" }, { x: 250, y: 364, tipo: "quad" },
  ] as const;
  const C = { x: 250, y: 200 };
  // arcos da impressão digital (meio-círculos concêntricos com "falhas")
  const arcos = [34, 50, 66, 82, 98];
  return (
    <svg viewBox="0 0 500 400" className="w-full h-auto max-w-[560px] mx-auto" role="img" aria-labelledby={`t-${id}`} focusable="false">
      <title id={`t-${id}`}>{t("landing.solana.diagrama", { defaultValue: "" })}</title>
      <defs>
        <linearGradient id={g} gradientUnits="userSpaceOnUse" x1="360.8791" y1="351.4553" x2="141.213" y2="-69.2936" gradientTransform="matrix(1 0 0 -1 0 314)">
          <stop offset="0" stopColor="#00FFA3" /><stop offset="1" stopColor="#DC1FFF" />
        </linearGradient>
        <linearGradient id={h} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#22d3ee" stopOpacity="0.9" /><stop offset="1" stopColor="#818cf8" stopOpacity="0.5" /></linearGradient>
        <radialGradient id={glow}><stop offset="0" stopColor="#22d3ee" stopOpacity="0.35" /><stop offset="1" stopColor="#22d3ee" stopOpacity="0" /></radialGradient>
      </defs>

      {/* fios do centro aos nós */}
      {nos.map((n, i) => (
        <path key={`f${i}`} id={`p-${id}-${i}`} d={`M${C.x},${C.y} Q${(C.x + n.x) / 2},${(C.y + n.y) / 2 + (i % 2 ? -28 : 28)} ${n.x},${n.y}`} fill="none" stroke="#22d3ee" strokeOpacity="0.28" strokeWidth="1.2" strokeDasharray="3 5" className="sol-pipeline-fio" />
      ))}

      {/* brilho central */}
      <circle className="sol-pipeline-pulso" cx={C.x} cy={C.y} r="120" fill={`url(#${glow})`} />

      {/* impressão digital */}
      <g fill="none" stroke="#e2e8f0" strokeOpacity="0.75" strokeWidth="2.2" strokeLinecap="round">
        {arcos.map((r, i) => (
          <g key={r}>
            <path d={`M${C.x - r},${C.y + 10} A${r},${r} 0 0 1 ${C.x + r},${C.y + 10}`} strokeDasharray={i % 2 ? `${r * 1.2} 12 ${r * 0.9} 10` : `${r * 0.8} 10 ${r * 1.4} 9`} />
            <path d={`M${C.x - r},${C.y + 10} A${r},${r} 0 0 0 ${C.x + r},${C.y + 10}`} strokeOpacity="0.45" strokeDasharray={`${r * 1.1} 14 ${r * 0.7} 11`} />
          </g>
        ))}
        <path d={`M${C.x},${C.y - 18} v56`} strokeOpacity="0.6" />
      </g>

      {/* a marca da Solana FECHA por cima da digital (a identidade some atrás da prova) */}
      <g transform={`translate(${C.x - 60} ${C.y - 47}) scale(0.3)`} opacity="0.96">
        <rect x="-30" y="-30" width="457" height="371" rx="60" fill="#070a1a" fillOpacity="0.85" />
        <path fill={`url(#${g})`} d="M64.6,237.9c2.4-2.4,5.7-3.8,9.2-3.8h317.4c5.8,0,8.7,7,4.6,11.1l-62.7,62.7c-2.4,2.4-5.7,3.8-9.2,3.8H6.5c-5.8,0-8.7-7-4.6-11.1L64.6,237.9z" />
        <path fill={`url(#${g})`} d="M64.6,3.8C67.1,1.4,70.4,0,73.8,0h317.4c5.8,0,8.7,7,4.6,11.1l-62.7,62.7c-2.4,2.4-5.7,3.8-9.2,3.8H6.5c-5.8,0-8.7-7-4.6-11.1L64.6,3.8z" />
        <path fill={`url(#${g})`} d="M333.1,120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8,0-8.7,7-4.6,11.1l62.7,62.7c2.4,2.4,5.7,3.8,9.2,3.8h317.4c5.8,0,8.7-7,4.6-11.1L333.1,120.1z" />
      </g>

      {/* os NÓS: quadrados (sólidos) e holográficos (aramados) — acendem quando o arquivo chega */}
      {nos.map((n, i) => (
        <g key={`n${i}`} transform={`translate(${n.x} ${n.y})`}>
          {n.tipo === "quad" ? (
            <>
              <rect x="-20" y="-20" width="40" height="40" rx="7" fill="#0f1f44" stroke="#22d3ee" strokeWidth="1.4">
                <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur="2.4s" begin={`${3.2 + i * 0.35}s`} repeatCount="indefinite" />
              </rect>
              <rect x="-11" y="-11" width="22" height="22" rx="3" fill="#22d3ee" fillOpacity="0.18" />
              <path d="M-5,-2 h10 M-5,2 h10" stroke="#22d3ee" strokeWidth="1.2" strokeOpacity="0.8" />
            </>
          ) : (
            <>
              <polygon points="0,-24 21,-12 21,12 0,24 -21,12 -21,-12" fill={`url(#${h})`} fillOpacity="0.12" stroke={`url(#${h})`} strokeWidth="1.3" strokeDasharray="4 3">
                <animate attributeName="fill-opacity" values="0.1;0.35;0.1" dur="2.4s" begin={`${3.2 + i * 0.35}s`} repeatCount="indefinite" />
              </polygon>
              <polygon points="0,-12 10.5,-6 10.5,6 0,12 -10.5,6 -10.5,-6" fill="none" stroke="#a5b4fc" strokeOpacity="0.8" strokeWidth="1" />
              <circle r="2.2" fill="#22d3ee" />
            </>
          )}
          <circle r="30" fill="#22d3ee" fillOpacity="0">
            <animate attributeName="fill-opacity" values="0;0.18;0" dur="2.4s" begin={`${3.2 + i * 0.35}s`} repeatCount="indefinite" />
          </circle>
        </g>
      ))}

    </svg>
  );
}

export default function SolanaPrivacidade() {
  const { t } = useTranslation();
  return (
    <section id="privacidade" aria-labelledby="privacidade-titulo" className="zaeon-borda relative z-40 w-full scroll-mt-28 py-12 md:py-16">
      {/* primeiro a PROMESSA (o dono, out/2026: antes do módulo da Solana "pra fazer mais sentido"), SEM card — só o título
          e os subtítulos, como as outras seções da landing; depois a PROVA (o módulo animado), o selo e os links */}
      <div id="privacidade-titulo">
        <TituloSecao className="mx-auto text-center font-display" forte={t("landing.privacidade_titulo", { defaultValue: "" })} />
      </div>
      <p className="mx-auto mt-6 max-w-[620px] text-center font-display text-base md:text-lg font-light leading-relaxed text-slate-900 dark:text-white">
        <TextoRevelado texto={t("landing.privacidade_texto", { defaultValue: "" })} delay={0.2} />
      </p>

      {/* o módulo ANIMADO da Solana: a digital some atrás da prova */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6 }}
        className="dark mx-auto mt-10 w-full max-w-3xl rounded-[2rem] border border-cyan-400/25 bg-[#0b1733]/80 backdrop-blur-md p-4 md:p-8 shadow-[0_0_40px_rgba(6,182,212,0.12)]"
      >
        <div className="sol-pipeline-cena">
          <ImpressaoSolana />
          <EsteiraSolana />
        </div>
      </motion.div>
      {/* o selo da Solana logo após o módulo */}
      <div className="mx-auto mt-6 flex w-fit items-center gap-3 rounded-full border border-white/15 bg-black/80 px-4 py-2 shadow-[0_0_30px_rgba(220,31,255,0.15)]">
        <SolanaMark size={15} wordmark />
        <span className="h-4 w-px bg-white/15" />
        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-white/80">{t("landing.solana.credenciais", { defaultValue: "" })}</span>
      </div>
      <article className="mx-auto mt-6 max-w-3xl rounded-2xl border border-cyan-700/20 bg-sky-50/75 p-6 dark:border-cyan-300/20 dark:bg-[#0b1733]/80 md:p-8">
        <p className="mx-auto max-w-2xl text-center text-base leading-relaxed text-slate-800 dark:text-slate-100 md:text-lg">
          {t("landing.solana.talento", { defaultValue: "" })}
        </p>
        <div className="sol-ranking" role="img" aria-label={t("landing.solana.ranking", { defaultValue: "" })}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((nivel) => <i key={nivel} aria-hidden="true" />)}
          <span className="sol-ranking-beija-flor" aria-hidden="true">
            <i className="sol-ranking-asa-distante" />
            <i className="sol-ranking-corpo" />
            <i className="sol-ranking-asa" />
          </span>
          <span className="sol-ranking-flor" aria-hidden="true" />
        </div>
      </article>
      <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[11px] font-black uppercase tracking-widest">
        <Link href="/about/about-us" className="text-cyan-700 dark:text-cyan-300 hover:text-cyan-500 underline underline-offset-4 decoration-cyan-500/40">{t("landing.solana.verificacao", { defaultValue: "" })}</Link>
        <Link href="/docs#privacidade" className="text-slate-700 dark:text-white/70 hover:text-cyan-500 underline underline-offset-4 decoration-white/20">{t("landing.solana.blockchain", { defaultValue: "" })}</Link>
      </div>
    </section>
  );
}
