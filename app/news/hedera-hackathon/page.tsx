"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
    ArrowLeftIcon,
    BuildingLibraryIcon,
    CodeBracketIcon,
    CpuChipIcon,
    ExclamationTriangleIcon,
    CheckBadgeIcon,
    LinkIcon,
    LockClosedIcon
} from "@heroicons/react/24/outline";

// ============================================================================
// DADOS DOS PROJETOS (HEDERA HACKATHON AFRICA - 50 ENTREGAS)
// ============================================================================
const DELIVERED_PROJECTS = [
    { id: 1, title: "AgriProof", github: "https://github.com/SMS-Team-7/Student-Mobility-System-SMS-.git", description: "Sistema de rastreabilidade on-chain para validação de produção agrícola." },
    { id: 2, title: "Ysusu", github: "https://github.com/lothanuelubah93/African-Ancestral-Spirits", description: "Protocolo descentralizado de financiamento colaborativo focado no mercado local africano." },
    { id: 3, title: "Yumi Finance", github: "https://github.com/Devnuelx/Kweli", description: "Infraestrutura DeFi para concessão de microcréditos e pools de liquidez." },
    { id: 4, title: "Direla", github: "https://github.com/Lotanna1989/Orange_Afro_Pay", description: "Solução de pagamentos transfronteiriços otimizada para baixas taxas via rede Hedera." },
    { id: 5, title: "Orange Digital Finance", github: "https://github.com/Mohammed-Ehap-Ali-Zean-Al-Abdin/Proovly", description: "Plataforma de carteira digital e serviços financeiros integrados on-chain." },
    { id: 6, title: "Proovly", github: "https://github.com/godspowerufot/IFarm", description: "Sistema de atestação criptográfica para verificação de identidade e credenciais." },
    { id: 7, title: "IFARM", github: "https://github.com/ff4f/yieldharvest", description: "Marketplace de tokenização de safras permitindo o fracionamento de ativos reais." },
    { id: 8, title: "Yield Harvest", github: "https://github.com/carnage999-max/fractional", description: "Protocolo de agregação de rendimentos para otimização de RWA no agronegócio." },
    { id: 9, title: "Fractional", github: "https://github.com/mrpatrick030/VeryMarket-Onchain-Marketplace", description: "Smart contracts para fracionamento e negociação de propriedades de alto valor." },
    { id: 10, title: "VeryMarket", github: "https://github.com/hebx/hedron", description: "Marketplace descentralizado para negociação P2P de ativos físicos tokenizados." },
    { id: 11, title: "Hedron", github: "N/A", description: "Arquitetura de derivativos on-chain baseada na emissão de ativos sintéticos." },
    { id: 12, title: "MedLedger", github: "https://github.com/petrkrulis2022/agentsphere-full-web-man-US/tree/revolut-pay-sim-solana-hedera", description: "Registro imutável para histórico médico e portabilidade de dados de saúde." },
    { id: 13, title: "Cube Pay", github: "https://github.com/afristableafrica", description: "Gateway de pagamentos web3 integrando stablecoins locais e liquidação instantânea." },
    { id: 14, title: "Afristable", github: "https://github.com/Hashmate-hedera", description: "Protocolo de stablecoin algorítmica atrelada a cestas de moedas fiduciárias africanas." },
    { id: 15, title: "HashMate", github: "https://github.com/KarimAdel-1/Dera", description: "Serviço de custódia e validação de transações multifassinatura corporativas." },
    { id: 16, title: "DERA", github: "https://github.com/a-sahil/ceres-protocol", description: "Plataforma de conformidade regulatória automatizada para emissão de RWA." },
    { id: 17, title: "Ceres Protocol", github: "https://github.com/IlucaM/EcoChainMada/", description: "Infraestrutura de liquidez descentralizada focada em comodities agrícolas." },
    { id: 18, title: "EcoChain Mada", github: "https://github.com/Kingscliq/deralinks", description: "Sistema de rastreabilidade de créditos de carbono e compensação ambiental." },
    { id: 19, title: "Deralinks", github: "https://github.com/Hedera-Bima", description: "Oráculo descentralizado para integração de dados off-chain em smart contracts." },
    { id: 20, title: "Bima", github: "https://github.com/hexdee/Teritage", description: "Protocolo de micro-seguros on-chain parametrizados para intempéries climáticas." },
    { id: 21, title: "Teritage", github: "https://github.com/Haykaybee3/DonateOnChain", description: "Gestão de identidade e preservação de registros patrimoniais em blockchain." },
    { id: 22, title: "Donate onChain", github: "https://github.com/QuickCart41/quickCart-landingPage.git", description: "Smart contracts para distribuição transparente e rastreável de fundos filantrópicos." },
    { id: 23, title: "Quick cart", github: "https://github.com/sayedibrahimQ/Hedera_Hackathon", description: "Solução de e-commerce on-chain eliminando intermediários no processamento de pagamentos." },
    { id: 24, title: "HederaNile", github: "https://github.com/danodin69/Kingdoms-and-Cards-Classic-Public", description: "Rede de monitoramento hídrico tokenizado para gestão de recursos na bacia do Nilo." },
    { id: 25, title: "Movo", github: "https://github.com/HeftySammich/skaterz", description: "DApp de mobilidade urbana com sistema de recompensas para modais sustentáveis." },
    { id: 26, title: "Hedgy", github: "https://github.com/therza01/AfyaUkweli1.git", description: "Protocolo de hedge automatizado para proteção contra volatilidade cambial." },
    { id: 27, title: "AfyaUkweli", github: "https://github.com/yusuf-abdoul/AgriYield", description: "Infraestrutura descentralizada de dados de saúde pública e telemedicina." },
    { id: 28, title: "AgriYield", github: "https://github.com/B-2003-R/LoRa-Water-Monitor.git", description: "Otimizador de rendimentos focado em staking de ativos do setor agrícola." },
    { id: 29, title: "HedFunds", github: "https://github.com/Kars07/Hedfunds", description: "Fundo de investimento descentralizado gerenciado via DAO e contratos inteligentes." },
    { id: 30, title: "AFJPCripto", github: "https://github.com/0xp3/AFJP-Hedera", description: "Sistema de previdência e poupança de longo prazo estruturado em ativos digitais." },
    { id: 31, title: "Welcome Home", github: "N/A", description: "Tokenização imobiliária para facilitar o acesso à casa própria através de fracionamento." },
    { id: 32, title: "AfroFinance", github: "https://github.com/devesh1011/AfroFinance/", description: "Hub DeFi integrando serviços de empréstimo, staking e swaps para o mercado local." },
    { id: 33, title: "Borderlesspay", github: "https://github.com/bodefavour/O3_Start", description: "Solução de remessas internacionais instantâneas mitigando custos cambiais de RMR." },
    { id: 34, title: "Afrik Solar", github: "https://github.com/Shumba1-creator/Afrik-Renewable-Energy-Smart-Contract/", description: "Financiamento e tokenização de infraestruturas de energia solar comunitárias (RWA)." },
    { id: 35, title: "Waternity", github: "https://github.com/ff4f/waternity_hedera", description: "Mercado descentralizado para negociação de direitos de uso e acesso à água limpa." },
    { id: 36, title: "Hedera AutoVest AI", github: "https://github.com/EmmanuelHaggai/Hedera-AutoVest", description: "Agente de IA integrado a smart contracts para automação de portfólios de investimento." },
    { id: 37, title: "LiftUP", github: "https://github.com/sarahkronz/LiftUp-by-hedera", description: "Protocolo de ascensão socioeconômica através de micro-investimentos tokenizados." },
    { id: 38, title: "MazaoChain", github: "https://github.com/sabowaryan/mazaochain.git", description: "Rede de suprimentos agrícolas garantindo transparência desde o produtor até o varejo." },
    { id: 39, title: "Noblocks", github: "https://github.com/5ran6/noblocks", description: "Arquitetura de abstração de contas para simplificar o onboarding de usuários Web2." },
    { id: 40, title: "FractionHome", github: "https://github.com/Talent-Index/FractionHome/", description: "Democratização de investimentos no setor de Real Estate através de NFTs lastreados." },
    { id: 41, title: "Remit-Flow", github: "https://github.com/boipatrick/remit-flow", description: "Canal de liquidez otimizado para fluxo de remessas e pagamentos B2B." },
    { id: 42, title: "Cradle Protocol", github: "https://github.com/cradle-labs", description: "Plataforma de fomento inicial e grants automatizados para startups do ecossistema." },
    { id: 43, title: "Kelo", github: "https://github.com/irakusaReo/kelo-bnpl-platform", description: "Sistema 'Buy Now, Pay Later' (BNPL) integrado diretamente na camada de consenso." },
    { id: 44, title: "FlowLedger", github: "https://github.com/Mahd-Mehn/MM-flowledger", description: "Gerenciador de fluxos de caixa corporativos e faturamento auditável on-chain." },
    { id: 45, title: "CrisisChain", github: "https://github.com/Dibora12/Crisischain-Blockchain-Powered-Aid-Distribution-in-Africa2", description: "Distribuição de ajuda humanitária emergencial protegida contra desvios operacionais." },
    { id: 46, title: "HAjo", github: "https://github.com/adeemma/Hajo.git", description: "DApp focado na resolução de disputas financeiras por meio de escrows automatizados." },
    { id: 47, title: "Trace Trade", github: "https://github.com/Sakly-Saber/TraceTrade", description: "Validação de origem e certificação de qualidade para produtos de exportação." },
    { id: 48, title: "Seed", github: "https://github.com/ReemHasanA/seed-project", description: "Tokenização de ativos de biodiversidade e fomento à preservação de sementes nativas." },
    { id: 49, title: "AgroLink", github: "https://github.com/cbof16/AlphaNode", description: "Conexão P2P entre pequenos produtores e o mercado consumidor final institucional." },
    { id: 50, title: "H-Pay", github: "https://github.com/kromsten/frangibles", description: "Infraestrutura escalável para micro-pagamentos de alta frequência no varejo." }
];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export default function InstitucionalReportPage() {
    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] text-slate-800 dark:text-slate-200 selection:bg-indigo-500/30 overflow-x-hidden font-sans pb-24">

            {/* HEADER INSTITUCIONAL - ESTILO LIQUID GLASS */}
            <div className="relative w-full pt-32 pb-16 flex flex-col items-center justify-center overflow-hidden border-b border-slate-200 dark:border-white/10 bg-white/30 dark:bg-black/20 backdrop-blur-3xl">
                <Link href="/news" className="absolute top-8 left-8 z-20">
                    <button className="flex items-center gap-2 px-5 py-2.5 backdrop-blur-2xl bg-white/30 dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm rounded-full text-slate-800 dark:text-slate-200 text-xs font-medium tracking-wide hover:bg-white/60 dark:hover:bg-white/10 transition-all duration-300">
                        <ArrowLeftIcon className="w-4 h-4" /> Retornar
                    </button>
                </Link>

                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
                    className="relative z-10 w-full max-w-4xl mx-auto px-6 text-center"
                >
                    <div className="flex items-center justify-center gap-4 mb-8">
                        <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 backdrop-blur-md">
                            <BuildingLibraryIcon className="w-8 h-8" />
                        </div>
                    </div>
                    <h4 className="text-[11px] md:text-xs font-semibold uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400 mb-4 opacity-80">
                        Documento Oficial de Transparência
                    </h4>
                    <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 dark:text-white leading-tight tracking-tight mb-6">
                        Relatório de Impacto Técnico e Justificativa de Prazos
                    </h1>
                    <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        À FUNCAP & SUDENE • Ciclo 2026
                    </p>
                </motion.div>
            </div>

            {/* CORPO DO RELATÓRIO */}
            <main className="w-full max-w-6xl mx-auto px-6 mt-16 space-y-16">

                {/* SEÇÃO 1: O CONTEXTO DA OMISSÃO TEMPORÁRIA */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    className="p-10 md:p-14 rounded-[2.5rem] backdrop-blur-3xl bg-white/40 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.03)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] max-w-4xl mx-auto"
                >
                    <div className="flex items-center gap-3 mb-8">
                        <ExclamationTriangleIcon className="w-6 h-6 text-amber-500" />
                        <h2 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">O Fator Escala e o Gargalo Operacional</h2>
                    </div>

                    <div className="space-y-6 text-base md:text-lg font-serif leading-relaxed text-slate-700 dark:text-slate-300 opacity-90">
                        <p>
                            Prezados representantes da <strong>FUNCAP</strong> e da <strong>SUDENE</strong>, este documento serve não apenas como uma prestação de contas dos projetos desenvolvidos, mas como um registro histórico do que ocorre quando uma equipe diminuta colide com um sucesso em escala global.
                        </p>
                        <p>
                            A justificativa central para o atraso no envio desta prestação burocrática reside em um cálculo operacional simples, porém brutal: <strong>A Equipe Zaeon operou o maior hackathon de blockchain da história com uma infraestrutura humana de microempresa.</strong>
                        </p>
                        <p>
                            O que iniciou como uma iniciativa de fomento local nas instalações da Unilab e no Campus dos Malês, escalou de forma incontrolável. Fomos responsáveis por gerir, orientar e auditar tecnicamente <strong>468 indivíduos</strong>, lidando simultaneamente com quatro idiomas (Português, Francês, Inglês e dialetos locais africanos). Essa multidão precisou ser estruturada e liderada para entregar produtos complexos em arquitetura Web3.
                        </p>
                    </div>
                </motion.section>

                {/* SEÇÃO 2: A PRORROGAÇÃO E A PRESSÃO INSTITUCIONAL - NARRATIVA SEMANAL */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    className="relative p-10 md:p-14 rounded-[2.5rem] backdrop-blur-3xl bg-indigo-500/5 dark:bg-indigo-500/5 border border-indigo-500/20 dark:border-indigo-500/20 shadow-inner overflow-hidden max-w-4xl mx-auto"
                >
                    <div className="absolute top-0 right-10 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full" />

                    <div className="flex items-center gap-3 mb-8 relative z-10">
                        <CpuChipIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        <h2 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">A Pressão de Representar o Nordeste Globalmente</h2>
                    </div>

                    <div className="space-y-6 text-base md:text-lg font-serif leading-relaxed text-slate-700 dark:text-slate-300 relative z-10 opacity-90">
                        <p>
                            A burocracia exige previsibilidade, mas a inovação de fronteira é caótica. Quando a DoraHacks e a Hedera anunciaram a prorrogação do evento, a dinâmica de trabalho foi drasticamente alterada. O cronograma, que inicialmente previa encerramento na última semana de Julho, exigiu suporte intensivo através da primeira e segunda semanas de Agosto. A fase de submissões e refinamento de código arrastou-se implacavelmente semana após semana durante Setembro e a primeira quinzena de Outubro.
                        </p>
                        <p>
                            No pós-evento, a realidade foi ainda mais exigente. Desde a primeira semana de Dezembro até a última semana de Março, cada ciclo de sete dias foi consumido pela necessidade de implementar iterativamente as soluções vencedoras diretamente na mainnet da Hedera. Estávamos concorrendo contra projetos de ponta, desenvolvidos por startups do Vale do Silício e da Europa.
                        </p>
                        <blockquote className="border-l-[3px] border-indigo-400/50 pl-6 py-2 my-8 italic text-lg font-medium text-slate-900 dark:text-slate-100 bg-white/20 dark:bg-black/10 backdrop-blur-md rounded-r-2xl">
                            &quot;A escolha era binária: paralisar o suporte técnico diário das equipes para preencher formulários institucionais, ou garantir que o Nordeste e o Brasil entregassem códigos invioláveis e produtos de nível internacional a cada novo sprint semanal.&quot;
                        </blockquote>
                        <p>
                            A equipe Zaeon escolheu a entrega. Cada hora útil de nossa equipe enxuta foi dedicada a depurar <em>Smart Contracts</em> e agir como barreira de contenção contra o <em>burnout</em> dos alunos. O atraso na formalização não foi um ato de negligência, mas um sacrifício operacional necessário semana a semana para garantir a execução técnica de um feito histórico.
                        </p>
                    </div>
                </motion.section>

                {/* SEÇÃO 3: PROJETOS ENTREGUES (OS 50 LINKS) */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                >
                    <div className="flex items-center justify-center md:justify-start gap-3 mb-10 pl-4 max-w-4xl mx-auto">
                        <CheckBadgeIcon className="w-7 h-7 text-emerald-500/80" />
                        <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">Entregas Validadas & Repositórios</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {DELIVERED_PROJECTS.map((project, idx) => (
                            <motion.div
                                key={project.id}
                                initial={{ opacity: 0, scale: 0.98, y: 10 }} whileInView={{ opacity: 1, scale: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.4 }}
                                className="group p-6 md:p-8 rounded-[2rem] bg-white/40 dark:bg-[#0f172a]/40 backdrop-blur-2xl border border-slate-200/50 dark:border-white/5 hover:border-emerald-500/30 dark:hover:border-emerald-500/30 transition-all duration-500 shadow-[0_4px_24px_0_rgba(0,0,0,0.02)] hover:shadow-[0_8px_32px_0_rgba(16,185,129,0.05)] flex flex-col"
                            >
                                <div className="flex items-center justify-between mb-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-white/50 dark:bg-white/5 backdrop-blur-md flex items-center justify-center border border-slate-200/50 dark:border-white/10 group-hover:bg-emerald-500/10 transition-colors duration-300">
                                            <CodeBracketIcon className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-emerald-500" />
                                        </div>
                                        <span className="text-sm font-black text-slate-300 dark:text-slate-700">
                                            #{project.id}
                                        </span>
                                    </div>
                                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10">
                                        Auditado
                                    </span>
                                </div>

                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                                    {project.title}
                                </h3>
                                <p className="text-sm text-slate-600/90 dark:text-slate-400/90 leading-relaxed mb-8 flex-1 font-serif">
                                    {project.description}
                                </p>

                                {project.github !== "N/A" ? (
                                    <a
                                        href={project.github}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-auto flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-slate-900/5 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-xs font-semibold uppercase tracking-widest hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-all duration-300"
                                    >
                                        <LinkIcon className="w-4 h-4" /> Acessar Código Fonte
                                    </a>
                                ) : (
                                    <div className="mt-auto flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-slate-200/30 dark:bg-white/5 text-slate-400 dark:text-slate-600 text-xs font-semibold uppercase tracking-widest cursor-not-allowed border border-slate-200/50 dark:border-white/5">
                                        <LockClosedIcon className="w-4 h-4" /> Não Disponível
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </motion.section>

                {/* CONCLUSÃO E ASSINATURA */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    className="mt-20 pt-12 border-t border-slate-200/50 dark:border-white/10 text-center max-w-4xl mx-auto"
                >
                    <p className="text-slate-500 dark:text-slate-400 font-serif italic text-base md:text-lg max-w-2xl mx-auto mb-10 opacity-80">
                        Reiteramos nosso compromisso inabalável com o desenvolvimento científico e tecnológico do Estado do Ceará e do Nordeste. Entregamos o que nos foi confiado, superando as expectativas globais, e agora nos colocamos à inteira disposição para o saneamento burocrático e fiscal deste ciclo.
                    </p>
                    <div className="inline-block text-left">
                        <p className="text-slate-800 dark:text-slate-200 font-semibold text-sm md:text-base tracking-wide">Equipe Técnica & Operacional Zaeon</p>
                        <p className="text-slate-500 dark:text-slate-500 text-xs font-medium mt-1">Baturité, Ceará, Brasil — Abril de 2026</p>
                    </div>
                </motion.section>

            </main>
        </div>
    );
}