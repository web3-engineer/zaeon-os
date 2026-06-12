"use client";

/**
 * ResearchesView — Phase 4 of the liquid-glass-rooms transition.
 *
 * Shared researches submodule (all rooms re-export it). Brought to the canonical
 * liquid glass and reconnected to the real academic-position classifier
 * (lib/scholar/levels + termometro). Detail (agent names, metrics) is lean:
 * hidden behind a "Ver detalhes" toggle.
 *
 * Note: rooms route the Research tab to /research-lab (canonical) since Phase 1;
 * this view is the standalone researches surface, now classifier-backed.
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Beaker, ChevronDown, Server, Lock } from "lucide-react";
import { GlassPanel, GLASS_ACCENT } from "@/components/ui/GlassPanel";
import { LEVEL_META, type Level } from "@/lib/scholar/levels";
import { estimateResearchTime, publicationTarget } from "@/lib/scholar/termometro";

interface ResearchItem {
  id: number;
  title: string;
  participants: { grads: number; masters: number; phds: number };
  level: Level; // classified academic position
  progress: number;
  status: string;
  details: { agents: string[]; writing: number; methodology: number; impact: number; clarity: number; rank: string };
}

const TITLES = [
  "Graphene Bio-synthesis via E.Coli Bacteria",
  "Mycelium Neural Networks: Organic Data Processing",
  "Z-77 Enzyme: Accelerated PET Polymer Degradation",
  "Self-healing Concrete with Bacterial Spores",
  "Artificial Photosynthesis for Industrial Carbon Capture",
  "Neuro-Botanical Interface: Plant-Machine Communication",
  "Bio-mining of Rare Earths in E-Waste",
  "Sensory Synthetic Skin for Advanced Prosthetics",
  "Genetic Algorithms for Protein Optimization",
  "Synthetic DNA Data Storage (Project Glass)",
  "Urban Bioluminescence: Public Lighting Replacement",
  "Microplastic Filtration via Chitin Membranes",
];
const AGENT_NAMES = ["Alpha-Node", "Synapse-X", "Core-V", "Flux-8", "Vertex-Alpha", "Omni-1", "Nexus-9"];

const getRank = (score: number): string => (score >= 95 ? "SS" : score >= 85 ? "S" : score >= 70 ? "A" : score >= 50 ? "B" : "C");
const getProgressLabel = (p: number) => (p < 25 ? "Explorando" : p < 51 ? "Validando" : p < 75 ? "Construindo" : p < 99 ? "Revisão por pares" : "Concluído");

// Classify the academic position from the participant mix (the real engine maps level → outlook).
const classifyLevel = (p: { masters: number; phds: number }): Level => (p.phds > 0 ? "phd" : p.masters > 0 ? "msc" : "grad");

// Deterministic pseudo-data (no Math.random at module scope → stable SSR, no hydration drift).
const RESEARCH_DATA: ResearchItem[] = Array.from({ length: 18 }).map((_, i) => {
  const progress = i === 0 ? 75 : i === 1 ? 69 : i === 2 ? 65 : 8 + ((i * 7) % 42);
  const phds = i < 4 ? (i % 3) + 1 : 0;
  const masters = i < 4 ? (i % 4) + 1 : i < 18 ? (i % 4) + 1 : 0;
  const grads = (i % 6) + 2;
  const writing = 60 + ((i * 13) % 40);
  const methodology = 60 + ((i * 7) % 40);
  const impact = 60 + ((i * 11) % 40);
  const clarity = 60 + ((i * 5) % 40);
  const avg = (writing + methodology + impact + clarity) / 4;
  const agents = Array.from({ length: (i % 4) + 2 }, (_, k) => AGENT_NAMES[k % AGENT_NAMES.length]);
  const participants = { grads, masters, phds };
  return {
    id: i + 1,
    title: TITLES[i % TITLES.length] + (i > 11 ? ` [Fase ${Math.floor(i / 5)}]` : ""),
    participants,
    level: classifyLevel(participants),
    progress,
    status: progress > 50 ? "Construindo" : "Em progresso",
    details: { agents, writing, methodology, impact, clarity, rank: getRank(avg) },
  };
});

function ResearchCard({ item }: { item: ResearchItem }) {
  const [expanded, setExpanded] = useState(false);
  const [showMeta, setShowMeta] = useState(false); // lean by default: agents/metrics hidden
  const meta = LEVEL_META[item.level];
  const time = estimateResearchTime(item.level);
  const pub = publicationTarget(item.level);

  return (
    <GlassPanel
      variant="inner"
      as={motion.div}
      // @ts-expect-error framer props on polymorphic element
      layout
      onClick={() => setExpanded((e) => !e)}
      className="cursor-pointer p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
            style={{ background: expanded ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
          >
            <Beaker size={15} />
          </div>
          <div>
            <h4 className="max-w-md text-[11px] font-bold uppercase leading-tight text-white">{item.title}</h4>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-[9px] font-bold" style={{ color: GLASS_ACCENT.cyan }}>
                {meta.icon} {meta.name} · {meta.suggestionType}
              </span>
              {(item.details.rank === "S" || item.details.rank === "SS") && (
                <span className="text-[9px] font-black" style={{ color: GLASS_ACCENT.violet }}>Rank {item.details.rank}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="rounded-md px-2 py-1 text-[9px] font-black uppercase" style={{ background: "rgba(255,255,255,0.08)", color: GLASS_ACCENT.dimLabel }}>
            {item.status}
          </span>
          {expanded && <ChevronDown size={12} className="animate-bounce" style={{ color: GLASS_ACCENT.darkerDim }} />}
        </div>
      </div>

      {/* Classifier readout (always visible — the reconnected engine) */}
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 pl-11 text-[9px]" style={{ color: GLASS_ACCENT.dimLabel }}>
        <span>⏱ {time.label}</span>
        <span>📄 {pub.qualis} · {pub.tier}</span>
        {item.participants.phds > 0 && <span><b className="text-white">{item.participants.phds}</b> PhDs</span>}
        {item.participants.masters > 0 && <span><b className="text-white">{item.participants.masters}</b> Mestres</span>}
        <span><b className="text-white">{item.participants.grads}</b> Grad</span>
      </div>

      <div className="mt-3 pl-11">
        <div className="mb-1 flex justify-between text-[9px] font-bold text-white">
          <span className="uppercase tracking-wide">{getProgressLabel(item.progress)}</span>
          <span>{item.progress}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.10)" }}>
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: `${item.progress}%` }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #8b5cf6, #22d3ee)" }}
          />
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-4 border-t border-white/10 pt-4 pl-2">
              {/* Lean: the focus is the topic. Agents/metrics are opt-in. */}
              {!showMeta ? (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowMeta(true); }}
                  className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white"
                  style={{ background: "rgba(139,92,246,0.25)", border: "1px solid rgba(139,92,246,0.45)" }}
                >
                  Ver detalhes
                </button>
              ) : (
                <div onClick={(e) => e.stopPropagation()}>
                  <h5 className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase" style={{ color: GLASS_ACCENT.mutedLabel }}>
                    <Server size={12} /> Agentes no fluxo
                  </h5>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {item.details.agents.map((a, idx) => (
                      <span key={idx} className="rounded border px-2 py-1 text-[9px]" style={{ background: "rgba(34,211,238,0.10)", borderColor: "rgba(34,211,238,0.25)", color: GLASS_ACCENT.cyan }}>{a}</span>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {[{ label: "Escrita", val: item.details.writing }, { label: "Metodologia", val: item.details.methodology }, { label: "Impacto", val: item.details.impact }, { label: "Clareza", val: item.details.clarity }].map((m, idx) => (
                      <div key={idx}>
                        <div className="mb-1 flex justify-between text-[9px]"><span style={{ color: GLASS_ACCENT.dimLabel }}>{m.label}</span><span className="font-mono text-white/80">{m.val}/100</span></div>
                        <div className="h-1 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                          <div style={{ width: `${m.val}%`, background: m.val > 80 ? "#22d3ee" : "rgba(255,255,255,0.3)" }} className="h-full rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassPanel>
  );
}

export default function ResearchesView() {
  return (
    <div className="flex h-full w-full flex-col gap-5">
      <GlassPanel variant="shell" className="flex items-center justify-between p-5">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full" style={{ background: GLASS_ACCENT.cyan }} />
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">{RESEARCH_DATA.length} projetos ativos</h3>
        </div>
        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider" style={{ color: GLASS_ACCENT.dimLabel }}>
          <Lock size={12} /> Chat liberado por credencial
        </div>
      </GlassPanel>

      <div className="grid grid-cols-1 gap-3 pb-16">
        {RESEARCH_DATA.map((item) => <ResearchCard key={item.id} item={item} />)}
      </div>
    </div>
  );
}
