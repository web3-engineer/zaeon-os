"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { ArrowLeftIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import MacSplash from "@/components/ui/MacSplash";
import { PLAN_INFO } from "@/lib/plans";
import PdaEquipe from "@/components/about/PdaEquipe";
import FundoDroids from "@/components/about/FundoDroids";
// Sem este import o i18n só inicializa se outra página (home) já o carregou: num acesso direto
// ou F5 em /about o `isInitialized` ficava falso e a página parava no splash, em branco.
import "@/src/i18n";

// ─── SCRAMBLE TEXT HOOK ───────────────────────────────────────────────────────
const CHAR_POOL = ["紀", "律", "知", "識", "未", "来", "革", "新", "卓", "越", "智", "慧", "能", "力"];

const useScrambleText = (targetText: string, start: boolean) => {
    const [displayText, setDisplayText] = useState("");
    const [isComplete, setIsComplete] = useState(false);
    const stateRef = useRef<"idle" | "scrambling" | "resolving" | "holding">("idle");
    const startTimeRef = useRef<number>(0);
    const lastStateChangeTimeRef = useRef<number>(0);
    const animationFrameRef = useRef<number>();

    const animate = useCallback(
        (timestamp: number) => {
            if (!start) return;
            if (!startTimeRef.current) startTimeRef.current = timestamp;
            if (lastStateChangeTimeRef.current === 0) lastStateChangeTimeRef.current = timestamp;
            const elapsedInCurrentState = timestamp - lastStateChangeTimeRef.current;

            switch (stateRef.current) {
                case "idle":
                    stateRef.current = "scrambling";
                    lastStateChangeTimeRef.current = timestamp;
                    break;
                case "scrambling":
                    if (elapsedInCurrentState >= 3000) {
                        stateRef.current = "resolving";
                        lastStateChangeTimeRef.current = timestamp;
                    } else {
                        setDisplayText(
                            targetText
                                .split("")
                                .map((c) =>
                                    c === " " ? " " : CHAR_POOL[Math.floor(Math.random() * CHAR_POOL.length)]
                                )
                                .join("")
                        );
                    }
                    break;
                case "resolving": {
                    const progress = Math.min(elapsedInCurrentState / 2000, 1);
                    const resolved = targetText
                        .split("")
                        .map((char, i) =>
                            i < targetText.length * progress
                                ? char
                                : char === " "
                                    ? " "
                                    : CHAR_POOL[Math.floor(Math.random() * CHAR_POOL.length)]
                        )
                        .join("");
                    setDisplayText(resolved);
                    if (progress === 1) {
                        stateRef.current = "holding";
                        lastStateChangeTimeRef.current = timestamp;
                        setIsComplete(true);
                    }
                    break;
                }
                case "holding":
                    if (elapsedInCurrentState >= 3000) {
                        stateRef.current = "scrambling";
                        lastStateChangeTimeRef.current = timestamp;
                        setIsComplete(false);
                    }
                    break;
            }
            animationFrameRef.current = requestAnimationFrame(animate);
        },
        [targetText, start]
    );

    useEffect(() => {
        if (start) animationFrameRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrameRef.current!);
    }, [animate, start]);

    return { displayText, isComplete };
};

