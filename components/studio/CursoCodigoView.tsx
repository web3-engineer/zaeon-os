"use client";

/**
 * CursoCodigoView — a UI/UX BASE de todo curso de CÓDIGO (repo). A sequência que o dono pediu:
 *   1. o GRAFO DO CÓDIGO (graphify) entra com fade + zoom;
 *   2. a BASE DE CONHECIMENTO (árvore do understand) se monta animando por cima;
 *   3. para no PONTO INICIAL (a raiz) com a 1ª área ("comece por aqui") destacada.
 * Sem temperatura e sem botão de iniciar: abrir o card já é querer começar, e a árvore é mostrada no
 * nível que o understand entrega. Puro de dados: recebe o CursoRepo e desenha. Depois entram mais
 * harness/skill (lições que arrancam, Aura conduzindo) pra virar curso de verdade.
 */
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { CursoRepo } from "@/lib/forja/tipos";
import { layoutSaber, layoutCodigo, CENTRO } from "@/lib/forja/layoutCurso";

const VB = { w: 1040, h: 760 };
type Fase = "codigo" | "saber" | "pronto";

export default function CursoCodigoView({ curso, titulo, onFechar }: { curso: CursoRepo; titulo?: string; onFechar?: () => void }) {
  const [fase, setFase] = useState<Fase>("codigo");

  const saber = useMemo(() => layoutSaber(curso.arvore), [curso.arvore]);
  const codigo = useMemo(() => layoutCodigo(curso.grafo), [curso.grafo]);
  const posCod = useMemo(() => new Map(codigo.map((c) => [c.id, c])), [codigo]);
  const posSaber = useMemo(() => new Map(saber.nos.map((n) => [n.id, n])), [saber]);
  const entrada = saber.nos.find((n) => n.nivel === 1)?.id ?? saber.nos[0]?.id; // "comece por aqui"

  // a coreografia: código (fade+zoom) → base de conhecimento (monta) → pronto (para no ponto inicial)
  useEffect(() => {
    const t1 = setTimeout(() => setFase("saber"), 1400);
    const t2 = setTimeout(() => setFase("pronto"), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const mostraSaber = fase === "saber" || fase === "pronto";
  const pronto = fase === "pronto";
  const semMapa = curso.grafo.nos.length === 0;
  const cabecalho = (titulo || curso.arvore.raiz.titulo || "").trim();

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#060b16]">
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(34,211,238,0.10), transparent 60%)" }} />

      <div className="absolute left-5 top-4 z-20">
        <div className="font-mono text-[12px] text-cyan-400/90">{curso.repo}</div>
        <div className="text-[18px] font-black tracking-tight text-white">{cabecalho}</div>
      </div>
      {onFechar && (
        <button type="button" onClick={onFechar} aria-label="voltar"
          className="absolute right-4 top-4 z-30 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[12px] text-white/70 hover:text-white">← voltar</button>
      )}

      <svg viewBox={`0 0 ${VB.w} ${VB.h}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        <motion.g initial={{ opacity: 0, scale: 0.86 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ transformOrigin: `${CENTRO.x}px ${CENTRO.y}px` }}>

          {/* ── 1. o grafo do código (graphify): arestas + nós, de fundo ── */}
          <g opacity={mostraSaber ? 0.35 : 0.9}>
            {curso.grafo.arestas.map((a, i) => {
              const de = posCod.get(a.de), para = posCod.get(a.para);
              if (!de || !para) return null;
              return <motion.line key={`ce${i}`} x1={de.x} y1={de.y} x2={para.x} y2={para.y} stroke="#1e3a5f" strokeWidth={1}
                initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 0.8, delay: 0.1 + i * 0.03 }} />;
            })}
            {codigo.map((c, i) => (
              <motion.g key={c.id} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.15 + i * 0.04 }}>
                <circle cx={c.x} cy={c.y} r={4 + Math.min(6, c.grau)} fill="#0e2033" stroke="#2b5278" strokeWidth={1} />
                <text x={c.x} y={c.y - 10 - Math.min(6, c.grau)} textAnchor="middle" className="fill-slate-500" style={{ fontSize: 10, fontFamily: "monospace" }}>{c.nome}</text>
              </motion.g>
            ))}
          </g>

          {/* ── 2. a base de conhecimento (understand), por cima, animando — a árvore inteira ── */}
          <AnimatePresence>
            {mostraSaber && (
              <g>
                {saber.arestas.map((e, i) => {
                  const de = posSaber.get(e.de)!, para = posSaber.get(e.para)!;
                  return <motion.line key={`se${e.de}-${e.para}`} x1={de.x} y1={de.y} x2={para.x} y2={para.y} stroke="#22d3ee" strokeWidth={1.5} strokeOpacity={0.5}
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: i * 0.05 }} />;
                })}
                {saber.nos.map((n, i) => {
                  const raiz = n.nivel === 0;
                  const ehEntrada = n.id === entrada;
                  const r = raiz ? 14 : n.nivel === 1 ? 10 : 7;
                  return (
                    <motion.g key={n.id} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 20, delay: pronto ? 0 : 0.2 + i * 0.08 }}>
                      {(raiz || ehEntrada) && pronto && (
                        <motion.circle cx={n.x} cy={n.y} r={r + 8} fill="none" stroke="#22d3ee" strokeWidth={2}
                          animate={{ r: [r + 8, r + 16], opacity: [0.6, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }} />
                      )}
                      <circle cx={n.x} cy={n.y} r={r} fill={raiz ? "#22d3ee" : n.nivel === 1 ? "#0b3a66" : "#0e2033"}
                        stroke={raiz || ehEntrada ? "#a5f3fc" : "#22d3ee"} strokeWidth={raiz ? 2.5 : 1.5} />
                      <text x={n.x} y={n.y + r + 15} textAnchor="middle" className={raiz ? "fill-white" : "fill-cyan-100/80"}
                        style={{ fontSize: raiz ? 14 : 12, fontWeight: raiz ? 800 : 600 }}>{n.titulo}</text>
                      {ehEntrada && pronto && (
                        <motion.text x={n.x} y={n.y - r - 12} textAnchor="middle" className="fill-cyan-300"
                          style={{ fontSize: 11, fontWeight: 700 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>comece por aqui</motion.text>
                      )}
                    </motion.g>
                  );
                })}
              </g>
            )}
          </AnimatePresence>
        </motion.g>
      </svg>

      {semMapa && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] text-amber-200/80">
          o mapa do código entra quando o motor analisar o repositório
        </div>
      )}
    </div>
  );
}
