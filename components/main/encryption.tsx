"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useMemo, useRef, useState, useEffect } from "react"; // ADD useEffect
import whoAre from "@/app/who-are-zaeon.png";

// --- I18N IMPORTS ---
import { useTranslation } from "react-i18next";
import "../../src/i18n";

export default function Encryption() {
    const { t } = useTranslation();

    // --- CORREÇÃO DO ERRO DE HIDRATAÇÃO ---
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);
    // ----------------------------------------

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

    // Só renderiza depois de montar no cliente para evitar conflito de idioma
    if (!mounted) return null;

    return (
        <section
            id="about-us"
            ref={sectionRef}
            className="relative flex flex-col items-center justify-center min-h-[100vh] w-full overflow-hidden"
        >
            {/* Vídeo de fundo */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <video
                    className="h-full w-full object-cover"
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

            {/* Imagem */}
            <div className="relative z-10 flex items-center justify-center mt-24">
                <motion.div
                    onMouseMove={handleMove}
                    onHoverStart={() => setHovering(true)}
                    onHoverEnd={() => setHovering(false)}
                    animate={reduced ? {} : { y: [0, -18, 0] }}
                    transition={reduced ? {} : { duration: 6, ease: "easeInOut", repeat: Infinity }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 1.02 }}
                    className="drop-shadow-[0_0_45px_rgba(56,189,248,0.5)] transition-transform duration-700 ease-out"
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

            {/* Botão */}
            <motion.button
                type="button"
                onClick={handleClick}
                className="pointer-events-auto absolute z-30 rounded-full px-3.5 py-1.5 text-[12px] font-semibold
                   text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)]
                   bg-[linear-gradient(135deg,rgba(17,24,39,.9),rgba(30,58,138,.9))]
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

            {/* Vinheta */}
            <div
                className="pointer-events-none absolute inset-0 z-[5]
                   bg-[radial-gradient(1000px_550px_at_50%_40%,rgba(0,0,0,0)_0%,rgba(0,0,0,0.45)_100%)]"
            />
        </section>
    );
}