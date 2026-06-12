"use client";

import { ProFeaturePanel } from "@/components/ui/ProFeaturePanel";
import { CanonicalLaunchPanel } from "@/components/ui/CanonicalLaunchPanel";
import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
    BookOpen, ClipboardList, Activity, Users, Eye, EyeOff, 
    UserCircle, Newspaper, Library, UploadCloud, Feather, Landmark, ScrollText, X
} from 'lucide-react';
import { LoungeChatWidget } from "@/components/sub/LoungeChatWidget";

// --- 1. CONFIGURAÇÃO DE IMPORTS (MODULOS HUMANITIES) ---
const LoadingModule = () => (
    <div className="w-full h-full flex flex-col items-center justify-center text-violet-600/50 animate-pulse gap-2">
        <Library className="w-6 h-6 animate-pulse" />
        <span className="text-[10px] tracking-[0.2em] uppercase font-serif">Consulting Archives...</span>
    </div>
);

// IMPORTANTE: Ajuste os caminhos abaixo para apontar para os arquivos reais da sala Humanities
const ClassesModule = dynamic(() => import('../humanities/classes/page').then(mod => mod.default), { loading: LoadingModule });
const ExamsModule = dynamic(() => import('../humanities/exams/page').then(mod => mod.default), { loading: LoadingModule });
const CommunityModule = dynamic(() => import('../humanities/community/page').then(mod => mod.default), { loading: LoadingModule });
const ProfileModule = dynamic(() => import('../humanities/profile/page').then(mod => mod.default), { loading: LoadingModule });

// --- DADOS DAS GAVETAS (GADGETS DA BIBLIOTECA) ---
const GADGETS_LIST = [
    {
        id: "archive",
        title: "GRAND_ARCHIVE",
        icon: <Library className="w-5 h-5" />,
        items: [
            { label: "Upload Scroll", icon: <UploadCloud size={14} /> },
            { label: "Reading Room", icon: <ScrollText size={14} /> }
        ]
    }
];

// --- COMPONENTE GADGET (ODRADEK ADAPTADO PARA BIBLIOTECA) ---
interface DrawerProps {
    data: any;
    isOpen: boolean;
    onToggle: () => void;
    onAction: (actionType: string) => void;
}

