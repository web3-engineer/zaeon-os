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
    Users, Eye, EyeOff, UserCircle, Newspaper,
    VariableIcon, BeakerIcon, CalculatorIcon, ChartBarIcon, BoltIcon, Atom
} from 'lucide-react';
import { LoungeChatWidget } from "@/components/sub/LoungeChatWidget";

// --- 1. CONFIGURAÇÃO DE IMPORTS (MODULOS QUANTIC) ---
const LoadingModule = () => (
    <div className="w-full h-full flex flex-col items-center justify-center text-violet-500/50 animate-pulse gap-2">
        <Atom className="w-5 h-5 animate-[spin_3s_linear_infinite]" />
        <span className="text-[10px] tracking-[0.2em] uppercase font-mono">Loading Quantic-Stream...</span>
    </div>
);

// IMPORTANTE: Ajuste os caminhos abaixo para apontar para os arquivos reais da sala Quantic
const ClassesModule = dynamic(() => import('../quantic/classes/page').then(mod => mod.default), { loading: LoadingModule });
const ExamsModule = dynamic(() => import('../quantic/exams/page').then(mod => mod.default), { loading: LoadingModule });
const CommunityModule = dynamic(() => import('../quantic/community/page').then(mod => mod.default), { loading: LoadingModule });
const ProfileModule = dynamic(() => import('../quantic/profile/page').then(mod => mod.default), { loading: LoadingModule });

// --- LISTA DE TERMOS DA FÍSICA E MATEMÁTICA (PARTÍCULAS) ---
const QUANTIC_KEYS = [
    "E=mc²", "F=ma", "∫f(x)dx", "∇×E", "Schrödinger", "Planck",
    "String Theory", "Relativity", "Qubits", "Dark Matter", "Entanglement",
    "Topology", "Calculus", "Tensor Flow", "Matrix", "Photon", "Boson"
];

// --- DADOS DAS GAVETAS (GADGETS ODRADEK) ---
const GADGETS_LIST = [
    {
        id: "theoretical",
        title: "THEORETICAL",
        icon: <VariableIcon className="w-5 h-5" />,
        items: [
            { label: "Equation Solver", icon: "∑" },
            { label: "Constants DB", icon: "π" }
        ]
    },
    {
        id: "applied",
        title: "APPLIED_PHYS",
        icon: <BeakerIcon className="w-5 h-5" />,
        items: [
            { label: "Experiment Log", icon: "⚗️" },
            { label: "Particle Sim", icon: "⚛️" }
        ]
    },
    {
        id: "math",
        title: "MATHEMATICS",
        icon: <CalculatorIcon className="w-5 h-5" />,
        items: [
            { label: "Calculus Engine", icon: "∫" },
            { label: "Tensor Flow", icon: "T" }
        ]
    },
    {
        id: "quantum",
        title: "QUANTUM_DATA",
        icon: <ChartBarIcon className="w-5 h-5" />,
        items: [
            { label: "Wave Function", icon: "Ψ" },
            { label: "Entropy Graph", icon: "S" }
        ]
    }
];

// --- COMPONENTE GADGET (CONTROLA A ANIMAÇÃO DOS BRAÇOS) ---
interface DrawerProps {
    data: any;
    isOpen: boolean;
    onToggle: () => void;
    onAction: () => void;
}

