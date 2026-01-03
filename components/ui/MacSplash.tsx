"use client";

import Image, { type StaticImageData } from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import brain from "@/app/zaeon-brain.png";

type Props = {
    show?: boolean;
    onDone?: () => void;
    minDurationMs?: number;
    logoSrc?: StaticImageData | string;
    hint?: string;
};

export default function MacSplash({
                                      show = true,
                                      onDone,
                                      minDurationMs = 3000,
                                      logoSrc = brain,
                                  }: Props) {
    const [progress, setProgress] = useState(0);
    const [phase, setPhase] = useState<0 | 1 | 2 | 3 | 4>(0);
    const [visible, setVisible] = useState(show);
    const [opacity, setOpacity] = useState(0);
    const [contentScale, setContentScale] = useState(1);
    const [contentBlur, setContentBlur] = useState(0);
    const startedAt = useRef<number | null>(null);
    const exitingRef = useRef(false);

    const prefersReducedMotion = useMemo(
        () =>
            typeof window !== "undefined" &&
            window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
        []
    );

    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    useEffect(() => {
        if (!show) return;

        setVisible(true);
        const openT = setTimeout(() => setOpacity(1), 10);

        // Força o scroll manual logo na montagem
        if (typeof window !== "undefined") {
            window.history.scrollRestoration = "manual";
            window.scrollTo(0, 0);
        }

        let raf = 0;
        const loop = (ts: number) => {
            if (!startedAt.current) startedAt.current = ts;
            const elapsed = ts - startedAt.current;
            const total = Math.max(1, minDurationMs);
            const t = Math.min(1, elapsed / total);
            const eased = prefersReducedMotion ? t : ease(t);

            setProgress(eased);

            // --- FORÇA BRUTA (AQUI ESTÁ A MÁGICA) ---
            // Enquanto a animação não acabou (tela preta), forçamos o topo a cada frame.
            // O navegador não tem chance de descer.
            if (!exitingRef.current && typeof window !== "undefined") {
                window.scrollTo(0, 0);
            }
            // ----------------------------------------

            if (eased >= 0.9 && phase < 4) setPhase(4);
            else if (eased >= 0.69 && phase < 3) setPhase(3);
            else if (eased >= 0.51 && phase < 2) setPhase(2);
            else if (eased >= 0.33 && phase < 1) setPhase(1);

            if (t < 1) {
                raf = requestAnimationFrame(loop);
            } else if (!exitingRef.current) {
                exitingRef.current = true;

                // Uma última garantia antes de começar o fade out
                if (typeof window !== "undefined") window.scrollTo(0, 0);

                if (!prefersReducedMotion) {
                    setContentScale(0.985);
                    setContentBlur(4);
                }
                setOpacity(0);
                setTimeout(() => {
                    onDone?.();
                    setVisible(false);
                    startedAt.current = null;
                    exitingRef.current = false;
                    setProgress(0);
                    setPhase(0);
                    setContentScale(1);
                    setContentBlur(0);
                }, prefersReducedMotion ? 0 : 260);
            }
        };

        raf = requestAnimationFrame(loop);
        return () => {
            clearTimeout(openT);
            cancelAnimationFrame(raf);
        };
    }, [show, minDurationMs, prefersReducedMotion]);

    useEffect(() => {
        if (!show && visible && !exitingRef.current) {
            exitingRef.current = true;
            if (!prefersReducedMotion) {
                setContentScale(0.985);
                setContentBlur(4);
            }
            setOpacity(0);
            const t = setTimeout(() => {
                onDone?.();
                setVisible(false);
                exitingRef.current = false;
            }, prefersReducedMotion ? 0 : 220);
            return () => clearTimeout(t);
        }
    }, [show, visible, prefersReducedMotion, onDone]);

    if (!visible) return null;

    // --- FRASES MÍSTICAS EM CHINÊS ---
    const zhPhrase =
        phase >= 4 || phase === 3
            ? "世界之希望已诞生"
            : phase === 2
                ? "日月星辰皆为吾家"
                : phase === 1
                    ? "万物归一"
                    : "";

    return (
        <div
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black transition-opacity duration-300"
            style={{ opacity }}
            role="status"
            aria-label="Carregando"
        >
            <div
                className="flex flex-col items-center justify-center px-6 transition-[transform,filter] duration-300"
                style={{
                    transform: `scale(${contentScale})`,
                    filter: contentBlur ? `blur(${contentBlur}px)` : "none",
                }}
            >
                {/* Logo */}
                <Image
                    src={logoSrc}
                    alt="Zaeon"
                    width={100}
                    height={100}
                    priority
                    className="mb-6 opacity-95"
                />

                {/* Barra de progresso */}
                <div className="w-[200px] h-[3px] rounded-full bg-white/15 overflow-hidden">
                    <div
                        className="h-full rounded-full"
                        style={{
                            width: `${Math.max(0.02, progress) * 100}%`,
                            transition: prefersReducedMotion
                                ? "none"
                                : "width 120ms cubic-bezier(.22,.61,.36,1)",
                            background:
                                "linear-gradient(90deg,rgba(255,255,255,.9),rgba(230,236,255,.95),rgba(255,255,255,.9))",
                            boxShadow: "0 0 8px rgba(255,255,255,0.35)",
                            transform: "translateZ(0)",
                            willChange: "width",
                        }}
                    />
                </div>

                {/* Frase Mística (Chinês) */}
                {zhPhrase && (
                    <div
                        className="mt-6 text-center text-[10px] tracking-widest leading-tight text-sky-400/90 font-light"
                        style={{
                            fontFamily: `"Noto Sans SC", "Microsoft YaHei", sans-serif`,
                        }}
                        aria-hidden="true"
                    >
                        {zhPhrase}
                    </div>
                )}

                {/* Logs técnicos (Inglês) */}
                <div
                    className="mt-4 text-center text-[9px] leading-tight text-white/60"
                    style={{
                        fontFamily:
                            `"Ubuntu Mono","SF Mono","Menlo","Consolas","Liberation Mono",monospace`,
                    }}
                    aria-live="polite"
                >
                    {phase >= 1 && <p>[ OK ] mounting zaeon kernel modules — 33%</p>}
                    {phase >= 2 && <p>[ OK ] linking research graph services — 51%</p>}
                    {phase >= 3 && <p>[ OK ] starting ai-mentors daemons — 69%</p>}
                    {phase >= 4 && (
                        <p className="pt-1 text-white/75 tracking-wide">
                            zaeon state initiated.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}