const LibraryDrawer = ({ data, isOpen, onToggle, onAction }: DrawerProps) => {
    const tray1Variants = {
        closed: { x: 0, y: 0, opacity: 0, scale: 0.5, pointerEvents: "none" as const },
        open: {
            x: 70, y: -20, opacity: 1, scale: 1, pointerEvents: "auto" as const,
            transition: { type: "spring", stiffness: 200, damping: 15, delay: 0.1 }
        }
    };

    const tray2Variants = {
        closed: { x: 0, y: 0, opacity: 0, scale: 0.5, pointerEvents: "none" as const },
        open: {
            x: 90, y: 40, opacity: 1, scale: 1, pointerEvents: "auto" as const,
            transition: { type: "spring", stiffness: 200, damping: 15, delay: 0.2 }
        }
    };

    return (
        <div className="relative z-40 group/drawer">
            <motion.button
                onClick={onToggle}
                className={`relative w-12 h-12 flex items-center justify-center border rounded-xl transition-all z-50 shadow-lg 
                    bg-[#fafaf9]/90 border-violet-200 text-violet-700 hover:border-violet-400 hover:bg-violet-50
                    dark:bg-[#0c0a09]/90 dark:border-violet-600/40 dark:text-violet-500 dark:hover:bg-violet-900/30 dark:hover:border-violet-400
                `}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <div className={`absolute inset-0 bg-violet-500/10 animate-pulse rounded-xl ${isOpen ? 'opacity-100' : 'opacity-0'}`} />
                <div className={`transition-transform duration-500 ${isOpen ? 'rotate-90 text-violet-700 dark:text-violet-300' : ''}`}>
                    {data.icon}
                </div>
                <div className={`absolute top-1/2 -right-1 -translate-y-1/2 w-1.5 h-1.5 bg-violet-500 dark:bg-violet-400 rounded-full shadow-[0_0_8px_orange] transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`} />
            </motion.button>

            {/* Tray 1: Upload */}
            <motion.div
                initial="closed" animate={isOpen ? "open" : "closed"} variants={tray1Variants}
                className={`absolute top-0 left-0 w-48 border p-3 rounded-lg backdrop-blur-xl origin-left z-40
                    bg-[#fafaf9]/95 border-violet-200 shadow-xl shadow-violet-900/10
                    dark:bg-[#0c0a09]/95 dark:border-violet-600/40 dark:shadow-[0_0_20px_rgba(139, 92, 246,0.15)]
                `}
            >
                <div className="absolute top-1/2 -left-6 w-6 h-[1px] bg-violet-300 dark:bg-violet-500/50" />
                <div className="flex items-center justify-between border-b border-violet-100 dark:border-violet-500/30 pb-2 mb-2">
                    <span className="text-[9px] uppercase tracking-widest font-bold text-violet-800 dark:text-violet-500">{data.items[0].label}</span>
                    <span className="text-xs text-violet-900 dark:text-white">{data.items[0].icon}</span>
                </div>
                <button onClick={() => onAction('upload')} className="w-full flex items-center justify-center gap-2 bg-violet-50 hover:bg-violet-100 border border-violet-200 text-[9px] py-1.5 text-violet-800 uppercase transition-colors dark:bg-violet-900/20 dark:hover:bg-violet-800/40 dark:border-violet-600/40 dark:text-violet-300">
                    <UploadCloud size={12}/> Select File
                </button>
            </motion.div>

            {/* Tray 2: Reader Mode */}
            <motion.div
                initial="closed" animate={isOpen ? "open" : "closed"} variants={tray2Variants}
                className={`absolute top-0 left-0 w-48 border p-3 rounded-lg backdrop-blur-xl origin-left z-50
                    bg-[#fafaf9]/95 border-violet-200 shadow-xl shadow-violet-900/10
                    dark:bg-[#0c0a09]/95 dark:border-violet-600/40 dark:shadow-[0_0_20px_rgba(139, 92, 246,0.15)]
                `}
            >
                <div className="flex items-center justify-between border-b border-violet-100 dark:border-violet-500/30 pb-2 mb-2">
                    <span className="text-[9px] uppercase tracking-widest font-bold text-violet-800 dark:text-violet-500">{data.items[1].label}</span>
                    <span className="text-xs text-violet-900 dark:text-white">{data.items[1].icon}</span>
                </div>
                <button onClick={() => onAction('read')} className="w-full bg-violet-50 hover:bg-violet-100 border border-violet-200 text-[9px] py-1.5 text-violet-800 uppercase transition-colors dark:bg-violet-900/20 dark:hover:bg-violet-800/40 dark:border-violet-600/40 dark:text-violet-300">
                    Open Scroll
                </button>
            </motion.div>
        </div>
    );
};

