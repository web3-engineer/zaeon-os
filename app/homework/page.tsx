"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    PlusIcon, ChevronRightIcon, BookmarkIcon, ArrowPathIcon,
    VideoCameraIcon, ClipboardIcon, SparklesIcon, TrashIcon
} from "@heroicons/react/24/outline";
import MatrixRain from "@/components/main/star-background";
import ResearchCardPDF from "@/components/ui/ResearchCardPDF";

interface StudyDoc { id: string; title: string; url: string; }
interface VideoItem { id: string; youtubeId: string; }

export default function HomeworkPage() {
    const [studyFiles, setStudyFiles] = useState<StudyDoc[]>([]);
    const [videos, setVideos] = useState<VideoItem[]>([]);
    const [activeSection, setActiveSection] = useState<string | null>(null);
    const [chatHistory, setChatHistory] = useState<{role: 'ai', text: string}[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [prompt, setPrompt] = useState("");

    // Estados de Controle de Fluxo
    const [isAdding, setIsAdding] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const mainScrollRef = useRef<HTMLDivElement>(null);
    const citationsRef = useRef<HTMLElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // --- CORREÇÃO TÉCNICA: Captura de Arquivos ---
    const handleFiles = (files: FileList | null) => {
        if (!files) return;
        setIsAdding(false);
        const newFiles: StudyDoc[] = [];
        Array.from(files).forEach(file => {
            if (file.type === 'application/pdf') {
                newFiles.push({
                    id: crypto.randomUUID(),
                    title: file.name,
                    url: URL.createObjectURL(file)
                });
            }
        });
        setStudyFiles(prev => [...prev, ...newFiles]);
        setActiveSection('study'); // Foca nos arquivos recém-chegados
    };

    // --- LÓGICA DE FLUXO IA (Input -> Processamento -> Output) ---
    const handlePlayDocument = async (doc: StudyDoc) => {
        setIsProcessing(true);
        setActiveSection(null); // Sombra em tudo para focar no Chat

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: `Analise o documento ${doc.title}`, agent: "zenita" })
            });
            const data = await response.json();

            // Chat funciona como Caderno de Insights (apenas AI fala)
            setChatHistory(prev => [...prev, { role: 'ai', text: `[INSIGHT: ${doc.title}]\n\n${data.text}` }]);

            // ROLAGEM AUTOMÁTICA: Move a mesa para mostrar a saída
            setTimeout(() => {
                setIsProcessing(false);
                setActiveSection('citations');
                citationsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 500);
        } catch (e) {
            setIsProcessing(false);
        }
    };

    const handleUserQuestion = async () => {
        if(!prompt.trim()) return;
        const currentPrompt = prompt;
        setPrompt("");
        setIsTyping(true);
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: currentPrompt, agent: "zenita" })
            });
            const data = await response.json();
            setChatHistory(prev => [...prev, { role: 'ai', text: data.text }]);
        } catch (e) { console.error(e); } finally { setIsTyping(false); }
    };

    const handlePasteVideo = async () => {
        try {
            const text = await navigator.clipboard.readText();
            const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
            const match = text.match(regex);
            if (match && match[1]) setVideos(prev => [{ id: crypto.randomUUID(), youtubeId: match[1] }, ...prev]);
        } catch (err) { console.error("Clipboard denied"); }
    };

    const ActionButton = ({ icon: Icon, label, onClick, colorClass = "hover:text-cyan-500" }: any) => (
        <div className="group relative flex flex-col items-center">
            <button onClick={onClick} className={`p-2 bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full transition-all ${colorClass}`}>
                <Icon className="w-4 h-4" />
            </button>
            <span className="absolute -top-8 scale-0 group-hover:scale-100 transition-all bg-slate-800 text-white text-[9px] px-2 py-1 rounded font-bold uppercase tracking-tighter whitespace-nowrap z-[100] shadow-xl">
                {label}
            </span>
        </div>
    );

    return (
        <div
            onDragOver={(e) => { e.preventDefault(); setActiveSection('study'); }}
            onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            className="relative w-full h-screen bg-[#f0f4f8] dark:bg-[#030014] overflow-hidden flex flex-row transition-all duration-500"
        >
            <div className="absolute inset-0 z-0 pointer-events-none opacity-20"><MatrixRain /></div>

            {/* --- FIX: Overlay com pointer-events-none para não bloquear cliques --- */}
            <AnimatePresence>
                {(isAdding || isProcessing || activeSection) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[15] bg-black/20 backdrop-blur-[1px] pointer-events-none"
                    />
                )}
            </AnimatePresence>

            {/* Input Corrigido */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="application/pdf"
                multiple
                onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
            />

            <main
                ref={mainScrollRef}
                onClick={() => setActiveSection(null)}
                className={`relative z-20 flex-1 h-full overflow-y-auto pt-[120px] pl-10 pb-40 custom-scrollbar pr-[460px] space-y-12 transition-all duration-700 ${isProcessing ? 'blur-[4px] opacity-40' : ''}`}
            >
                {/* 1. STUDY FILES */}
                <section
                    onClick={(e) => { e.stopPropagation(); setActiveSection('study'); }}
                    className={`relative rounded-[41px] p-[1px] transition-all duration-500 ${activeSection === 'study' ? 'z-[30]' : 'z-[10]'}`}
                >
                    <div className={`relative p-6 rounded-[40px] border transition-all duration-300 ${activeSection === 'study' ? 'border-cyan-500 shadow-2xl bg-white' : 'border-slate-200 bg-slate-100/95 dark:bg-[#0f172a]/90'}`}>
                        <div className="flex items-center gap-4 mb-6">
                            <span className="bg-cyan-500 text-white text-[10px] font-black px-4 py-1.5 rounded-lg uppercase tracking-widest shadow-lg shadow-cyan-500/20">Study Files</span>
                            <ActionButton
                                icon={PlusIcon}
                                label="Upload ou Arrastar"
                                onClick={(e: any) => { e.stopPropagation(); setIsAdding(true); fileInputRef.current?.click(); }}
                            />
                        </div>
                        <div className="flex flex-row gap-6 overflow-x-auto pb-4 min-h-[300px]">
                            {studyFiles.map(doc => (
                                <ResearchCardPDF
                                    key={doc.id}
                                    title={doc.title}
                                    fileUrl={doc.url}
                                    onDelete={() => setStudyFiles(prev => prev.filter(f => f.id !== doc.id))}
                                    onPlay={() => handlePlayDocument(doc)}
                                />
                            ))}
                        </div>
                    </div>
                </section>

                {/* 2. AI CITATIONS */}
                <section ref={citationsRef} onClick={(e) => { e.stopPropagation(); setActiveSection('citations'); }} className={`relative rounded-[40px] p-6 border transition-all duration-500 ${activeSection === 'citations' ? 'border-cyan-500 shadow-2xl z-[30] bg-white' : 'border-slate-200 bg-slate-100/95 dark:bg-[#0f172a]/90'}`}>
                    <div className="flex items-center justify-between mb-4 pr-4">
                        <div className="flex items-center gap-4">
                            <span className="text-slate-500 dark:text-cyan-400/60 text-[10px] font-black uppercase tracking-widest">AI Citations</span>
                            <div className="flex gap-2">
                                <ActionButton icon={ArrowPathIcon} label="Recarregar" onClick={() => {}} />
                                <ActionButton icon={BookmarkIcon} label="Salvar Tudo" onClick={() => {}} colorClass="hover:text-emerald-500" />
                            </div>
                        </div>
                    </div>
                    <div className="h-[100px] bg-slate-50/50 dark:bg-black/20 rounded-2xl flex items-center justify-center italic text-slate-400 text-xs">Aguardando síntese...</div>
                </section>

                {/* 3. VIDEOS */}
                <section onClick={(e) => { e.stopPropagation(); setActiveSection('videos'); }} className={`relative rounded-[40px] p-6 border transition-all duration-500 ${activeSection === 'videos' ? 'border-cyan-500 shadow-2xl z-[30] bg-white' : 'border-slate-200 bg-slate-100/95 dark:bg-[#0f172a]/90'}`}>
                    <div className="flex items-center gap-4 mb-6">
                        <span className="text-slate-500 dark:text-cyan-400/60 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><VideoCameraIcon className="w-5 h-5" /> Videos</span>
                        <div className="flex gap-3">
                            <ActionButton icon={ClipboardIcon} label="Colar Link Direto" onClick={handlePasteVideo} />
                            <ActionButton icon={SparklesIcon} label="IA Sugerir" onClick={() => {}} colorClass="hover:text-blue-500" />
                        </div>
                    </div>
                    <div className="flex flex-row gap-8 overflow-x-auto pb-4 min-h-[300px]">
                        {videos.map(vid => (
                            <div key={vid.id} className="flex-shrink-0 w-[480px] h-[270px] bg-black rounded-[32px] overflow-hidden shadow-2xl relative group/vid border border-white/5">
                                <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${vid.youtubeId}`} frameBorder="0" allowFullScreen />
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            {/* CHAT DE INSIGHTS (BRANCO GELO / PAPEL) */}
            <aside className={`fixed right-6 z-[60] w-[420px] bg-slate-50 shadow-2xl rounded-[40px] flex flex-col border border-slate-200 transition-all duration-700 ${
                isProcessing || isTyping ? 'top-10 h-[calc(100vh-60px)] border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.3)]' : 'top-[123px] h-[calc(100vh-155px)]'
            }`}>
                <div className="p-8 border-b border-slate-200 flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isProcessing || isTyping ? 'bg-cyan-500 animate-pulse shadow-[0_0_8px_cyan]' : 'bg-slate-300'}`} />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Research Insights</span>
                </div>
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-10 space-y-6 text-slate-800 text-[14px] leading-relaxed font-serif custom-scrollbar">
                    {chatHistory.map((msg, i) => (
                        <div key={i} className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm italic text-slate-600 animate-in fade-in slide-in-from-right-4 duration-500">
                            {msg.text.split('\n').map((line, idx) => <p key={idx}>{line}</p>)}
                        </div>
                    ))}
                    {isTyping && <div className="text-cyan-600 text-[10px] animate-pulse">Agente gerando anotações...</div>}
                </div>
                <div className="p-8 bg-white rounded-b-[40px] border-t border-slate-100">
                    <div className="relative">
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleUserQuestion()}
                            placeholder="Interagir..."
                            className="w-full bg-white border border-black rounded-2xl py-4 px-6 text-[14px] text-black focus:outline-none shadow-sm"
                        />
                        <button onClick={handleUserQuestion} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black rounded-xl text-white hover:bg-slate-800 transition-colors">
                            <ChevronRightIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </aside>
        </div>
    );
}