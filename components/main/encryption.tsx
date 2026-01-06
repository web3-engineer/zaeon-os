"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // Importação correta para navegação
import whoAre from "@/app/who-are-zaeon.png";
import { useTranslation } from "react-i18next";
import "../../src/i18n";

export default function Encryption() {
    const { t } = useTranslation();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const reduced = useMemo(
        () =>
            typeof window !== "undefined" &&
            window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
        []
    );

    // Função de navegação para a nova página que criamos em app/about/page.tsx
    const handleNavigation = () => {
        router.push("/about");
    };

    if (!mounted) return null;

    // Configurações de animação do texto gradiente
    const textAnimateState = reduced ? {} : {
        y: [0, -5, 0],
        opacity: [1, 0.9, 1],
        backgroundImage: [
            "linear-gradient(90deg,#3b82f6,#38bdf8,#22d3ee)",
            "linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899)",
            "linear-gradient(90deg,#3b82f6,#38bdf8,#22d3ee)",
        ],
    };

    const textTransitionState = reduced ? {} : {
        duration: 10,
        ease: "easeInOut",
        repeat: Infinity,
    };

    const textStyleState = {
        backgroundSize: "200% 100%",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
    };

    const fontClass = "text-[32px] sm:text-[54px] font-light tracking-tight leading-tight";

    return (
        <section
            id="about-us"
            className="relative flex flex-col items-center justify-center min-h-screen w-full overflow-hidden bg-transparent py-20"
        >
            {/* VÍDEO DE FUNDO */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <video
                    className="h-full w-full object-cover invert dark:invert-0 opacity-30 dark:opacity-60 transition-all duration-500"
                    loop
                    muted
                    autoPlay
                    playsInline
                >
                    <source src="/videos/encryption-bg.webm" type="video/webm" />
                </video>
            </div>

            {/* --- 1. TÍTULO PRINCIPAL --- */}
            <motion.div
                className={`z-20 select-none text-center px-4 mb-10 ${fontClass}`}
                animate={textAnimateState}
                transition={textTransitionState}
                style={textStyleState}
            >
                {t("encryption.title")}
            </motion.div>

            {/* --- 2. IMAGEM CENTRAL --- */}
            <div className="relative z-10 flex items-center justify-center mb-10">
                <motion.div
                    animate={reduced ? {} : { y: [0, -15, 0] }}
                    transition={reduced ? {} : { duration: 5, ease: "easeInOut", repeat: Infinity }}
                    whileHover={{ scale: 1.02 }}
                    className="drop-shadow-[0_0_35px_rgba(56,189,248,0.3)]"
                >
                    <Image
                        src={whoAre}
                        alt="Who are Zaeon"
                        priority
                        draggable={false}
                        className="w-[90vw] max-w-[1100px] h-auto select-none"
                    />
                </motion.div>
            </div>

            {/* --- 3. SUBTÍTULO --- */}
            <motion.div
                className={`z-20 select-none text-center px-6 max-w-5xl mb-12 ${fontClass}`}
                animate={textAnimateState}
                transition={textTransitionState}
                style={textStyleState}
            >
                {t("encryption.subtitle")}
            </motion.div>

            {/* --- 4. BOTÃO FIXO "SAIBA MAIS" --- */}
            <div className="z-[100] mt-8"> {/* Container com z-index altíssimo */}
                <motion.button
                    onClick={() => window.location.assign("/about")} // Força a navegação direta
                    whileHover={{ scale: 1.1, boxShadow: "0 0 25px rgba(56,189,248,0.6)" }}
                    whileTap={{ scale: 0.95 }}
                    className="relative px-10 py-4 rounded-full font-black uppercase tracking-[0.2em] text-[12px]
                   bg-gradient-to-r from-blue-600 to-cyan-500 text-white
                   border border-white/30 shadow-2xl cursor-pointer pointer-events-auto"
                >
                    {t("encryption.button")}
                </motion.button>
            </div>
            {/* VINHETA DE SUAVIZAÇÃO */}
            <div className="pointer-events-none absolute inset-0 z-[5]
                bg-[radial-gradient(circle,transparent_40%,rgba(0,0,0,0.4)_100%)]
                opacity-70"
            />
        </section>
    );
}