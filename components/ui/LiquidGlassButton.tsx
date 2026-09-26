"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

/**
 * Botão de vidro líquido.
 *
 * O que faz o material parecer vidro NÃO é o desfoque — é a borda: um fio de luz
 * especular que muda de intensidade conforme o ângulo. Por isso aqui tem quatro
 * camadas e não uma: fundo refratado, aro de luz, brilho que segue o ponteiro, e
 * um lustro que passa sozinho quando ninguém toca (no celular não existe hover,
 * e um botão de vidro parado parece um retângulo morto).
 *
 * CUSTO: `backdrop-filter` sobre um fundo que muda todo frame (o vídeo) obriga o
 * compositor a refiltrar a cada quadro. É o caso caro do filtro. Por isso o vidro
 * fica confinado a uma cápsula pequena — a conta é proporcional à área.
 *
 * O ponteiro é escrito direto em variáveis CSS, sem passar por estado do React:
 * mover o dedo não deve disparar re-render 60 vezes por segundo.
 */

type Tom = "neutro" | "destaque";
type Tamanho = "md" | "lg";

type Props = {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    /**
     * "neutro"   — vidro incolor. Para ação secundária ou única.
     * "destaque" — vidro TINGIDO. Vidro incolor num botão primário derruba a
     *              hierarquia: ele vira mais um. O tingimento mantém o material
     *              e devolve o peso visual de ação principal.
     */
    tom?: Tom;
    tamanho?: Tamanho;
    /** Seta que avança no hover. Faz sentido em "vamos" e não em "cancelar". */
    seta?: boolean;
};

