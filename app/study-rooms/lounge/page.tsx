"use client";

import { ProFeaturePanel } from "@/components/ui/ProFeaturePanel";
import { CanonicalLaunchPanel } from "@/components/ui/CanonicalLaunchPanel";
import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
    Terminal, Lock, XCircle,
    BookOpen, ClipboardList, Cpu, Activity,
    Users, Eye, EyeOff, UserCircle, Zap, ShieldCheck, Aperture,
    Newspaper
} from 'lucide-react';
// IMPORT DA NAVBAR REMOVIDO DAQUI
import { LoungeChatWidget } from "@/components/sub/LoungeChatWidget";

// --- 1. CONFIGURAÇÃO DE IMPORTS ---
const LoadingModule = () => (
    <div className="w-full h-full flex flex-col items-center justify-center text-violet-500/50 animate-pulse gap-2">
        <Zap className="w-5 h-5 animate-bounce" />
        <span className="text-[10px] tracking-[0.2em] uppercase font-mono">Loading Stream...</span>
    </div>
);

const ClassesModule = dynamic(() => import('./main-lounge/classes/page').then(mod => mod.default), { loading: LoadingModule });
const ExamsModule = dynamic(() => import('./main-lounge/exams/page').then(mod => mod.default), { loading: LoadingModule });
const CommunityModule = dynamic(() => import('./main-lounge/community/page').then(mod => mod.default), { loading: LoadingModule });
const ProfileModule = dynamic(() => import('./main-lounge/profile/page').then(mod => mod.default), { loading: LoadingModule });

