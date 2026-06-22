"use client";

/**
 * Renderizadores INLINE dos artefatos de texto do Studio — com a cara da Zaeon
 * (liquid glass, cyan/violet). Cada view recebe o `meta` do StudioArtifact.
 */
import { useState } from "react";
import { layoutMindmap, type MmNode } from "@/lib/studio/mindmap-layout";

const card = "rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl";

export function GuideView({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      {data?.resumo && (
        <div className={`${card} p-4`}>
          <p className="text-[13px] leading-relaxed text-slate-700 dark:text-white/80">{data.resumo}</p>
        </div>
      )}
      {!!data?.conceitos?.length && (
        <div className="space-y-2">
          <h4 className="text-[11px] font-black uppercase tracking-wide text-cyan-600 dark:text-cyan-300">Conceitos</h4>
          {data.conceitos.map((c: any, i: number) => (
            <div key={i} className={`${card} p-3.5`}>
              <div className="text-[13px] font-bold text-[#0b3a66] dark:text-white">{c.termo}</div>
              <div className="text-[12.5px] leading-relaxed text-slate-600 dark:text-white/70 mt-0.5">{c.definicao}</div>
            </div>
          ))}
        </div>
      )}
      {!!data?.revisao?.length && (
        <div className="space-y-1.5">
          <h4 className="text-[11px] font-black uppercase tracking-wide text-violet-500 dark:text-violet-300">Revisão rápida</h4>
          <ul className="space-y-1">
            {data.revisao.map((r: string, i: number) => (
              <li key={i} className="flex gap-2 text-[12.5px] text-slate-700 dark:text-white/75">
                <span className="text-cyan-500">◆</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function FaqView({ data }: { data: any }) {
  return (
    <div className="space-y-2.5">
      {(data?.faq || []).map((f: any, i: number) => (
        <div key={i} className={`${card} p-3.5`}>
          <div className="text-[13px] font-bold text-[#0b3a66] dark:text-white flex gap-2">
            <span className="text-cyan-500">?</span>
            <span>{f.q}</span>
          </div>
          <div className="text-[12.5px] leading-relaxed text-slate-600 dark:text-white/70 mt-1 pl-5">{f.a}</div>
        </div>
      ))}
    </div>
  );
}

function FlipCard({ front, back }: { front: string; back: string }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      onClick={() => setFlipped((v) => !v)}
      className="relative h-32 w-full text-left"
      style={{ perspective: "1000px" }}
      title="Clique para virar"
    >
      <div
        className="relative h-full w-full transition-transform duration-500"
        style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "none" }}
      >
        <div
          className={`${card} absolute inset-0 p-3.5 flex items-center justify-center text-center`}
          style={{ backfaceVisibility: "hidden" }}
        >
          <span className="text-[13px] font-bold text-[#0b3a66] dark:text-white">{front}</span>
        </div>
        <div
          className="absolute inset-0 p-3.5 flex items-center justify-center text-center rounded-2xl border border-cyan-400/40 text-white"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: "linear-gradient(135deg,#2563eb,#06b6d4)",
          }}
        >
          <span className="text-[12.5px] leading-snug">{back}</span>
        </div>
      </div>
    </button>
  );
}

export function FlashcardsView({ data }: { data: any }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {(data?.cards || []).map((c: any, i: number) => (
        <FlipCard key={i} front={c.front} back={c.back} />
      ))}
    </div>
  );
}

export function TimelineView({ data }: { data: any }) {
  const events = data?.events || [];
  return (
    <ol className="relative ml-3 border-l-2 border-cyan-400/40 space-y-4 pt-1">
      {events.map((e: any, i: number) => (
        <li key={i} className="ml-4 relative">
          <span
            className="absolute -left-[1.42rem] top-1 w-3 h-3 rounded-full ring-4 ring-white dark:ring-[#0a1020]"
            style={{ background: "linear-gradient(135deg,#2563eb,#22d3ee)" }}
          />
          {e.when && <div className="text-[11px] font-black uppercase tracking-wide text-cyan-600 dark:text-cyan-300">{e.when}</div>}
          <div className="text-[13px] font-bold text-[#0b3a66] dark:text-white">{e.title}</div>
          {e.detail && <div className="text-[12.5px] leading-relaxed text-slate-600 dark:text-white/70 mt-0.5">{e.detail}</div>}
        </li>
      ))}
    </ol>
  );
}

export function PodcastView({ audioUrl, data }: { audioUrl: string; data: any }) {
  const [showTranscript, setShowTranscript] = useState(false);
  const turns: { speaker: string; text: string }[] = data?.transcript || [];
  const hosts: { id: string; name: string }[] = data?.hosts || [];
  const sideOf = (name: string) => (hosts.find((h) => h.name === name)?.id === "B" ? "B" : "A");
  return (
    <div className="space-y-3">
      <div className={`${card} p-3`}>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio controls src={audioUrl} className="w-full" preload="metadata" />
      </div>
      {!!turns.length && (
        <div>
          <button
            onClick={() => setShowTranscript((v) => !v)}
            className="text-[12px] font-bold text-cyan-600 dark:text-cyan-300 hover:underline"
          >
            {showTranscript ? "Ocultar transcrição" : "Ver transcrição"}
          </button>
          {showTranscript && (
            <div className="mt-2 space-y-2">
              {turns.map((t, i) => {
                const b = sideOf(t.speaker) === "B";
                return (
                  <div key={i} className={`flex ${b ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-[12.5px] leading-relaxed ${
                        b
                          ? "bg-violet-500/10 text-violet-900 dark:text-violet-100 rounded-br-sm"
                          : "bg-cyan-500/10 text-cyan-900 dark:text-cyan-100 rounded-bl-sm"
                      }`}
                    >
                      <span className="block text-[10px] font-black uppercase tracking-wide opacity-60">{t.speaker}</span>
                      {t.text}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function MindmapView({ data }: { data: any }) {
  const nodes: MmNode[] = (data?.nodes || []).map((n: any) => ({ id: String(n.id), label: String(n.label), parent: n.parent ?? null }));
  const { nodes: pos, links, width, height } = layoutMindmap(nodes);
  const nodeW = 150;
  const nodeH = 42;
  if (!pos.length) return <div className="text-[12px] text-slate-400">Mapa vazio.</div>;
  return (
    <div className="overflow-auto custom-scrollbar rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] p-2">
      <svg width={width + nodeW} height={height + nodeH} viewBox={`-10 -10 ${width + nodeW + 20} ${height + nodeH + 20}`} className="min-w-full">
        <defs>
          <linearGradient id="zstudio-node" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        {links.map((l, i) => (
          <path
            key={i}
            d={`M ${l.x1} ${l.y1} C ${(l.x1 + l.x2) / 2} ${l.y1}, ${(l.x1 + l.x2) / 2} ${l.y2}, ${l.x2} ${l.y2}`}
            fill="none"
            stroke="rgba(34,211,238,0.45)"
            strokeWidth={1.5}
          />
        ))}
        {pos.map((n) => {
          const isRoot = n.depth === 0;
          return (
            <g key={n.id}>
              <rect
                x={n.x - nodeW / 2}
                y={n.y - nodeH / 2}
                width={nodeW}
                height={nodeH}
                rx={12}
                fill={isRoot ? "url(#zstudio-node)" : "rgba(255,255,255,0.9)"}
                stroke={isRoot ? "none" : "rgba(34,211,238,0.5)"}
                strokeWidth={1.5}
                className={isRoot ? "" : "dark:fill-[#0f1830]"}
              />
              <text
                x={n.x}
                y={n.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={11.5}
                fontWeight={isRoot ? 800 : 600}
                fill={isRoot ? "#ffffff" : "#0b3a66"}
                className={isRoot ? "" : "dark:fill-white"}
              >
                {n.label.length > 22 ? n.label.slice(0, 21) + "…" : n.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
