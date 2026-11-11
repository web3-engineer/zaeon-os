"use client";

import TextoRevelado from "@/components/ui/TextoRevelado";
import { motion } from "framer-motion";
import React, { useState, useEffect } from "react";
import NextImage from "next/image";
import { useTranslation } from "react-i18next";
import ZaeonFlowDiagram from "./ZaeonFlowDiagram";
import SolanaPrivacidade from "./SolanaPrivacidade";
import ChavesApi from "./ChavesApi";
import BlueprintsShowcase from "./BlueprintsShowcase";
import PalcoIso from "./PalcoIso";
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
                    <TextoRevelado texto="Financiado e apoiado por:" />
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
    return (
        <div id="mentores" className="w-full zaeon-borda mt-10 mb-20 z-40 relative bg-transparent scroll-mt-28">
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
            >
                <TituloSecao className="font-display" forte="Com grandes tecnologias vêm grandes protótipos." />

                {/* PALCO ISOMÉTRICO: estruturas de engenharia (usina solar, data center, braço robótico, satélite,
                    powertrain, reator) se MONTAM peça a peça e se DESMONTAM, uma de cada vez, em loop — com ícones de
                    trabalhos científicos, peças e equipamentos flutuando em volta. */}
                <PalcoIso className="mt-10" />
            </motion.div>

            {/* as casas de modelos (#modelos) + o card do projeto vencedor — a menção às chaves de API saiu (o dono) */}
            <ChavesApi className="mt-16 md:mt-20" />
        </div>
    );
};

// =========================================================================
// CARROSSEL VERTICAL DE MARCAS IA (Infinite Ticker)

// --- COMPONENTE PRINCIPAL (PÁGINA) ---
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
            <section id="como-funciona" className="relative z-[30] w-full bg-transparent pt-12 md:pt-16 pb-12 scroll-mt-28">
                <div className="zaeon-borda">
                    <TituloSecao className="font-display" forte={t("landing.knowledge_title", "Transforme sua ideia em realidade.")} />

                    {/* DIAGRAMA VIVO: entrada -> cerebro Zaeon -> saida.
                        O painel nao e enfeite: o ParticleSystem da landing corre
                        atras da pagina inteira e passava por cima do card da
                        direita. Uma chapa escura com borda de 1px devolve o
                        diagrama para um fundo calmo sem desligar o fundo. */}
                    {/* CLARO: vidro AZUL glossy (gradiente + brilho no topo), estilo do botão
                        "Iniciar", no lugar do branco lavado. ESCURO: segue o navy de sempre. */}
                    {/* Sem o card grande em volta: só os cards do diagrama, AZULADOS e tingidos pelo fluxo em foco.
                        `dark` força o estilo escuro dentro (texto claro sobre os cards azulados) nos dois temas. */}
                    <div className="dark mt-12 md:mt-16">
                        <ZaeonFlowDiagram />
                    </div>
                </div>

                {/* o marquee e de proposito full-bleed: ele corre de borda a borda */}
                <div className="w-full mt-14 md:mt-20">
                    <SponsorsTicker opacity={1} />
                </div>
            </section>

            {/* ========================================================= */}
            {/* SECÇÃO: CONTRATAÇÃO DE AGENTES (3D Cover Flow) E MARCAS   */}
            {/* ========================================================= */}
            {/* overflow-x-clip: a pilha 3D de agentes e `absolute w-[340px]` e o leque
                empurra os cards para fora da viewport no celular -- eram 46px de
                scroll horizontal na pagina inteira. `clip` em vez de `hidden`
                porque `hidden` criaria um contexto de rolagem e mataria qualquer
                `sticky` daqui para dentro. */}
            {/* a ORDEM (o dono, out/2026): BLUEPRINTS ("Aqui você vale o que você constrói.", em carrossel) → a SOLANA
                (privacidade + a prova) → os AGENTES → as chaves de API com o card do projeto VENCEDOR (Centelha) */}
            <BlueprintsShowcase />

            <SolanaPrivacidade />

            <div className="relative z-40 w-full overflow-x-clip flex flex-col items-center justify-center bg-transparent pt-10">
                <HireAgentsSection />
            </div>
        </div>
    );
}