// ─── CYBER TITLE ─────────────────────────────────────────────────────────────
const CyberTitle = ({
    mainText,
    secondaryText,
    scrollText,
    startAnimations,
}: {
    mainText: string;
    secondaryText: string;
    scrollText: string;
    startAnimations: boolean;
}) => {
    const { displayText: sText, isComplete: sDone } = useScrambleText(secondaryText, startAnimations);
    const { displayText: mText, isComplete: mDone } = useScrambleText(mainText, startAnimations);

    // o texto PRINCIPAL em cima ("Construa sem limites.") e o subtexto azul embaixo ("da ideia ao mundo real");
    // os dois nascem dos ideogramas (scramble) e assentam.
    return (
        <div className="text-center mb-16 relative z-20 min-h-[220px] flex flex-col justify-center max-w-5xl mx-auto">
            <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter text-white font-mono uppercase leading-[1.05] min-h-[2.1em]">
                <span
                    className={`${mDone ? "text-white drop-shadow-[0_0_30px_rgba(34,211,238,0.8)]" : "text-white/20"
                        }`}
                >
                    {mText}
                </span>
            </h1>
            <h2 className="text-base md:text-2xl font-medium tracking-[0.3em] mt-4 font-mono uppercase min-h-[1.4em]">
                <span className={`${sDone ? "text-cyan-400/90" : "text-white/40"} transition-all duration-1000`}>
                    {sText}
                </span>
            </h2>
            <div className="mt-10 flex flex-col items-center gap-3">
                <span className="text-cyan-400 font-bold text-[10px] uppercase tracking-[0.5em] animate-pulse">
                    {scrollText}
                </span>
                <ChevronDownIcon className="w-5 h-5 text-cyan-500/70" />
            </div>
        </div>
    );
};

// ─── TEXT BLOCK ───────────────────────────────────────────────────────────────
const TextBlock = ({
    children,
    align = "left",
    glowColor = "cyan",
    direction = "none",
    customBg = "bg-black/60",
}: {
    children: React.ReactNode;
    align?: "left" | "right" | "center";
    glowColor?: "cyan" | "purple";
    direction?: "left" | "right" | "none";
    customBg?: string;
}) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-15% 0px" });
    const alignClass =
        align === "left"
            ? "items-start text-left"
            : align === "right"
                ? "items-end text-right ml-auto"
                : "items-center text-center mx-auto";
    const xInitial = direction === "left" ? -150 : direction === "right" ? 150 : 0;
    const yInitial = direction === "none" ? 50 : 0;

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, x: xInitial, y: yInitial }}
            animate={isInView ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, x: xInitial, y: yInitial }}
            transition={{ type: "spring", stiffness: 50, damping: 20, mass: 1 }}
            whileHover={{ y: -5, scale: 1.01, transition: { duration: 0.3 } }}
            className={`flex flex-col ${alignClass} max-w-4xl w-full p-10 rounded-[2.5rem]
                        backdrop-blur-xl ${customBg} border border-white/10 shadow-2xl
                        relative overflow-hidden group
                        ${glowColor === "cyan"
                    ? "hover:border-cyan-500/40 hover:shadow-[0_0_40px_rgba(34,211,238,0.2)]"
                    : "hover:border-purple-500/40 hover:shadow-[0_0_40px_rgba(168,85,247,0.2)]"
                }`}
        >
            <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.05] via-transparent to-black/20" />
            <div className="relative z-10 space-y-6 text-white leading-relaxed font-light text-lg md:text-xl drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                {children}
            </div>
        </motion.div>
    );
};

interface MoleculeNode {
    readonly level: string;
    readonly glowColor: string;
    readonly borderClass: string;
    readonly bgClass: string;
    readonly tagClass: string;
    readonly textClass: string;
    readonly pulseClass: string;
}

// ─── MOLECULE DATA (o texto de cada camada fica em about.layers.n1…n3 do i18n) ───
const MOLECULE_NODES: readonly MoleculeNode[] = [
    {
        level: "01",
        glowColor: "rgba(34,211,238,0.6)",
        borderClass: "border-cyan-500/50",
        bgClass: "bg-cyan-950/60",
        tagClass: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
        textClass: "text-cyan-400",
        pulseClass: "border-cyan-400/30",
    },
    {
        level: "02",
        glowColor: "rgba(168,85,247,0.6)",
        borderClass: "border-purple-500/50",
        bgClass: "bg-purple-950/60",
        tagClass: "bg-purple-500/10 text-purple-300 border-purple-500/20",
        textClass: "text-purple-400",
        pulseClass: "border-purple-400/30",
    },
    {
        level: "03",
        glowColor: "rgba(16,185,129,0.6)",
        borderClass: "border-emerald-500/50",
        bgClass: "bg-emerald-950/60",
        tagClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
        textClass: "text-emerald-400",
        pulseClass: "border-emerald-400/30",
    },
];

