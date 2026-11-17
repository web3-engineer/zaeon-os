"use client";

import { motion, useReducedMotion } from "framer-motion";
import React, { useState, useEffect } from "react";
import NextImage from "next/image";
import { useTranslation } from "react-i18next";
import SolanaPrivacidade from "./SolanaPrivacidade";
import ProjetoVencedor from "./ProjetoVencedor";
import EstudoAnatomiaLanding from "./EstudoAnatomiaLanding";
import particulas from "@/components/sub/hero-aquario.module.css";
import ConhecimentoShowcase from "./ConhecimentoShowcase";
import { Rotulo, TituloSecao } from "@/components/layout/secao";

// --- TICKER DE PATROCINADORES ---
const SponsorsTicker = ({ opacity }: { opacity: any }) => {
    const { t } = useTranslation();
    const sponsors = [
        { name: "Funcap", src: "/sponsors/funcap.png", url: "https://www.funcap.ce.gov.br/" },
        { name: "Centelha", src: "/sponsors/centelha.png", url: "https://programacentelha.com.br/ce/" },
        { name: "Sudene", src: "/sponsors/sudene.png", url: "https://www.gov.br/sudene" },
        { name: "Finep", src: "/sponsors/finep.png", url: "http://www.finep.gov.br/" },
        { name: "Cnpq", src: "/sponsors/cnpq.png", url: "https://www.gov.br/cnpq/pt-br" },

    ];
    const tickerItems = [...sponsors, ...sponsors, ...sponsors];

    return (
        <motion.div style={{ opacity }} className="w-full py-8 overflow-hidden relative z-50">
            <div className="w-full flex justify-center mb-8">
                <Rotulo className="text-center">
                    {t("landing.premiacao.apoio", { defaultValue: "" })}
                </Rotulo>
            </div>
            <div className="relative">
                <div className="flex whitespace-nowrap">
                    <motion.div
                        animate={{ x: ["0%", "-50%"] }}
                        transition={{ ease: "linear", duration: 35, repeat: Infinity }}
                        className="flex gap-8 px-6"
                    >
                        {tickerItems.map((item, i) => (
                            <SponsorCard key={i} item={item} />
                        ))}
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
};

const SponsorCard = ({ item }: { item: { name: string; src: string; url: string } }) => {
    return (
        <motion.a
            href={item.url} target="_blank" rel="noopener noreferrer"
            whileHover={{ scale: 1.05, borderColor: "rgba(34, 211, 238, 0.4)", backgroundColor: "rgba(255, 255, 255, 0.05)" }}
            // o card fica ESCURO nos dois temas: as logos (a da Funcap é branca) foram feitas pra fundo escuro — no claro, com o
            // card cinza-translúcido, a Funcap sumia e as outras ficavam lavadas (incidente em produção, out/2026)
            className="relative flex items-center justify-center min-w-[200px] h-[100px] rounded-[1.5rem] border border-black/10 dark:border-white/5 bg-[#0a0a0f]/90 dark:bg-[#0a0a0f]/40 backdrop-blur-md transition-all duration-500 group overflow-hidden cursor-pointer"
        >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.12)_0%,transparent_70%)]" />
            <div className="relative w-full h-full p-6 flex items-center justify-center">
                {/* `unoptimized`: as logos são PNGs pequenos e locais; sem passar pelo /_next/image (que já falhou em
                    produção e deixava os cards vazios — o next/image esconde a imagem quebrada com color:transparent). O service
                    worker guarda /sponsors/* (stale-while-revalidate), então elas carregam mesmo com a rede ruim */}
                <NextImage src={item.src} alt={item.name} fill unoptimized className="max-w-full max-h-full object-contain opacity-100 transition-all duration-500" />
            </div>
        </motion.a>
    );
};


const provedores = [
    { nome: "OpenAI", arquivo: "openai" },
    { nome: "Google Gemini", arquivo: "google" },
    { nome: "Anthropic", arquivo: "anthropic" },
    { nome: "DeepSeek", arquivo: "deepseek" },
    { nome: "Meta", arquivo: "meta" },
    { nome: "Mistral AI", arquivo: "mistral" },
];

