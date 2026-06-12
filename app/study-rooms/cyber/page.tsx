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
    Users, Eye, EyeOff, UserCircle, Newspaper
} from 'lucide-react';
// IMPORT DA NAVBAR REMOVIDO DAQUI
import { LoungeChatWidget } from "@/components/sub/LoungeChatWidget";

// --- 1. CONFIGURAÇÃO DE IMPORTS (MODULOS CYBER) ---
const LoadingModule = () => (
    <div className="w-full h-full flex flex-col items-center justify-center text-violet-500/50 animate-pulse gap-2">
        <Terminal className="w-5 h-5 animate-bounce" />
        <span className="text-[10px] tracking-[0.2em] uppercase font-mono">Loading Cyber-Stream...</span>
    </div>
);

const ClassesModule = dynamic(() => import('./main-hall/classes/page').then(mod => mod.default), { loading: LoadingModule });
const ExamsModule = dynamic(() => import('./main-hall/exams/page').then(mod => mod.default), { loading: LoadingModule });
const CommunityModule = dynamic(() => import('./main-hall/community/page').then(mod => mod.default), { loading: LoadingModule });
const ProfileModule = dynamic(() => import('./main-hall/profile/page').then(mod => mod.default), { loading: LoadingModule });

const COURSE_KEYS = [
    "Computer Science", "Software Eng.", "InfoSec", "Cloud Computing",
    "DevOps", "AI & ML", "Big Data", "Blockchain", "Cybersecurity",
    "Networks", "Database Systems", "IoT", "Game Dev", "UX/UI Design"
];