export default function ZaeonHumanitiesRoom() {
    // --- ESTADOS GERAIS ---
    const [isLoaded, setIsLoaded] = useState(false);
    const [activeTab, setActiveTab] = useState("classes");
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [activeDrawer, setActiveDrawer] = useState<string | null>(null);
    
    // --- ESTADOS DO MODO LEITURA ---
    const [isReadingMode, setIsReadingMode] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement>(null);

    // --- TABS BASE ---
    const baseTabs = [
        { id: 'community', label: 'Agora', icon: <Users size={18} /> },
        { id: 'classes', label: 'Lectures', icon: <BookOpen size={18} /> },
        { id: 'exams', label: 'Assessments', icon: <ClipboardList size={18} /> },
        { id: 'projects', label: 'Essays', icon: <Feather size={18} /> },
        { id: 'research', label: 'Archives', icon: <Landmark size={18} /> },
        { id: 'news', label: 'Chronicles', icon: <Newspaper size={18} /> }, 
        { id: 'profile', label: 'Identity', icon: <UserCircle size={18} /> },
    ];

    const [tabs, setTabs] = useState(baseTabs);

    // --- COMUNICAÇÃO DE MODO FOCO COM NAVBAR GLOBAL ---
    useEffect(() => {
        window.dispatchEvent(new CustomEvent("zaeon-focus-mode", { detail: isFocusMode }));
        return () => {
            window.dispatchEvent(new CustomEvent("zaeon-focus-mode", { detail: false }));
        };
    }, [isFocusMode]);

    // --- RECUPERAR LAYOUT ---
    useEffect(() => {
        const fetchSavedOrder = async () => {
            try {
                const res = await fetch('/api/user-space');
                if (res.ok) {
                    const data = await res.json();
                    if (data?.data?.layoutState?.sidebarOrder) {
                        const savedOrder = data.data.layoutState.sidebarOrder;
                        const newTabs = savedOrder.map((id: string) => baseTabs.find(t => t.id === id)).filter(Boolean);
                        const missingTabs = baseTabs.filter(t => !savedOrder.includes(t.id));
                        setTabs([...newTabs, ...missingTabs]);
                    }
                }
            } catch (error) {
                console.error("Erro ao buscar a ordem", error);
            }
        };
        fetchSavedOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleReorder = async (newOrderTabs: any[]) => {
        setTabs(newOrderTabs);
        const sidebarOrder = newOrderTabs.map(t => t.id);
        try {
            await fetch('/api/user-space', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ layoutState: { sidebarOrder } })
            });
        } catch (error) {
            console.error("Erro ao salvar", error);
        }
    };

    // --- INIT ---
    useEffect(() => {
        const timer = setTimeout(() => setIsLoaded(true), 600);
        return () => clearTimeout(timer);
    }, []);

    // --- GADGET HANDLER ---
    const handleGadgetAction = (action: string) => {
        if (action === 'read') {
            setIsReadingMode(true);
            setIsFocusMode(true); // Foca automaticamente ao abrir leitura
            setActiveDrawer(null);
            setIsMinimized(true); // Esconde a UI principal
        } else if (action === 'upload') {
            // Simulador de clique em input file
            console.log("Abre explorador de arquivos do SO");
            alert("File Explorer Module Triggered.");
        }
    };

    // --- BACKGROUND ENGINE (DUST MOTES / PARTICULAS DE POEIRA) ---
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        window.addEventListener('resize', resize);
        resize();

        class DustMote {
            x: number; y: number; vx: number; vy: number; size: number; alpha: number;
            constructor(w: number, h: number) {
                this.x = Math.random() * w;
                this.y = Math.random() * h;
                this.vx = (Math.random() - 0.5) * 0.3;
                this.vy = (Math.random() * -0.5) - 0.1; // Flutua lentamente pra cima
                this.size = Math.random() * 2 + 0.5;
                this.alpha = Math.random() * 0.5 + 0.1;
            }
            update(w: number, h: number) {
                this.x += this.vx; this.y += this.vy;
                if (this.y < 0) this.y = h;
                if (this.x < 0) this.x = w;
                if (this.x > w) this.x = 0;
            }
            draw(ctx: CanvasRenderingContext2D) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(139, 92, 246, ${this.alpha})`; // Amber dust
                ctx.fill();
            }
        }

        let particles = Array.from({ length: 80 }, () => new DustMote(canvas.width, canvas.height));

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

    // --- STYLES HUMANITIES ---
    const cardStyle = `
        dark:bg-[rgba(22,22,34,0.55)] bg-[rgba(255,255,255,0.6)]
        backdrop-blur-[40px] backdrop-saturate-[1.8] 
        border dark:border-[rgba(255,255,255,0.12)] border-[rgba(255,255,255,0.5)]
        shadow-[0_40px_100px_-30px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.10)]
    `;

    return (
        <div className="relative w-screen h-screen overflow-hidden font-serif bg-stone-100 dark:bg-stone-950 text-stone-800 dark:text-stone-300 transition-colors duration-1000">

            {/* 1. BACKGROUND FIXO & DUST MOTES */}
            <motion.div className="absolute inset-0 z-0 pointer-events-none" animate={{ opacity: isLoaded ? 1 : 0 }} transition={{ duration: 1 }}>
                <div className="absolute top-16 bottom-0 left-0 w-1/3 border-r border-violet-200/50 dark:border-white/5 bg-transparent">
                    {/* Substitua pela imagem da sala de humanidades */}
                    <Image src="/assets/humanities-room.png" alt="Library" fill className="object-cover object-center opacity-40 dark:opacity-50 mix-blend-multiply dark:mix-blend-overlay" priority />
                    <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-stone-100 dark:from-stone-950 to-transparent"></div>
                </div>
            </motion.div>
            <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

            {/* 2. MAIN UI */}
            <AnimatePresence>
                {isLoaded && (
                    <motion.div
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0, transition: { delay: 0.2, duration: 0.8 } }}
                        className={`flex items-start justify-start px-4 gap-6 w-full h-full relative z-10 transition-all duration-700 ${isFocusMode ? 'pt-4' : 'pt-32'}`}
                    >
                        {/* SIDEBAR DUPLA */}
                        <div className="flex gap-4 h-full relative z-20">
                            
                            {/* SIDEBAR PRINCIPAL */}
                            <motion.aside
                                layout
                                className={`rounded-[2.5rem] ${cardStyle} transition-all duration-500 flex flex-col items-center py-6 gap-4 w-12 ${isFocusMode ? 'h-[96vh]' : 'h-[70vh]'}`}
                            >
                                <Reorder.Group axis="y" values={tabs} onReorder={handleReorder} className="flex flex-col gap-2 w-full flex-1 justify-center">
                                    {tabs.map((item) => (
                                        <Reorder.Item key={item.id} value={item}>
                                            <button
                                                onClick={() => { 
                                                    setActiveTab(item.id); 
                                                    setIsMinimized(false);
                                                    setIsReadingMode(false); // Sai da leitura ao trocar aba
                                                    setActiveDrawer(null); 
                                                }}
                                                className={`flex items-center justify-center w-8 h-8 mx-auto rounded-xl transition-all relative overflow-hidden group
                                                ${activeTab === item.id && !activeDrawer && !isMinimized && !isReadingMode
                                                        ? 'bg-violet-100 dark:bg-stone-800 text-violet-800 dark:text-violet-500 shadow-lg border border-violet-300 dark:border-violet-600/30'
                                                        : 'text-stone-400 dark:text-stone-500 hover:text-violet-700 hover:bg-violet-50 hover:dark:text-violet-400 hover:dark:bg-stone-800'
                                                    }`}
                                            >
                                                <div className="shrink-0 relative z-10 flex justify-center w-full">{item.icon}</div>
                                                <span className="absolute left-full ml-4 px-2 py-1 bg-stone-800 text-white text-[9px] rounded font-sans uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                                                    {item.label}
                                                </span>
                                            </button>
                                        </Reorder.Item>
                                    ))}
                                </Reorder.Group>

                                <div className="w-full pt-4 mt-auto border-t border-violet-200 dark:border-white/10">
                                    <button
                                        onClick={() => setIsFocusMode(!isFocusMode)}
                                        className={`flex items-center justify-center w-8 h-8 mx-auto rounded-xl transition-all group relative
                                            ${isFocusMode
                                                ? 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400 border border-violet-300 dark:border-violet-500/30'
                                                : 'text-stone-400 dark:text-stone-500 hover:text-violet-700 hover:bg-violet-50 hover:dark:text-violet-400 hover:dark:bg-stone-800'
                                            }`}
                                    >
                                        <div className="shrink-0 flex justify-center w-full">
                                            {isFocusMode ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </div>
                                    </button>
                                </div>
                            </motion.aside>

                            {/* SIDEBAR GADGETS */}
                            <motion.div layout className={`flex flex-col justify-center gap-4 transition-all duration-500 ${isFocusMode ? 'h-[96vh]' : 'h-[70vh]'}`}>
                                {GADGETS_LIST.map((gadget) => (
                                    <LibraryDrawer
                                        key={gadget.id}
                                        data={gadget}
                                        isOpen={activeDrawer === gadget.id}
                                        onToggle={() => {
                                            setActiveDrawer(prev => prev === gadget.id ? null : gadget.id);
                                            setIsMinimized(true);
                                        }}
                                        onAction={handleGadgetAction}
                                    />
                                ))}
                            </motion.div>
                        </div>

                        {/* CONTENT AREA PRINCIPAL */}
                        <AnimatePresence>
                            {!isMinimized && !isReadingMode && (
                                <motion.main
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.3 } }}
                                    className={`z-10 flex-1 rounded-[3.5rem] ${cardStyle} overflow-hidden flex flex-col relative transition-all duration-700 font-sans
                                        ${isFocusMode ? 'h-[96vh]' : 'h-[82vh]'}
                                    `}
                                >
                                    <div className="p-10 pb-4 flex items-center gap-4 border-b border-violet-100 dark:border-white/5">
                                        <div
                                            onClick={() => setIsMinimized(true)}
                                            className="w-3 h-3 rounded-full bg-[#f59e0b] border border-[#d97706] shadow-sm cursor-pointer hover:bg-[#fbbf24] active:scale-95 transition-transform"
                                        />
                                        <h2 className="text-xl font-bold uppercase tracking-[0.2em] text-violet-900 dark:text-stone-200 leading-none flex items-center gap-3">
                                            <Landmark className="w-6 h-6 text-violet-600 dark:text-violet-500" />
                                            {tabs.find(t => t.id === activeTab)?.label}
                                        </h2>
                                    </div>

                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-12 pt-6 relative">
                                        <AnimatePresence mode="wait">
                                            <motion.div key={activeTab} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="h-full">
                                                {activeTab === 'news' && <CanonicalLaunchPanel target="news" />} 
                                                {activeTab === 'classes' && <ClassesModule />}
                                                {activeTab === 'exams' && <ExamsModule />}
                                                {activeTab === 'projects' && <ProFeaturePanel title="Essays" description="Ambiente de projetos colaborativos — disponível apenas no plano Pro." />}
                                                {activeTab === 'research' && <CanonicalLaunchPanel target="research" />}
                                                {activeTab === 'community' && <CommunityModule />}
                                                {activeTab === 'profile' && <ProfileModule />}
                                            </motion.div>
                                        </AnimatePresence>
                                    </div>
                                </motion.main>
                            )}
                        </AnimatePresence>

                        {/* MODO DE LEITURA PROFUNDA (ZEN READER) */}
                        <AnimatePresence>
                            {isReadingMode && (
                                <motion.main
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    className={`z-10 flex-1 rounded-[2rem] overflow-hidden flex flex-col relative transition-all duration-700 shadow-2xl h-[96vh]
                                        bg-[#fffdf8] border border-violet-200 
                                        dark:bg-[#151312] dark:border-violet-900/50
                                    `}
                                >
                                    {/* Toolbar da Leitura */}
                                    <div className="h-14 border-b border-violet-100 dark:border-stone-800/50 flex items-center justify-between px-6 bg-white/50 dark:bg-black/20 backdrop-blur-md font-sans">
                                        <div className="flex items-center gap-3">
                                            <ScrollText className="w-5 h-5 text-violet-600 dark:text-violet-500" />
                                            <span className="text-xs font-bold tracking-widest uppercase text-violet-900 dark:text-stone-300">
                                                Document_V1.pdf
                                            </span>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                setIsReadingMode(false);
                                                setIsMinimized(false);
                                                setIsFocusMode(false); // Desativa o foco ao sair
                                            }}
                                            className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-stone-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                                        >
                                            <X size={14} /> Close Reader
                                        </button>
                                    </div>

                                    {/* Área de Leitura do Arquivo (Mock) */}
                                    <div className="flex-1 overflow-y-auto p-16 flex justify-center custom-scrollbar">
                                        <div className="max-w-2xl w-full">
                                            <h1 className="text-4xl font-serif font-bold text-violet-950 dark:text-stone-100 mb-8 leading-tight">
                                                A Crítica da Razão Pura: Arquivos Selecionados
                                            </h1>
                                            <p className="text-lg font-serif leading-loose text-stone-700 dark:text-stone-400 mb-6 text-justify">
                                                O leitor é convidado a experimentar o texto sem distrações. Este módulo é desenhado especificamente para isolar o conteúdo do documento, removendo qualquer ruído da interface principal do sistema.
                                            </p>
                                            <p className="text-lg font-serif leading-loose text-stone-700 dark:text-stone-400 mb-6 text-justify">
                                                Quando um documento é anexado pelo &ldquo;Upload Scroll&rdquo;, o sistema Zaeon OS converte o arquivo para este formato de leitura Zen, permitindo que a pesquisa acadêmica flua em harmonia com a estética clássica.
                                            </p>
                                            
                                            {/* Placeholder UI */}
                                            <div className="w-full h-64 border-2 border-dashed border-violet-200 dark:border-stone-800 rounded-xl flex items-center justify-center mt-12">
                                                <span className="text-stone-400 font-sans text-xs uppercase tracking-widest">
                                                    [ PDF / EPUB RENDERER AREA ]
                                                </span>
                                            </div>
                                        </div>
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