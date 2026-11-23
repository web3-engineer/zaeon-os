"use client";

import { useRef, type CSSProperties } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import pt from "@/public/locales/pt/common.json";

interface MoleculeNode {
    readonly level: string;
    readonly glowColor: string;
    readonly borderClass: string;
    readonly bgClass: string;
    readonly textClass: string;
    readonly pulseClass: string;
}

const camadas = [["estudar", "construir"], ["provar"], ["conectar"]] as const;

const MOLECULE_NODES: readonly MoleculeNode[] = [
    {
        level: "01",
        glowColor: "rgba(34,211,238,0.6)",
        borderClass: "border-cyan-500/50",
        bgClass: "bg-cyan-950/60",
        textClass: "text-cyan-400",
        pulseClass: "border-cyan-400/30",
    },
    {
        level: "02",
        glowColor: "rgba(168,85,247,0.6)",
        borderClass: "border-purple-500/50",
        bgClass: "bg-purple-950/60",
        textClass: "text-purple-400",
        pulseClass: "border-purple-400/30",
    },
    {
        level: "03",
        glowColor: "rgba(16,185,129,0.6)",
        borderClass: "border-emerald-500/50",
        bgClass: "bg-emerald-950/60",
        textClass: "text-emerald-400",
        pulseClass: "border-emerald-400/30",
    },
];

// ─── FLOW BOND ────────────────────────────────────────────────────────────────
// Analogia: como o fio de energia que conecta dois átomos numa molécula —
// quando o átomo de cima está ativo, elétrons fluem para o próximo.
const FlowBond = ({
    isActive,
    fromColor,
    toColor,
}: {
    isActive: boolean;
    fromColor: string;
    toColor: string;
}) => (
    <div className="relative flex justify-center items-start h-20 w-8">
        {/* Linha estática */}
        <div
            className="w-[2px] h-full rounded-full transition-all duration-1000"
            style={{
                background: isActive
                    ? `linear-gradient(to bottom, ${fromColor}, ${toColor})`
                    : "rgba(255,255,255,0.08)",
                opacity: isActive ? 1 : 0.4,
            }}
        />
        {/* Partículas fluindo */}
        {isActive && (
            <>
                <motion.div
                    animate={{ y: [0, 76] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
                    style={{ background: fromColor, boxShadow: `0 0 14px ${fromColor}` }}
                />
                <motion.div
                    animate={{ y: [0, 76] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "linear", delay: 0.7 }}
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-[5px] h-[5px] rounded-full bg-white/30"
                />
            </>
        )}
    </div>
);

// ─── MOLECULE SECTION ─────────────────────────────────────────────────────────
// 3 nós conectados por ligações com fluxo animado.
// Cada nó se acende conforme entra na viewport ao rolar a tela.
export default function PilaresAbout() {
    const { t } = useTranslation();
    const texto = pt.about.apresentacao;
    const movimentoReduzido = useReducedMotion();
    const node0Ref = useRef<HTMLDivElement>(null);
    const node1Ref = useRef<HTMLDivElement>(null);
    const node2Ref = useRef<HTMLDivElement>(null);

    const isNode0 = useInView(node0Ref, { once: true, margin: "-10% 0px" });
    const isNode1 = useInView(node1Ref, { once: true, margin: "-10% 0px" });
    const isNode2 = useInView(node2Ref, { once: true, margin: "-10% 0px" });

    const activeMap = [isNode0, isNode1, isNode2];
    const refs = [node0Ref, node1Ref, node2Ref];

    return (
        <section aria-labelledby="about-fluxo" className="flex flex-col items-center w-full max-w-[1000px] mx-auto px-4 lg:px-0">
            {/* Cabeçalho */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-12"
            >
                <h2 id="about-fluxo" className="font-display text-3xl font-semibold text-slate-950 dark:text-white md:text-5xl">
                    {t("about.apresentacao.fluxo", texto.fluxo)}
                </h2>
            </motion.div>

            {/* Cadeia da molécula */}
            <div className="flex flex-col items-center w-full gap-0">
                {MOLECULE_NODES.map((node, i) => {
                    const isActive = activeMap[i] || Boolean(movimentoReduzido);
                    const isEven = i % 2 === 0;

                    return (
                        <div key={i} className="flex flex-col items-center w-full">
                            {/* Linha do nó */}
                            <div
                                ref={refs[i]}
                                className={`flex items-center w-full gap-5 ${!isEven ? "lg:flex-row-reverse" : ""
                                    }`}
                            >
                                {/* Átomo */}
                                <motion.div
                                    animate={
                                        isActive && !movimentoReduzido
                                            ? {
                                                boxShadow: [
                                                    `0 0 20px ${node.glowColor}`,
                                                    `0 0 60px ${node.glowColor}`,
                                                    `0 0 20px ${node.glowColor}`,
                                                ],
                                            }
                                            : { boxShadow: "0 0 0px transparent" }
                                    }
                                    transition={{ duration: 2.5, repeat: Infinity }}
                                    className={`flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-full border-2 ${node.borderClass} ${node.bgClass} backdrop-blur-xl flex flex-col items-center justify-center relative`}
                                >
                                    <span
                                        className={`text-[11px] font-black uppercase tracking-normal transition-colors duration-700 ${isActive ? node.textClass : "text-white/20"
                                            }`}
                                    >
                                        LVL
                                    </span>
                                    <span
                                        className={`text-xl font-black transition-colors duration-700 ${isActive ? "text-white" : "text-white/20"
                                            }`}
                                    >
                                        {node.level}
                                    </span>
                                    {/* Anel pulsante de ativação */}
                                    {isActive && !movimentoReduzido && (
                                        <motion.div
                                            animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
                                            transition={{ duration: 2.5, repeat: Infinity }}
                                            className={`absolute inset-0 rounded-full border ${node.pulseClass}`}
                                        />
                                    )}
                                </motion.div>

                                {/* Card de conteúdo */}
                                <motion.div
                                    initial={{ opacity: 0, x: isEven ? 40 : -40 }}
                                    animate={
                                        isActive
                                            ? { opacity: 1, x: 0 }
                                            : { opacity: 0.15, x: isEven ? 18 : -18 }
                                    }
                                    transition={{ type: "spring", stiffness: 60, damping: 20 }}
                                    whileHover={movimentoReduzido ? undefined : { y: -5 }}
                                    className={`min-w-0 flex-1 p-5 md:p-7 rounded-[1.8rem] bg-slate-950/90 border ${node.borderClass} shadow-xl transition-shadow duration-300 hover:shadow-[0_16px_40px_-14px_var(--pilar-brilho)]`}
                                    style={{ "--pilar-brilho": node.glowColor } as CSSProperties}
                                >
                                    {camadas[i].map((etapa) => (
                                        <div key={etapa} className="first:mt-0 mt-5">
                                            <h3 className="mb-2 text-lg font-semibold tracking-tight text-white md:text-xl">
                                                {t(`about.apresentacao.${etapa}.titulo`, texto[etapa].titulo)}
                                            </h3>
                                            <p className="text-sm leading-relaxed text-slate-200">
                                                {t(`about.apresentacao.${etapa}.descricao`, texto[etapa].descricao)}
                                            </p>
                                        </div>
                                    ))}
                                </motion.div>
                            </div>

                            {/* Ligação entre nós */}
                            {i < MOLECULE_NODES.length - 1 && (
                                <FlowBond
                                    isActive={isActive && !movimentoReduzido}
                                    fromColor={node.glowColor}
                                    toColor={MOLECULE_NODES[i + 1].glowColor}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

        </section>
    );
}