export default function ZaeonComputerScienceRoom() {

    const [isLoaded, setIsLoaded] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    const [inputValue, setInputValue] = useState('');
    const [isError, setIsError] = useState(false);

    const [activeTab, setActiveTab] = useState("classes");
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement>(null);

    const baseTabs = [
        { id: 'community', label: 'Communities', icon: <Users size={18} /> },
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

    useEffect(() => {
        if (isAuthenticated) {
            const fetchSavedOrder = async () => {
                try {
                    const res = await fetch('/api/user-space');
                    if (res.ok) {
                        const data = await res.json();
                        if (data?.data?.layoutState?.sidebarOrder) {
                            const savedOrder = data.data.layoutState.sidebarOrder;
                            const newTabs = savedOrder
                                .map((id: string) => baseTabs.find(t => t.id === id))
                                .filter(Boolean);

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
            console.error("Erro ao salvar a nova ordem da sidebar", error);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => setIsLoaded(true), 500);
        return () => clearTimeout(timer);
    }, []);

    const handleAuth = () => {
        if (inputValue.trim() === "npm run dev") {
            setIsError(false);
            setIsAuthenticating(true);
            setTimeout(() => {
                setIsAuthenticating(false);
                setIsAuthenticated(true);
            }, 2500);
        } else {
            setIsError(true);
            setTimeout(() => setIsError(false), 1000);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleAuth();
    };

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
                const colors = ['#A855F7', '#3B82F6', '#8b5cf6', '#6366f1'];
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
                for (let other of particles) {
                    if (other === this) continue;
                    if (this.x < other.x + other.width && this.x + this.width > other.x &&
                        this.y < other.y + other.height && this.y + this.height > other.y) {
                        const tempVx = this.vx; this.vx = other.vx; other.vx = tempVx;
                        const tempVy = this.vy; this.vy = other.vy; other.vy = tempVy;
                    }
                }
            }
            draw(ctx: CanvasRenderingContext2D) {
                ctx.beginPath();
                ctx.roundRect(this.x, this.y, this.width, this.height, 6);
                ctx.strokeStyle = this.color; ctx.lineWidth = 1; ctx.stroke();
                ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fill();
                ctx.fillStyle = "#e2e8f0"; ctx.font = "bold 11px monospace";
                ctx.fillText(this.text, this.x + 10, this.y + 18);
            }
        }

        let particles = COURSE_KEYS.map(c => new Particle(c, canvas.width, canvas.height));

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

    // Zaeon liquid glass — canonical shell tokens (see GlassPanel / liquid-glass-style-reference)
    const cardStyle = `
        dark:bg-[rgba(22,22,34,0.55)] bg-[rgba(255,255,255,0.6)]
        backdrop-blur-[40px] backdrop-saturate-[1.8]
        border dark:border-[rgba(255,255,255,0.12)] border-[rgba(255,255,255,0.5)]
        shadow-[0_40px_100px_-30px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.10)]
    `;

    return (
        <div className="relative w-screen h-screen overflow-hidden font-mono bg-[#e2e8f0] dark:bg-[#010816] text-slate-800 dark:text-slate-200 transition-colors duration-1000">

            <motion.div className="absolute inset-0 z-0 pointer-events-none" animate={{ opacity: isLoaded ? 1 : 0 }} transition={{ duration: 1 }}>
                <div className="absolute top-16 bottom-0 left-0 w-1/3 border-r border-slate-300 dark:border-white/5 bg-transparent">
                    <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#e2e8f0] dark:from-[#010816] to-transparent"></div>
                </div>
            </motion.div>
            <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

            <AnimatePresence>
                {isLoaded && !isAuthenticated && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1, x: isError ? [0, -10, 10, -10, 10, 0] : 0 }}
                        exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
                        transition={{ duration: 0.5 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md px-4"
                    >
                        <div className={`w-full max-w-[440px] rounded-[18px] bg-[rgba(22,22,34,0.85)] backdrop-blur-[40px] backdrop-saturate-[1.8] border-2 relative overflow-hidden transition-colors duration-300
                            shadow-[0_40px_100px_-30px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.10)]
                            ${isError ? 'border-red-500' : 'border-[rgba(139,92,246,0.5)]'}`}>

                            <div className={`border-b p-2 flex justify-between bg-slate-900/50 ${isError ? 'border-red-500/30' : 'border-violet-500/30'}`}>
                                <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${isError ? 'text-red-400' : 'text-violet-300'}`}>
                                    <Terminal size={12} /> {isError ? "ACCESS_DENIED" : "SYSTEM_GATEWAY"}
                                </div>
                                <div className={`w-2 h-2 rounded-full animate-pulse ${isError ? 'bg-red-500' : 'bg-violet-500'}`} />
                            </div>

                            <div className="p-8 relative">
                                {!isAuthenticating ? (
                                    <>
                                        <div className={`border-l-2 pl-4 mb-6 ${isError ? 'border-red-500' : 'border-violet-500'}`}>
                                            <h2 className={`font-bold text-lg flex items-center gap-2 ${isError ? 'text-red-400' : 'text-white'}`}>
                                                {isError ? <XCircle size={18} /> : <Lock size={18} />}
                                                {isError ? "Invalid Command" : "Secure Environment"}
                                            </h2>
                                            <p className="text-[10px] uppercase tracking-widest mt-1 text-slate-400">Initialize Dev Server</p>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[9px] uppercase font-bold text-slate-500 mb-1 block">Command Line</label>
                                                <div className={`flex items-center bg-slate-900/50 border px-3 py-2 ${isError ? 'border-red-500/50' : 'border-slate-700 focus-within:border-violet-500'}`}>
                                                    <span className="text-violet-400 mr-2">{'>'}</span>
                                                    <input
                                                        type="text"
                                                        value={inputValue}
                                                        onChange={(e) => { setInputValue(e.target.value); setIsError(false); }}
                                                        onKeyDown={handleKeyDown}
                                                        placeholder="Type 'npm run dev' to start..."
                                                        className="bg-transparent border-none w-full text-white font-mono text-sm outline-none placeholder:text-slate-600"
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>
                                            <button onClick={handleAuth} className="w-full py-3 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-300 font-bold uppercase text-xs tracking-[0.2em] transition-all">
                                                Execute
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="py-8 flex flex-col items-center justify-center gap-4">
                                        <div className="text-violet-300 font-mono text-sm animate-pulse">STARTING DEVELOPMENT SERVER...</div>
                                        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: "100%" }}
                                                transition={{ duration: 2.2, ease: "easeInOut" }}
                                                className="h-full bg-violet-500 shadow-[0_0_10px_#8b5cf6]"
                                            />
                                        </div>
                                        <div className="flex justify-between w-full text-[8px] text-slate-500 font-mono uppercase">
                                            <span>Compiling Modules</span>
                                            <span>100%</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isAuthenticated && (
                    <motion.div
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0, transition: { delay: 0.2, duration: 0.8 } }}
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
                                            onClick={() => { setActiveTab(item.id); setIsMinimized(false); }}
                                            className={`flex items-center justify-center w-8 h-8 mx-auto rounded-xl transition-all relative overflow-hidden group
                                            ${activeTab === item.id
                                                    ? 'dark:bg-[rgba(139,92,246,0.28)] bg-[#0f172a] text-white shadow-[0_8px_20px_-8px_rgba(139,92,246,0.85)] border border-[rgba(255,255,255,0.28)]'
                                                    : 'dark:text-white/40 text-slate-500 hover:dark:text-white hover:text-[#0f172a]'
                                                }`}
                                        >
                                            <div className="shrink-0 relative z-10 flex justify-center w-full">{item.icon}</div>
                                            <span className="absolute left-full ml-4 px-2 py-1 bg-[rgba(15,15,28,0.92)] border border-[rgba(139,92,246,0.55)] text-white text-[9px] rounded font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.8)]">
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
                                            ? 'bg-[rgba(139,92,246,0.25)] text-violet-200 border border-[rgba(139,92,246,0.45)]'
                                            : 'dark:text-white/40 text-slate-500 hover:dark:text-white hover:text-[#0f172a]'
                                        }`}
                                >
                                    <div className="shrink-0 flex justify-center w-full">
                                        {isFocusMode ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </div>
                                    <span className="absolute left-full ml-4 px-2 py-1 bg-[rgba(15,15,28,0.92)] border border-[rgba(139,92,246,0.55)] text-white text-[9px] rounded font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.8)]">
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
                                    <div className="p-10 pb-4 flex items-center gap-4 border-b dark:border-white/5 border-black/5">
                                        <div
                                            onClick={() => setIsMinimized(true)}
                                            className="w-3 h-3 rounded-full bg-[#f59e0b] border border-[#d97706] shadow-sm cursor-pointer hover:bg-[#fbbf24] active:scale-95 transition-transform"
                                            title="Minimize Window"
                                        />
                                        <h2 className="text-xl font-black uppercase tracking-[0.3em] dark:text-white text-[#0f172a] leading-none flex items-center gap-3">
                                            <Terminal className="w-6 h-6 text-violet-400" />
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
                                                {activeTab === 'classes' && <ClassesModule />}
                                                {activeTab === 'exams' && <ExamsModule />}
                                                {activeTab === 'projects' && <ProFeaturePanel title="Projects" description="Ambiente de projetos colaborativos — disponível apenas no plano Pro." />}
                                                {activeTab === 'research' && <CanonicalLaunchPanel target="research" />}
                                                {activeTab === 'news' && <CanonicalLaunchPanel target="news" />}
                                                {activeTab === 'community' && <CommunityModule />}
                                                {activeTab === 'profile' && <ProfileModule />}
                                            </motion.div>
                                        </AnimatePresence>
                                    </div>
                                </motion.main>
                            )}
                        </AnimatePresence>

                        <div className="relative z-50">
                            <LoungeChatWidget defaultOpen={false} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}