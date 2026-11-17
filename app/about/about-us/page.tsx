"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    SunIcon,
    MoonIcon,
    CpuChipIcon as CpuChipIconSolid,
    ArrowLeftIcon,
    CubeIcon,
    CommandLineIcon
} from "@heroicons/react/24/solid";

import {
    ServerStackIcon,
    LockClosedIcon,
    CpuChipIcon as CpuChipIconOutline,
    CalendarDaysIcon
} from "@heroicons/react/24/outline";

import MarCardumes from "@/components/sub/MarCardumes";

// CAMADA VERIFICÁVEL (Solana): marca oficial, ícones, card de credencial e diagramas
import SolanaMark from "@/components/solana/SolanaMark";
import IconeCredencial, { MedalhaoIcone, type NomeIcone } from "@/components/solana/IconesCredencial";
import CredencialCard from "@/components/solana/CredencialCard";
import { FluxoVerificacaoDiagrama, PrivacidadeDiagrama, PresencaDiagrama, ChancelaDiagrama, LivroRazaoDiagrama } from "@/components/solana/Diagramas";

// ============================================================================
// DADOS DO MANIFESTO E DOS PILARES DE VERIFICAÇÃO
// (espelha o posicionamento de /docs: universidade operada por IA, validada por humanos)
// ============================================================================
const MANIFESTO_PAGES = [
    {
        title: "UMA UNIVERSIDADE OPERADA POR IA",
        subtitle: "Introdução",
        content: [
            "A Zaeon é uma instituição de pesquisa conduzida por inteligências artificiais: agentes autônomos que investigam, ensinam e constroem de forma contínua.",
            "O propósito é usar essa capacidade para enfrentar os maiores problemas da humanidade — curar doenças, regenerar o meio ambiente e reduzir riscos ao planeta.",
            "Cada pesquisa caminha da pergunta à solução, e nenhuma etapa é tratada como verdade só porque foi gerada: o que importa é o que pode ser verificado."
        ]
    },
    {
        title: "OS AGENTES",
        subtitle: "Inteligência Artificial colaborativa",
        content: [
            "Agentes especializados leem a literatura, cruzam fontes, formulam hipóteses e propõem soluções — e também ensinam, explicando o que fazem para estudantes e professores.",
            "Eles assumem o trabalho repetitivo e de busca em escala, para que a mente humana foque no que faz de melhor: a intuição, a ética e a descoberta criativa.",
            "Tudo o que produzem é rastreável: cada afirmação aponta para a fonte que a sustenta."
        ]
    },
    {
        title: "VALIDAÇÃO HUMANA",
        subtitle: "Do produzido ao confiável",
        content: [
            "A transição de “produzido” para “confiável” exige um revisor humano — um pesquisador ou uma instituição.",
            "Ao aprovar, o sistema emite uma credencial verificável: um registro portável e à prova de adulteração do que foi feito, por quem foi validado e quando.",
            "O resultado é conhecimento aberto e auditável, que serve tanto para comprovar as habilidades de um estudante quanto para chancelar a entrega de um projeto."
        ]
    }
];

const VERIFICACAO_DATA = [
    {
        id: "v1",
        title: "REVISÃO HUMANA",
        status: "Hoje",
        isCurrent: true,
        desc: "Nada vira resultado confiável sem a aprovação de um pesquisador ou instituição. A IA propõe; as pessoas decidem."
    },
    {
        id: "v2",
        title: "EVIDÊNCIA RASTREÁVEL",
        status: "Hoje",
        isCurrent: false,
        desc: "Cada afirmação aponta para a fonte que a sustenta. Sem fonte verificada, a afirmação não entra."
    },
    {
        id: "v3",
        title: "CREDENCIAIS VERIFICÁVEIS",
        status: "Quando ativado",
        isCurrent: false,
        desc: "Ao validar, o sistema emite um registro portável e à prova de adulteração de proveniência: o que foi feito, quem validou e quando."
    },
    {
        id: "v4",
        title: "CONHECIMENTO ABERTO",
        status: "Princípio",
        isCurrent: false,
        desc: "A pesquisa que vira tecnologia, medicina e bem público é aberta e auditável — pensada para circular, não para ficar trancada."
    }
];

