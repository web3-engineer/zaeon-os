"use client";

import { useState, useEffect } from 'react';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { motion } from 'framer-motion';
import { TrashIcon, PlayIcon } from '@heroicons/react/24/solid';
import { ArrowsPointingOutIcon } from '@heroicons/react/24/outline';
import '@react-pdf-viewer/core/lib/styles/index.css';

interface PDFCardProps {
    fileUrl: string;
    title: string;
    onDelete: () => void;
    onPlay: () => void;
}

export default function ResearchCardPDF({ fileUrl, title, onDelete, onPlay }: PDFCardProps) {
    const [mounted, setMounted] = useState(false);

    // Garante que o PDF Viewer só renderize no cliente para evitar erros de hidratação
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-shrink-0 w-[240px] h-[320px] bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xl flex flex-col group relative transition-all"
        >
            {/* --- HEADER DO CARD --- */}
            <div className="h-9 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between px-3 z-20">
                <span className="text-[8px] font-mono text-slate-500 dark:text-cyan-400 truncate uppercase tracking-widest font-bold max-w-[140px]">
                    {title}
                </span>

                <div className="flex items-center gap-1">
                    {/* Botão Deletar (Lixeira Vermelha) */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="p-1 hover:bg-red-500/10 rounded transition-colors group/trash"
                        title="Remover arquivo"
                    >
                        <TrashIcon className="w-3.5 h-3.5 text-red-500/40 group-hover/trash:text-red-500" />
                    </button>
                    <ArrowsPointingOutIcon className="w-3.5 h-3.5 text-slate-300 dark:text-white/20" />
                </div>
            </div>

            {/* --- PREVIEW DO PDF --- */}
            <div className="flex-1 bg-white dark:bg-black pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity">
                <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                    <div className="h-full w-full">
                        <Viewer
                            fileUrl={fileUrl}
                            defaultScale={0.3}
                            theme={typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                        />
                    </div>
                </Worker>
            </div>

            {/* --- BOTÃO PLAY CENTRAL (FLUXO IA) --- */}
            {/* Aparece suavemente ao passar o mouse, criando o efeito de "jogar" no chat */}
            <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-black/5 dark:bg-black/20 backdrop-blur-[2px]">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onPlay();
                    }}
                    className="p-4 bg-cyan-500 text-white rounded-full shadow-[0_0_25px_rgba(6,182,212,0.6)] hover:scale-110 active:scale-95 transition-all transform"
                    title="Analisar documento com Zaeon"
                >
                    <PlayIcon className="w-6 h-6" />
                </button>
            </div>

            {/* Efeito de brilho na borda ao passar o mouse */}
            <div className="absolute inset-0 border-2 border-transparent group-hover:border-cyan-500/30 rounded-2xl pointer-events-none transition-all" />
        </motion.div>
    );
}