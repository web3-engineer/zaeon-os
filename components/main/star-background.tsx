"use client";

import React, { useEffect, useRef } from "react";

// Mandarin Chinese translations of:
// Luck, Faith, Work, Education, Organization, Honor, Community, Victory, Dreams
const WORDS = [
    "幸运",   // Luck
    "信仰",   // Faith
    "努力",   // Work (Effort)
    "教育",   // Education
    "组织",   // Organization
    "荣誉",   // Honor
    "社区",   // Community
    "胜利",   // Victory
    "梦想"    // Dreams
];

// Updated font stack to prioritize Simplified Chinese characters
const FONT_FAMILY = `"Noto Sans SC", "Microsoft YaHei", "SimHei", monospace, sans-serif`;

/** Cold Palette — Blue and Teal tones fitting the VERY ecosystem */
const PALETTE = [
    "#9ecbff", "#5fb4ff", "#2b8eff", "#1a73e8",
    "#1572a1", "#00a7a7", "#009688", "#33cccc", "#7dd3fc",
];

function buildStreamSource() {
    // Keep the crypto symbols for the ecosystem feel
    const chunks: string[] = [];
    for (let i = 0; i < WORDS.length; i++) {
        chunks.push(WORDS[i]);
        // Insert crypto symbols at specific intervals
        if (i % 3 === 1) chunks.push("₿");
        if (i % 5 === 2) chunks.push("Ξ");
        if (i % 7 === 3) chunks.push("ICP");
    }
    return chunks.join("");
}
const STREAM_SOURCE = buildStreamSource();

const MatrixRain: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        let width = canvas.clientWidth;
        let height = canvas.clientHeight;

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

        // --- MUDANÇA DE DENSIDADE AQUI ---
        // Antes: fontSize * 1.05 (Muito denso)
        // Agora: fontSize * 4 (Cria espaçamento entre as colunas, deixando mais leve)
        const colWidth = Math.round(fontSize * 4);

        let columns = Math.max(4, Math.floor(width / colWidth));

        type Col = { y: number; speed: number; color: string; offset: number };

        // Inicializa as colunas
        let cols: Col[] = new Array(columns).fill(0).map((_, i) => ({
            y: -Math.random() * 40,
            speed: 0.50 + (i % 7) * (0.32 / 7),
            color: PALETTE[(i + Math.floor(Math.random() * 3)) % PALETTE.length],
            offset: Math.floor(Math.random() * STREAM_SOURCE.length),
        }));

        ctx.font = `${fontSize}px ${FONT_FAMILY}`;
        ctx.textBaseline = "top";

        const FADE_LENGTH_LINES = 50; // Levemente reduzido para ficar mais curto
        const BASE_ALPHA = 0.90; // Um pouco mais transparente
        const TOP_ALPHA = 0.00;

        const draw = () => {
            // Limpa o fundo com um fade para criar rastro
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = "rgba(0,0,0,0.22)";
            ctx.fillRect(0, 0, width, height);

            for (let i = 0; i < columns; i++) {
                const col = cols[i];
                const x = i * colWidth; // Posicionamento baseado na nova largura espaçada
                const headY = col.y * fontSize;
                ctx.fillStyle = col.color;

                for (let j = 0; j < FADE_LENGTH_LINES; j++) {
                    const y = headY - j * fontSize;
                    if (y < -fontSize) break;
                    if (y > height + fontSize) continue;

                    const t = j / (FADE_LENGTH_LINES - 1);
                    const alpha = BASE_ALPHA * (1 - t) + TOP_ALPHA * t;
                    ctx.globalAlpha = alpha;

                    // Calculate char index safely
                    const charIndex = (col.offset + Math.floor(col.y) - j + STREAM_SOURCE.length * 100) % STREAM_SOURCE.length;
                    const ch = STREAM_SOURCE.charAt(Math.floor(charIndex));

                    ctx.fillText(ch, x, y);
                }

                col.y += col.speed;
                if (headY > height + FADE_LENGTH_LINES * fontSize) {
                    col.y = -Math.random() * 30;
                    col.offset = (col.offset + Math.floor(5 + Math.random() * 25)) % STREAM_SOURCE.length;

                    // Randomiza cor ocasionalmente
                    if (Math.random() > 0.7) {
                        col.color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
                    }
                }
            }
            ctx.globalAlpha = 1;
            requestAnimationFrame(draw);
        };

        const animationId = requestAnimationFrame(draw);

        const onResize = () => {
            applyDPR();
            // Recalcula colunas no resize usando o novo espaçamento
            columns = Math.max(4, Math.floor(width / colWidth));
            cols = new Array(columns).fill(0).map((_, i) => ({
                y: -Math.random() * 40,
                speed: 0.50 + (i % 7) * (0.32 / 7),
                color: PALETTE[(i + Math.floor(Math.random() * 3)) % PALETTE.length],
                offset: Math.floor(Math.random() * STREAM_SOURCE.length),
            }));
            ctx.font = `${fontSize}px ${FONT_FAMILY}`;
        };
        const ro = new ResizeObserver(onResize);
        ro.observe(canvas);

        return () => {
            cancelAnimationFrame(animationId);
            ro.disconnect();
        };
    }, []);

    return (
        <div className="fixed inset-0 z-0 pointer-events-none">
            <canvas
                ref={canvasRef}
                className="w-full h-full"
                style={{ background: "#030014", imageRendering: "auto" }} // Fundo levemente azulado para combinar com o tema
            />
        </div>
    );
};

export const StarsCanvas = MatrixRain;
export default MatrixRain;