// ============================================================================
// A CAMADA VERIFICÁVEL — pilares ancorados no código (lib/aura/*, lib/solana/*, app/api/academic/*)
// Regra: só o que o código faz; o que é feature-gated diz "quando ativado".
// ============================================================================
type Pilar = { numeral: string; icone: NomeIcone; tom: "cyan" | "amber" | "emerald" | "violet"; title: string; desc: string; pontos: string[]; ancora: string };
const PILARES: Pilar[] = [
    {
        numeral: "I", icone: "identidade", tom: "cyan",
        title: "IDENTIDADE E PAPÉIS",
        desc: "Cada conta tem um papel — aluno, professor, instituição — e o que ela pode fazer é decidido na sessão, rota a rota. O vínculo professor↔aluno é um registro explícito; a instituição só enxerga as credenciais que emitiu.",
        pontos: ["papel na conta (User.role) + habilitação pra verificar", "vínculo professor↔aluno registrado (TeacherStudent)", "instituição filtra pela própria emissão"],
        ancora: "lib/aura/academico-server.ts · eu() · vinculado() · alunosDoVerificador()",
    },
    {
        numeral: "II", icone: "chancela", tom: "amber",
        title: "A CHANCELA HUMANA",
        desc: "O portão obrigatório. Nenhuma credencial, nenhuma AURA e nenhum registro on-chain acontece antes de um humano habilitado chancelar. Quem tenta verificar a si mesmo recebe 403. Admin só modera: rejeita, nunca verifica.",
        pontos: ["papel ✓ vínculo ✓ não-é-você ✓ documento ✓", "sem documento não há verificação — fica “declarado”", "rejeitar depois de verificado reverte tudo"],
        ancora: "lib/aura/academico.ts · elegibilidade() · metodoPermitido()",
    },
    {
        numeral: "III", icone: "livro", tom: "emerald",
        title: "LIVRO-RAZÃO",
        desc: "A reputação é um livro-razão que só cresce: um evento por conquista, único por (usuário, fonte, referência). Reverter é um evento negativo — nada se apaga. O saldo é a soma do ledger e o nível é derivado dele, nunca um campo solto.",
        pontos: ["AuraEvent append-only, idempotente", "reversão auditável (evento negativo)", "saldo recomputável a partir do ledger"],
        ancora: "lib/aura/ledger.ts · grantAura() · reverseAura() · recomputeAura()",
    },
    {
        numeral: "IV", icone: "economia", tom: "violet",
        title: "ECONOMIA DA VERIFICAÇÃO",
        desc: "AURA cresce com verificação, não com volume: validado vale muito mais que aplicado, que vale mais que aprendido. Título acadêmico só pontua com documento revisado; declarado vale zero. Só a validação humana gera atestado on-chain.",
        pontos: ["aprendido 5 · aplicado 15 · validado 50 · cérebro completo 200", "título: Técnico 60 → Pós-Doutorado 800 (só com doc_review)", "atestado on-chain só quando modo = humana"],
        ancora: "lib/aura/rules.ts · AURA · AURA_NIVEL · auraPorCredencial() · daAtestado()",
    },
];

/** O que acontece, em ordem, quando o revisor marca “verificado” (app/api/academic/[id]/verificar). */
const AO_CHANCELAR: { icone: NomeIcone; t: string; d: string }[] = [
    { icone: "livro", t: "AURA entra no livro-razão", d: "um evento credential_verified, uma vez por credencial, com o valor do nível liberado pelo método." },
    { icone: "identidade", t: "O nível acadêmico sobe", d: "User.academicLevel passa a ser o maior título verificado do aluno." },
    { icone: "credencial", t: "A credencial é cunhada", d: "issueCredential({ type: \"academic\" }) grava o registro e manda a Crossmint cunhar na carteira do aluno — sem segurar a resposta." },
    { icone: "portavel", t: "Na carteira do aluno", d: "a carteira custodial nasce do e-mail no primeiro login (sem seed phrase, sem gas); o mint é soulbound: não se vende nem transfere." },
    { icone: "hash", t: "Posse confirmada on-chain", d: "o mural lê a Solana (Helius DAS) e marca “verificada” só quando o asset existe, não foi queimado e está na carteira do aluno." },
];

// ============================================================================
// COMPONENTES DE UI
// ============================================================================

