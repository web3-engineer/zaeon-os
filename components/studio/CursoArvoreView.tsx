"use client";

/**
 * CursoArvoreView — a UI/UX BASE de todo curso de CÓDIGO (repo), como ÁRVORE DA VIDA no estilo Zaeon.
 * A sequência que o dono pediu, na forma de árvore simétrica e circular:
 *   1. o GRAFO DO CÓDIGO (graphify) entra com fade + zoom — a matéria-prima, que recua pro fundo;
 *   2. a ÁRVORE DA VIDA se desenha a partir da semente: raízes espelhando a copa, tronco central,
 *      ramos (módulos) curvando simétricos até a copa, folhas (símbolos) abrindo nas pontas;
 *   3. para no PONTO INICIAL com o 1º ramo ("comece por aqui") destacado.
 * Forma de árvore da vida; CORES as da casa (cyan). Sem temperatura e sem botão de iniciar.
 */
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { CursoRepo } from "@/lib/forja/tipos";
import { layoutBotanico, CANVAS } from "@/lib/forja/layoutBotanico";
import { layoutCodigo } from "@/lib/forja/layoutCurso";

type Fase = "codigo" | "arvore" | "pronto";
const curto = (s: string, n = 22): string => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "");
const CX = CANVAS.w / 2;

