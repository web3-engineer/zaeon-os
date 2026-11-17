"use client";

import TextoRevelado from "@/components/ui/TextoRevelado";
import { motion } from "framer-motion";
import React, { useState, useEffect } from "react";
import NextImage from "next/image";
import { useTranslation } from "react-i18next";
import SolanaPrivacidade from "./SolanaPrivacidade";
import ProjetoVencedor from "./ProjetoVencedor";
import EstudoAnatomiaLanding from "./EstudoAnatomiaLanding";
import particulas from "@/components/sub/hero-aquario.module.css";
import ConhecimentoShowcase from "./ConhecimentoShowcase";
import { TituloSecao } from "@/components/layout/secao";
import MolecularText from "@/components/ui/MolecularText";

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
                <h3 className="text-center text-[11px] font-black tracking-[0.35em] text-white uppercase">
                    <TextoRevelado texto={t("landing.premiacao.apoio", { defaultValue: "" })} />
                </h3>
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


// =========================================================================
// NOVO: SECÇÃO DE CONTRATAÇÃO DE AGENTES (Stack 3D e Highlight)
// ══════════════════════════════════════════════════════════════════════════
// MENTORES — os 13 reais da sala de Plugins, num carrossel
//
// O que estava aqui era uma pilha 3D de quatro AGENTES INVENTADOS ("Dr. Marcus
// Vance, Advogado Societário", "Elena Rostova, Secretária Executiva"), com
// crachá, empresa e matrícula. Ficção apresentada como catálogo numa página
// que vende ciência: quem clicasse procurando o Dr. Vance não ia achar nada.
//
// Os agentes de verdade existem e são os 13 MENTORES da camada agêntica --
// Osler (Medicina), Turing (Eng. da Computação), Noether (Matemática) e os
// outros dez -- que já vivem na sala de Plugins. Esta seção agora mostra eles.
// ══════════════════════════════════════════════════════════════════════════
const HireAgentsSection = () => {
    const { t } = useTranslation();
    return (
        <div id="mentores" className="w-full zaeon-borda mt-8 mb-10 md:mb-14 z-40 relative bg-transparent scroll-mt-28">
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
            >
                <TituloSecao className="mx-auto text-center font-display" forte={<>{t("landing.premiacao.titulo", { defaultValue: "" })}{" "} <span aria-hidden="true">🇧🇷</span></>} />
            </motion.div>

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

export default function Encryption() {
    const { t } = useTranslation();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 500);
        return () => clearTimeout(timer);
    }, []);

    if (!mounted) return <div className="min-h-screen bg-transparent" />;

    return (
        <div className="w-full relative">
            <section id="como-funciona" className="relative z-[30] w-full overflow-x-clip bg-transparent py-12 md:py-16 scroll-mt-28">
                <div className="zaeon-borda">
                    <div className="ci-titulo-secao"><TituloSecao className="mx-auto text-center font-display" forte={t("landing.knowledge_title", { defaultValue: "" })} /></div>

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