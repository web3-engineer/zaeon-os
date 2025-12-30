"use client";

import React, { useEffect, useRef } from "react";

// South Korean translations of:
// Luck, Faith, Work, Education, Organization, Honor, Community, Victory, Dreams
const WORDS = [
    "행운",   // Luck
    "신념",   // Faith
    "노력",   // Work (Effort)
    "교육",   // Education
    "조직",   // Organization
    "명예",   // Honor
    "공동체", // Community
    "승리",   // Victory
    "꿈"      // Dreams
];

// Updated font stack to prioritize Korean characters
const FONT_FAMILY = `"Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", monospace, sans-serif`;

/** Cold Palette — Blue and Teal tones fitting the VERY ecosystem */
const PALETTE = [
    "#9ecbff", "#5fb4ff", "#2b8eff", "#1a73e8",
    "#1572a1", "#00a7a7", "#009688", "#33cccc", "#7dd3fc",
];

function buildStreamSource() {
    // Keep the crypto symbols for the ecosystem feel
    const specials = ["₿","Ξ",];
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

        const fontSize = 13; // Slightly larger for legibility of Hangul
        const colWidth = Math.round(fontSize * 1.05);
        let columns = Math.max(8, Math.floor(width / colWidth) - 6);

        type Col = { y: number; speed: number; color: string; offset: number };
        let cols: Col[] = new Array(columns).fill(0).map((_, i) => ({
            y: -Math.random() * 40,
            speed: 0.50 + (i % 7) * (0.32 / 7),
            color: PALETTE[(i + Math.floor(Math.random() * 3)) % PALETTE.length],
            offset: Math.floor(Math.random() * STREAM_SOURCE.length),
        }));

        ctx.font = `${fontSize}px ${FONT_FAMILY}`;
        ctx.textBaseline = "top";

        const FADE_LENGTH_LINES = 24;
        const BASE_ALPHA = 0.95;
        const TOP_ALPHA = 0.00;

        const draw = () => {
            // Darker fade for sharper contrast
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = "rgba(0,0,0,0.22)";
            ctx.fillRect(0, 0, width, height);

            for (let i = 0; i < columns; i++) {
                const col = cols[i];
                const x = i * colWidth;
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
            columns = Math.max(8, Math.floor(width / colWidth) - 6);
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
                style={{ background: "#000", imageRendering: "auto" }}
            />
        </div>
    );
};

export const StarsCanvas = MatrixRain;
export default MatrixRain;