function ProvedoresTicker() {
    const movimentoReduzido = useReducedMotion();
    return (
        <div className={movimentoReduzido ? "overflow-x-auto" : "overflow-hidden"}>
            <motion.div
                animate={movimentoReduzido ? { x: 0 } : { x: ["0%", "-50%"] }}
                transition={movimentoReduzido ? { duration: 0 } : { ease: "linear", duration: 29, repeat: Infinity }}
                className="flex w-max"
            >
                {(movimentoReduzido ? [0] : [0, 1]).map((copia) => (
                    <ul key={copia} aria-hidden={copia === 1 || undefined} className="flex flex-none gap-4 pr-4 md:gap-6 md:pr-6">
                        {provedores.map(({ nome, arquivo }) => (
                            <li key={arquivo} className="grid h-[78px] w-[132px] flex-none place-items-center rounded-[1.5rem] border border-white/10 bg-[#0a0a0f] transition-colors hover:border-cyan-400/45 md:h-[100px] md:w-[188px]">
                                <NextImage
                                    src={`/assets/models/${arquivo}.svg`}
                                    alt={copia === 0 ? nome : ""}
                                    width={48}
                                    height={48}
                                    unoptimized
                                    className={`h-10 w-12 object-contain ${arquivo === "openai" ? "invert" : ""}`}
                                />
                            </li>
                        ))}
                    </ul>
                ))}
            </motion.div>
        </div>
    );
}

const HireAgentsSection = () => {
    const { t } = useTranslation();
    return (
        <div id="mentores" className="w-full zaeon-borda mt-8 mb-10 md:mb-14 z-40 relative bg-transparent scroll-mt-28">
            <Rotulo className="mb-6 text-center">{t("landing.premiacao.provedores")}</Rotulo>
            <ProvedoresTicker />

            {/* o card do PRODUTO VENCEDOR (Centelha, categoria blockchain) */}
            <ProjetoVencedor className="mt-8 md:mt-10" />

            {/* "Financiado e apoiado por: [sponsors]" — no lugar das casas de modelos; mantém a âncora #modelos do rodapé */}
            <div id="modelos" className="scroll-mt-24 mt-6">
                <SponsorsTicker opacity={1} />
            </div>
        </div>
    );
};

// =========================================================================
// CARROSSEL VERTICAL DE MARCAS IA (Infinite Ticker)

// --- COMPONENTE PRINCIPAL (PÁGINA) ---
function SubtituloEstudos() {
    const { t } = useTranslation();
    const [termo, setTermo] = useState(0);
    useEffect(() => {
        const movimento = window.matchMedia("(prefers-reduced-motion: reduce)");
        if (movimento.matches) return;
        const timer = window.setInterval(() => setTermo((atual) => (atual + 1) % 3), 2100);
        return () => window.clearInterval(timer);
    }, []);
    const palavra = "ZAETERMO";
    const [antes, depois] = t("landing.study_beyond_prompts", { palavra }).split(palavra);
    return (
        <p className="mx-auto mt-4 max-w-3xl text-balance text-center font-display text-xl font-semibold text-slate-900 dark:text-white md:text-2xl">
            <span className="sr-only">{t("landing.study_beyond_prompts", { palavra: t("landing.study_terms.work") })}</span>
            <span aria-hidden="true">
                {antes}
                <span className={`inline-block text-cyan-700 dark:text-cyan-300 ${particulas.palavraParticulas}`}>
                    <span key={termo} className={particulas.termoParticulas}>{t(`landing.study_terms.${["work", "study", "life"][termo]}`)}</span>
                    <span key={`particulas-${termo}`} className={particulas.particulasPalavra}>
                        {Array.from({ length: 12 }, (_, i) => <i key={i} style={{ left: `${4 + i * 8}%`, top: `${24 + (i * 19) % 52}%`, animationDelay: `${i * 14}ms` }} />)}
                    </span>
                </span>
                {depois}
            </span>
        </p>
    );
}

export function TituloConhecimento() {
    const { t } = useTranslation();
    return (
        <div id="como-funciona" className="zaeon-borda scroll-mt-28 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:pb-0 md:pt-16">
            <TituloSecao className="mx-auto !mt-0 text-balance text-center font-display !text-[clamp(1.4rem,5.1vw,2rem)] md:!text-[3.125rem]" forte={t("landing.knowledge_title", { defaultValue: "" })} />
        </div>
    );
}

export default function Encryption() {
    return (
        <div className="w-full relative">
            <section className="relative z-[30] w-full overflow-x-clip bg-transparent pb-12 pt-5 md:pb-16 md:pt-0">
                <div className="zaeon-borda">

                    <SubtituloEstudos />
                </div>
                <ConhecimentoShowcase />
            </section>
            <EstudoAnatomiaLanding />

            {/* ========================================================= */}
            {/* SECÇÃO: CONTRATAÇÃO DE AGENTES (3D Cover Flow) E MARCAS   */}
            {/* ========================================================= */}
            {/* overflow-x-clip: a pilha 3D de agentes e `absolute w-[340px]` e o leque
                empurra os cards para fora da viewport no celular -- eram 46px de
                scroll horizontal na pagina inteira. `clip` em vez de `hidden`
                porque `hidden` criaria um contexto de rolagem e mataria qualquer
                `sticky` daqui para dentro. */}
            <SolanaPrivacidade />

            <div className="relative z-40 w-full overflow-x-clip flex flex-col items-center justify-center bg-transparent">
                <HireAgentsSection />
            </div>
        </div>
    );
}