const OdradekDrawer = ({ data, isOpen, onToggle, onAction }: DrawerProps) => {
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
                    bg-white/80 border-violet-200 text-violet-600 hover:border-violet-400 hover:bg-violet-50
                    dark:bg-[#0f172a]/90 dark:border-violet-500/30 dark:text-violet-400 dark:hover:bg-violet-900/80 dark:hover:border-violet-400
                `}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <div className={`absolute inset-0 bg-violet-500/10 animate-pulse rounded-xl ${isOpen ? 'opacity-100' : 'opacity-0'}`} />
                <div className={`transition-transform duration-500 ${isOpen ? 'rotate-90 text-violet-600 dark:text-violet-300' : ''}`}>
                    {data.icon}
                </div>
                <div className={`absolute top-1/2 -right-1 -translate-y-1/2 w-1.5 h-1.5 bg-violet-500 dark:bg-violet-400 rounded-full shadow-[0_0_8px_cyan] transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`} />
            </motion.button>

            {/* Tray 1 */}
            <motion.div
                initial="closed"
                animate={isOpen ? "open" : "closed"}
                variants={tray1Variants}
                className={`absolute top-0 left-0 w-48 border p-3 rounded-lg backdrop-blur-xl origin-left z-40
                    bg-white/95 border-violet-200 shadow-xl shadow-violet-900/10
                    dark:bg-[#050b14]/95 dark:border-violet-500/40 dark:shadow-[0_0_20px_rgba(34, 211, 238,0.15)]
                `}
            >
                <div className="absolute top-1/2 -left-6 w-6 h-[1px] bg-violet-300 dark:bg-violet-500/50" />
                <div className="flex items-center justify-between border-b border-violet-100 dark:border-violet-500/30 pb-2 mb-2">
                    <span className="text-[9px] uppercase tracking-widest font-bold text-violet-700 dark:text-violet-400">{data.items[0].label}</span>
                    <span className="text-xs text-violet-900 dark:text-white">{data.items[0].icon}</span>
                </div>
                <div className="h-1 w-full bg-violet-100 dark:bg-violet-900/50 rounded overflow-hidden">
                    <motion.div className="h-full bg-violet-500 dark:bg-violet-500" initial={{ width: 0 }} animate={{ width: isOpen ? '100%' : 0 }} transition={{ duration: 1, delay: 0.5 }} />
                </div>
            </motion.div>

            {/* Tray 2 */}
            <motion.div
                initial="closed"
                animate={isOpen ? "open" : "closed"}
                variants={tray2Variants}
                className={`absolute top-0 left-0 w-48 border p-3 rounded-lg backdrop-blur-xl origin-left z-50
                    bg-white/95 border-violet-200 shadow-xl shadow-violet-900/10
                    dark:bg-[#050b14]/95 dark:border-violet-500/40 dark:shadow-[0_0_20px_rgba(34, 211, 238,0.15)]
                `}
            >
                <div className="flex items-center justify-between border-b border-violet-100 dark:border-violet-500/30 pb-2 mb-2">
                    <span className="text-[9px] uppercase tracking-widest font-bold text-violet-700 dark:text-violet-400">{data.items[1].label}</span>
                    <span className="text-xs text-violet-900 dark:text-white">{data.items[1].icon}</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={onAction} className="flex-1 bg-violet-50 hover:bg-violet-100 border border-violet-200 text-[8px] py-1 text-violet-700 uppercase transition-colors dark:bg-violet-900/20 dark:hover:bg-violet-900/40 dark:border-violet-500/30 dark:text-violet-300">
                        Launch
                    </button>
                    <button onClick={onAction} className="flex-1 bg-violet-50 hover:bg-violet-100 border border-violet-200 text-[8px] py-1 text-violet-700 uppercase transition-colors dark:bg-violet-900/20 dark:hover:bg-violet-900/40 dark:border-violet-500/30 dark:text-violet-300">
                        Analyze
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default function ZaeonQuanticRoom() {

    // --- ESTADOS GERAIS ---
    const [isLoaded, setIsLoaded] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [isError, setIsError] = useState(false);

    // --- ESTADOS DA UI ---
    const [activeTab, setActiveTab] = useState("classes");
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    // --- ESTADO DOS GADGETS ---
    const [activeDrawer, setActiveDrawer] = useState<string | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);

    // --- TABS BASE ---
    const baseTabs = [
        { id: 'community', label: 'Community', icon: <Users size={18} /> },
        { id: 'classes', label: 'Classes', icon: <BookOpen size={18} /> },
        { id: 'exams', label: 'Exams', icon: <ClipboardList size={18} /> },
        { id: 'projects', label: 'Projects', icon: <Cpu size={18} /> },
        { id: 'research', label: 'Research', icon: <Activity size={18} /> },
        { id: 'news', label: 'News', icon: <Newspaper size={18} /> },
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
        if (isAuthenticated) {
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
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated]);

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
        const timer = setTimeout(() => setIsLoaded(true), 500);
        return () => clearTimeout(timer);
    }, []);

    // --- AUTENTICAÇÃO QUANTIC ---
    const handleAuth = () => {
        if (inputValue === "ZA-2026" || inputValue === "admin") {
            setIsError(false);
            setIsAuthenticated(true);
        } else {
            setIsError(true);
            setTimeout(() => setIsError(false), 1000);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleAuth();
    };

    // --- GERENCIADOR DE GAVETAS ---
    const handleDrawerToggle = (id: string) => {
        // Se a gaveta abrir, minimiza o conteúdo principal para não poluir
        if (activeDrawer !== id) {
            setIsMinimized(true);
        }
        setActiveDrawer(prev => prev === id ? null : id);
    };

    const handleGadgetAction = () => {
        // Exemplo: Feedback visual que o módulo de cálculo iniciou
        console.log("Quantum Module Launched");
    };

    // --- PHYSICS ENGINE (BACKGROUND CANVA) ---
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let mouse = { x: -1000, y: -1000, radius: 150 };

        const handleMouseMove = (event: MouseEvent) => { mouse.x = event.clientX; mouse.y = event.clientY; };
        const handleMouseLeave = () => { mouse.x = -1000; mouse.y = -1000; };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseout', handleMouseLeave);

        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        window.addEventListener('resize', resize);
        resize();

        class Particle {
            x: number; y: number; vx: number; vy: number; text: string; width: number; height: number; color: string;
            constructor(text: string, canvasW: number, canvasH: number) {
                this.text = text;
                const minX = canvasW * 0.35;
                this.x = Math.random() * (canvasW - minX) + minX;
                this.y = Math.random() * canvasH;
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = (Math.random() - 0.5) * 0.5;
                this.width = text.length * 8 + 20;
                this.height = 28;
                const colors = ['#8b5cf6', '#22d3ee', '#8b5cf6'];
                this.color = colors[Math.floor(Math.random() * colors.length)];
            }
            update(canvasW: number, canvasH: number, particles: Particle[]) {
                this.x += this.vx; this.y += this.vy;
                const dx = this.x - mouse.x; const dy = this.y - mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < mouse.radius) {
                    const force = (mouse.radius - dist) / mouse.radius;
                    this.x += (dx / dist) * force * 3; this.y += (dy / dist) * force * 3;
                }
                const imageBarrier = canvasW * 0.30;
                if (this.x + this.width > canvasW) { this.x = canvasW - this.width; this.vx *= -1; }
                if (this.x < imageBarrier) { this.x = imageBarrier; this.vx *= -1; }
                if (this.y + this.height > canvasH) { this.y = canvasH - this.height; this.vy *= -1; }
                if (this.y < 0) { this.y = 0; this.vy *= -1; }
            }
            draw(ctx: CanvasRenderingContext2D) {
                ctx.beginPath();
                ctx.roundRect(this.x, this.y, this.width, this.height, 6);
                ctx.strokeStyle = this.color; ctx.lineWidth = 1; ctx.stroke();
                // O preenchimento precisa ser dinâmico no futuro para LightMode, mas para simplicidade usamos Alpha Black
                ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.fill();
                ctx.fillStyle = "#94a3b8"; ctx.font = "bold 11px monospace";
                ctx.fillText(this.text, this.x + 10, this.y + 18);
            }
        }

        let particles = QUANTIC_KEYS.map(c => new Particle(c, canvas.width, canvas.height));

        const animate = () => {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => { p.update(canvas.width, canvas.height, particles); p.draw(ctx); });
            animationFrameId = requestAnimationFrame(animate);
        };
        animate();
        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseout', handleMouseLeave);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    // --- STYLES QUANTIC ---
    const cardStyle = `
        dark:bg-[rgba(22,22,34,0.55)] bg-[rgba(255,255,255,0.6)]
        backdrop-blur-[40px] backdrop-saturate-[1.8] 
        border dark:border-[rgba(255,255,255,0.12)] border-[rgba(255,255,255,0.5)]
        shadow-[0_40px_100px_-30px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.10)]
    `;

    return (
        <div className="relative w-screen h-screen overflow-hidden font-mono bg-slate-50 dark:bg-black text-slate-800 dark:text-slate-200 transition-colors duration-1000">

            {/* 1. BACKGROUND FIXO */}
            <motion.div className="absolute inset-0 z-0 pointer-events-none" animate={{ opacity: isLoaded ? 1 : 0 }} transition={{ duration: 1 }}>
                <div className="absolute top-16 bottom-0 left-0 w-1/3 border-r border-violet-200 dark:border-white/5 bg-transparent">
                    <Image src="/assets/quantic-room.png" alt="Quantic Room" fill className="object-cover object-center opacity-40 dark:opacity-80 mix-blend-multiply dark:mix-blend-overlay" priority />
                    <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-slate-50 dark:from-black to-transparent"></div>
                </div>
            </motion.div>
            <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

            {/* 2. MODAL DE ACESSO (Antiga Sala de Espera) */}
            <AnimatePresence>
                {isLoaded && !isAuthenticated && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1, x: isError ? [0, -10, 10, -10, 10, 0] : 0 }}
                        exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
                        transition={{ duration: 0.5 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md px-4"
                    >
                        <div className={`w-full max-w-[400px] border-2 backdrop-blur-xl transition-all duration-300
                            bg-white/90 dark:bg-black/80
                            ${isError
                                ? 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.4)] dark:shadow-[0_0_50px_rgba(239,68,68,0.6)]'
                                : 'border-violet-200 dark:border-violet-800 shadow-xl shadow-violet-900/10 dark:shadow-[0_0_50px_rgba(34, 211, 238,0.15)]'
                            }`}
                        >
                            {/* Top Bar Modal */}
                            <div className={`border-b p-2 flex items-center justify-between select-none
                                ${isError ? 'bg-red-50 border-red-200 dark:bg-red-900/40 dark:border-red-800/50' : 'bg-violet-50/50 border-violet-100 dark:bg-violet-900/20 dark:border-violet-800/50'}
                            `}>
                                <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] 
                                    ${isError ? 'text-red-500 dark:text-red-400' : 'text-violet-600 dark:text-violet-400'}`}>
                                    <BoltIcon className="w-4 h-4" />
                                    <span>{isError ? "ACTION_DENIED" : "QUANTUM_GATEWAY_V9"}</span>
                                </div>
                                <div className="flex gap-1">
                                    <div className={`w-1.5 h-1.5 animate-pulse rounded-full ${isError ? 'bg-red-500' : 'bg-violet-400 dark:bg-violet-400'}`}></div>
                                </div>
                            </div>

                            <div className="p-8 relative overflow-hidden">
                                <div className="relative z-10 flex flex-col gap-6">
                                    {/* Header Modal */}
                                    <div className={`border-l-4 pl-4 py-2 transition-colors duration-300 
                                        ${isError ? 'border-red-500' : 'border-violet-500 dark:border-violet-600'}`}>
                                        <h2 className={`text-xl font-bold tracking-widest flex items-center gap-3 
                                            ${isError ? 'text-red-600 dark:text-red-500' : 'text-slate-800 dark:text-white'}`}>
                                            {isError ? <XCircle size={20} /> : <Lock size={20} className="text-violet-500 dark:text-violet-500" />}
                                            {isError ? "LOGIN REQUIRED" : "RESTRICTED"}
                                        </h2>
                                        <p className={`text-[10px] mt-1 uppercase tracking-[0.3em] transition-colors 
                                            ${isError ? 'text-red-400' : 'text-violet-400 dark:text-violet-500/70'}`}>
                                            PHYSICS DEPARTMENT
                                        </p>
                                    </div>

                                    {/* Input Modal */}
                                    <div className="space-y-4">
                                        <div className="relative group">
                                            <label className={`text-[9px] uppercase font-bold mb-2 block transition-colors 
                                                ${isError ? 'text-red-500' : 'text-violet-400 dark:text-violet-500/50'}`}>
                                                ACCESS KEY (Hint: ZA-2026)
                                            </label>
                                            <div className={`flex items-center border transition-colors duration-300 
                                                ${isError
                                                    ? 'border-red-300 bg-red-50 dark:border-red-500/60 dark:bg-red-900/10'
                                                    : 'border-violet-200 bg-violet-50/50 dark:border-violet-500/40 dark:bg-violet-900/10 focus-within:border-violet-400'
                                                }`}>
                                                <span className={`pl-3 font-bold text-lg transition-colors ${isError ? 'text-red-500' : 'text-violet-500 dark:text-violet-500'}`}>{'>'}</span>
                                                <input
                                                    type="password"
                                                    value={inputValue}
                                                    onChange={(e) => { setInputValue(e.target.value); setIsError(false); }}
                                                    onKeyDown={handleKeyDown}
                                                    className={`w-full bg-transparent border-none px-3 py-3 text-lg focus:ring-0 font-mono tracking-[0.5em] outline-none
                                                    ${isError ? 'text-red-600 dark:text-red-400 placeholder:text-red-300 dark:placeholder:text-red-800' : 'text-slate-900 dark:text-white placeholder:text-violet-200 dark:placeholder:text-violet-900/50'}`}
                                                    placeholder="••••"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleAuth}
                                            className={`w-full border font-bold py-4 text-xs uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-2 group duration-300 hover:scale-[1.02] active:scale-95
                                            ${isError
                                                    ? 'bg-red-50 border-red-200 text-red-500 dark:bg-red-800/40 dark:border-red-600 dark:text-red-300'
                                                    : 'bg-violet-50 border-violet-200 text-violet-600 hover:bg-violet-100 dark:bg-violet-950/40 dark:border-violet-600 dark:text-violet-300 dark:hover:bg-violet-900/60'
                                                }`}
                                        >
                                            {isError ? "ACCESS DENIED" : "AUTHENTICATE"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 3. MAIN UI COMPLETA (SIDEBARS + MODULES) */}
            <AnimatePresence>
                {isAuthenticated && (
                    <motion.div
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0, transition: { delay: 0.2, duration: 0.8 } }}
                        className={`flex items-start justify-start px-4 gap-6 w-full h-full relative z-10 transition-all duration-700 ${isFocusMode ? 'pt-4' : 'pt-32'}`}
                    >
                        {/* --- SIDEBAR CONTAINER DUPLO --- */}
                        <div className="flex gap-4 h-full relative z-20">

                            {/* SIDEBAR PRINCIPAL (Disciplinas) */}
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
                                                    setActiveDrawer(null); // Fecha gadgets ao focar no modulo principal
                                                }}
                                                className={`flex items-center justify-center w-8 h-8 mx-auto rounded-xl transition-all relative overflow-hidden group
                                                ${activeTab === item.id && !activeDrawer && !isMinimized
                                                        ? 'bg-violet-100 dark:bg-[#0f172a] text-violet-600 dark:text-white shadow-lg border border-violet-300 dark:border-white/10'
                                                        : 'text-slate-400 dark:text-white/40 hover:text-violet-500 hover:bg-violet-50 hover:dark:text-white hover:dark:bg-[#0f172a]'
                                                    }`}
                                            >
                                                <div className="shrink-0 relative z-10 flex justify-center w-full">{item.icon}</div>
                                                <span className="absolute left-full ml-4 px-2 py-1 bg-violet-900 dark:bg-slate-800 text-white text-[9px] rounded font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
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
                                                : 'text-slate-400 dark:text-white/40 hover:text-violet-500 hover:bg-violet-50 hover:dark:text-white hover:dark:bg-[#0f172a]'
                                            }`}
                                    >
                                        <div className="shrink-0 flex justify-center w-full">
                                            {isFocusMode ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </div>
                                        <span className="absolute left-full ml-4 px-2 py-1 bg-violet-900 dark:bg-slate-800 text-white text-[9px] rounded font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                                            {isFocusMode ? "Exit" : "Focus"}
                                        </span>
                                    </button>
                                </div>
                            </motion.aside>

                            {/* SIDEBAR SECUNDÁRIA (Gadgets Odradek) */}
                            {/* Ela fica colada à primeira sidebar, separando a navegação grossa das ferramentas rápidas */}
                            <motion.div layout className={`flex flex-col justify-center gap-4 transition-all duration-500 ${isFocusMode ? 'h-[96vh]' : 'h-[70vh]'}`}>
                                {GADGETS_LIST.map((gadget) => (
                                    <OdradekDrawer
                                        key={gadget.id}
                                        data={gadget}
                                        isOpen={activeDrawer === gadget.id}
                                        onToggle={() => handleDrawerToggle(gadget.id)}
                                        onAction={handleGadgetAction}
                                    />
                                ))}
                            </motion.div>
                        </div>

                        {/* CONTENT AREA PRINCIPAL */}
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
                                            <Atom className="w-6 h-6 text-violet-500 dark:text-violet-500" />
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