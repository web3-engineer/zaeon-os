"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useMotionTemplate } from "framer-motion";
import Link from "next/link";
import NextImage from "next/image";
import { useTranslation } from "react-i18next";
import {
    CalendarDaysIcon,
    SparklesIcon,
    BookOpenIcon,
    ArrowTopRightOnSquareIcon,
    RocketLaunchIcon
} from "@heroicons/react/24/outline";

// --- TYPES ---
interface NewsPost {
    id: string;
    title: Record<string, string>;
    subtitle: Record<string, string>;
    content: Record<string, string>;
    imageUrl: string;
    publishDate: string;
    status: string;
    category: "news" | "report";
}

// --- LOUPE TEXT (Modo Leitura com Foco Reconstruído) ---
function LoupeText({ content }: { content: string }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isLoupeEnabled, setIsLoupeEnabled] = useState(false);

    // Controle do Mouse para o efeito de Lupa
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    // Suavização do movimento
    const springX = useSpring(mouseX, { stiffness: 500, damping: 50 });
    const springY = useSpring(mouseY, { stiffness: 500, damping: 50 });

    // Máscara radial dinâmica
    const maskImage = useMotionTemplate`radial-gradient(140px at ${springX}px ${springY}px, black 0%, transparent 100%)`;

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        mouseX.set(e.clientX - rect.left);
        mouseY.set(e.clientY - rect.top);
    };

    return (
        <div className="space-y-6 mt-8 border-t border-slate-200 dark:border-white/10 pt-8">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Conteúdo da Matéria</span>
                <button
                    onClick={() => setIsLoupeEnabled(!isLoupeEnabled)}
                    className={`text-[10px] font-bold px-4 py-2 rounded-full border transition-all duration-300 ${isLoupeEnabled ? 'bg-cyan-500 text-white border-cyan-500 shadow-lg shadow-cyan-500/30' : 'text-slate-500 border-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                >
                    {isLoupeEnabled ? "DESATIVAR FOCO" : "ATIVAR MODO FOCO"}
                </button>
            </div>
            <div
                ref={containerRef}
                onMouseMove={handleMouseMove}
                className={`relative ${isLoupeEnabled ? 'cursor-none' : ''}`}
            >
                {/* Texto Base (Fica ofuscado quando a lupa está ativa) */}
                <p className={`text-sm md:text-base leading-loose font-serif whitespace-pre-wrap transition-colors duration-500 ${isLoupeEnabled ? 'text-slate-200 dark:text-slate-800' : 'text-slate-600 dark:text-slate-400'}`}>
                    {content}
                </p>

                {/* Camada da Lupa (Revela o texto com destaque) */}
                {isLoupeEnabled && (
                    <motion.div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            WebkitMaskImage: maskImage,
                            maskImage: maskImage,
                        }}
                    >
                        <p className="text-sm md:text-base leading-loose font-serif whitespace-pre-wrap text-slate-900 dark:text-white font-semibold">
                            {content}
                        </p>
                    </motion.div>
                )}
            </div>
        </div>
    );
}

// --- MAIN COMPONENT ---
export default function LoungeNewsFeed() {
    const { i18n } = useTranslation();
    const activeLocale = i18n?.language ? i18n.language.split('-')[0] : 'pt';

    const [newsList, setNewsList] = useState<NewsPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedNews, setSelectedNews] = useState<NewsPost | null>(null);

    // Controle de expansão da barra lateral (Inicia aberta)
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const res = await fetch('/api/news');
                if (res.ok) {
                    const data = await res.json();
                    const sorted = data.sort((a: any, b: any) =>
                        new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
                    );
                    const publishedNews = sorted.filter((post: NewsPost) => post.status === 'published');
                    setNewsList(publishedNews);

                    if (publishedNews.length > 0) {
                        setSelectedNews(publishedNews[0]);
                    }
                }
            } catch (e) {
                console.error("Erro ao buscar notícias:", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchNews();
    }, []);

    const handleSelectNews = (post: NewsPost) => {
        setSelectedNews(post);

        // Minimiza a barra ao selecionar a notícia no Desktop
        if (window.innerWidth >= 1024) {
            setIsSidebarExpanded(false);
        }

        // Rola até o artigo no Mobile
        if (window.innerWidth < 1024 && contentRef.current) {
            contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    if (isLoading) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center space-y-4">
                <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Sincronizando Banco de Dados</div>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto h-full min-h-[85vh] flex flex-col lg:flex-row gap-8 p-4 md:p-6 lg:p-8">

            {/* --- BARRA LATERAL (LISTA DE NOTÍCIAS) COM ANIMAÇÃO SLIDE IN/OUT --- */}
            <aside
                onMouseEnter={() => window.innerWidth >= 1024 && setIsSidebarExpanded(true)}
                onMouseLeave={() => window.innerWidth >= 1024 && setIsSidebarExpanded(false)}
                className={`flex-shrink-0 h-full lg:h-[85vh] overflow-hidden transition-[width] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] z-10
                    ${isSidebarExpanded ? 'w-full lg:w-[350px] xl:w-[400px]' : 'w-full lg:w-[96px]'}
                `}
            >
                {/* O container interno fixa a largura no desktop para evitar quebra de texto ao retrair */}
                <div className={`flex flex-col h-full w-full ${isSidebarExpanded ? '' : 'lg:w-[350px] xl:w-[400px]'}`}>
                    <div className="pb-6 border-b border-slate-200 dark:border-white/10 mb-6 flex-shrink-0 whitespace-nowrap overflow-hidden">
                        <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
                            The Lounge <SparklesIcon className="w-6 h-6 text-cyan-500 flex-shrink-0" />
                        </h1>

                        {/* Data removida daqui conforme solicitado */}

                        <Link href="/news/hedera-hackathon" className="inline-block mt-4">
                            <div className="group flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 transition-all cursor-pointer shadow-sm">
                                <div className="relative flex h-2.5 w-2.5 flex-shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                        Aviso FUNCAP / SUDENE
                                    </span>
                                    <span className="text-[8px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">
                                        Acessar Justificativa Oficial
                                    </span>
                                </div>
                            </div>
                        </Link>
                    </div>

                    {/* Destaque */}
                    <Link href="/news/hedera-hackathon-2025">
                        <div className="mb-6 group cursor-pointer relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-900/20 dark:to-purple-900/20 p-4 shadow-lg transition-all duration-300 hover:border-indigo-500/60 hover:shadow-indigo-500/20 flex-shrink-0">
                            <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="flex gap-4 items-center relative z-10 whitespace-nowrap">
                                <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-indigo-500/20 bg-indigo-900/50">
                                    <NextImage
                                        src="https://images.unsplash.com/photo-1639762681485-074b7f4ec651?q=80&w=200&auto=format&fit=crop"
                                        alt="Hedera Hackathon"
                                        fill
                                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1">
                                        <RocketLaunchIcon className="w-3 h-3" /> Special Feature
                                    </span>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight group-hover:text-indigo-500 transition-colors">
                                        Hedera Hackathon Cobertura Exclusiva
                                    </h3>
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Lista com Scroll Oculto */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 space-y-3 custom-scrollbar">
                        {newsList.map((item) => {
                            const isSelected = selectedNews?.id === item.id;
                            const title = item.title[activeLocale] || item.title['pt'] || "";

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => handleSelectNews(item)}
                                    className={`group cursor-pointer p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden whitespace-nowrap
                                        ${isSelected
                                            ? 'bg-white dark:bg-slate-800 border-cyan-500 shadow-md scale-[1.02]'
                                            : 'bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-white/5 hover:border-slate-200 dark:hover:border-white/10'
                                        }`}
                                >
                                    {isSelected && (
                                        <motion.div layoutId="activeIndicator" className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500" />
                                    )}

                                    <div className="flex gap-4">
                                        {item.imageUrl && (
                                            <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                                                <NextImage
                                                    src={item.imageUrl}
                                                    alt={title}
                                                    fill
                                                    className={`object-cover transition-transform duration-500 ${isSelected ? 'scale-110' : 'group-hover:scale-110'}`}
                                                />
                                            </div>
                                        )}
                                        <div className="flex flex-col justify-center overflow-hidden">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${item.category === 'report' ? 'text-amber-500' : 'text-cyan-600'}`}>
                                                    {item.category === 'report' ? 'Report' : 'News'}
                                                </span>
                                            </div>
                                            <h3 className={`text-sm font-bold truncate leading-tight transition-colors ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                                                {title}
                                            </h3>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </aside>

            {/* --- ÁREA PRINCIPAL (LEITURA DA NOTÍCIA) --- */}
            <main ref={contentRef} className="flex-1 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] bg-white dark:bg-[#0f172a] rounded-[40px] border border-slate-200 dark:border-white/10 overflow-hidden relative shadow-2xl lg:h-[85vh] lg:overflow-y-auto custom-scrollbar">
                <AnimatePresence mode="wait">
                    {selectedNews ? (
                        <motion.article
                            key={selectedNews.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.4 }}
                            className="p-6 md:p-10 lg:p-16"
                        >
                            {selectedNews.imageUrl && (
                                <div className="relative w-full h-[300px] md:h-[400px] rounded-3xl overflow-hidden mb-10 shadow-lg">
                                    <NextImage
                                        src={selectedNews.imageUrl}
                                        alt="Cover"
                                        fill
                                        className="object-cover"
                                        priority
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                                    <div className="absolute bottom-6 left-6 flex items-center gap-3">
                                        <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                            <CalendarDaysIcon className="w-3 h-3" />
                                            {new Date(selectedNews.publishDate).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="max-w-3xl mx-auto">
                                <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white leading-tight mb-6 tracking-tight">
                                    {selectedNews.title[activeLocale] || selectedNews.title['pt']}
                                </h1>

                                <h2 className="text-xl md:text-2xl text-slate-500 dark:text-slate-400 font-medium italic mb-8">
                                    {selectedNews.subtitle[activeLocale] || selectedNews.subtitle['pt']}
                                </h2>

                                {selectedNews.category === 'report' && (
                                    <div className="mb-10 p-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                        <div>
                                            <h4 className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                                <BookOpenIcon className="w-4 h-4" /> Artigo de Profundidade
                                            </h4>
                                            <p className="text-xs text-slate-500">Este conteúdo possui uma página dedicada de leitura.</p>
                                        </div>
                                        <Link href={`/study-rooms/lounge/main-lounge/news/articles?id=${selectedNews.id}`}>
                                            <button className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase tracking-widest rounded-full transition-colors shadow-lg shadow-amber-500/30">
                                                Acessar Report <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                                            </button>
                                        </Link>
                                    </div>
                                )}

                                {/* Componente de Lupa Atualizado */}
                                <LoupeText content={selectedNews.content[activeLocale] || selectedNews.content['pt'] || ""} />
                            </div>
                        </motion.article>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-400 italic font-serif">
                            Selecione uma matéria na lista ao lado.
                        </div>
                    )}
                </AnimatePresence>
            </main>

            {/* --- ESTILOS DE SCROLL INLINE --- */}
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: rgba(148, 163, 184, 0.3);
                    border-radius: 20px;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: rgba(255, 255, 255, 0.1);
                }
            `}</style>
        </div>
    );
}