"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { CpuChipIcon, ArrowLeftIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

// Pool de caracteres significativos (Valores Zaeon)
const CHAR_POOL = ["紀", "律", "知", "識", "未", "来", "革", "新", "卓", "越", "智", "慧", "教", "育"];

// --- HOOK DE SCRAMBLE ---
const useScrambleText = (
    targetText: string,
    start: boolean,
    scrambleDuration: number = 3000,
    resolveDuration: number = 2000,
    holdDuration: number = 3000,
    initialDelay: number = 0
) => {
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

        const totalElapsed = timestamp - startTimeRef.current;
        const elapsedInCurrentState = timestamp - lastStateChangeTimeRef.current;

        if (totalElapsed < initialDelay) {
            animationFrameRef.current = requestAnimationFrame(animate);
            return;
        }

        switch (stateRef.current) {
            case 'idle':
                stateRef.current = 'scrambling';
                lastStateChangeTimeRef.current = timestamp;
                setIsComplete(false);
                break;
            case 'scrambling':
                if (elapsedInCurrentState >= scrambleDuration) {
                    stateRef.current = 'resolving';
                    lastStateChangeTimeRef.current = timestamp;
                } else {
                    const scrambled = targetText.split("").map((char) => {
                        if (char === " " || char === ".") return char;
                        return CHAR_POOL[Math.floor(Math.random() * CHAR_POOL.length)];
                    }).join("");
                    setDisplayText(scrambled);
                }
                break;
            case 'resolving':
                const resolveProgress = Math.min(elapsedInCurrentState / resolveDuration, 1);
                const charsToResolve = Math.floor(targetText.length * resolveProgress);
                const resolved = targetText.split("").map((char, index) => {
                    if (index < charsToResolve) return char;
                    if (char === " " || char === ".") return char;
                    return CHAR_POOL[Math.floor(Math.random() * CHAR_POOL.length)];
                }).join("");
                setDisplayText(resolved);
                if (resolveProgress === 1) {
                    stateRef.current = 'holding';
                    lastStateChangeTimeRef.current = timestamp;
                    setIsComplete(true);
                }
                break;
            case 'holding':
                if (elapsedInCurrentState >= holdDuration) {
                    stateRef.current = 'scrambling';
                    lastStateChangeTimeRef.current = timestamp;
                    setIsComplete(false);
                }
                break;
        }
        animationFrameRef.current = requestAnimationFrame(animate);
    }, [targetText, start, scrambleDuration, resolveDuration, holdDuration, initialDelay]);

    useEffect(() => {
        if (start) animationFrameRef.current = requestAnimationFrame(animate);
        else setDisplayText("");
        return () => animationFrameRef.current && cancelAnimationFrame(animationFrameRef.current);
    }, [animate, start]);

    return { displayText, isComplete };
};

