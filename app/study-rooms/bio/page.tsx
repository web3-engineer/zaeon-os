"use client";

import { ProFeaturePanel } from "@/components/ui/ProFeaturePanel";
import { CanonicalLaunchPanel } from "@/components/ui/CanonicalLaunchPanel";
import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { 
    Dna, Activity, CheckCircle, AlertTriangle, 
    BookOpen, ClipboardList, FlaskConical, Microscope, 
    Users, Eye, EyeOff, UserCircle, Newspaper
} from 'lucide-react';
// IMPORT DA NAVBAR REMOVIDO DAQUI
import { LoungeChatWidget } from "@/components/sub/LoungeChatWidget";

// --- 1. CONFIGURAÇÃO DE IMPORTS ---
const LoadingModule = () => (
    <div className="w-full h-full flex flex-col items-center justify-center text-violet-400/50 animate-pulse gap-2">
        <Activity className="w-5 h-5 animate-bounce" />
        <span className="text-[10px] tracking-[0.2em] uppercase font-mono">Loading Stream...</span>
    </div>
);

// Módulos Bio (Atualizados com os módulos do Lounge)
const ClassesModule = dynamic(() => import('./main-room/classes/page'), { loading: LoadingModule });
const ExamsModule = dynamic(() => import('./main-room/exams/page'), { loading: LoadingModule });
const CommunityModule = dynamic(() => import('./main-room/community/page'), { loading: LoadingModule });
// Novos módulos integrados do Lounge
const ProfileModule = dynamic(() => import('./main-room/profile/page'), { loading: LoadingModule });

// --- 2. TERMOS (CANVAS) ---
const BASE_TERMS = [
    "Mitochondria", "Ribosome", "Nucleus", "Cytoplasm", "Membrane",
    "DNA", "RNA", "CRISPR", "Enzyme", "Protein", "Lipid", "ATP", 
    "Neuron", "Axon", "Synapse", "Dendrite", "Myelin", "Hemoglobin", 
    "Leukocyte", "Platelet", "Plasma", "Antibody", "Antigen", "Virus"
];
const BIO_TERMS = [...BASE_TERMS, ...BASE_TERMS];

