"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { CpuChipIcon, ArrowLeftIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import MacSplash from "@/components/ui/MacSplash"; // Importamos o Splash aqui

// --- LÓGICA DE SCRAMBLE (Mantida exatamente como a sua) ---
const CHAR_POOL = ["紀", "律", "知", "識", "未", "来", "革", "新", "卓", "越", "智", "慧", "教", "育"];

const useScrambleText = (targetText: string, start: boolean) => {
    const [displayText, setDisplayText] = useState("");
    const [isComplete, setIsComplete] = useState(false);
    const stateRef = useRef<'idle' | 'scrambling' | 'resolving' | 'holding'>('idle');
    const startTimeRef = useRef<number>(0);
    const lastStateChangeTimeRef = useRef<number>(0);
    const animationFrameRef = useRef<number>();

    const animate = useCallback((timestamp: number) => {
        if (!start) return;
        if (!startTimeRef.current) startTimeRef.current = timestamp;
        if (lastStateChangeTimeRef.current === 0) lastStateChangeTimeRef.current = timestamp;

        const elapsedInCurrentState = timestamp - lastStateChangeTimeRef.current;

        switch (stateRef.current) {
            case 'idle':
                stateRef.current = 'scrambling';
                lastStateChangeTimeRef.current = timestamp;
                break;
            case 'scrambling':
                if (elapsedInCurrentState >= 3000) {
                    stateRef.current = 'resolving';
                    lastStateChangeTimeRef.current = timestamp;
                } else {
                    setDisplayText(targetText.split("").map(c => c === " " ? " " : CHAR_POOL[Math.floor(Math.random() * CHAR_POOL.length)]).join(""));
                }
                break;
            case 'resolving':
                const progress = Math.min(elapsedInCurrentState / 2000, 1);
                const resolved = targetText.split("").map((char, i) => i < targetText.length * progress ? char : (char === " " ? " " : CHAR_POOL[Math.floor(Math.random() * CHAR_POOL.length)])).join("");
                setDisplayText(resolved);
                if (progress === 1) {
                    stateRef.current = 'holding';
                    lastStateChangeTimeRef.current = timestamp;
                    setIsComplete(true);
                }
                break;
            case 'holding':
                if (elapsedInCurrentState >= 3000) {
                    stateRef.current = 'scrambling';
                    lastStateChangeTimeRef.current = timestamp;
                    setIsComplete(false);
                }
                break;
        }
        animationFrameRef.current = requestAnimationFrame(animate);
    }, [targetText, start]);

    useEffect(() => {
        if (start) animationFrameRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrameRef.current!);
    }, [animate, start]);

    return { displayText, isComplete };
};

// --- COMPONENTES AUXILIARES (Mantidos originais) ---
const CyberTitle = ({ mainText, secondaryText, scrollText, startAnimations }: any) => {
    const { displayText: sText, isComplete: sDone } = useScrambleText(secondaryText, startAnimations);
    const { displayText: mText, isComplete: mDone } = useScrambleText(mainText, startAnimations);

    return (
        <div className="text-center mb-16 relative z-20 min-h-[200px] flex flex-col justify-center">
            <h2 className="text-lg md:text-2xl font-medium tracking-[0.2em] mb-3 font-mono uppercase h-8">
                <span className={`${sDone ? "text-cyan-400/90" : "text-white/40"} transition-all duration-1000`}>{sText}</span>
            </h2>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter text-white font-mono uppercase h-24">
                <span className={`${mDone ? "text-white drop-shadow-[0_0_20px_rgba(34,211,238,0.7)]" : "text-white/30"}`}>{mText}</span>
            </h1>
            <div className="mt-10 flex flex-col items-center gap-3">
                <span className="text-cyan-400 font-bold text-xs uppercase tracking-[0.4em] animate-pulse">{scrollText}</span>
                <ChevronDownIcon className="w-5 h-5 text-cyan-500/70" />
            </div>
        </div>
    );
};

const TextBlock = ({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" | "center" }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: false, margin: "-10% 0px" });
    const alignClass = align === "left" ? "items-start text-left" : align === "right" ? "items-end text-right ml-auto" : "items-center text-center mx-auto";
    return (
        <motion.div ref={ref} initial={{ opacity: 0, y: 40 }} animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }} className={`flex flex-col ${alignClass} max-w-4xl w-full p-10 rounded-[2.5rem] backdrop-blur-2xl bg-black/70 border border-white/10 shadow-2xl relative overflow-hidden`}>
            <div className="relative z-10 space-y-6 text-slate-300 leading-relaxed font-light text-lg md:text-xl">{children}</div>
        </motion.div>
    );
};