// --- TÍTULO ANIMADO ---
const CyberTitle = ({ mainText, secondaryText, startAnimations }: { mainText: string, secondaryText: string, startAnimations: boolean }) => {
    const { displayText: sText, isComplete: sDone } = useScrambleText(secondaryText, startAnimations, 3500, 1500, 3000, 0);
    const { displayText: mText, isComplete: mDone } = useScrambleText(mainText, startAnimations, 4500, 2000, 3000, 1000);

    return (
        <div className="text-center mb-16 relative z-20 min-h-[200px] flex flex-col justify-center">
            <h2 className="text-lg md:text-2xl font-medium tracking-[0.2em] mb-3 font-mono uppercase h-8">
                 <span className={`${sDone ? "text-cyan-400/90" : "text-white/40"} transition-all duration-1000`}>
                    {sText}
                </span>
            </h2>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter text-white relative font-mono uppercase leading-[1.1] h-20 md:h-24">
                <span className={`${mDone ? "text-white drop-shadow-[0_0_20px_rgba(34,211,238,0.7)]" : "text-white/30"} transition-all duration-1000`}>
                    {mText}
                </span>
                {startAnimations && !mDone && <span className="animate-pulse text-cyan-400 inline-block ml-1">_</span>}
            </h1>
            <motion.div className="flex flex-col items-center mt-10" initial={{ opacity: 0 }} animate={startAnimations ? { opacity: 1 } : { opacity: 0 }} transition={{ duration: 1, delay: 2 }}>
                <div className="h-[1px] w-32 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
                <div className="mt-8 flex flex-col items-center gap-3">
                    <span className="text-cyan-400 font-bold text-[11px] md:text-xs uppercase tracking-[0.4em] drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] animate-pulse">
                        deslize para baixo pra saber tudo
                    </span>
                    <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
                        <ChevronDownIcon className="w-5 h-5 text-cyan-500/70" />
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
};

const TextBlock = ({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" | "center" }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: false, margin: "-10% 0px" });
    const alignClass = align === "left" ? "items-start text-left" : align === "right" ? "items-end text-right ml-auto" : "items-center text-center mx-auto";
    return (
        <motion.div ref={ref} initial={{ opacity: 0, y: 40 }} animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }} transition={{ duration: 0.8 }} className={`flex flex-col ${alignClass} max-w-4xl w-full p-10 rounded-[2.5rem] backdrop-blur-2xl bg-black/70 border border-white/10 shadow-2xl relative overflow-hidden`}>
            <div className="relative z-10 space-y-6 text-slate-300 leading-relaxed font-light text-lg md:text-xl">{children}</div>
        </motion.div>
    );
};

