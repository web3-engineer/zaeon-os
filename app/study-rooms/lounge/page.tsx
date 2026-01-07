"use client";
import { motion, AnimatePresence } from "framer-motion";

export default function LoungePage() {
    // ... (estados mantidos)

    // ESTILO "ICE GLASS" REFINADO
    // Dark: Mantém o visual Cyberpunk
    // Light: Branco Gelo com degradê suave e borda acetinada
    const cardStyle = `
        dark:bg-[#080808]/60 
        bg-gradient-to-br from-slate-50/90 to-slate-200/70
        backdrop-blur-2xl 
        dark:border-white/10 border-white/40
        border
        dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.8)] 
        shadow-[0_20px_40px_rgba(0,0,0,0.05),inset_0_0_15px_rgba(255,255,255,0.5)]
    `;

    return (
        <div className="relative z-0 w-screen h-screen dark:bg-gradient-to-br dark:from-[#0d0118] dark:via-[#1a052e] dark:to-[#050505] bg-[#f8fafc] dark:text-white text-slate-800 font-sans overflow-hidden flex items-start justify-center px-6 gap-6 pt-32 transition-all duration-700">

            {/* BACKGROUND DE FUNDO NO LIGHT MODE */}
            <div className="absolute inset-0 z-[-1] pointer-events-none overflow-hidden">
                {/* Blobs mais suaves para o Ice Mode */}
                <div className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] dark:bg-[#d946ef]/15 bg-blue-100/40 blur-[130px] rounded-full animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] dark:bg-[#4f46e5]/10 bg-pink-100/30 blur-[110px] rounded-full"></div>

                {/* Scanlines invertidas para o modo claro */}
                <div className="absolute inset-0 bg-[url('/scanlines.png')] opacity-[0.02] dark:invert-0 invert"></div>
            </div>

            {/* ... (Todo o restante do layout continua igual) */}

            {/* Dica: Ajuste no SidebarItem para combinar com o Ice White */}
        </div>
    );
}

// Ajuste rápido no SidebarItem para o modo light
function SidebarItem({ icon, label, active, expanded, onClick }: any) {
    return (
        <button onClick={onClick} className={`flex items-center gap-4 w-full p-3 rounded-xl transition-all 
            ${active
            ? 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20 shadow-sm'
            : 'dark:text-white/30 text-slate-400 hover:bg-white/50 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-white border border-transparent'
        }`}>
            <div className="shrink-0">{icon}</div>
            {expanded && <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-[10px] font-bold uppercase tracking-widest truncate">{label}</motion.span>}
        </button>
    );
}