const BackButton = () => (
    <Link href="/" className="fixed top-28 left-8 z-[100] group">
        <motion.div
            whileHover={{ scale: 1.1, x: -5 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/80 dark:bg-black/60 backdrop-blur-xl border border-black/10 dark:border-white/10 flex items-center justify-center text-slate-800 dark:text-white group-hover:border-cyan-500 group-hover:text-cyan-500 transition-colors shadow-xl"
        >
            <ArrowLeftIcon className="w-5 h-5 md:w-6 md:h-6" />
        </motion.div>
    </Link>
);

const SectionSeparator = () => (
    <div className="relative w-full h-24 flex items-center justify-center z-40 overflow-hidden">
        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
        <div className="absolute w-8 h-8 border border-cyan-500/20 rotate-45 flex items-center justify-center bg-slate-50 dark:bg-[#030014] z-10 box-content p-1 transition-colors duration-500">
            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_10px_#22d3ee]" />
        </div>
        <div className="absolute bottom-2 text-[7px] font-mono text-cyan-800 tracking-[0.6em] uppercase">
            Buffer de Fragmento // Sincronização de Protocolo
        </div>
    </div>
);

const DimensionalCodex = ({ pages }: { pages: typeof MANIFESTO_PAGES }) => {
    const [page, setPage] = useState(0);
    const [isCodexDark, setIsCodexDark] = useState(true);
    const [direction, setDirection] = useState(0);

    const paginate = (dir: number) => {
        if (page + dir < 0 || page + dir >= pages.length) return;
        setDirection(dir);
        setPage(page + dir);
    };

    const iconColorActive = isCodexDark ? "text-cyan-300" : "text-cyan-600";
    const iconColorDisabled = isCodexDark ? "text-gray-700" : "text-gray-300";

    return (
        <div className="relative group perspective-2000 w-full flex justify-center z-30">
            <motion.div
                initial={{ opacity: 0, rotateY: -15 }} animate={{ opacity: 1, rotateY: 0 }}
                className={`relative w-full max-w-2xl h-[450px] md:h-[480px] rounded-[2.5rem] p-3 shadow-2xl flex flex-col overflow-visible transition-colors duration-500
                    ${isCodexDark ? 'bg-[#0a0a0f] border-white/5' : 'bg-slate-200 border-slate-300'}`}
            >
                <div className="absolute top-10 -left-0.5 w-0.5 h-10 bg-cyan-500/40 rounded-full blur-[1px]" />
                <div className="absolute bottom-10 -right-0.5 w-0.5 h-16 bg-blue-600/50 rounded-full blur-[1px]" />

                <div className={`relative flex-1 rounded-[2rem] overflow-hidden flex flex-col transition-all duration-700 ${isCodexDark ? 'bg-[#050508] shadow-[inset_0_0_20px_rgba(0,0,0,1)]' : 'bg-white shadow-[inset_0_0_20px_rgba(0,0,0,0.05)]'}`}>

                    <div className={`px-7 pt-5 pb-2 flex items-center justify-between border-b ${isCodexDark ? 'border-white/5' : 'border-slate-100'}`}>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                                <CpuChipIconSolid className="w-4 h-4 text-cyan-500" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black tracking-[0.2em] text-cyan-600 uppercase leading-none">Princípios do Sistema</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsCodexDark(!isCodexDark)}
                            className={`p-1.5 rounded-lg transition-all ${isCodexDark ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-black/5 text-slate-800 hover:bg-black/10'}`}
                        >
                            {isCodexDark ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
                        </button>
                    </div>

                    <div className="flex-1 relative overflow-hidden">
                        <AnimatePresence mode="wait" custom={direction}>
                            <motion.div
                                key={page} custom={direction}
                                initial={{ opacity: 0, x: direction * 30, filter: "blur(5px)" }}
                                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                                exit={{ opacity: 0, x: direction * -30, filter: "blur(5px)" }}
                                transition={{ duration: 0.4, ease: "circOut" }}
                                className={`absolute inset-0 p-7 overflow-y-auto custom-scrollbar flex flex-col ${isCodexDark ? 'text-white/70' : 'text-slate-600'}`}
                            >
                                <h2 className={`text-3xl md:text-3xl font-black mb-1 tracking-tighter leading-none ${isCodexDark ? 'text-white' : 'text-slate-900'}`}>
                                    {pages[page].title}
                                </h2>
                                <p className="text-cyan-600 font-mono text-[8px] uppercase tracking-[0.4em] mb-6 border-l border-cyan-500 pl-3 leading-none">
                                    {pages[page].subtitle}
                                </p>

                                <div className="space-y-4 font-serif text-base leading-relaxed">
                                    {pages[page].content.map((c, i) => (
                                        <p key={i} className={isCodexDark ? "opacity-90" : ""}>{c}</p>
                                    ))}
                                </div>
                                <div className="h-10 flex-none" />
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <div className={`px-7 py-4 flex items-center justify-between border-t ${isCodexDark ? 'bg-black/30 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                        <button
                            disabled={page === 0} onClick={() => paginate(-1)}
                            className={`group flex items-center gap-2 text-[9px] font-black uppercase tracking-widest transition-all ${page === 0 ? iconColorDisabled : `hover:text-cyan-500 ${iconColorActive}`}`}
                        >
                            <ChevronLeftIcon className="w-5 h-5 p-1 rounded-full border border-current" /> Ant
                        </button>

                        <div className="flex gap-1">
                            {pages.map((_, i) => (
                                <div key={i} className={`h-0.5 rounded-full transition-all duration-500 ${i === page ? 'w-6 bg-cyan-500' : (isCodexDark ? 'w-1.5 bg-gray-700' : 'w-1.5 bg-slate-300')}`} />
                            ))}
                        </div>

                        <button
                            disabled={page === pages.length - 1} onClick={() => paginate(1)}
                            className={`group flex items-center gap-2 text-[9px] font-black uppercase tracking-widest transition-all ${page === pages.length - 1 ? iconColorDisabled : `hover:text-cyan-500 ${iconColorActive}`}`}
                        >
                            Próx <ChevronRightIcon className="w-5 h-5 p-1 rounded-full border border-current" />
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// --- AGENT SECTION ---
const AgentSection = () => {
    return (
        <section className="relative min-h-screen w-full flex flex-col items-center justify-center p-6 md:p-12 overflow-hidden z-10 transition-colors duration-500">
            <div className="relative z-10 w-full max-w-6xl flex flex-col gap-8 md:gap-12 items-center text-center">

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-800 via-cyan-600 to-cyan-500 dark:from-white dark:via-cyan-100 dark:to-cyan-500 mb-4 tracking-tighter">
                        OS AGENTES
                    </h2>
                    <p className="text-sm md:text-base text-slate-600 dark:text-cyan-50/70 font-light leading-relaxed max-w-2xl mx-auto">
                        Agentes de IA que pesquisam, sintetizam e ensinam — conduzindo uma pergunta científica até uma solução verificável, sempre com validação humana.
                    </p>

                    {/* --- NOVO: ESPAÇO DA LOGO GOOGLE FOR STARTUPS --- */}
                    <div className="mt-8 flex flex-col items-center justify-center">
                        <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-3">
                            Apoiado Oficialmente Por
                        </span>
                        {/* Wrapper com fundo sutil para garantir visibilidade no modo claro e escuro */}
                        <div className="relative px-6 py-2 rounded-xl bg-white/40 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-white/10 opacity-70 hover:opacity-100 transition-all duration-300 filter grayscale hover:grayscale-0 shadow-sm cursor-default">
                            {/* #414: o logo vinha de um endereço da Wikimedia que não existe mais (404 em toda visita) — agora é
                                texto com as cores do Google, sem depender de site de fora. Pra voltar a ser imagem: pôr o
                                arquivo em public/ e trocar por um <img src="/…"> local. */}
                            <span role="img" aria-label="Google for Startups" className="flex items-baseline gap-1.5 text-[15px] md:text-[17px] font-semibold tracking-tight leading-none">
                                <span aria-hidden>
                                    <span style={{ color: "#4285F4" }}>G</span><span style={{ color: "#EA4335" }}>o</span><span style={{ color: "#FBBC05" }}>o</span><span style={{ color: "#4285F4" }}>g</span><span style={{ color: "#34A853" }}>l</span><span style={{ color: "#EA4335" }}>e</span>
                                </span>
                                <span aria-hidden className="font-normal text-slate-600 dark:text-slate-300">for Startups</span>
                            </span>
                        </div>
                    </div>
                </motion.div>

                <div className="w-full flex items-center justify-center gap-4 md:gap-8">

                    <motion.div
                        initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }}
                        className="hidden lg:flex w-16 h-[600px] rounded-full bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-blue-200/50 dark:border-cyan-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-xl flex-col items-center justify-between py-8 transition-all duration-500"
                    >
                        <div className="w-1.5 h-20 rounded-full bg-cyan-400/50 dark:bg-cyan-500/50" />
                        <div className="flex flex-col gap-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={`l-${i}`} className="w-2 h-2 rounded-full bg-cyan-500/80 dark:bg-cyan-400/80 animate-pulse shadow-[0_0_8px_#22d3ee]" style={{ animationDelay: `${i * 0.2}s` }} />
                            ))}
                        </div>
                        <div className="w-1.5 h-20 rounded-full bg-cyan-400/50 dark:bg-cyan-500/50" />
                    </motion.div>

                    <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        whileHover={{ boxShadow: "0 0 40px rgba(34, 211, 238, 0.15)" }}
                        className={`flex-1 w-full max-w-4xl rounded-[2.5rem] bg-white/60 dark:bg-[#030014]/60 backdrop-blur-2xl border border-blue-200/50 dark:border-cyan-500/30 p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-[0_0_30px_rgba(0,0,0,0.6)] flex flex-col transition-all duration-500 overflow-hidden h-auto`}
                    >
                        <div className="w-full p-6 rounded-3xl bg-slate-900 dark:bg-[#0f172a] border border-white/10 shadow-xl overflow-hidden relative group shrink-0 text-left">
                            <div className="absolute top-0 right-0 p-4 opacity-10 dark:opacity-20">
                                <CpuChipIconOutline className="w-24 h-24 text-cyan-500/50" />
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/90">
                                            PESQUISAS ATIVAS
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-2 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                                        <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider">
                                            Em breve
                                        </span>
                                    </div>
                                </div>

                                <div className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-lg border border-dashed border-cyan-500/30 bg-cyan-500/5 text-center">
                                    <ServerStackIcon className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
                                    <p className="font-mono text-[10px] md:text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                                        Nenhuma pesquisa pública ainda
                                    </p>
                                    <p className="max-w-md text-[11px] leading-relaxed text-white/60">
                                        As pesquisas validadas e publicadas pelos pesquisadores aparecem aqui — sem dados de exemplo.
                                    </p>
                                    <Link href="/docs" className="mt-1 text-[10px] font-black uppercase tracking-widest text-cyan-400 hover:text-cyan-300 underline underline-offset-4">
                                        Ler a documentação
                                    </Link>
                                </div>
                            </div>
                        </div>

                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.3 }}
                        className="hidden lg:flex w-16 h-[600px] rounded-full bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-blue-200/50 dark:border-cyan-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-xl flex-col items-center justify-between py-8 transition-all duration-500"
                    >
                        <div className="w-1.5 h-20 rounded-full bg-cyan-400/50 dark:bg-cyan-500/50" />
                        <div className="flex flex-col gap-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={`r-${i}`} className="w-2 h-2 rounded-full bg-cyan-500/80 dark:bg-cyan-400/80 animate-pulse shadow-[0_0_8px_#22d3ee]" style={{ animationDelay: `${i * 0.2 + 0.5}s` }} />
                            ))}
                        </div>
                        <div className="w-1.5 h-20 rounded-full bg-cyan-400/50 dark:bg-cyan-500/50" />
                    </motion.div>

                </div>
            </div>
        </section>
    );
};

// --- SECTION: VERIFICAÇÃO ---
const VerificacaoSection = () => {
    return (
        <section className="relative z-30 min-h-screen w-full flex flex-col items-center justify-center p-6 md:p-12 lg:p-32 overflow-hidden transition-colors duration-500">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

            <div className="mb-12 md:mb-20 text-center relative z-10">
                <h4 className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-400 mb-4 opacity-90">
                    Princípios do Sistema
                </h4>
                <h2 className="text-3xl md:text-5xl lg:text-7xl font-black text-slate-900 dark:text-white tracking-tighter mb-4 transition-colors">
                    VERDADE VERIFICÁVEL
                </h2>
                <div className="flex items-center justify-center gap-4 text-cyan-600 dark:text-cyan-500 font-mono text-[10px] uppercase tracking-[0.5em]">
                    <CubeIcon className="w-4 h-4" /> Como garantimos confiança <CubeIcon className="w-4 h-4" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl relative z-10">
                {VERIFICACAO_DATA.map((data, idx) => (
                    <motion.div
                        key={data.id}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.1 }}
                        whileHover={{ y: -5 }}
                        className={`p-6 md:p-8 rounded-[2rem] flex flex-col transition-all duration-500 group relative
                            ${data.isCurrent
                                ? 'bg-cyan-50/80 dark:bg-cyan-900/10 border-2 border-cyan-500/50 dark:border-cyan-500/50 shadow-[0_0_40px_rgba(34,211,238,0.2)] dark:shadow-[0_0_40px_rgba(34,211,238,0.1)] scale-[1.02] z-10'
                                : 'bg-white/80 dark:bg-white/5 border border-blue-200/50 dark:border-white/10 backdrop-blur-xl hover:bg-white/90 dark:hover:bg-white/10 shadow-lg dark:shadow-none hover:border-cyan-500/30'
                            }
                        `}
                    >
                        <span className="self-start mb-3 text-[9px] font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400">{data.status}</span>
                        <h3 className={`text-xl font-bold mb-4 tracking-tight transition-colors ${data.isCurrent ? 'text-slate-900 dark:text-cyan-50' : 'text-slate-800 dark:text-white'}`}>
                            {data.title}
                        </h3>
                        <p className={`text-sm leading-relaxed font-light transition-colors ${data.isCurrent ? 'text-slate-700 dark:text-cyan-100/70' : 'text-slate-500 dark:text-white/50'}`}>
                            {data.desc}
                        </p>
                    </motion.div>
                ))}
            </div>
        </section>
    );
};