export default function AboutUsPage() {
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({ target: containerRef });
    const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);

    const [startAnimations, setStartAnimations] = useState(false);
    const [isAtTop, setIsAtTop] = useState(true);

    useEffect(() => {
        // Controle de Scroll para habilitar o menu superior no topo
        const handleScroll = () => {
            if (window.scrollY < 80) setIsAtTop(true);
            else setIsAtTop(false);
        };
        window.addEventListener("scroll", handleScroll);

        // Atraso para garantir que a imagem apareça antes do texto começar a rolar
        const timer = setTimeout(() => setStartAnimations(true), 2500);

        return () => {
            window.removeEventListener("scroll", handleScroll);
            clearTimeout(timer);
        };
    }, []);

    return (
        <div
            ref={containerRef}
            // LÓGICA DE DESBLOQUEIO: No topo z-0 (clicável), ao rolar z-[200] (imersivo)
            className={`relative min-h-[400vh] bg-[#030014] overflow-hidden font-sans transition-all duration-700 ${isAtTop ? 'z-0' : 'z-[200]'}`}
        >
            {/* BOTÃO VOLTAR */}
            <button onClick={() => window.history.back()} className="fixed top-28 left-10 z-[300] flex items-center gap-3 text-white/40 hover:text-cyan-400 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center group-hover:border-cyan-500/40 backdrop-blur-xl bg-white/5 transition-all">
                    <ArrowLeftIcon className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                </div>
                <span className="text-[10px] uppercase tracking-[0.2em] font-black opacity-0 group-hover:opacity-100 transition-opacity">Voltar</span>
            </button>

            {/* FUNDO FIXO */}
            <motion.div className="fixed inset-0 z-[190]" style={{ y: backgroundY }}>
                <Image src="/about/about-us-room.png" alt="Zaeon Facility" fill priority className="object-cover" quality={100} />
                <motion.div initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 1.5, delay: 0.2 }} className="absolute inset-0 z-10 bg-[#030014]" />
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.85 }} transition={{ duration: 2, delay: 3.5 }} className="absolute inset-0 z-20 bg-gradient-to-t from-[#030014] via-[#030014]/80 to-transparent" />
                <div className="absolute inset-0 z-30 bg-[url('/scanlines.png')] opacity-[0.02] pointer-events-none"></div>
            </motion.div>

            {/* CONTEÚDO */}
            <div className="relative z-[210] flex flex-col items-center pt-[32vh] pb-[40vh] px-6 gap-[45vh]">
                <CyberTitle
                    startAnimations={startAnimations}
                    secondaryText="A escola do futuro."
                    mainText="ACONTECENDO AGORA."
                />

                <TextBlock align="left">
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 tracking-wide uppercase flex items-center gap-3">
                        <span className="w-1.5 h-8 bg-cyan-500 shadow-[0_0_20px_cyan]"></span>
                        A Gênese do Protocolo
                    </h2>
                    <p>Hoje, nossa atenção é roubada por grandes empresas que buscam apenas o lucro, roubando a atenção de milhões enquanto seus algoritmos destróem a inteligência humana.</p>
                    <p>A Zaeon surge para mudar isso: viemos resgatar o prazer de aprender novamente: Com profundidade, modernidade e diversão. Enquanto o ensino tradicional parou no tempo e não acompanha a tecnologia, nós destravamos o seu verdadeiro potencial através de Agentes de IA poderosos. Aqui, humanos e máquinas irão trabalhar por um mundo melhor <span className="text-cyan-300 font-semibold">dentro da Blockchain</span>.</p>
                </TextBlock>

                <TextBlock align="right">
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 tracking-wide uppercase flex items-center justify-end gap-3">
                        Nossa Missão
                        <span className="w-1.5 h-8 bg-purple-500 shadow-[0_0_20px_purple]"></span>
                    </h2>
                    <p>Capacitar a próxima geração de arquitetos da realidade.</p>
                    <p>Utilizamos a tecnologia Movement EVM para criar registros imutáveis de aprendizado. Aqui, seu diploma não é um papel; é um contrato inteligente, uma prova criptográfica do seu domínio sobre a tecnologia, a saúde ou a matemática.</p>
                    <p className="text-white/60 text-sm italic border-l-2 border-purple-500/50 pl-4 mt-4">"O conhecimento não deve apenas ser adquirido, deve ser assegurado."</p>
                </TextBlock>

                <TextBlock align="center">
                    <CpuChipIcon className="w-12 h-12 text-cyan-400 mx-auto mb-6 animate-pulse" />
                    <h2 className="text-3xl md:text-4xl font-black text-white mb-8 tracking-tight uppercase text-center">A Arquitetura Zaeon</h2>
                    <p className="text-xl text-center mb-8">Mais do que salas de aula, construímos nós de processamento neural.</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full">
                        <div className="bg-white/5 p-8 rounded-3xl border border-white/5 hover:bg-white/10 transition-colors">
                            <h3 className="text-cyan-300 font-bold mb-3 text-lg">Agentes Neurais</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">Zenita, Ballena e Ethernaut não são chatbots. São mentores especialistas treinados em bases de conhecimento verticais para maximizar seu potencial.</p>
                        </div>
                        <div className="bg-white/5 p-8 rounded-3xl border border-white/5 hover:bg-white/10 transition-colors">
                            <h3 className="text-purple-300 font-bold mb-3 text-lg">Movement EVM</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">A blockchain de alta performance que garante que cada insight gerado na sua Workstation seja sua propriedade intelectual eterna e transferível.</p>
                        </div>
                        <div className="bg-white/5 p-8 rounded-3xl border border-white/5 hover:bg-white/10 transition-colors">
                            <h3 className="text-green-300 font-bold mb-3 text-lg">Estudo Híbrido</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">Ambientes digitais com baixa latência onde a colaboração global acontece em tempo real, protegida por criptografia de ponta a ponta.</p>
                        </div>
                    </div>
                </TextBlock>

                <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="text-center relative z-40 pb-[10vh]">
                    <p className="text-slate-400 uppercase tracking-[0.5em] text-sm mb-8">O futuro aguarda sua conexão</p>
                    <h2 className="text-4xl md:text-6xl font-black text-white mb-12">Junte-se à Vanguarda.</h2>
                    <button onClick={() => window.location.assign('/signup')} className="px-14 py-5 bg-gradient-to-r from-cyan-600 to-blue-700 rounded-full text-white font-black uppercase tracking-widest hover:shadow-[0_0_50px_rgba(34,211,238,0.4)] transition-all duration-500 hover:scale-105">Iniciar Protocolo</button>
                </motion.div>
            </div>
        </div>
    );
}