export default function CursoArvoreView({ curso, titulo, onFechar }: { curso: CursoRepo; titulo?: string; onFechar?: () => void }) {
  const [fase, setFase] = useState<Fase>("codigo");

  const arvore = useMemo(() => layoutBotanico(curso.arvore), [curso.arvore]);
  const codigo = useMemo(() => layoutCodigo(curso.grafo), [curso.grafo]);
  const posCod = useMemo(() => new Map(codigo.map((c) => [c.id, c])), [codigo]);

  useEffect(() => {
    const t1 = setTimeout(() => setFase("arvore"), 1200);
    const t2 = setTimeout(() => setFase("pronto"), 3800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const mostraArvore = fase === "arvore" || fase === "pronto";
  const pronto = fase === "pronto";
  const semMapa = curso.grafo.nos.length === 0;
  const cabecalho = (titulo || curso.arvore.raiz.titulo || "").trim();
  const entrada = arvore.ramos[0]?.id; // "comece por aqui" = o primeiro ramo

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#060b16]">
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 38%, rgba(34,211,238,0.12), transparent 60%)" }} />

      <div className="absolute left-5 top-4 z-20">
        <div className="font-mono text-[12px] text-cyan-400/90">{curso.repo}</div>
        <div className="text-[18px] font-black tracking-tight text-white">{cabecalho}</div>
      </div>
      {onFechar && (
        <button type="button" onClick={onFechar} aria-label="voltar"
          className="absolute right-4 top-4 z-30 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[12px] text-white/70 hover:text-white">← voltar</button>
      )}

      <svg viewBox={`0 0 ${CANVAS.w} ${CANVAS.h}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="aura" cx="50%" cy="50%">
            <stop offset="0%" stopColor="rgba(34,211,238,0.14)" /><stop offset="100%" stopColor="rgba(34,211,238,0)" />
          </radialGradient>
        </defs>

        {/* ── 1. o grafo do código (graphify): a matéria-prima, que recua pro fundo ── */}
        <motion.g initial={{ opacity: 0, scale: 0.86 }} animate={{ opacity: mostraArvore ? 0.12 : 0.85, scale: 1 }} transition={{ duration: 1.0, ease: "easeOut" }} style={{ transformOrigin: `${CX}px 392px` }}>
          {curso.grafo.arestas.map((a, i) => {
            const de = posCod.get(a.de), para = posCod.get(a.para);
            if (!de || !para) return null;
            return <line key={`ce${i}`} x1={de.x} y1={de.y} x2={para.x} y2={para.y} stroke="#1e3a5f" strokeWidth={1} />;
          })}
          {codigo.map((c) => (
            <circle key={c.id} cx={c.x} cy={c.y} r={3 + Math.min(5, c.grau)} fill="#0e2033" stroke="#2b5278" strokeWidth={1} />
          ))}
        </motion.g>

        {/* ── 2. a Árvore da Vida se desenha ── */}
        <AnimatePresence>
          {mostraArvore && (
            <g>
              {/* aura da copa */}
              <motion.circle cx={arvore.centro.x} cy={340} r={250} fill="url(#aura)"
                initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: pronto ? 1 : 0, scale: 1 }} transition={{ duration: 1.2, delay: 1.4 }} />

              {/* anel que emoldura a árvore */}
              <motion.circle cx={arvore.centro.x} cy={arvore.centro.y} r={arvore.rAnel} fill="none" stroke="#22d3ee" strokeWidth={1.5} strokeOpacity={0.28}
                initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.28 }} transition={{ duration: 1.6, ease: "easeInOut" }} />

              {/* solo */}
              <motion.line x1={arvore.centro.x - 300} y1={arvore.semente.y} x2={arvore.centro.x + 300} y2={arvore.semente.y}
                stroke="#22d3ee" strokeWidth={1.5} strokeOpacity={0.35}
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8 }} />

              {/* raízes espelhando a copa */}
              {arvore.raizes.map((r, i) => (
                <motion.path key={`raiz${i}`} d={r.d} fill="none" stroke="#1b6f86" strokeWidth={2.5} strokeLinecap="round" strokeOpacity={0.75}
                  initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.75 }} transition={{ duration: 0.9, delay: 0.1 + i * 0.06 }} />
              ))}

              {/* tronco */}
              <motion.path d={arvore.troncoPath} fill="none" stroke="#2b8fa6" strokeWidth={9} strokeLinecap="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.0, delay: 0.4, ease: "easeOut" }} />

              {/* ramos (módulos) + folhas (símbolos) */}
              {arvore.ramos.map((ramo, i) => {
                const ehEntrada = ramo.id === entrada;
                const brota = 0.8 + i * 0.22;
                return (
                  <g key={ramo.id}>
                    <motion.path d={ramo.path} fill="none" stroke="#22d3ee" strokeWidth={4} strokeLinecap="round" strokeOpacity={0.9}
                      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7, delay: brota }} />

                    {/* folhas */}
                    {ramo.folhas.map((f, j) => (
                      <motion.g key={f.id} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 240, damping: 18, delay: brota + 0.45 + j * 0.1 }}>
                        <circle cx={f.x} cy={f.y} r={5} fill="#0e2a3a" stroke="#22d3ee" strokeWidth={1.5} filter="url(#glow)" />
                        <text x={f.x} y={f.y - 10} textAnchor="middle" className="fill-cyan-200/70" style={{ fontSize: 10 }}>{curto(f.titulo, 16)}</text>
                      </motion.g>
                    ))}

                    {/* nó do módulo na ponta */}
                    <motion.g initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 20, delay: brota + 0.3 }}>
                      {ehEntrada && pronto && (
                        <motion.circle cx={ramo.x} cy={ramo.y} r={18} fill="none" stroke="#fbbf24" strokeWidth={2}
                          animate={{ r: [16, 28], opacity: [0.7, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }} />
                      )}
                      <circle cx={ramo.x} cy={ramo.y} r={ehEntrada ? 12 : 9}
                        fill={ehEntrada ? "#fbbf24" : "#22d3ee"} stroke={ehEntrada ? "#fde68a" : "#a5f3fc"} strokeWidth={2} filter="url(#glow)" />
                      <text x={ramo.x} y={ramo.y - 17} textAnchor="middle" className="fill-white" style={{ fontSize: 12, fontWeight: 700 }}>{curto(ramo.titulo, 20)}</text>
                      {ehEntrada && pronto && (
                        <motion.text x={ramo.x} y={ramo.y + 28} textAnchor="middle" className="fill-amber-300" style={{ fontSize: 11, fontWeight: 700 }}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>comece por aqui</motion.text>
                      )}
                    </motion.g>
                  </g>
                );
              })}

              {/* a semente / o repo, na base do tronco */}
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <circle cx={arvore.semente.x} cy={arvore.semente.y} r={7} fill="#0b3a66" stroke="#a5f3fc" strokeWidth={2} filter="url(#glow)" />
                <text x={arvore.semente.x} y={arvore.semente.y + 24} textAnchor="middle" className="fill-cyan-100/80" style={{ fontSize: 12, fontWeight: 800 }}>{curto(arvore.semente.titulo, 32)}</text>
              </motion.g>
            </g>
          )}
        </AnimatePresence>
      </svg>

      {semMapa && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] text-amber-200/80">
          a árvore ganha galhos quando o motor analisar o repositório
        </div>
      )}
    </div>
  );
}