// --- SECTION: A CAMADA VERIFICÁVEL (Solana) ---
const CamadaVerificavelSection = () => {
    const anim = (delay = 0) => ({ initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-60px" }, transition: { duration: 0.55, delay } });
    const cabecalho = "text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-400 mb-4 opacity-90";
    const titulo = "text-3xl md:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tighter mb-4 transition-colors";
    const lead = "text-sm md:text-base text-slate-600 dark:text-cyan-50/70 font-light leading-relaxed max-w-3xl mx-auto";
    const cardCls = "rounded-[2rem] bg-white/80 dark:bg-white/5 border border-blue-200/50 dark:border-white/10 backdrop-blur-xl shadow-lg dark:shadow-none p-6 md:p-8";

    return (
        <section className="relative z-30 w-full flex flex-col items-center p-6 md:p-12 lg:px-32 lg:py-24 overflow-hidden transition-colors duration-500">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

            {/* ── cabeçalho ── */}
            <motion.div {...anim()} className="mb-12 md:mb-16 text-center relative z-10 max-w-4xl">
                <h4 className={cabecalho}>A Camada Verificável</h4>
                <h2 className={titulo}>PRODUZIDO ≠ CONFIÁVEL</h2>
                <p className={lead}>
                    Nenhum resultado é tratado como verdade só porque foi gerado. A passagem de “produzido” para “confiável” exige um revisor humano — um pesquisador ou uma instituição. Ao aprovar, a Zaeon emite uma credencial verificável: um registro portável e à prova de adulteração do que foi feito, por quem foi validado e quando.
                </p>
                <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-white/15 bg-black/80 px-4 py-2 shadow-[0_0_30px_rgba(220,31,255,0.15)]">
                    <SolanaMark size={16} wordmark />
                    <span className="h-4 w-px bg-white/15" />
                    <span className="text-[9px] font-black uppercase tracking-[0.25em] text-white/80">credenciais emitidas na Solana</span>
                </div>
            </motion.div>

            {/* ── pilares I–IV ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-7xl relative z-10">
                {PILARES.map((p, idx) => (
                    <motion.div key={p.numeral} {...anim(idx * 0.08)} whileHover={{ y: -4 }} className={`${cardCls} flex flex-col gap-4 group hover:border-cyan-500/30 transition-colors`}>
                        <div className="flex items-start justify-between gap-4">
                            <MedalhaoIcone name={p.icone} tom={p.tom} size={52} title={p.title} />
                            <span className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-slate-400 dark:text-white/35">Pilar {p.numeral}</span>
                        </div>
                        <h3 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white">{p.title}</h3>
                        <p className="text-sm leading-relaxed font-light text-slate-600 dark:text-white/60">{p.desc}</p>
                        <ul className="flex flex-col gap-1.5">
                            {p.pontos.map((pt) => (
                                <li key={pt} className="flex items-start gap-2 text-[12px] text-slate-700 dark:text-white/75">
                                    <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500 shadow-[0_0_8px_#22d3ee]" />
                                    <span>{pt}</span>
                                </li>
                            ))}
                        </ul>
                        {p.numeral === "II" && <div className="mt-2"><ChancelaDiagrama /></div>}
                        {p.numeral === "III" && <div className="mt-2"><LivroRazaoDiagrama /></div>}
                        <p className="mt-auto pt-3 border-t border-slate-200/70 dark:border-white/10 font-mono text-[9px] text-cyan-700/80 dark:text-cyan-300/70 break-words">{p.ancora}</p>
                    </motion.div>
                ))}
            </div>

            {/* ── Verificação & Credenciais (peça central) ── */}
            <motion.div {...anim()} className="mt-20 md:mt-28 mb-10 text-center relative z-10 max-w-4xl">
                <h4 className={cabecalho}>Verificação &amp; Credenciais</h4>
                <h2 className={titulo}>DO PRODUZIDO AO CONFIÁVEL</h2>
                <p className={lead}>
                    Três etapas, uma única passagem. Os agentes produzem; um humano habilitado revisa; só então o sistema emite a credencial — e faz isso no mesmo ato em que registra a reputação e atualiza o nível do aluno.
                </p>
            </motion.div>
            <div className="w-full max-w-7xl relative z-10">
                <FluxoVerificacaoDiagrama />
            </div>

            <div className="mt-12 grid grid-cols-1 lg:grid-cols-5 gap-6 w-full max-w-7xl relative z-10 items-start">
                {/* card da credencial (ilustrativo) */}
                <motion.div {...anim(0.1)} className="lg:col-span-2 lg:sticky lg:top-28">
                    <CredencialCard
                        ilustrativo
                        tipo="Título acadêmico verificado"
                        titulo="Mestrado em Agronomia — UFC"
                        validadoPor="Instituição emissora (selo ouro)"
                        emitidaEm={new Date("2026-10-02T12:00:00Z")}
                        assetId="A1q7FxJ3kZcP9u2vT8yWm4nR6sL0dH5eK2bN8cV3xG1p"
                        rede="devnet"
                        status="issued"
                    />
                </motion.div>

                {/* o que acontece ao chancelar */}
                <motion.div {...anim(0.2)} className={`lg:col-span-3 ${cardCls}`}>
                    <div className="flex items-center justify-between gap-3 mb-5">
                        <h3 className="text-lg md:text-xl font-black tracking-tight text-slate-900 dark:text-white">Quando o revisor marca “verificado”</h3>
                        <IconeCredencial name="chancela" size={22} className="text-amber-500" title="Chancela" />
                    </div>
                    <ol className="flex flex-col gap-4">
                        {AO_CHANCELAR.map((e, i) => (
                            <li key={e.t} className="flex items-start gap-4">
                                <span className="relative shrink-0">
                                    <MedalhaoIcone name={e.icone} size={40} tom={i === 4 ? "emerald" : i === 3 ? "violet" : "cyan"} />
                                    <span className="absolute -top-1 -left-1 h-4 w-4 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[9px] font-black grid place-items-center">{i + 1}</span>
                                </span>
                                <div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{e.t}</p>
                                    <p className="text-[12px] text-slate-600 dark:text-white/60 leading-snug">{e.d}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                    <div className="mt-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-[11px] leading-relaxed text-slate-700 dark:text-cyan-50/70">
                        <b className="text-slate-900 dark:text-white">Quando ativado.</b> A economia AURA e a fila de verificação respondem atrás de uma chave de ativação; a cunhagem on-chain acontece quando a camada Solana (Crossmint + Helius) está configurada. Sem ela, a conquista do aluno fica intacta e a credencial espera — nunca aparece um selo falso.
                    </div>
                    <p className="mt-4 font-mono text-[9px] text-cyan-700/80 dark:text-cyan-300/70 break-words">app/api/academic/[id]/verificar/route.ts · lib/solana/credentials.ts · lib/solana/crossmint.ts · lib/solana/helius.ts</p>
                </motion.div>
            </div>

            {/* ── Privacidade por proveniência ── */}
            <motion.div {...anim()} className="mt-20 md:mt-28 mb-10 text-center relative z-10 max-w-4xl">
                <h4 className={cabecalho}>Privacidade por proveniência</h4>
                <h2 className={titulo}>PROVAR SEM EXPOR</h2>
                <p className={lead}>
                    A camada Solana existe para provar proveniência sem expor a pessoa. O que vai para a cadeia é a prova — título, tipo, data, ponteiro de origem — nunca o conteúdo do trabalho, o documento do diploma, o nome ou o e-mail de quem o conquistou.
                </p>
            </motion.div>
            <div className="w-full max-w-7xl relative z-10">
                <PrivacidadeDiagrama />
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-7xl relative z-10">
                <motion.div {...anim(0.05)} className={`${cardCls} flex flex-col gap-3`}>
                    <MedalhaoIcone name="hash" tom="emerald" size={44} title="Integridade sem revelar" />
                    <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Integridade sem revelar</h3>
                    <p className="text-[13px] leading-relaxed font-light text-slate-600 dark:text-white/60">
                        O documento do diploma vira uma impressão digital (sha256) usada só para detectar o mesmo arquivo reaproveitado em outra conta. O arquivo em si fica guardado: só o dono e um revisor elegível o abrem, por uma rota própria e sem cache.
                    </p>
                    <p className="mt-auto font-mono text-[9px] text-cyan-700/80 dark:text-cyan-300/70">lib/aura/academico.ts · hashDocumento() · app/api/academic/[id]/doc</p>
                </motion.div>
                <motion.div {...anim(0.12)} className={`${cardCls} flex flex-col gap-3`}>
                    <MedalhaoIcone name="portavel" tom="violet" size={44} title="A credencial é sua" />
                    <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">A credencial é sua</h3>
                    <p className="text-[13px] leading-relaxed font-light text-slate-600 dark:text-white/60">
                        A carteira nasce do seu e-mail, sem seed phrase nem gas, e a credencial é cunhada nela — soulbound: não se vende, não se transfere, não se revende. Você pode reivindicar a carteira e levar as provas para fora da Zaeon. A plataforma emite; não é dona.
                    </p>
                    <p className="mt-auto font-mono text-[9px] text-cyan-700/80 dark:text-cyan-300/70">lib/solana/wallet.ts · ensureCustodialWallet() · claimWalletUrl()</p>
                </motion.div>
                <motion.div {...anim(0.2)} className={`${cardCls} flex flex-col gap-3`}>
                    <MedalhaoIcone name="privacidade" tom="amber" size={44} title="No ciberespaço" />
                    <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">No ciberespaço</h3>
                    <p className="text-[13px] leading-relaxed font-light text-slate-600 dark:text-white/60">
                        Quando você anda, conversa e colabora com outras pessoas, a presença leva só o seu avatar, a sua cor e o seu nome de exibição. E-mail, documentos, carteira e credenciais não viajam com você — a competência é provada pela credencial, não pela exposição.
                    </p>
                    <div className="mt-2"><PresencaDiagrama /></div>
                    <p className="mt-auto font-mono text-[9px] text-cyan-700/80 dark:text-cyan-300/70">app/api/lounge3d/[id]/rt-token · server/colyseus LoungeRoom.Jogador</p>
                </motion.div>
            </div>

            <motion.div {...anim(0.1)} className="mt-14 flex flex-col items-center gap-3 text-center relative z-10">
                <div className="flex items-center gap-4 text-cyan-600 dark:text-cyan-500 font-mono text-[10px] uppercase tracking-[0.5em]">
                    <CubeIcon className="w-4 h-4" /> Público é a prova · privado é a pessoa <CubeIcon className="w-4 h-4" />
                </div>
                <Link href="/docs" className="text-[10px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400 hover:text-cyan-300 underline underline-offset-4">
                    Ler a documentação
                </Link>
            </motion.div>
        </section>
    );
};

export default function TechnicalAboutPage() {
    return (
        <div className="relative isolate w-full font-sans overflow-x-hidden selection:bg-cyan-500 selection:text-white">

            <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
                <MarCardumes continuo />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/75 to-background" />
            </div>

            <BackButton />

            {/* SEÇÃO 1: MANIFESTO & CODEX */}
            <div className="relative min-h-screen w-full overflow-hidden flex flex-col justify-center z-20 p-6 md:p-12 lg:py-24 transition-colors duration-500">
                <div className="relative z-30 w-full flex items-center justify-center">
                    <DimensionalCodex pages={MANIFESTO_PAGES} />
                </div>
            </div>

            <SectionSeparator />

            {/* SEÇÃO 2: AGENTES (COM PESQUISAS INTEGRADAS) */}
            <div className="bg-slate-50/50 dark:bg-transparent transition-colors duration-500">
                <AgentSection />
            </div>

            <div className="relative z-30"><SectionSeparator /></div>

            {/* SEÇÃO 3: VERIFICAÇÃO */}
            <div className="bg-slate-50/50 dark:bg-transparent transition-colors duration-500">
                <VerificacaoSection />
            </div>

            <div className="relative z-30"><SectionSeparator /></div>

            {/* SEÇÃO 4: A CAMADA VERIFICÁVEL (Solana) — pilares, fluxo Verificação & Credenciais, privacidade */}
            <div className="bg-slate-50/50 dark:bg-transparent transition-colors duration-500">
                <CamadaVerificavelSection />
            </div>

            <style jsx global>{`
                .perspective-2000 { perspective: 2000px; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34, 211, 238, 0.3); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(34, 211, 238, 0.6); }
            `}</style>
        </div>
    );
}