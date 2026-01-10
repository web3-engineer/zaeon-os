"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

const WORDS = ["幸运", "信仰", "努力", "教育", "组织", "荣誉", "社区", "胜利", "梦想"];
const FONT_FAMILY = `"Noto Sans SC", "Microsoft YaHei", "SimHei", monospace, sans-serif`;

const DARK_PALETTE = ["#9ecbff", "#5fb4ff", "#2b8eff", "#1a73e8", "#1572a1", "#00a7a7", "#009688", "#33cccc", "#7dd3fc"];
const LIGHT_PALETTE = ["#0f172a", "#1e293b", "#334155", "#0369a1", "#1d4ed8", "#000000"];

function buildStreamSource() {
    const chunks: string[] = [];
    for (let i = 0; i < WORDS.length; i++) {
        chunks.push(WORDS[i]);
        if (i % 3 === 1) chunks.push("₿");
        if (i % 5 === 2) chunks.push("Ξ");
        if (i % 7 === 3) chunks.push("ICP");
    }
    return chunks.join("");
}
const STREAM_SOURCE = buildStreamSource();

const MatrixRain: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const { theme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        if (!mounted) return;

        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        let width = canvas.clientWidth;
        let height = canvas.clientHeight;

        const currentTheme = theme === 'system' ? resolvedTheme : theme;
        const isDark = currentTheme === 'dark';
        const activePalette = isDark ? DARK_PALETTE : LIGHT_PALETTE;
        const fadeColor = isDark ? "rgba(3, 0, 20, 0.22)" : "rgba(248, 250, 252, 0.22)";

        const applyDPR = () => {
            const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
            width = canvas.clientWidth;
            height = canvas.clientHeight;
            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        applyDPR();

        const fontSize = 13;
        // Mantemos a densidade baixa que você pediu (divisor 0.4)
        const colWidthBase = Math.round((fontSize * 4) / 0.4);
        let columns = Math.max(2, Math.floor(width / colWidthBase));

        type Col = { y: number; speed: number; color: string; offset: number };
        let cols: Col[] = new Array(columns).fill(0).map((_, i) => ({
            y: -Math.random() * 50,
            speed: 0.40 + (i % 5) * (0.30 / 5),
            color: activePalette[(i + Math.floor(Math.random() * 3)) % activePalette.length],
            offset: Math.floor(Math.random() * STREAM_SOURCE.length),
        }));

        ctx.font = `${fontSize}px ${FONT_FAMILY}`;
        ctx.textBaseline = "top";
        const FADE_LENGTH_LINES = 50;
        const BASE_ALPHA = 0.90;
        const TOP_ALPHA = 0.00;

        let animationId: number;

        const draw = () => {
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = fadeColor;
            ctx.fillRect(0, 0, width, height);

            for (let i = 0; i < columns; i++) {
                const col = cols[i];

                // --- LÓGICA DE SIMETRIA ---
                // Se i=0, x=0 (borda esquerda)
                // Se i=último, x=largura total (borda direita)
                const x = columns > 1
                    ? (i * (width - fontSize)) / (columns - 1)
                    : (width - fontSize) / 2;

                const headY = col.y * fontSize;
                ctx.fillStyle = col.color;

                for (let j = 0; j < FADE_LENGTH_LINES; j++) {
                    const y = headY - j * fontSize;
                    if (y < -fontSize) break;
                    if (y > height + fontSize) continue;

                    const t = j / (FADE_LENGTH_LINES - 1);
                    const alpha = BASE_ALPHA * (1 - t) + TOP_ALPHA * t;
                    ctx.globalAlpha = alpha;
                    const charIndex = (col.offset + Math.floor(col.y) - j + STREAM_SOURCE.length * 100) % STREAM_SOURCE.length;
                    const ch = STREAM_SOURCE.charAt(Math.floor(charIndex));
                    ctx.fillText(ch, x, y);
                }

                col.y += col.speed;
                if (headY > height + FADE_LENGTH_LINES * fontSize) {
                    col.y = -Math.random() * 40;
                    col.offset = (col.offset + Math.floor(5 + Math.random() * 25)) % STREAM_SOURCE.length;
                }
            }
            ctx.globalAlpha = 1;
            animationId = requestAnimationFrame(draw);
        };

        animationId = requestAnimationFrame(draw);

        const onResize = () => {
            applyDPR();
            columns = Math.max(2, Math.floor(width / colWidthBase));
            cols = new Array(columns).fill(0).map((_, i) => ({
                y: -Math.random() * 50,
                speed: 0.40 + (i % 5) * (0.30 / 5),
                color: activePalette[(i + Math.floor(Math.random() * 3)) % activePalette.length],
                offset: Math.floor(Math.random() * STREAM_SOURCE.length),
            }));
            ctx.font = `${fontSize}px ${FONT_FAMILY}`;
        };

        const ro = new ResizeObserver(onResize);
        ro.observe(canvas);
        return () => { cancelAnimationFrame(animationId); ro.disconnect(); };
    }, [theme, resolvedTheme, mounted]);

    if (!mounted) return <div className="fixed inset-0 z-0 bg-[#030014]" />;

    return (
        <div className="fixed inset-0 z-0 pointer-events-none transition-colors duration-500">
            <canvas ref={canvasRef} className="w-full h-full" style={{ imageRendering: "auto" }} />
        </div>
    );
};

export const StarsCanvas = MatrixRain;
export default MatrixRain;