export default function LiquidGlassButton({
    children,
    onClick,
    className = "",
    tom = "neutro",
    tamanho = "lg",
    seta = true,
}: Props) {
    const ref = useRef<HTMLButtonElement>(null);
    const [pressionado, setPressionado] = useState(false);
    const [semMovimento, setSemMovimento] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        const sync = () => setSemMovimento(mq.matches);
        sync();
        mq.addEventListener("change", sync);
        return () => mq.removeEventListener("change", sync);
    }, []);

    const seguir = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 100;
        const y = ((e.clientY - r.top) / r.height) * 100;
        el.style.setProperty("--mx", `${x}%`);
        el.style.setProperty("--my", `${y}%`);
        // Inclinação sutil: vidro reage ao ângulo, mas 2° já é o limite antes de
        // virar brinquedo. Acima disso o texto desfoca na rasterização.
        el.style.setProperty("--rx", `${(50 - y) / 25}deg`);
        el.style.setProperty("--ry", `${(x - 50) / 25}deg`);
    }, []);

    const centralizar = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        el.style.setProperty("--mx", "50%");
        el.style.setProperty("--my", "40%");
        el.style.setProperty("--rx", "0deg");
        el.style.setProperty("--ry", "0deg");
    }, []);

    return (
        <>
            <style>{`
                @keyframes zaeon-lustro {
                    0%   { transform: translateX(-130%) skewX(-18deg); opacity: 0; }
                    12%  { opacity: .55; }
                    45%  { opacity: .55; }
                    60%  { transform: translateX(130%) skewX(-18deg); opacity: 0; }
                    100% { transform: translateX(130%) skewX(-18deg); opacity: 0; }
                }
                @keyframes zaeon-respiro {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(34,211,238,.00), 0 8px 32px -8px rgba(0,0,0,.6); }
                    50%      { box-shadow: 0 0 22px 2px rgba(34,211,238,.18), 0 8px 32px -8px rgba(0,0,0,.6); }
                }
                @keyframes zaeon-respiro-destaque {
                    0%, 100% { box-shadow: 0 0 14px 0 rgba(34,211,238,.20), 0 10px 34px -10px rgba(0,0,0,.65); }
                    50%      { box-shadow: 0 0 34px 4px rgba(34,211,238,.42), 0 10px 34px -10px rgba(0,0,0,.65); }
                }
            `}</style>

            <button
                ref={ref}
                type="button"
                onClick={onClick}
                onPointerMove={semMovimento ? undefined : seguir}
                onPointerLeave={centralizar}
                onPointerDown={() => setPressionado(true)}
                onPointerUp={() => setPressionado(false)}
                onPointerCancel={() => setPressionado(false)}
                style={{
                    ["--mx" as string]: "50%",
                    ["--my" as string]: "40%",
                    ["--rx" as string]: "0deg",
                    ["--ry" as string]: "0deg",
                    transform: `perspective(700px) rotateX(var(--rx)) rotateY(var(--ry)) scale(${pressionado ? 0.965 : 1})`,
                    animation: semMovimento
                        ? undefined
                        : tom === "destaque"
                          ? "zaeon-respiro-destaque 4.5s ease-in-out infinite"
                          : "zaeon-respiro 5.5s ease-in-out infinite",
                }}
                className={[
                    "group relative isolate overflow-hidden rounded-full",
                    tamanho === "lg"
                        ? "px-12 py-4 sm:px-14 sm:py-[18px]"
                        : "px-9 py-3.5",
                    // O vidro em si. saturate puxa a cor do vídeo pra dentro do material,
                    // que é o que diferencia vidro de plástico fosco.
                    "backdrop-blur-2xl backdrop-saturate-[1.8]",
                    // Vidro claro e vidro escuro sao materiais DIFERENTES, nao o
                    // mesmo com opacidade trocada: no escuro o vidro CLAREIA o que
                    // esta atras, no claro ele ESCURECE. Um preenchimento branco a
                    // 7% sobre fundo branco nao existe; ciano a 20% com texto
                    // branco sobre fundo claro tambem nao. Por isso cada tom tem
                    // duas receitas.
                    tom === "destaque"
                        ? // cyan-700, nao 600: branco em 11px sobre cyan-600/90 composto com fundo
                          // branco da 3,22:1, e a AA exige 4,5:1 para texto pequeno.
                          // cyan-700/95 da 4,87:1. Medido, nao estimado no olho.
                          "bg-cyan-700/95 hover:bg-cyan-700 active:bg-cyan-800 dark:bg-cyan-400/[0.20] dark:hover:bg-cyan-400/[0.28] dark:active:bg-cyan-400/[0.34]"
                        : "bg-black/[0.06] hover:bg-black/[0.10] active:bg-black/[0.14] ring-1 ring-black/10 dark:ring-0 dark:bg-white/[0.07] dark:hover:bg-white/[0.12] dark:active:bg-white/[0.16]",
                    "transition-[transform,background-color] duration-300 ease-out",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                    "cursor-pointer select-none",
                    className,
                ].join(" ")}
            >
                {/* ARO DE LUZ — o fio de 1px que faz o olho ler "vidro". Gradiente
                    recortado por máscara: pinta só a borda, não o miolo. */}
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-full"
                    style={{
                        padding: "1px",
                        background:
                            tom === "destaque"
                                ? "linear-gradient(135deg, rgba(255,255,255,.95), rgba(165,243,252,.25) 38%, rgba(255,255,255,0) 58%, rgba(34,211,238,.75))"
                                : "linear-gradient(135deg, rgba(255,255,255,.85), rgba(255,255,255,.10) 38%, rgba(255,255,255,0) 58%, rgba(190,240,255,.55))",
                        WebkitMask:
                            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                        WebkitMaskComposite: "xor",
                        maskComposite: "exclude",
                    }}
                />

                {/* PROFUNDIDADE — luz batendo em cima, sombra embaixo por dentro.
                    É o que dá espessura ao material em vez de adesivo chapado. */}
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-full"
                    style={{
                        boxShadow:
                            tom === "destaque"
                                ? "inset 0 1px 1px rgba(255,255,255,.55), inset 0 -10px 22px -12px rgba(0,0,0,.45)"
                                : "inset 0 1px 1px rgba(255,255,255,.35), inset 0 -10px 22px -12px rgba(0,0,0,.35)",
                    }}
                />

                {/* ESPECULAR — o brilho que segue o dedo/mouse. É a camada que
                    transforma o botão de "bonito" em "reativo". */}
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-full opacity-70 transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                        background:
                            "radial-gradient(120px circle at var(--mx) var(--my), rgba(255,255,255,.34), rgba(120,220,255,.12) 40%, transparent 68%)",
                    }}
                />

                {/* LUSTRO — passa sozinho de tempos em tempos. No celular não existe
                    hover: sem isso o botão fica visualmente morto até alguém tocar. */}
                {!semMovimento && (
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3"
                        style={{
                            background:
                                "linear-gradient(90deg, transparent, rgba(255,255,255,.5), transparent)",
                            animation: "zaeon-lustro 6s ease-in-out infinite",
                        }}
                    />
                )}

                <span
                    className={[
                        "relative z-10 flex items-center justify-center gap-3 font-medium uppercase",
                        tom === "destaque"
                            ? "text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.35)]"
                            : "text-slate-900 dark:text-white dark:drop-shadow-[0_1px_6px_rgba(0,0,0,0.55)]",
                        tamanho === "lg"
                            ? "text-[15px] sm:text-base tracking-[0.22em]"
                            : "text-[11px] tracking-[0.18em]",
                    ].join(" ")}
                >
                    {children}
                    {/* Seta que avança no hover — a única recompensa de movimento. */}
                    {seta ? (
                        <span className="inline-block translate-x-0 transition-transform duration-300 ease-out group-hover:translate-x-1 motion-reduce:transition-none">
                            &rarr;
                        </span>
                    ) : null}
                </span>
            </button>
        </>
    );
}
