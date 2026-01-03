"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useMemo, useRef, useState, useEffect } from "react";
import whoAre from "@/app/who-are-zaeon.png";
import { useTranslation } from "react-i18next";
import "../../src/i18n";

export default function Encryption() {
    const { t } = useTranslation();
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

    const sectionRef = useRef<HTMLDivElement | null>(null);
    const [hovering, setHovering] = useState(false);
    const [pos, setPos] = useState({ x: 0, y: 0 });

    const handleMove = (e: React.MouseEvent) => {
        const rect = sectionRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setPos({ x, y });
    };

    const handleClick = () => {
        window.location.assign("/about");
    };

    if (!mounted) return null;

    // Configurações de animação
    const textAnimateState = reduced ? {} : {
        y: [0, -8, 0],
        opacity: [1, 0.85, 1],
        backgroundImage: [
            "linear-gradient(90deg,#3b82f6,#38bdf8,#22d3ee)",
            "linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899)",
            "linear-gradient(90deg,#7c3aed,#8b5cf6,#10b981)",
            "linear-gradient(90deg,#3b82f6,#38bdf8,#22d3ee)",
        ],
    };

    const textTransitionState = reduced ? {} : {
        duration: 12,
        ease: "easeInOut",
        repeat: Infinity,
    };

    const textStyleState = {
        backgroundSize: "200% 100%",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
    };

    const fontClass = "text-[42px] sm:text-[54px] font-light tracking-tight leading-tight";

    return (
        <section
            id="about-us"
            ref={sectionRef}
            // CORREÇÃO VISUAL: bg-transparent remove qualquer cor de fundo sólida.
            // A "separação" some porque agora estamos vendo direto o body/matrix rain.
            className="relative flex flex-col items-center justify-center min-h-[100vh] w-full overflow-hidden bg-transparent py-20"
        >
            {/* VÍDEO DE FUNDO */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <video
                    className="h-full w-full object-cover invert dark:invert-0 opacity-40 dark:opacity-100 transition-all duration-500"
                    loop
                    muted
                    autoPlay
                    playsInline
                    preload="none"
                >
                    <source src="/videos/encryption-bg.webm" type="video/webm" />
                </video>
            </div>

            {/* --- 1. TÍTULO PRINCIPAL (TOPO) --- */}
            <motion.div
                className={`absolute top-[12%] md:top-[15%] z-20 select-none text-center text-transparent bg-clip-text px-4 ${fontClass}`}
                animate={textAnimateState}
                transition={textTransitionState}
                style={textStyleState}
            >
                {t("encryption.title")}
            </motion.div>

            {/* --- 2. IMAGEM CENTRAL (MEIO) --- */}
            <div className="relative z-10 flex items-center justify-center mt-32 mb-8">
                <motion.div
                    onMouseMove={handleMove}
                    onHoverStart={() => setHovering(true)}
                    onHoverEnd={() => setHovering(false)}
                    animate={reduced ? {} : { y: [0, -18, 0] }}
                    transition={reduced ? {} : { duration: 6, ease: "easeInOut", repeat: Infinity }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 1.02 }}
                    className="drop-shadow-[0_0_45px_rgba(56,189,248,0.5)] dark:drop-shadow-[0_0_45px_rgba(56,189,248,0.5)] transition-transform duration-700 ease-out"
                >
                    <Image
                        src={whoAre}
                        alt="Who are Zaeon"
                        priority
                        draggable={false}
                        // CORREÇÃO TAMANHO: Aumentado para 1250px (era 1000px)
                        className="w-[95vw] max-w-[1250px] h-auto select-none"
                    />
                </motion.div>
            </div>

            {/* --- 3. SUBTÍTULO (EMBAIXO) --- */}
            <motion.div
                className={`relative z-20 select-none text-center text-transparent bg-clip-text px-6 max-w-5xl ${fontClass}`}
                animate={textAnimateState}
                transition={textTransitionState}
                style={textStyleState}
            >
                {t("encryption.subtitle")}
            </motion.div>

            {/* Botão Flutuante */}
            <motion.button
                type="button"
                onClick={handleClick}
                className="pointer-events-auto absolute z-30 rounded-full px-3.5 py-1.5 text-[12px] font-semibold
                   text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)]
                   bg-gradient-to-br from-gray-900/90 to-blue-900/90
                   border border-white/15 backdrop-blur-sm"
                style={{
                    left: pos.x,
                    top: pos.y - 28,
                    transform: "translate(-50%, -100%)",
                }}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={
                    hovering
                        ? { opacity: 1, scale: 1, x: 0, y: 0 }
                        : { opacity: 0, scale: 0.92 }
                }
                transition={{ type: "spring", stiffness: 360, damping: 30, mass: 0.6 }}
                aria-label={t("encryption.button")}
            >
                {t("encryption.button")}
            </motion.button>

            {/* VINHETA - Ajustada para ser suave e não criar linhas duras */}
            <div className="pointer-events-none absolute inset-0 z-[5]
                bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(255,255,255,0.4)_100%)]
                dark:bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(0,0,0,0.4)_100%)]
                transition-colors duration-500 opacity-60"
            />
        </section>
    );
}