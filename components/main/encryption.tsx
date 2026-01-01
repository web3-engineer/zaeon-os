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

    return (
        <section
            id="about-us"
            ref={sectionRef}
            // ADICIONADO: bg-background para garantir que o fundo base seja correto
            className="relative flex flex-col items-center justify-center min-h-[100vh] w-full overflow-hidden bg-background transition-colors duration-300"
        >
            {/* VÍDEO DE FUNDO */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <video
                    // MUDANÇA MÁGICA AQUI:
                    // invert: No modo claro, inverte as cores (preto vira branco).
                    // dark:invert-0: No modo escuro, remove a inversão (video original).
                    // opacity-40 dark:opacity-100: No modo claro, deixamos o video mais sutil.
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

            {/* Texto principal */}
            <motion.div
                className="absolute top-[14%] z-20 select-none text-center text-transparent bg-clip-text
                   text-[46px] sm:text-[54px] font-light tracking-tight leading-tight"
                animate={
                    reduced
                        ? {}
                        : {
                            y: [0, -8, 0],
                            opacity: [1, 0.85, 1],
                            backgroundImage: [
                                "linear-gradient(90deg,#3b82f6,#38bdf8,#22d3ee)",
                                "linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899)",
                                "linear-gradient(90deg,#7c3aed,#8b5cf6,#10b981)",
                                "linear-gradient(90deg,#3b82f6,#38bdf8,#22d3ee)",
                            ],
                        }
                }
                transition={
                    reduced
                        ? {}
                        : {
                            duration: 12,
                            ease: "easeInOut",
                            repeat: Infinity,
                        }
                }
                style={{
                    backgroundSize: "200% 100%",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                }}
            >
                {t("encryption.title")}
            </motion.div>

            {/* Imagem Central */}
            <div className="relative z-10 flex items-center justify-center mt-24">
                <motion.div
                    onMouseMove={handleMove}
                    onHoverStart={() => setHovering(true)}
                    onHoverEnd={() => setHovering(false)}
                    animate={reduced ? {} : { y: [0, -18, 0] }}
                    transition={reduced ? {} : { duration: 6, ease: "easeInOut", repeat: Infinity }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 1.02 }}
                    // Sombra adaptativa: Cyan no escuro, Azul profundo no claro para contraste
                    className="drop-shadow-[0_0_45px_rgba(56,189,248,0.5)] dark:drop-shadow-[0_0_45px_rgba(56,189,248,0.5)] transition-transform duration-700 ease-out"
                >
                    <Image
                        src={whoAre}
                        alt="Who are Zaeon"
                        priority
                        draggable={false}
                        className="w-[90vw] max-w-[1180px] h-auto select-none"
                    />
                </motion.div>
            </div>

            {/* Botão Flutuante */}
            <motion.button
                type="button"
                onClick={handleClick}
                // Cores do botão ajustadas para ficarem visíveis em ambos os modos
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

            {/* VINHETA (Overlay de bordas) */}
            {/* Modo Dark: Gradiente Preto nas bordas */}
            {/* Modo Light: Gradiente Branco nas bordas (via dark: prefixo invertido) */}
            <div className="pointer-events-none absolute inset-0 z-[5]
                bg-[radial-gradient(1000px_550px_at_50%_40%,rgba(255,255,255,0)_0%,rgba(255,255,255,0.8)_100%)]
                dark:bg-[radial-gradient(1000px_550px_at_50%_40%,rgba(0,0,0,0)_0%,rgba(0,0,0,0.45)_100%)]
                transition-colors duration-500"
            />
        </section>
    );
}