"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    motion,
    AnimatePresence,
    useMotionValue,
    useSpring,
    useMotionTemplate,
    useTransform
} from "framer-motion";
import Link from "next/link";
import NextImage from "next/image";
import { useTranslation } from "react-i18next";
import {
    NewspaperIcon,
    ChevronDownIcon,
    CalendarDaysIcon,
    ArrowRightIcon,
    SparklesIcon
} from "@heroicons/react/24/outline";

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

function LoupeText({ content, category }: { content: string, category: string }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isHovering, setIsHovering] = useState(false);
    const [isLoupeEnabled, setIsLoupeEnabled] = useState(false);
    const [loupeRadius, setLoupeRadius] = useState(35);

    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const smoothX = useSpring(mouseX, { stiffness: 400, damping: 30 });
    const smoothY = useSpring(mouseY, { stiffness: 400, damping: 30 });

    const LENS_WIDTH = loupeRadius * 6;
    const LENS_HEIGHT = loupeRadius * 2.5;

    const topInset = useTransform(smoothY, y => y - LENS_HEIGHT / 2);
    const rightInset = useTransform(smoothX, x => `calc(100% - ${x + LENS_WIDTH / 2}px)`);
    const bottomInset = useTransform(smoothY, y => `calc(100% - ${y + LENS_HEIGHT / 2}px)`);
    const leftInset = useTransform(smoothX, x => x - LENS_WIDTH / 2);

    const clipPath = useMotionTemplate`inset(${topInset}px ${rightInset} ${bottomInset} ${leftInset}px round 20px)`;
    const originTemplate = useMotionTemplate`${smoothX}px ${smoothY}px`;

    const lensX = useTransform(smoothX, x => x - LENS_WIDTH / 2);
    const lensY = useTransform(smoothY, y => y - LENS_HEIGHT / 2);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current || !isLoupeEnabled) return;
        const rect = containerRef.current.getBoundingClientRect();
        mouseX.set(e.clientX - rect.left);
        mouseY.set(e.clientY - rect.top);
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-6 border-b border-slate-200 dark:border-white/5 pb-4 mb-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                        <input
                            type="checkbox"
                            className="sr-only"
                            checked={isLoupeEnabled}
                            onChange={(e) => setIsLoupeEnabled(e.target.checked)}
                        />
                        <div className={`block w-8 h-4 rounded-full transition-colors ${isLoupeEnabled ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                        <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform ${isLoupeEnabled ? 'transform translate-x-4' : ''}`}></div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 group-hover:text-cyan-500 transition-colors">
                        Focus Reader
                    </span>
                </label>

                <AnimatePresence>
                    {isLoupeEnabled && (
                        <motion.div
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            className="flex items-center gap-3 overflow-hidden"
                        >
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Lens Size</span>
                            <input
                                type="range"
                                min="20"
                                max="60"
                                value={loupeRadius}
                                onChange={(e) => setLoupeRadius(Number(e.target.value))}
                                className="w-24 h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div
                ref={containerRef}
                className={`relative w-full ${isLoupeEnabled ? 'cursor-none group/loupe' : ''}`}
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
            >
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-serif whitespace-pre-wrap">
                    {content}
                </p>

                {isLoupeEnabled && (
                    <>
                        <motion.div
                            className="absolute inset-0 pointer-events-none z-10"
                            style={{
                                clipPath: clipPath,
                                WebkitClipPath: clipPath,
                                opacity: isHovering ? 1 : 0
                            }}
                        >
                            <div className="absolute inset-0 bg-white dark:bg-[#1e293b]" />
                            <motion.div
                                className="absolute inset-0 w-full h-full"
                                style={{ transformOrigin: originTemplate }}
                                animate={{ scale: isHovering ? 1.35 : 1 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                            >
                                <p className="text-sm text-slate-900 dark:text-white leading-relaxed font-serif whitespace-pre-wrap font-medium shadow-sm">
                                    {content}
                                </p>
                            </motion.div>
                        </motion.div>

                        <motion.div
                            className="absolute pointer-events-none rounded-[20px] border-[1.5px] border-cyan-400/80 shadow-[0_4px_15px_rgba(0,0,0,0.3)] bg-cyan-500/5 backdrop-blur-[1px] z-50"
                            style={{
                                width: LENS_WIDTH,
                                height: LENS_HEIGHT,
                                x: lensX,
                                y: lensY,
                                opacity: isHovering ? 1 : 0,
                                scale: isHovering ? 1 : 0.8
                            }}
                            transition={{ duration: 0.2 }}
                        />
                    </>
                )}

                {category === 'report' && (
                    <div className="mt-8 relative z-20 inline-block px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[9px] uppercase tracking-widest font-bold rounded-lg pointer-events-none">
                        Archived Report
                    </div>
                )}
            </div>
        </div>
    );
}

function NewsCard({ item, locale }: { item: NewsPost, locale: string }) {
    const [isExpanded, setIsExpanded] = useState<boolean>(false);
    const dateFormatted = new Date(item.publishDate).toLocaleDateString('en-US', {
        month: 'short', day: '2-digit', year: 'numeric'
    });

    const title = item.title[locale] || item.title['en'] || item.title['pt'] || "";
    const subtitle = item.subtitle[locale] || item.subtitle['en'] || item.subtitle['pt'] || "";
    const content = item.content[locale] || item.content['en'] || item.content['pt'] || "";

    return (
        <motion.div layout
            onClick={() => setIsExpanded(!isExpanded)}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`flex flex-col rounded-2xl border transition-all cursor-pointer group relative
                ${isExpanded
                    ? "bg-white dark:bg-[#1e293b] border-cyan-500/50 shadow-2xl z-20"
                    : "bg-white/40 dark:bg-white/[0.03] border-slate-200 dark:border-white/5 hover:border-[#0f172a]/30 dark:hover:border-white/20 overflow-hidden"
                }`}
        >
            {item.imageUrl && (
                <div className="w-full h-32 sm:h-40 overflow-hidden relative border-b border-slate-200 dark:border-white/5 rounded-t-2xl">
                    <NextImage
                        src={item.imageUrl}
                        alt={title}
                        fill
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-50 dark:opacity-80" />
                </div>
            )}

            <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl transition-colors ${isExpanded ? "bg-cyan-600 text-white" : "bg-[#0f172a]/5 dark:bg-white/10 text-[#0f172a] dark:text-white"}`}>
                            <NewspaperIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-[#0f172a] dark:text-slate-200 leading-tight">{title}</h4>
                            <p className="text-[10px] font-medium text-slate-500 mt-1 max-w-md truncate">{subtitle}</p>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-slate-200 dark:bg-white/10 text-slate-500 flex items-center gap-1">
                            <CalendarDaysIcon className="w-3 h-3" /> {dateFormatted}
                        </span>
                        <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                    </div>
                </div>

                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0, overflow: "hidden" }}
                            animate={{ height: "auto", opacity: 1, transitionEnd: { overflow: "visible" } }}
                            exit={{ height: 0, opacity: 0, overflow: "hidden" }}
                            className="w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="mt-4 pt-6 border-t border-slate-200 dark:border-white/5 relative">
                                <LoupeText content={content} category={item.category} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

export default function NewsPanel({ className }: { className?: string }) {
    const { i18n } = useTranslation();
    const activeLocale = i18n.language.split('-')[0];

    const [newsList, setNewsList] = useState<NewsPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const res = await fetch('/api/news');
                if (res.ok) {
                    const data = await res.json();
                    setNewsList(data.filter((post: NewsPost) => post.status === 'published'));
                }
            } catch (error) {
                console.error("Erro:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchNews();
    }, []);

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const featuredReport = newsList.find(post => {
        if (post.category !== 'report') return false;
        const postDate = new Date(post.publishDate);
        return postDate.getMonth() === currentMonth && postDate.getFullYear() === currentYear;
    });

    const regularNews = newsList.filter(post => post.id !== featuredReport?.id);

    if (isLoading) return <div className="p-10 text-center text-slate-500 animate-pulse uppercase tracking-[0.2em] text-xs font-black">Syncing Database...</div>;

    return (
        <div className={`w-full max-w-4xl mx-auto h-full flex flex-col gap-8 p-6 ${className ?? ''}`}>
            {featuredReport && (
                <Link href={`/study-rooms/lounge/main-lounge/news/articles?id=${featuredReport.id}`}>
                    <div className="w-full rounded-[30px] bg-[#0f172a] border border-cyan-500/30 shadow-2xl overflow-hidden relative group cursor-pointer hover:border-cyan-400 transition-colors">
                        <div className="absolute inset-0 z-0">
                            <NextImage src={featuredReport.imageUrl} alt="Cover" fill className="w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/80 to-transparent" />
                        </div>
                        <div className="relative z-10 p-8 flex flex-col h-full justify-end min-h-[300px]">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                                </span>
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">Report of the Month</h3>
                            </div>
                            <h1 className="text-3xl font-black text-white mb-2 tracking-tight group-hover:text-cyan-300 transition-colors">
                                {featuredReport.title[activeLocale] || featuredReport.title['pt']}
                            </h1>
                            <p className="text-sm font-medium text-slate-300 max-w-2xl mb-6">
                                {featuredReport.subtitle[activeLocale] || featuredReport.subtitle['pt']}
                            </p>
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-400 group-hover:translate-x-2 transition-transform">
                                Read Full Article <ArrowRightIcon className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                </Link>
            )}

            <div className="flex items-center justify-between px-2 mt-4">
                <h2 className="text-[#0f172a] dark:text-white text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5" /> Latest Updates
                </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 pb-20">
                {regularNews.map((item) => (
                    <NewsCard key={item.id} item={item} locale={activeLocale} />
                ))}
            </div>
        </div>
    );
}