// ─── FLOW BOND ────────────────────────────────────────────────────────────────
// Analogia: como o fio de energia que conecta dois átomos numa molécula —
// quando o átomo de cima está ativo, elétrons fluem para o próximo.
const FlowBond = ({
    isActive,
    fromColor,
    toColor,
}: {
    isActive: boolean;
    fromColor: string;
    toColor: string;
}) => (
    <div className="relative flex justify-center items-start h-20 w-8">
        {/* Linha estática */}
        <div
            className="w-[2px] h-full rounded-full transition-all duration-1000"
            style={{
                background: isActive
                    ? `linear-gradient(to bottom, ${fromColor}, ${toColor})`
                    : "rgba(255,255,255,0.08)",
                opacity: isActive ? 1 : 0.4,
            }}
        />
        {/* Partículas fluindo */}
        {isActive && (
            <>
                <motion.div
                    animate={{ y: [0, 76] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
                    style={{ background: fromColor, boxShadow: `0 0 14px ${fromColor}` }}
                />
                <motion.div
                    animate={{ y: [0, 76] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "linear", delay: 0.7 }}
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-[5px] h-[5px] rounded-full bg-white/30"
                />
            </>
        )}
    </div>
);

// ─── MOLECULE SECTION ─────────────────────────────────────────────────────────
// 3 nós conectados por ligações com fluxo animado.
// Cada nó se acende conforme entra na viewport ao rolar a tela.
const MoleculeSection = () => {
    const { t } = useTranslation();
    const node0Ref = useRef<HTMLDivElement>(null);
    const node1Ref = useRef<HTMLDivElement>(null);
    const node2Ref = useRef<HTMLDivElement>(null);

    const isNode0 = useInView(node0Ref, { once: true, margin: "-10% 0px" });
    const isNode1 = useInView(node1Ref, { once: true, margin: "-10% 0px" });
    const isNode2 = useInView(node2Ref, { once: true, margin: "-10% 0px" });

    const activeMap = [isNode0, isNode1, isNode2];
    const refs = [node0Ref, node1Ref, node2Ref];

    return (
        <div className="flex flex-col items-center w-full max-w-[1000px] mx-auto my-16 px-4 lg:px-0">
            {/* Cabeçalho */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-20"
            >
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-cyan-500/70 mb-4">
                    {t("about.layers.kicker")}
                </p>
                <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter">
                    {t("about.layers.title_a")}{" "}
                    <span className="text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.4)]">
                        {t("about.layers.title_b")}
                    </span>
                </h2>
            </motion.div>

            {/* Cadeia da molécula */}
            <div className="flex flex-col items-center w-full gap-0">
                {MOLECULE_NODES.map((node, i) => {
                    const isActive = activeMap[i];
                    const isEven = i % 2 === 0;
                    const chave = `about.layers.n${i + 1}`;
                    const tags = t(`${chave}.tags`, { returnObjects: true });

                    return (
                        <div key={i} className="flex flex-col items-center w-full">
                            {/* Linha do nó */}
                            <div
                                ref={refs[i]}
                                className={`flex items-center w-full gap-5 ${!isEven ? "lg:flex-row-reverse" : ""
                                    }`}
                            >
                                {/* Átomo */}
                                <motion.div
                                    animate={
                                        isActive
                                            ? {
                                                boxShadow: [
                                                    `0 0 20px ${node.glowColor}`,
                                                    `0 0 60px ${node.glowColor}`,
                                                    `0 0 20px ${node.glowColor}`,
                                                ],
                                            }
                                            : { boxShadow: "0 0 0px transparent" }
                                    }
                                    transition={{ duration: 2.5, repeat: Infinity }}
                                    className={`flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-full border-2 ${node.borderClass} ${node.bgClass} backdrop-blur-xl flex flex-col items-center justify-center relative`}
                                >
                                    <span
                                        className={`text-[7px] font-black uppercase tracking-wider transition-colors duration-700 ${isActive ? node.textClass : "text-white/20"
                                            }`}
                                    >
                                        LVL
                                    </span>
                                    <span
                                        className={`text-xl font-black transition-colors duration-700 ${isActive ? "text-white" : "text-white/20"
                                            }`}
                                    >
                                        {node.level}
                                    </span>
                                    {/* Anel pulsante de ativação */}
                                    {isActive && (
                                        <motion.div
                                            animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
                                            transition={{ duration: 2.5, repeat: Infinity }}
                                            className={`absolute inset-0 rounded-full border ${node.pulseClass}`}
                                        />
                                    )}
                                </motion.div>

                                {/* Card de conteúdo */}
                                <motion.div
                                    initial={{ opacity: 0, x: isEven ? 40 : -40 }}
                                    animate={
                                        isActive
                                            ? { opacity: 1, x: 0 }
                                            : { opacity: 0.15, x: isEven ? 18 : -18 }
                                    }
                                    transition={{ type: "spring", stiffness: 60, damping: 20 }}
                                    className={`flex-1 p-5 md:p-7 rounded-[1.8rem] backdrop-blur-xl ${node.bgClass} border ${node.borderClass} shadow-xl`}
                                >
                                    <h3 className="text-lg md:text-xl font-black text-white mt-1 mb-2 tracking-tight">
                                        {t(`${chave}.title`)}
                                    </h3>
                                    <p className="text-xs md:text-sm text-white/60 leading-relaxed">
                                        {t(`${chave}.desc`)}
                                    </p>
                                    {Array.isArray(tags) && (
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {(tags as string[]).map((tag) => (
                                                <span key={tag} className={`px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${node.tagClass}`}>
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            </div>

                            {/* Ligação entre nós */}
                            {i < MOLECULE_NODES.length - 1 && (
                                <FlowBond
                                    isActive={isActive}
                                    fromColor={node.glowColor}
                                    toColor={MOLECULE_NODES[i + 1].glowColor}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Rodapé da seção */}
            <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="mt-16 text-center"
            >
                <div className="w-20 h-[2px] bg-gradient-to-r from-cyan-500 via-purple-500 to-emerald-500 mx-auto mb-5 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400">
                    {t("about.layers.footer")}
                </p>
            </motion.div>
        </div>
    );
};

// ─── COMO FUNCIONA (copy no bloco `about.architecture` do i18n) ──────────────
// A ideia passa pelos mesmos marcos da placa-chip da landing (components/main/TimelineIdeia), nas mesmas cores.
const ETAPAS = ["#e2e8f0", "#f5c542", "#2bd47a", "#2d6ae8", "#8b5cf6", "#22d3ee"] as const;
const ComoFunciona = () => {
    const { t } = useTranslation();
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="w-full max-w-5xl rounded-[2.5rem] bg-black/70 backdrop-blur-xl border border-white/10 p-8 md:p-12 text-center shadow-2xl"
        >
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase">{t("about.architecture.title")}</h2>
            <p className="mt-3 text-white/70 max-w-2xl mx-auto">{t("about.architecture.subtitle")}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 md:gap-3">
                {ETAPAS.map((cor, i) => (
                    <div key={cor} className="flex items-center gap-2 md:gap-3">
                        <span
                            className="px-3 py-2 rounded-full border text-[10px] md:text-xs font-black tracking-[0.18em]"
                            style={{ color: cor, borderColor: `${cor}55`, background: `${cor}14`, boxShadow: `0 0 18px ${cor}22` }}
                        >
                            {t(`about.architecture.flow.step${i + 1}`)}
                        </span>
                        {i < ETAPAS.length - 1 && <span className="text-white/30" aria-hidden>→</span>}
                    </div>
                ))}
            </div>
            <div className="mt-8 inline-block rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-400">{t("about.architecture.card_title")}</p>
                <p className="mt-1 text-sm text-white/70">{t("about.architecture.card_desc")}</p>
            </div>
        </motion.div>
    );
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function AboutUsPage() {
    const { t, ready } = useTranslation();
    const [mounted, setMounted] = useState(false);
    const containerRef = useRef(null);
    const missionRef = useRef(null);

    const { scrollYProgress } = useScroll({ target: containerRef });
    const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);

    const { scrollYProgress: missionProgress } = useScroll({
        target: missionRef,
        offset: ["start end", "end start"],
    });
    const missionX = useTransform(missionProgress, [0, 0.15, 0.6, 0.8], [-300, 0, 0, -300]);
    const missionOpacity = useTransform(missionProgress, [0, 0.15, 0.6, 0.8], [0, 1, 1, 0]);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || !ready) return <MacSplash minDurationMs={1500} />;

    return (
        <div
            ref={containerRef}
            className="relative min-h-[300vh] bg-[#030014] overflow-hidden font-sans z-[200]"
        >
            {/* ── Botão voltar ── */}
            <button
                onClick={() => window.history.back()}
                className="fixed top-28 left-10 z-[300] flex items-center gap-3 text-white/40 hover:text-cyan-400 group"
            >
                <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center backdrop-blur-xl bg-white/5 transition-all shadow-xl">
                    <ArrowLeftIcon className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                </div>
                <span className="text-[10px] uppercase tracking-[0.3em] font-black opacity-0 group-hover:opacity-100 transition-all">
                    {t("about.back", "Voltar")}
                </span>
            </button>

            {/* ── Fundo parallax: os droids passeando pelo Templo Cósmico (a imagem fica de reserva — celular, sem WebGL) ── */}
            <motion.div className="fixed inset-0 z-[190]" style={{ y: backgroundY }}>
                <FundoDroids png="/about/about-us-room.png" />
                <div className="absolute inset-0 z-20 bg-gradient-to-t from-[#030014] via-[#030014]/50 to-transparent" />
            </motion.div>

            {/* ── Conteúdo ── */}
            <div className="relative z-[210] flex flex-col items-center pt-[32vh] pb-[40vh] px-6 gap-[22vh]">

                {/* Hero Title */}
                <CyberTitle
                    startAnimations={true}
                    mainText={t("about.title_hero", "Construa sem limites.")}
                    secondaryText={t("about.title_secondary", "da ideia ao mundo real")}
                    scrollText={t("about.scroll_down", "role pra conhecer")}
                />

                {/* ── Card 1: Gênese (copy no bloco `about` do i18n) ── */}
                <TextBlock align="left" glowColor="cyan" direction="none" customBg="bg-black/80">
                    <h2 className="text-2xl md:text-4xl font-black text-white mb-6 tracking-tight uppercase flex items-center gap-4">
                        <span className="w-2 h-10 bg-gradient-to-b from-cyan-400 to-blue-600 rounded-full shadow-[0_0_20px_rgba(34,211,238,0.5)]" />
                        {t("about.genesis.title")}
                    </h2>
                    <p className="font-medium text-white/95">
                        {t("about.genesis.p1")}
                    </p>
                    <p className="text-white/80">
                        <span className="text-cyan-400 font-bold drop-shadow-[0_0_5px_rgba(34,211,238,0.3)]">
                            {t("about.genesis.p2")}
                        </span>
                    </p>
                </TextBlock>

                {/* ── Card 2: o que você constrói é seu ── */}
                <div ref={missionRef} className="w-full max-w-7xl flex items-center justify-end gap-16 relative">
                    <motion.div
                        style={{ x: missionX, opacity: missionOpacity }}
                        className="hidden lg:block relative w-[460px] h-[560px] rounded-[3.5rem] overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.4)] transition-all duration-700"
                    >
                        <Image
                            src="/assets/zenitta.png"
                            alt="Zaeon Agent"
                            fill
                            className="object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-900/20 to-transparent mix-blend-overlay" />
                    </motion.div>

                    <TextBlock align="right" glowColor="purple" direction="right" customBg="bg-indigo-950/80">
                        <h2 className="text-2xl md:text-4xl font-black text-white mb-6 tracking-tight uppercase flex items-center justify-end gap-4">
                            {t("about.mission.title")}
                            <span className="w-2 h-10 bg-gradient-to-b from-purple-400 to-indigo-600 rounded-full shadow-[0_0_20px_rgba(168,85,247,0.5)]" />
                        </h2>
                        <p className="text-xl md:text-3xl font-extralight italic text-white drop-shadow-md">
                            {t("about.title_main")}
                        </p>
                        <p className="text-base text-white/70 mt-4 leading-relaxed">
                            {t("about.mission.p1")}
                        </p>
                    </TextBlock>
                </div>

                {/* ── Como funciona: da ideia ao mundo real ── */}
                <ComoFunciona />

                {/* ── Molécula ── */}
                <MoleculeSection />

                {/* ── PLANOS ── */}
                <div id="planos" className="relative z-40 max-w-6xl mx-auto px-4 pb-[12vh] scroll-mt-24">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter drop-shadow-2xl">{t("about.plans.title", "Planos")}</h2>
                        <p className="text-cyan-300/70 text-sm font-bold uppercase tracking-[0.25em] mt-3">{t("about.plans.subtitle")}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {PLAN_INFO.map((p) => {
                            const featured = p.id === "plus";
                            return (
                                <div key={p.id}
                                    className={`relative rounded-[1.8rem] p-[1.5px] ${featured ? "bg-gradient-to-br from-violet-500 to-cyan-400 shadow-[0_20px_60px_-20px_rgba(34,211,238,0.6)]" : "bg-white/10"}`}>
                                    <div className="h-full rounded-[1.7rem] bg-[#0b1120]/90 backdrop-blur-2xl border border-white/5 p-6 flex flex-col">
                                        {featured && <span className="self-start mb-2 text-[9px] font-black uppercase tracking-widest text-white px-2 py-0.5 rounded-full" style={{ background: "linear-gradient(135deg,#7c3aed,#06b6d4)" }}>{t("about.plans.popular", "Mais popular")}</span>}
                                        <h3 className="text-xl font-black text-white">{p.name}</h3>
                                        <p className="text-[11px] text-white/50 uppercase tracking-widest mt-0.5">{p.tagline}</p>
                                        <div className="my-4 text-cyan-300 font-black text-lg">{p.price}</div>
                                        <ul className="flex flex-col gap-2 flex-1">
                                            {p.perks.map((perk) => (
                                                <li key={perk} className="flex items-start gap-2 text-[12px] text-white/75 leading-snug">
                                                    <span className="text-cyan-400 mt-0.5">✦</span> {perk}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Conheça a equipe (interface do PDA) ── */}
                <PdaEquipe titulo={t("about.team.title", "Conheça a equipe")} subtitulo={t("about.team.subtitle", "")} />

                {/* link discreto pra arquitetura (o antigo "quer entender a fundo") */}
                <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 1 }} className="text-center relative z-40 -mt-[14vh] pb-[6vh]">
                    <Link href="/about/about-us" className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.3em] text-cyan-400/80 hover:text-cyan-200 underline underline-offset-8 decoration-cyan-500/40 transition-colors">
                        {t("about.cta.tour_title")} →
                    </Link>
                </motion.div>
            </div>

            <style jsx global>{`
                .perspective-1000 {
                    perspective: 1000px;
                }
            `}</style>
        </div>
    );
}
