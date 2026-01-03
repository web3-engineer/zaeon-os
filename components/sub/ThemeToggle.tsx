"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "@heroicons/react/24/solid"; // Usando SOLID para preenchimento
import { motion } from "framer-motion";

export default function ThemeToggle() {
    const [mounted, setMounted] = useState(false);
    const { theme, setTheme } = useTheme();

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className="w-8 h-8" />; // Placeholder para evitar layout shift
    }

    return (
        <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="relative p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors duration-300 group focus:outline-none"
            aria-label="Toggle Theme"
        >
            <div className="relative w-6 h-6">
                {/* SOL: Amarelo Preenchido, rotaciona e some no dark mode */}
                <motion.div
                    initial={{ rotate: 0, scale: 1, opacity: 1 }}
                    animate={theme === "dark" ? { rotate: 90, scale: 0, opacity: 0 } : { rotate: 0, scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 flex items-center justify-center"
                >
                    <SunIcon className="w-6 h-6 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                </motion.div>

                {/* LUA: Preta (ou Branca no dark mode para contraste) Preenchida, rotaciona e aparece no dark mode */}
                <motion.div
                    initial={{ rotate: -90, scale: 0, opacity: 0 }}
                    animate={theme === "dark" ? { rotate: 0, scale: 1, opacity: 1 } : { rotate: -90, scale: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 flex items-center justify-center"
                >
                    {/* No modo Dark, a lua precisa ser clara para aparecer no fundo escuro.
              Se você quiser estritamente "preta", ela sumiria no fundo preto.
              Vou colocar um tom cinza-azulado muito bonito para "noite". */}
                    <MoonIcon className="w-5 h-5 text-slate-200 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" />
                </motion.div>
            </div>
        </button>
    );
}