// --- PÁGINA PRINCIPAL ---
export default function AboutUsPage() {
    const { t, i18n } = useTranslation();
    const [mounted, setMounted] = useState(false);
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({ target: containerRef });
    const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);
    const [startAnimations, setStartAnimations] = useState(false);
    const [isAtTop, setIsAtTop] = useState(true);

    useEffect(() => {
        setMounted(true);
        const handleScroll = () => setIsAtTop(window.scrollY < 80);
        window.addEventListener("scroll", handleScroll);
        setTimeout(() => setStartAnimations(true), 1500);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // BARREIRA ANTI-BUG: Se o i18n não estiver pronto, mostramos o Splash.
    // Isso evita o erro de "NO_I18NEXT_INSTANCE" e o delay de 7 segundos.
    if (!mounted || !i18n.isInitialized) {
        return <MacSplash minDurationMs={1500} />;
    }

    return (
        <div ref={containerRef} className={`relative min-h-[400vh] bg-[#030014] overflow-hidden font-sans transition-all duration-700 ${isAtTop ? 'z-0' : 'z-[200]'}`}>

            {/* BOTÃO VOLTAR */}
            <button onClick={() => window.history.back()} className="fixed top-28 left-10 z-[300] flex items-center gap-3 text-white/40 hover:text-cyan-400 group">
                <div className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center backdrop-blur-xl bg-white/5 transition-all">
                    <ArrowLeftIcon className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                </div>
                <span className="text-[10px] uppercase tracking-[0.2em] font-black opacity-0 group-hover:opacity-100 transition-opacity">{t('about.back')}</span>
            </button>

            {/* FUNDO FIXO */}
            <motion.div className="fixed inset-0 z-[190]" style={{ y: backgroundY }}>
                <Image src="/about/about-us-room.png" alt="Zaeon Facility" fill priority className="object-cover" />
                <div className="absolute inset-0 z-20 bg-gradient-to-t from-[#030014] via-[#030014]/80 to-transparent" />
            </motion.div>

            {/* CONTEÚDO (Suas seções originais) */}
            <div className="relative z-[210] flex flex-col items-center pt-[32vh] pb-[40vh] px-6 gap-[45vh]">
                <CyberTitle startAnimations={startAnimations} secondaryText={t('about.title_secondary')} mainText={t('about.title_main')} scrollText={t('about.scroll_down')} />

                <TextBlock align="left">
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 tracking-wide uppercase flex items-center gap-3">
                        <span className="w-1.5 h-8 bg-cyan-500 shadow-[0_0_20px_cyan]"></span>
                        {t('about.genesis.title')}
                    </h2>
                    <p>{t('about.genesis.p1')}</p>
                    <p>{t('about.genesis.p2')} <span className="text-cyan-300 font-semibold">{t('about.genesis.p2_highlight')}</span></p>
                </TextBlock>

                <TextBlock align="right">
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 tracking-wide uppercase flex items-center justify-end gap-3">
                        {t('about.mission.title')}
                        <span className="w-1.5 h-8 bg-purple-500 shadow-[0_0_20px_purple]"></span>
                    </h2>
                    <p>{t('about.mission.p1')}</p>
                    <p>{t('about.mission.p2')}</p>
                </TextBlock>

                <TextBlock align="center">
                    <CpuChipIcon className="w-12 h-12 text-cyan-400 mx-auto mb-6 animate-pulse" />
                    <h2 className="text-3xl md:text-4xl font-black text-white mb-8 tracking-tight uppercase text-center">{t('about.architecture.title')}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full">
                        <div className="bg-white/5 p-8 rounded-3xl border border-white/5 hover:bg-white/10 transition-colors">
                            <h3 className="text-cyan-300 font-bold mb-3 text-lg">{t('about.architecture.card1_t')}</h3>
                            <p className="text-sm text-slate-400">{t('about.architecture.card1_d')}</p>
                        </div>
                        <div className="bg-white/5 p-8 rounded-3xl border border-white/5 hover:bg-white/10 transition-colors">
                            <h3 className="text-purple-300 font-bold mb-3 text-lg">{t('about.architecture.card2_t')}</h3>
                            <p className="text-sm text-slate-400">{t('about.architecture.card2_d')}</p>
                        </div>
                        <div className="bg-white/5 p-8 rounded-3xl border border-white/5 hover:bg-white/10 transition-colors">
                            <h3 className="text-green-300 font-bold mb-3 text-lg">{t('about.architecture.card3_t')}</h3>
                            <p className="text-sm text-slate-400">{t('about.architecture.card3_d')}</p>
                        </div>
                    </div>
                </TextBlock>

                <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="text-center relative z-40 pb-[10vh]">
                    <h2 className="text-4xl md:text-6xl font-black text-white mb-12">{t('about.cta.join')}</h2>
                    <button onClick={() => window.location.assign('/signup')} className="px-14 py-5 bg-gradient-to-r from-cyan-600 to-blue-700 rounded-full text-white font-black uppercase tracking-widest hover:shadow-[0_0_50px_rgba(34,211,238,0.4)] transition-all duration-500 hover:scale-105">
                        {t('about.cta.button')}
                    </button>
                </motion.div>
            </div>
        </div>
    );
}