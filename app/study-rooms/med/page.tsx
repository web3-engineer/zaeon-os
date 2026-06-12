"use client";

import { ProFeaturePanel } from "@/components/ui/ProFeaturePanel";
import { CanonicalLaunchPanel } from "@/components/ui/CanonicalLaunchPanel";
import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
    Activity, BookOpen, ClipboardList, Stethoscope, 
    Users, Eye, EyeOff, UserCircle, Newspaper, HeartPulse, Cross
} from 'lucide-react';
import { LoungeChatWidget } from "@/components/sub/LoungeChatWidget";

// --- 1. CONFIGURAÇÃO DE IMPORTS (MODULOS MEDLAB) ---
const LoadingModule = () => (
    <div className="w-full h-full flex flex-col items-center justify-center text-violet-500/50 animate-pulse gap-2">
        <HeartPulse className="w-6 h-6 animate-ping" />
        <span className="text-[10px] tracking-[0.2em] uppercase font-mono">Loading Med-Stream...</span>
    </div>
);

const ClassesModule = dynamic(() => import('../med/classes/page').then(mod => mod.default), { loading: LoadingModule });
const ExamsModule = dynamic(() => import('../med/exams/page').then(mod => mod.default), { loading: LoadingModule });
const CommunityModule = dynamic(() => import('../med/community/page').then(mod => mod.default), { loading: LoadingModule });
const ProfileModule = dynamic(() => import('../med/profile/page').then(mod => mod.default), { loading: LoadingModule });