export default function ZaeonLoungeRoom() {

    // --- ESTADOS GERAIS ---
    const [isLoaded, setIsLoaded] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Estados do Loading Imersivo
    const [loadingText, setLoadingText] = useState("SYSTEM CHECK");
    const [progress, setProgress] = useState(0);

    // --- ESTADOS DA UI ---
    const [activeTab, setActiveTab] = useState("community");
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    // Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // --- TABS (BASE INICIAL) ---
    // REQUISITO 2: News embaixo de Research
    const baseTabs = [
        { id: 'community', label: 'Lounge & Net', icon: <Users size={18} /> },
        { id: 'classes', label: 'Classes', icon: <BookOpen size={18} /> },
        { id: 'exams', label: 'Exams', icon: <ClipboardList size={18} /> },
        { id: 'projects', label: 'Projects', icon: <Cpu size={18} /> },
        { id: 'research', label: 'Research', icon: <Activity size={18} /> },
        { id: 'news', label: 'News', icon: <Newspaper size={18} /> },
        { id: 'profile', label: 'Identity', icon: <UserCircle size={18} /> },
    ];

    const [tabs, setTabs] = useState(baseTabs);

    // --- SINAL DE RÁDIO: COMUNICAÇÃO COM A NAVBAR GLOBAL ---
    useEffect(() => {
        window.dispatchEvent(new CustomEvent("zaeon-focus-mode", { detail: isFocusMode }));

        return () => {
            // Garante que a Navbar volte a aparecer se o usuário sair dessa tela
            window.dispatchEvent(new CustomEvent("zaeon-focus-mode", { detail: false }));
        };
    }, [isFocusMode]);

    // --- BUSCAR A ORDEM SALVA NO BANCO AO AUTENTICAR ---
    useEffect(() => {
        if (isAuthenticated) {
            const fetchSavedOrder = async () => {
                try {
                    const res = await fetch('/api/user-space');
                    if (res.ok) {
                        const data = await res.json();
                        // Se existir uma ordem salva dentro de layoutState
                        if (data?.data?.layoutState?.sidebarOrder) {
                            const savedOrder = data.data.layoutState.sidebarOrder;
                            // Reconstrói a array baseada na ordem dos IDs salvos
                            const newTabs = savedOrder
                                .map((id: string) => baseTabs.find(t => t.id === id))
                                .filter(Boolean);

                            // Adiciona módulos novos que não estavam na ordem salva
                            const missingTabs = baseTabs.filter(t => !savedOrder.includes(t.id));
                            setTabs([...newTabs, ...missingTabs]);
                        }
                    }
                } catch (error) {
                    console.error("Erro ao buscar a ordem da sidebar", error);
                }
            };
            fetchSavedOrder();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated]);

    // --- SALVAR A ORDEM NO BANCO QUANDO O USUÁRIO ARRASTAR ---
    // REQUISITO 3: Funcionalidade de mudar os modos ativa e funcional
    const handleReorder = async (newOrderTabs: any[]) => {
        setTabs(newOrderTabs); // Atualiza instantaneamente a tela
        const sidebarOrder = newOrderTabs.map(t => t.id); // Pega apenas os IDs

        try {
            await fetch('/api/user-space', {
                method: 'POST', // Mudado para POST para usar a rota de upsert/update padrão que você já deve ter configurada
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    layoutState: { sidebarOrder }
                })
            });
        } catch (error) {
            console.error("Erro ao salvar a nova ordem da sidebar", error);
        }
    };

    // --- 1. BOOT SEQUENCE (MÓDULOS) ---
    useEffect(() => {
        setIsLoaded(true);

        const modules = ["PROJECTS", "HUMANS", "AGENTS", "CONTRACTS", "COUNCIL"];
        let currentIndex = 0;

        const interval = setInterval(() => {
            if (currentIndex < modules.length) {
                setLoadingText(modules[currentIndex]);
                setProgress(((currentIndex + 1) / modules.length) * 100);
                currentIndex++;
            } else {
                clearInterval(interval);
                setLoadingText("LINK ESTABLISHED");
                setTimeout(() => setIsAuthenticated(true), 800);
            }
        }, 600);

        return () => clearInterval(interval);
    }, []);

    // --- 2. PHYSICS ENGINE (BACKGROUND) ---
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        window.addEventListener('resize', resize);
        resize();

        class Particle {
            x: number; y: number; vx: number; vy: number; text: string;
            constructor(text: string, w: number, h: number) {
                this.text = text;
                const minX = w * 0.35;
                this.x = Math.random() * (w - minX) + minX;
                this.y = Math.random() * h;
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = (Math.random() - 0.5) * 0.5;
            }
            update(w: number, h: number) {
                this.x += this.vx; this.y += this.vy;
                const minX = w * 0.30;
                if (this.x + 100 > w || this.x < minX) this.vx *= -1;
                if (this.y > h || this.y < 0) this.vy *= -1;
            }
            draw(ctx: CanvasRenderingContext2D) {
                ctx.fillStyle = "rgba(226, 232, 240, 0.05)";
                ctx.font = "bold 10px monospace";
                ctx.fillText(this.text, this.x, this.y);
            }
        }

        const KEYS = ["SYSTEM", "ZAEON", "NET", "DATA", "FLOW", "CORE", "BIO", "QUANTUM"];
        let particles = KEYS.map(c => new Particle(c, canvas.width, canvas.height));

        const animate = () => {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => { p.update(canvas.width, canvas.height); p.draw(ctx); });
            animationFrameId = requestAnimationFrame(animate);
        };
        animate();
        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    const cardStyle = `
        dark:bg-[rgba(22,22,34,0.55)] bg-[rgba(255,255,255,0.6)]
        backdrop-blur-[40px] backdrop-saturate-[1.8] 
        border dark:border-[rgba(255,255,255,0.12)] border-[rgba(255,255,255,0.5)]
        shadow-[0_40px_100px_-30px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.10)]
    `;

    return (
        <div className="relative w-screen h-screen overflow-hidden font-mono bg-[#e2e8f0] dark:bg-[#010816] text-slate-800 dark:text-slate-200 transition-colors duration-1000">

            {/* BACKGROUND */}
            <motion.div className="absolute inset-0 z-0 pointer-events-none" animate={{ opacity: 1 }} transition={{ duration: 1 }}>
                <div className="absolute top-16 bottom-0 left-0 w-1/3 border-r border-slate-300 dark:border-white/5 bg-transparent">
                    <Image src="/assets/computer.png" alt="Cyber Room" fill className="object-cover object-center opacity-80" priority />
                    <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#e2e8f0] dark:from-[#010816] to-transparent"></div>
                </div>
            </motion.div>
            <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

            {/* --- ULTRA COMPACT & AESTHETIC BOOT LOADER --- */}
            <AnimatePresence>
                {!isAuthenticated && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05, filter: "blur(20px)" }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl"
                    >
                        {/* WIDGET CONTAINER */}
                        <div className="relative w-[300px] bg-[#050b14] border border-violet-900/50 rounded-xl overflow-hidden shadow-[0_0_50px_-10px_rgba(34, 211, 238,0.15)] flex flex-col p-1">

                            {/* Decorative Tech Corners */}
                            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-violet-500/50 rounded-tl-lg" />
                            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-violet-500/50 rounded-tr-lg" />
                            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-violet-500/50 rounded-bl-lg" />
                            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-violet-500/50 rounded-br-lg" />

                            {/* Inner Glass */}
                            <div className="relative z-10 w-full h-full bg-violet-950/10 backdrop-blur-sm rounded-lg p-6 flex flex-col items-center">

                                {/* Header Minimal */}
                                <div className="w-full flex justify-between items-center mb-8 border-b border-violet-900/30 pb-2">
                                    <span className="text-[9px] text-violet-600 font-bold tracking-[0.2em]">INIT_ENGINE.V4</span>
                                    <div className="flex gap-1">
                                        <div className="w-1 h-1 bg-violet-500 rounded-full animate-ping" />
                                        <div className="w-1 h-1 bg-violet-800 rounded-full" />
                                        <div className="w-1 h-1 bg-violet-900 rounded-full" />
                                    </div>
                                </div>

                                {/* Mechanical Loader */}
                                <div className="relative w-20 h-20 flex items-center justify-center mb-8">
                                    {/* Outer Ring */}
                                    <div className="absolute inset-0 border border-dashed border-violet-800/60 rounded-full animate-[spin_10s_linear_infinite]" />

                                    {/* Middle Ring (Reverse) */}
                                    <div className="absolute inset-2 border-2 border-t-transparent border-l-violet-500/80 border-r-transparent border-b-violet-500/20 rounded-full animate-[spin_2s_linear_infinite_reverse]" />

                                    {/* Inner Ring (Fast) */}
                                    <div className="absolute inset-5 border border-violet-400/40 rounded-full animate-pulse" />

                                    {/* Icon */}
                                    <Aperture className="w-6 h-6 text-violet-400 animate-[spin_4s_linear_infinite]" />
                                </div>

                                {/* Dynamic Text */}
                                <div className="flex flex-col items-center gap-1 h-10">
                                    <span className="text-[8px] text-violet-700 uppercase font-mono">Loading Module</span>
                                    <AnimatePresence mode="wait">
                                        <motion.span
                                            key={loadingText}
                                            initial={{ opacity: 0, y: 5, filter: "blur(4px)" }}
                                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                            exit={{ opacity: 0, y: -5, filter: "blur(4px)" }}
                                            className="text-sm font-black text-violet-100 tracking-[0.3em] uppercase drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                                        >
                                            {loadingText}
                                        </motion.span>
                                    </AnimatePresence>
                                </div>

                                {/* Slim Progress Bar */}
                                <div className="w-full mt-6 flex flex-col gap-1">
                                    <div className="flex justify-between text-[8px] text-violet-800 font-mono">
                                        <span>PROGRESS</span>
                                        <span>{Math.round(progress)}%</span>
                                    </div>
                                    <div className="w-full h-[2px] bg-violet-950 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-violet-400 shadow-[0_0_10px_#22d3ee]"
                                            animate={{ width: `${progress}%` }}
                                            transition={{ ease: "circOut", duration: 0.5 }}
                                        />
                                    </div>
                                </div>

                            </div>

                            {/* Scanline Overlay */}
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-20 bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 4. MAIN UI */}
            <AnimatePresence>
                {isAuthenticated && (
                    <motion.div
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0, transition: { delay: 0.2, duration: 0.8 } }}
                        className={`flex items-start justify-start px-4 gap-6 w-full h-full relative z-10 transition-all duration-700 ${isFocusMode ? 'pt-4' : 'pt-32'}`}
                    >
                        {/* SIDEBAR */}
                        {/* REQUISITO 1: w-12 fixo (sem isSidebarExpanded) */}
                        <motion.aside
                            layout
                            className={`z-20 rounded-[2.5rem] ${cardStyle} transition-all duration-500 flex flex-col items-center py-6 gap-4 w-12 ${isFocusMode ? 'h-[96vh]' : 'h-[70vh]'}`}
                        >
                            <Reorder.Group axis="y" values={tabs} onReorder={handleReorder} className="flex flex-col gap-2 w-full flex-1 justify-center">
                                {tabs.map((item) => (
                                    <Reorder.Item key={item.id} value={item}>
                                        {/* A tooltip que aparece no hover foi mantida para usabilidade, já que a sidebar é fixa em tamanho mínimo */}
                                        <button
                                            onClick={() => { setActiveTab(item.id); setIsMinimized(false); }}
                                            className={`flex items-center justify-center w-8 h-8 mx-auto rounded-xl transition-all relative overflow-hidden group
                                            ${activeTab === item.id
                                                    ? 'dark:bg-white/10 bg-[#0f172a] text-white shadow-lg border dark:border-white/10 border-transparent'
                                                    : 'dark:text-white/40 text-slate-500 hover:dark:text-white hover:text-[#0f172a]'
                                                }`}
                                        >
                                            <div className="shrink-0 relative z-10 flex justify-center w-full">{item.icon}</div>
                                            {/* Tooltip para mostrar o nome da aba já que a sidebar não expande mais */}
                                            <span className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-[9px] rounded font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                                                {item.label}
                                            </span>
                                        </button>
                                    </Reorder.Item>
                                ))}
                            </Reorder.Group>

                            <div className="w-full pt-4 mt-auto border-t dark:border-white/10 border-black/5">
                                <button
                                    onClick={() => setIsFocusMode(!isFocusMode)}
                                    className={`flex items-center justify-center w-8 h-8 mx-auto rounded-xl transition-all group relative
                                        ${isFocusMode
                                            ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                                            : 'dark:text-white/40 text-slate-500 hover:dark:text-white hover:text-[#0f172a]'
                                        }`}
                                >
                                    <div className="shrink-0 flex justify-center w-full">
                                        {isFocusMode ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </div>
                                    <span className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-[9px] rounded font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                                        {isFocusMode ? "Exit" : "Focus"}
                                    </span>
                                </button>
                            </div>
                        </motion.aside>

                        {/* CONTENT AREA */}
                        <AnimatePresence>
                            {!isMinimized && (
                                <motion.main
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.3 } }}
                                    className={`z-10 flex-1 rounded-[3.5rem] ${cardStyle} overflow-hidden flex flex-col relative transition-all duration-700
                                        ${isFocusMode ? 'h-[96vh]' : 'h-[82vh]'}
                                    `}
                                >
                                    {/* HEADER DA JANELA (ESTILO MAC) */}
                                    <div className="p-10 pb-4 flex items-center gap-4 border-b dark:border-white/5 border-black/5">
                                        <div
                                            onClick={() => setIsMinimized(true)}
                                            className="w-3 h-3 rounded-full bg-[#f59e0b] border border-[#d97706] shadow-sm cursor-pointer hover:bg-[#fbbf24] active:scale-95 transition-transform"
                                            title="Minimize Window"
                                        />
                                        <h2 className="text-xl font-black uppercase tracking-[0.3em] dark:text-white text-[#0f172a] leading-none flex items-center gap-3">
                                            {tabs.find(t => t.id === activeTab)?.label}
                                        </h2>
                                    </div>

                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-12 pt-6 relative">
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={activeTab}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 10 }}
                                                transition={{ duration: 0.2 }}
                                                className="h-full"
                                            >
                                                {/* MÓDULOS CARREGADOS DINAMICAMENTE */}
                                                {activeTab === 'news' && <CanonicalLaunchPanel target="news" />}
                                                {activeTab === 'classes' && <ClassesModule />}
                                                {activeTab === 'exams' && <ExamsModule />}
                                                {activeTab === 'projects' && <ProFeaturePanel title="Projects" description="Ambiente de projetos colaborativos — disponível apenas no plano Pro." />}
                                                {activeTab === 'research' && <CanonicalLaunchPanel target="research" />}
                                                {activeTab === 'community' && <CommunityModule />}
                                                {activeTab === 'profile' && <ProfileModule />}
                                            </motion.div>
                                        </AnimatePresence>
                                    </div>
                                </motion.main>
                            )}
                        </AnimatePresence>

                        <div className="relative z-50">
                            <LoungeChatWidget />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}