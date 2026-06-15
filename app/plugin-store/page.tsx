"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
    MagnifyingGlassIcon,
    PuzzlePieceIcon,
    RocketLaunchIcon,
    AcademicCapIcon,
    CubeTransparentIcon,
    ArrowLeftIcon,
    LockClosedIcon,
    CodeBracketIcon,
    SparklesIcon,
    ArrowRightIcon,
    ShieldCheckIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";

// --- INTERFACE ---
interface Plugin {
    id: string;
    name: string;
    author: string;
    description: string;
    category: "Essencial" | "Agentes" | "Mentorias" | "Blockchain";
    tag?: string;
    price: number;
    actionUrl: string;
    isLocked: boolean;
    unlockRequirement?: string;
}

// Capacidade do usuário p/ o Zaeon Code (vem de /api/projects/access).
interface Access {
    authenticated: boolean;
    superAdmin: boolean;
    canUse: boolean;
    reason: string;
    course: string | null;
}

// ─── Zaeon Code: card/banner FIXO em destaque (gating controlado por código) ─────
// Não vem do banco — é injetado sempre primeiro, com gating por curso/super admin.
const ZAEON_CODE = {
    name: "Zaeon Code",
    author: "Zaeon Core",
    tagline: "IDE agêntica no navegador",
    description:
        "Descreva o projeto e a IA planeja, escreve os arquivos um a um, roda e corrige sozinha — " +
        "com memória de projeto, checklist viva e commit direto no seu GitHub. Disponível para " +
        "estudantes de Computação e áreas correlatas.",
    room: "/research-lab?tab=projetos",
};