export default function ZaeonMedLabRoom() {

    // --- ESTADOS GERAIS ---
    const [isLoaded, setIsLoaded] = useState(false);
    
    // NOVO: Estado que controla quando a UI principal deve aparecer
    const [showUI, setShowUI] = useState(false); 
    const hasTriggeredUIRef = useRef(false);

    // --- ESTADOS DA UI ---
    const [activeTab, setActiveTab] = useState("classes");
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement>(null);

    // --- TABS BASE ---
    const baseTabs = [
        { id: 'community', label: 'Network', icon: <Users size={18} /> },
        { id: 'classes', label: 'Classes', icon: <BookOpen size={18} /> },
        { id: 'exams', label: 'Exams', icon: <ClipboardList size={18} /> },
        { id: 'projects', label: 'Clinical', icon: <Stethoscope size={18} /> },
        { id: 'research', label: 'Research', icon: <Activity size={18} /> },
        { id: 'news', label: 'Journals', icon: <Newspaper size={18} /> }, 
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

    // --- RECUPERAR LAYOUT DO USUÁRIO ---
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

    // --- INIT DO FUNDO ---
    useEffect(() => {
        // Reduzido para o fundo aparecer rapidamente e preparar o palco
        const timer = setTimeout(() => setIsLoaded(true), 100);
        return () => clearTimeout(timer);
    }, []);

    // --- ENGINE DE ECG / HOLTER (BACKGROUND CANVA) ---
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        
        const resize = () => { 
            canvas.width = window.innerWidth; 
            canvas.height = window.innerHeight; 
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        };
        window.addEventListener('resize', resize);
        resize();

        let x = 0;
        const speed = 3.5; // Levemente mais rápido para um fluxo natural
        const centerY = canvas.height / 2 + 50;
        
        const beatPattern = [
            0, 0, 0, 0, 0, -10, -15, -10, 0, 0, 0, 0, 
            10, 20, 
            -120, -150, -120, 
            40, 30, 0, 0, 0, 0, 
            -20, -25, -20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 
        ];
        
        let beatIndex = 0;
        let isBeating = false;
        let lastY = centerY;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const animate = () => {
            if (!ctx || !canvas) return;

            ctx.clearRect(x + 2, 0, 80, canvas.height);

            ctx.beginPath();
            ctx.moveTo(x, lastY);

            if (!isBeating && Math.random() < 0.02 && x % 200 < 50) {
                isBeating = true;
                beatIndex = 0;
            }

            let nextY = centerY;

            if (isBeating) {
                nextY = centerY + beatPattern[beatIndex];
                beatIndex++;
                if (beatIndex >= beatPattern.length) {
                    isBeating = false;
                }
            }

            nextY += (Math.random() - 0.5) * 4;
            x += speed;

            // NOVO: Gatilho de Cinematografia (Quando chegar em 45% da tela)
            if (!hasTriggeredUIRef.current && x >= canvas.width * 0.45) {
                hasTriggeredUIRef.current = true;
                setShowUI(true); // Dispara o surgimento suave da interface
            }

            ctx.lineTo(x, nextY);
            
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#8b5cf6'; 
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#22d3ee';
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(x, nextY, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#8b5cf6';
            ctx.fill();

            lastY = nextY;

            if (x >= canvas.width) {
                x = 0;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }

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
        <div className="relative w-screen h-screen overflow-hidden font-mono bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 transition-colors duration-1000">

            <motion.div className="absolute inset-0 z-0 pointer-events-none" animate={{ opacity: isLoaded ? 1 : 0 }} transition={{ duration: 1 }}>
                <div className="absolute inset-0 z-0 opacity-20 dark:opacity-10 pointer-events-none" 
                    style={{ backgroundImage: `linear-gradient(to right, #8b5cf6 1px, transparent 1px), linear-gradient(to bottom, #8b5cf6 1px, transparent 1px)`, backgroundSize: '40px 40px' }}
                />
                
                <div className="absolute top-16 bottom-0 left-0 w-1/3 border-r border-violet-200 dark:border-white/5 bg-transparent">

                    <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-slate-50 dark:from-zinc-950 to-transparent"></div>
                </div>
            </motion.div>

            <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none opacity-80" />

            <AnimatePresence>
                {showUI && (
                    <motion.div
                        layout
                        // Animação suavizada e relaxante com leve blur e transição longa (1.5s)
                        initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 1.5, ease: "easeOut" } }}
                        className={`flex items-start justify-start px-4 gap-6 w-full h-full relative z-10 transition-all duration-700 ${isFocusMode ? 'pt-4' : 'pt-32'}`}
                    >
                        <motion.aside
                            layout
                            className={`z-20 rounded-[2.5rem] ${cardStyle} transition-all duration-500 flex flex-col items-center py-6 gap-4 w-12 ${isFocusMode ? 'h-[96vh]' : 'h-[70vh]'}`}
                        >
                            <Reorder.Group axis="y" values={tabs} onReorder={handleReorder} className="flex flex-col gap-2 w-full flex-1 justify-center">
                                {tabs.map((item) => (
                                    <Reorder.Item key={item.id} value={item}>
                                        <button
                                            onClick={() => { 
                                                setActiveTab(item.id); 
                                                setIsMinimized(false); 
                                            }}
                                            className={`flex items-center justify-center w-8 h-8 mx-auto rounded-xl transition-all relative overflow-hidden group
                                            ${activeTab === item.id && !isMinimized
                                                    ? 'bg-violet-100 dark:bg-zinc-800 text-violet-600 dark:text-white shadow-lg border border-violet-300 dark:border-violet-500/30'
                                                    : 'text-slate-400 dark:text-zinc-500 hover:text-violet-500 hover:bg-violet-50 hover:dark:text-white hover:dark:bg-zinc-800'
                                                }`}
                                        >
                                            <div className="shrink-0 relative z-10 flex justify-center w-full">{item.icon}</div>
                                            <span className="absolute left-full ml-4 px-2 py-1 bg-violet-900 dark:bg-zinc-800 text-white text-[9px] rounded font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 border border-violet-500/20">
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
                                            ? 'bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 border border-violet-300 dark:border-violet-500/30'
                                            : 'text-slate-400 dark:text-zinc-500 hover:text-violet-500 hover:bg-violet-50 hover:dark:text-white hover:dark:bg-zinc-800'
                                        }`}
                                >
                                    <div className="shrink-0 flex justify-center w-full">
                                        {isFocusMode ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </div>
                                    <span className="absolute left-full ml-4 px-2 py-1 bg-violet-900 dark:bg-zinc-800 text-white text-[9px] rounded font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 border border-violet-500/20">
                                        {isFocusMode ? "Exit" : "Focus"}
                                    </span>
                                </button>
                            </div>
                        </motion.aside>

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
                                    <div className="p-10 pb-4 flex items-center gap-4 border-b border-violet-100 dark:border-white/5">
                                        <div
                                            onClick={() => setIsMinimized(true)}
                                            className="w-3 h-3 rounded-full bg-[#f59e0b] border border-[#d97706] shadow-sm cursor-pointer hover:bg-[#fbbf24] active:scale-95 transition-transform"
                                            title="Minimize Window"
                                        />
                                        <h2 className="text-xl font-black uppercase tracking-[0.3em] text-violet-900 dark:text-white leading-none flex items-center gap-3">
                                            <Cross className="w-6 h-6 text-violet-500" />
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
                                                {activeTab === 'news' && <CanonicalLaunchPanel target="news" />} 
                                                {activeTab === 'classes' && <ClassesModule />}
                                                {activeTab === 'exams' && <ExamsModule />}
                                                {activeTab === 'projects' && <ProFeaturePanel title="Clinical" description="Ambiente de projetos colaborativos — disponível apenas no plano Pro." />}
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