export default function ZaeonBiologyRoom() {
    // --- ESTADOS ---
    const [isLoaded, setIsLoaded] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(true); // O Protocolo inicial
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [isMinimized, setIsMinimized] = useState(false);
    
    const initialTab = (() => {
        if (typeof window === "undefined") return "classes";
        try {
            const saved = localStorage.getItem("zaeon.bio.lastTab");
            if (saved) return saved;
        } catch { /* ignore */ }
        return "classes";
    })();
    const [activeTab, setActiveTab] = useState(initialTab);

    useEffect(() => {
        try { localStorage.setItem("zaeon.bio.lastTab", activeTab); } catch { /* ignore */ }
    }, [activeTab]);
    
    // --- TABS (BASE INICIAL UNIFICADA) ---
    // Usando os mesmos IDs do Lounge para manter a compatibilidade do layoutState no BD
    const baseTabs = [
        { id: 'community', label: 'Community', icon: <Users size={18} /> },
        { id: 'classes', label: 'Classes', icon: <BookOpen size={18} /> },
        { id: 'exams', label: 'Exams', icon: <ClipboardList size={18} /> },
        { id: 'projects', label: 'Projects', icon: <FlaskConical size={18} /> },
        { id: 'research', label: 'Research', icon: <Microscope size={18} /> },
        { id: 'news', label: 'News', icon: <Newspaper size={18} /> }, 
        { id: 'profile', label: 'Identity', icon: <UserCircle size={18} /> },
    ];

    const [tabs, setTabs] = useState(baseTabs);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // --- SINAL DE RÁDIO: COMUNICAÇÃO COM A NAVBAR GLOBAL ---
    useEffect(() => {
        window.dispatchEvent(new CustomEvent("zaeon-focus-mode", { detail: isFocusMode }));
        
        return () => {
            // Garante que a Navbar volte a aparecer se o usuário sair dessa tela
            window.dispatchEvent(new CustomEvent("zaeon-focus-mode", { detail: false }));
        };
    }, [isFocusMode]);

    // --- BUSCAR A ORDEM SALVA NO BANCO ---
    useEffect(() => {
        // Só busca depois de passar pelo modal (Protocolo)
        if (!isModalOpen) {
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
    }, [isModalOpen]);

    // --- SALVAR A ORDEM NO BANCO QUANDO O USUÁRIO ARRASTAR ---
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

    // --- SETUP & DETECÇÃO DE TEMA ---
    useEffect(() => {
        const timer = setTimeout(() => setIsLoaded(true), 500);
        const checkTheme = () => setIsDarkMode(document.documentElement.classList.contains('dark'));
        
        checkTheme();
        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        return () => {
            clearTimeout(timer);
            observer.disconnect();
        };
    }, []);

    // --- BIO-PHYSICS ENGINE (CANVAS DNA) ---
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let mouse = { x: -1000, y: -1000 };
        const interactionRadius = 300;

        const handleMouseMove = (event: MouseEvent) => { mouse.x = event.clientX; mouse.y = event.clientY; };
        const handleMouseLeave = () => { mouse.x = -1000; mouse.y = -1000; };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseout', handleMouseLeave);

        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        window.addEventListener('resize', resize);
        resize();

        const SPACING = 60; 
        const TOTAL_HEIGHT = BIO_TERMS.length * SPACING; 

        class Molecule {
            text: string; y: number; strand: 1 | 2; x: number = 0;
            scale: number = 1; opacity: number = 1; baseX: number = 0;
            constructor(text: string, startY: number, strand: 1 | 2) {
                this.text = text; this.y = startY; this.strand = strand;
            }
            update(canvasW: number, speed: number) {
                this.y -= speed;
                if (this.y < -100) this.y += TOTAL_HEIGHT;
                
                const helixRadius = 140;
                const helixCenter = canvasW * 0.85; 
                
                const frequency = 0.005; 
                const angle = (this.y * frequency) + (this.strand === 1 ? 0 : Math.PI);
                this.baseX = helixCenter + Math.cos(angle) * helixRadius;
                
                const dx = mouse.x - this.baseX;
                const dy = mouse.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                let targetX = this.baseX;

                if (dist < interactionRadius && dist > 0) {
                    const pullStrength = Math.pow(1 - dist / interactionRadius, 2);
                    const offsetX = (dx / dist) * pullStrength * 60;
                    targetX = this.baseX + offsetX;
                }

                if (this.x === 0) this.x = this.baseX;
                this.x += (targetX - this.x) * 0.1;
            }

            draw(ctx: CanvasRenderingContext2D) {
                const colorStrand1 = isDarkMode ? '#22d3ee' : '#8b5cf6'; 
                const colorStrand2 = isDarkMode ? '#22d3ee' : '#22d3ee'; 
                const textColor = isDarkMode ? '#f5f3ff' : '#0f172a';   

                let displayColor = this.strand === 1 ? colorStrand1 : colorStrand2;

                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.scale(this.scale, this.scale);
                ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2);
                ctx.fillStyle = displayColor; ctx.globalAlpha = 0.8; ctx.fill();
                
                if (isDarkMode) {
                    ctx.shadowBlur = 15; ctx.shadowColor = displayColor;
                }

                ctx.fillStyle = textColor; ctx.globalAlpha = 1;
                ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
                ctx.fillText(this.text, 15, 0);
                ctx.restore();
            }
        }

        const molecules: Molecule[] = [];
        BIO_TERMS.forEach((term, i) => {
            const strand = i % 2 === 0 ? 1 : 2;
            const startY = canvas.height + (i * SPACING);
            molecules.push(new Molecule(term, startY, strand));
        });

        const animate = () => {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const lineColor1 = isDarkMode ? 'rgba(34, 211, 238, 0.3)' : 'rgba(139, 92, 246, 0.3)';
            const lineColor2 = isDarkMode ? 'rgba(34, 211, 238, 0.3)' : 'rgba(34, 211, 238, 0.3)';

            const drawStrand = (strandNum: 1 | 2) => {
                const strandMols = molecules.filter(m => m.strand === strandNum).sort((a, b) => a.y - b.y);
                ctx.beginPath();
                ctx.strokeStyle = strandNum === 1 ? lineColor1 : lineColor2;
                ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                if (strandMols.length > 0) {
                    let started = false;
                    for (let i = 0; i < strandMols.length - 1; i++) {
                        const curr = strandMols[i]; const next = strandMols[i+1];
                        if (Math.abs(curr.y - next.y) < SPACING * 2.5) {
                            if (!started) { ctx.moveTo(curr.x, curr.y); started = true; }
                            const midX = (curr.x + next.x) / 2; const midY = (curr.y + next.y) / 2;
                            ctx.quadraticCurveTo(curr.x, curr.y, midX, midY); ctx.quadraticCurveTo(midX, midY, next.x, next.y);
                        } else { started = false; }
                    }
                }
                ctx.stroke();
            };
            molecules.forEach(m => m.update(canvas.width, 1.2));
            drawStrand(1); drawStrand(2);
            molecules.sort((a, b) => a.scale - b.scale);
            molecules.forEach(m => m.draw(ctx));
            animationFrameId = requestAnimationFrame(animate);
        };
        animate();
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', resize);
            window.removeEventListener('mouseout', handleMouseLeave);
            cancelAnimationFrame(animationFrameId);
        };
    }, [isDarkMode]);

    // --- ESTILOS FIXOS (TEMA VERDE SEMPRE) ---
    const fixedBioStyle = `
        dark:bg-[rgba(22,22,34,0.55)] bg-[rgba(255,255,255,0.6)] 
        backdrop-blur-[40px] backdrop-saturate-[1.8] 
        border dark:border-[rgba(255,255,255,0.12)] border-[rgba(255,255,255,0.5)] 
        shadow-[0_40px_100px_-30px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.10)]
        text-violet-50
    `;

    return (
        <div className={`relative w-screen h-screen overflow-hidden font-mono transition-colors duration-700
            ${isDarkMode ? 'bg-black' : 'bg-white'}
        `}>

            {/* 1. BACKGROUND: CANVAS DNA */}
            <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

            {/* 2. MODAL DE PROTOCOLO */}
            <AnimatePresence>
                {isLoaded && isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.5 } }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
                            className={`w-full max-w-[440px] overflow-hidden relative shadow-2xl ${fixedBioStyle} rounded-2xl`}
                        >
                            <div className="border-b border-violet-500/30 p-3 flex justify-between bg-violet-900/40">
                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-violet-400">
                                    <Activity size={12} /> PROTOCOL_V2
                                </div>
                            </div>
                            
                            <div className="p-8 relative">
                                <div className="border-l-2 pl-4 mb-6 border-yellow-500">
                                    <h2 className="font-bold text-lg flex items-center gap-2 text-white">
                                        <AlertTriangle className="w-5 h-5 text-yellow-500" /> 
                                        Restricted Area
                                    </h2>
                                    <p className="text-[10px] uppercase tracking-widest mt-1 text-violet-400/70">Bio-Medical Sciences Only</p>
                                </div>
                                <p className="text-sm leading-relaxed mb-8 text-violet-100/80">
                                    You are entering the <strong>Biology & Health Lounge</strong>. 
                                    <br/>All systems are optimized for organic chemistry, anatomy, and medical research.
                                </p>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="w-full py-4 font-bold uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3 group border
                                    bg-violet-500/10 border-violet-500/30 hover:bg-violet-500 hover:text-black text-violet-400"
                                >
                                    <CheckCircle size={14} /> Initialize Access
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 3. MAIN UI */}
            <AnimatePresence>
                {!isModalOpen && (
                    <motion.div 
                        layout 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0, transition: { delay: 0.2, duration: 0.6 } }}
                        className={`flex items-start justify-start px-4 gap-6 w-full h-full relative z-10 transition-all duration-700 ${isFocusMode ? 'pt-4' : 'pt-32'}`}
                    >
                        {/* SIDEBAR (Tinner & Static - Trazido do Lounge) */}
                        <motion.aside
                            layout
                            className={`z-20 rounded-[2.5rem] ${fixedBioStyle} transition-all duration-500 flex flex-col items-center py-6 gap-4 w-12 ${isFocusMode ? 'h-[96vh]' : 'h-[70vh]'}`}
                        >
                            <Reorder.Group axis="y" values={tabs} onReorder={handleReorder} className="flex flex-col gap-2 w-full flex-1 justify-center">
                                {tabs.map((item) => (
                                    <Reorder.Item key={item.id} value={item}>
                                        <button 
                                            onClick={() => { setActiveTab(item.id); setIsMinimized(false); }}
                                            className={`flex items-center justify-center w-8 h-8 mx-auto rounded-xl transition-all relative overflow-hidden group
                                            ${activeTab === item.id
                                                ? 'bg-violet-500/20 text-violet-100 border dark:border-[rgba(255,255,255,0.12)] border-[rgba(255,255,255,0.5)] shadow-[0_0_15px_rgba(139, 92, 246,0.15)]'
                                                : 'text-violet-500/40 hover:text-violet-100 hover:bg-violet-500/10'
                                            }`}
                                        >
                                            <div className="shrink-0 relative z-10 flex justify-center w-full">{item.icon}</div>
                                            
                                            {/* Tooltip Estilizada Tema Bio */}
                                            <span className="absolute left-full ml-4 px-2 py-1 bg-[#161622] border dark:border-[rgba(255,255,255,0.12)] border-[rgba(255,255,255,0.5)] text-violet-100 text-[9px] rounded font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                                                {item.label}
                                            </span>
                                        </button>
                                    </Reorder.Item>
                                ))}
                            </Reorder.Group>

                            <div className="w-full pt-4 mt-auto border-t border-violet-500/20">
                                <button 
                                    onClick={() => setIsFocusMode(!isFocusMode)}
                                    className={`flex items-center justify-center w-8 h-8 mx-auto rounded-xl transition-all group relative
                                        ${isFocusMode 
                                            ? 'bg-violet-500/20 text-violet-400' 
                                            : 'text-violet-500/40 hover:text-violet-100 hover:bg-violet-500/10'
                                        }`}
                                >
                                    <div className="shrink-0 flex justify-center w-full">
                                        {isFocusMode ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </div>
                                    <span className="absolute left-full ml-4 px-2 py-1 bg-[#161622] border dark:border-[rgba(255,255,255,0.12)] border-[rgba(255,255,255,0.5)] text-violet-100 text-[9px] rounded font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                                        {isFocusMode ? "Exit" : "Focus"}
                                    </span>
                                </button>
                            </div>
                        </motion.aside>

                        {/* CONTENT AREA (Layout do Lounge, Tema Bio) */}
                        <AnimatePresence>
                            {!isMinimized && (
                                <motion.main 
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.3 } }}
                                    className={`z-10 flex-1 rounded-[3.5rem] ${fixedBioStyle} overflow-hidden flex flex-col relative transition-all duration-700
                                        ${isFocusMode ? 'h-[96vh]' : 'h-[82vh]'}
                                    `}
                                >
                                    {/* HEADER DA JANELA (MAC-STYLE Adaptado para a Bio Room) */}
                                    <div className="p-10 pb-4 flex items-center gap-4 border-b border-violet-500/20">
                                        <div
                                            onClick={() => setIsMinimized(true)}
                                            className="w-3 h-3 rounded-full bg-[#f59e0b] border border-[#d97706] shadow-sm cursor-pointer hover:bg-[#fbbf24] active:scale-95 transition-transform"
                                            title="Minimize Window"
                                        />
                                        <h2 className="text-xl font-black uppercase tracking-[0.2em] leading-none flex items-center gap-3 text-violet-100">
                                            <Dna className="w-6 h-6 text-violet-500" />
                                            {tabs.find(t => t.id === activeTab)?.label}
                                        </h2>
                                    </div>

                                    {/* Container dos módulos */}
                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-12 pt-6 relative text-violet-50 dark">
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={activeTab}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 10 }}
                                                transition={{ duration: 0.2 }}
                                                className="h-full"
                                            >
                                                {/* Módulos Originais + Novos do Lounge */}
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
                        
                        {/* Wrapper do Chat */}
                        <div className="relative z-50 text-violet-50 dark">
                            <LoungeChatWidget defaultOpen={false} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}