export default function PluginStorePage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("All");
    const [plugins, setPlugins] = useState<Plugin[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [access, setAccess] = useState<Access | null>(null);
    const [showGate, setShowGate] = useState(false); // modal de elegibilidade

    const categories = ["All", "Essencial", "Agentes", "Mentorias", "Blockchain"];

    useEffect(() => {
        setMounted(true);
        fetchPlugins();
        fetchAccess();
    }, []);

    const fetchPlugins = async () => {
        try {
            setIsLoading(true);
            const res = await fetch("/api/plugins");
            if (res.ok) setPlugins(await res.json());
        } catch (error) {
            console.error("Zaeon Store Sync Error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAccess = async () => {
        try {
            const res = await fetch("/api/projects/access");
            if (res.ok) setAccess(await res.json());
        } catch { /* sem acesso → trata como não elegível */ }
    };

    // Ativar o Zaeon Code: super admin / curso elegível → entra; senão → aviso.
    const activateZaeonCode = useCallback(() => {
        if (access?.canUse) router.push(ZAEON_CODE.room);
        else setShowGate(true);
    }, [access, router]);

    if (!mounted) return null;

    const filteredPlugins = plugins.filter(
        (p) =>
            (category === "All" || p.category === category) &&
            p.name.toLowerCase().includes(search.toLowerCase()),
    );

    const headerContainer =
        "pointer-events-auto w-full max-w-7xl h-16 rounded-full backdrop-blur-2xl transition-all duration-500 " +
        "bg-white/90 border border-slate-300 shadow-xl dark:bg-black/40 dark:border-white/10 dark:shadow-2xl";

    const cardStyle =
        "group relative p-6 rounded-[32px] backdrop-blur-2xl transition-all duration-500 flex flex-col h-full overflow-hidden border " +
        "bg-white/80 border-slate-300 shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:bg-cyan-950/10 dark:border-white/10 dark:shadow-2xl " +
        "hover:border-cyan-500/50 dark:hover:border-cyan-400/40";

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#030014] text-slate-950 dark:text-white transition-colors duration-500 font-sans">

            {/* --- CABEÇALHO LOCAL --- */}
            <div className="sticky top-0 z-[100] w-full pt-6 pb-4 px-6 flex justify-center pointer-events-none">
                <div className={headerContainer}>
                    <div className="flex items-center justify-between h-full px-6">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.push("/")}
                                className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-cyan-600 transition-all border border-transparent hover:border-slate-200 dark:hover:border-white/10"
                            >
                                <ArrowLeftIcon className="w-5 h-5" />
                            </button>
                            <div className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 dark:text-cyan-900/80">
                                Zaeon <span className="text-cyan-600 dark:text-cyan-500">Modules</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Selo de papel: super admin tem destaque */}
                            {access?.superAdmin ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest text-white"
                                    style={{ background: "linear-gradient(135deg,#8b5cf6,#06b6d4)" }}>
                                    <ShieldCheckIcon className="w-3.5 h-3.5" /> Admin Supremo
                                </span>
                            ) : (
                                <span className="text-[10px] font-black text-slate-400 dark:text-white/20 uppercase tracking-widest mr-2">Secure Link</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-6 py-10 space-y-12">

                {/* TÍTULO E BUSCA */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="space-y-1 text-center md:text-left">
                        <h1 className="text-6xl font-black tracking-tighter text-slate-950 dark:text-white leading-none">Plugin Store</h1>
                        <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-cyan-600 dark:text-cyan-400 pl-1">Upgrade your workstation equipment</p>
                    </div>
                    <div className="relative w-full max-w-md">
                        <MagnifyingGlassIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search modules..."
                            className="w-full pl-14 pr-6 py-4 rounded-[22px] bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 outline-none focus:ring-2 ring-cyan-500 transition-all text-sm shadow-inner dark:shadow-none"
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* ─── EM DESTAQUE: ZAEON CODE (banner) ─────────────────────────── */}
                <ZaeonCodeHero access={access} onActivate={activateZaeonCode} />

                {/* CATEGORIAS */}
                <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 dark:text-white/30 mb-4 pl-1">Todos os módulos</div>
                    <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setCategory(cat)}
                                className={`px-7 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                                    category === cat
                                        ? "bg-slate-950 dark:bg-cyan-500 text-white dark:text-black shadow-xl scale-105"
                                        : "bg-white/90 dark:bg-white/5 text-slate-400 dark:text-white/40 border border-slate-300 dark:border-transparent hover:text-slate-900 dark:hover:text-white shadow-sm"
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* GRID DE PLUGINS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
                    {isLoading ? (
                        <div className="col-span-full py-32 text-center">
                            <div className="inline-block w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-40">Connecting to Grid...</p>
                        </div>
                    ) : filteredPlugins.length === 0 ? (
                        <div className="col-span-full py-24 text-center text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400 dark:text-white/30">
                            Nenhum módulo encontrado
                        </div>
                    ) : (
                        filteredPlugins.map((plugin) => <PluginCard key={plugin.id} plugin={plugin} cardStyle={cardStyle} />)
                    )}
                </div>
            </main>

            {/* MODAL: elegibilidade do Zaeon Code */}
            <AnimatePresence>
                {showGate && <EligibilityModal access={access} onClose={() => setShowGate(false)} onProfile={() => router.push("/research-lab?tab=profile")} />}
            </AnimatePresence>
        </div>
    );
}

// ─── HERO do Zaeon Code ──────────────────────────────────────────────────────────
function ZaeonCodeHero({ access, onActivate }: { access: Access | null; onActivate: () => void }) {
    const canUse = !!access?.canUse;
    const isAdmin = !!access?.superAdmin;
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-[36px] border border-violet-300/40 dark:border-white/10 p-8 md:p-10"
            style={{
                background:
                    "linear-gradient(135deg, rgba(139,92,246,0.16), rgba(6,182,212,0.10))",
                boxShadow: "0 30px 80px -40px rgba(99,102,241,0.6)",
            }}
        >
            {/* glow decorativo */}
            <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(34,211,238,0.35), transparent 70%)" }} />
            <div className="pointer-events-none absolute -bottom-24 -left-16 w-72 h-72 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.35), transparent 70%)" }} />

            <div className="relative flex flex-col lg:flex-row lg:items-center gap-8">
                <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.25em] text-white" style={{ background: "linear-gradient(135deg,#8b5cf6,#06b6d4)" }}>
                            <SparklesIcon className="w-3.5 h-3.5" /> Em destaque
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-violet-700 dark:text-cyan-300/80">{ZAEON_CODE.tagline}</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0" style={{ background: "linear-gradient(135deg,#8b5cf6,#06b6d4)", boxShadow: "0 10px 30px -10px rgba(99,102,241,0.8)" }}>
                            <CodeBracketIcon className="w-7 h-7" />
                        </div>
                        <div>
                            <h2 className="text-4xl font-black tracking-tighter text-slate-950 dark:text-white leading-none">{ZAEON_CODE.name}</h2>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-cyan-700 uppercase tracking-widest mt-1">Dev: {ZAEON_CODE.author}</p>
                        </div>
                    </div>

                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed max-w-2xl">{ZAEON_CODE.description}</p>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                        <button
                            onClick={onActivate}
                            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] text-white transition-transform hover:scale-[1.03] active:scale-95"
                            style={{ background: "linear-gradient(135deg,#8b5cf6,#06b6d4)", boxShadow: "0 12px 30px -10px rgba(34,211,238,0.7)" }}
                        >
                            {canUse ? "Abrir Zaeon Code" : "Ativar"} <ArrowRightIcon className="w-4 h-4" />
                        </button>

                        {/* selo de estado de acesso */}
                        {isAdmin ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-violet-700 dark:text-cyan-300"><ShieldCheckIcon className="w-4 h-4" /> Acesso total (admin)</span>
                        ) : canUse ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400"><AcademicCapIcon className="w-4 h-4" /> Liberado pelo seu curso</span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400"><LockClosedIcon className="w-4 h-4" /> Exclusivo para Computação</span>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// ─── Modal de elegibilidade (aviso amigável ao tentar ativar sem curso) ──────────
function EligibilityModal({ access, onClose, onProfile }: { access: Access | null; onClose: () => void; onProfile: () => void }) {
    const notAuthed = access && !access.authenticated;
    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-md rounded-[28px] p-8 border border-violet-300/40 dark:border-white/10 bg-white dark:bg-[#0b0a1a]"
                style={{ boxShadow: "0 40px 100px -30px rgba(0,0,0,0.7)" }}
            >
                <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 dark:hover:text-white"><XMarkIcon className="w-5 h-5" /></button>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-5" style={{ background: "linear-gradient(135deg,#8b5cf6,#06b6d4)" }}>
                    <LockClosedIcon className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white mb-2">Zaeon Code é para Computação</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {notAuthed
                        ? "Entre na sua conta Zaeon para verificarmos o seu curso. O Zaeon Code é liberado para estudantes de Computação e áreas correlatas."
                        : "Este módulo é exclusivo para estudantes de cursos de Computação e áreas correlatas (Ciência da Computação, Engenharia de Software, Sistemas de Informação, ADS, Engenharia da Computação, Redes, Cibersegurança, Ciência de Dados, IA, entre outros)."}
                </p>
                {access?.course && !notAuthed && (
                    <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                        Seu curso atual: <span className="font-bold text-slate-700 dark:text-slate-200">{access.course}</span>.
                        Se você se enquadra e o acesso não foi liberado, ajuste o curso no seu perfil.
                    </p>
                )}
                <div className="mt-6 flex items-center gap-3">
                    <button onClick={onProfile} className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white transition-transform hover:scale-[1.02]" style={{ background: "linear-gradient(135deg,#8b5cf6,#6d28d9)" }}>
                        Ir para o Perfil
                    </button>
                    <button onClick={onClose} className="px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5">
                        Fechar
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

function PluginCard({ plugin, cardStyle }: { plugin: Plugin; cardStyle: string }) {
    const getIcon = () => {
        switch (plugin.category) {
            case "Agentes": return <RocketLaunchIcon className="w-6 h-6" />;
            case "Mentorias": return <AcademicCapIcon className="w-6 h-6" />;
            case "Blockchain": return <CubeTransparentIcon className="w-6 h-6" />;
            default: return <PuzzlePieceIcon className="w-6 h-6" />;
        }
    };

    return (
        <motion.div
            layout
            whileHover={plugin.isLocked ? {} : { y: -10 }}
            className={`${cardStyle} ${plugin.isLocked ? "grayscale opacity-70" : ""}`}
        >
            {plugin.isLocked && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-100/10 dark:bg-black/60 backdrop-blur-[5px]">
                    <div className="w-16 h-16 rounded-full bg-white dark:bg-white/10 flex items-center justify-center shadow-2xl mb-4 border border-slate-200 dark:border-white/20">
                        <LockClosedIcon className="w-8 h-8 text-slate-900 dark:text-cyan-400" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white text-center px-8 leading-relaxed drop-shadow-md">
                        {plugin.unlockRequirement || "Access Denied"}
                    </span>
                </div>
            )}

            <div className="flex justify-between items-start mb-8">
                <div className="p-4 rounded-2xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20 shadow-inner">
                    {getIcon()}
                </div>
                {plugin.tag && (
                    <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/10 border border-slate-300 dark:border-white/10 text-slate-500 dark:text-white/50 shadow-sm">
                        {plugin.tag}
                    </span>
                )}
            </div>

            <div className="space-y-3 flex-1">
                <h3 className="text-2xl font-black tracking-tighter text-slate-950 dark:text-white leading-tight">{plugin.name}</h3>
                <p className="text-[10px] font-bold text-slate-400 dark:text-cyan-800 uppercase tracking-widest">Dev: {plugin.author}</p>
                <p className={`text-sm text-slate-600 dark:text-slate-400 leading-relaxed mt-4 line-clamp-3 ${plugin.isLocked ? "blur-sm" : ""}`}>
                    {plugin.description}
                </p>
            </div>

            <div className="mt-10 pt-6 border-t border-slate-200 dark:border-white/5 flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Investment</span>
                    <span className="text-lg font-black text-slate-950 dark:text-white">{plugin.price === 0 ? "FREE" : `$${plugin.price}`}</span>
                </div>
                <button
                    disabled={plugin.isLocked}
                    className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                        plugin.isLocked
                            ? "bg-slate-200 text-slate-400 dark:bg-white/5 dark:text-white/10"
                            : "bg-slate-950 dark:bg-cyan-500 text-white dark:text-black hover:scale-105 active:scale-95 shadow-xl shadow-cyan-500/20"
                    }`}
                >
                    {plugin.isLocked ? "Locked" : "Activate"}
                </button>
            </div>
        </motion.div>
    );
}
