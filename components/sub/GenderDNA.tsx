"use client";

/**
 * GenderDNA — Phase 6 of the liquid-glass-rooms transition.
 *
 * Restores the profile's DNA capsule colour-coded by gender (the colour stopped
 * showing after a migration). Reads `session.user.gender` (set in the auth
 * session callback: 'male' | 'female' | 'other'):
 *   male   → blue   (#3b82f6)
 *   female → pink   (#ec4899)
 *   other  → violet→cyan (canonical Zaeon accent)
 */

import React from "react";
import { useSession } from "next-auth/react";
import { GlassPanel, GLASS_ACCENT } from "@/components/ui/GlassPanel";

type Gender = "male" | "female" | "other" | string;

const PALETTE: Record<"male" | "female" | "other", { a: string; b: string; label: string }> = {
  male: { a: "#3b82f6", b: "#22d3ee", label: "Masculino" },
  female: { a: "#ec4899", b: "#f472b6", label: "Feminino" },
  other: { a: GLASS_ACCENT.violet, b: GLASS_ACCENT.cyan, label: "Neutro" },
};

function resolve(gender: Gender): "male" | "female" | "other" {
  const g = String(gender || "").toLowerCase();
  if (g.includes("masc") || g === "m" || g === "male") return "male";
  if (g.includes("fem") || g === "f" || g === "female") return "female";
  return "other";
}

export function GenderDNA({ className = "" }: { className?: string }) {
  const { data: session } = useSession();
  const key = resolve((session?.user as any)?.gender);
  const { a, b, label } = PALETTE[key];

  // Two sine strands + rungs → a simple animated double helix.
  const H = 120;
  const rungs = Array.from({ length: 9 }, (_, i) => i);

  return (
    <GlassPanel variant="inner" className={`flex flex-col items-center gap-2 px-4 py-4 ${className}`}>
      <span className="text-[9px] font-black uppercase tracking-[0.16em]" style={{ color: GLASS_ACCENT.mutedLabel }}>
        DNA
      </span>
      <svg width="56" height={H} viewBox={`0 0 56 ${H}`} aria-label={`DNA ${label}`}>
        <defs>
          <linearGradient id={`dna-${key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={a} />
            <stop offset="100%" stopColor={b} />
          </linearGradient>
        </defs>
        {rungs.map((i) => {
          const y = 8 + (i * (H - 16)) / (rungs.length - 1);
          const phase = (i / (rungs.length - 1)) * Math.PI * 2;
          const x1 = 28 + Math.sin(phase) * 18;
          const x2 = 28 - Math.sin(phase) * 18;
          return (
            <g key={i}>
              <line x1={x1} y1={y} x2={x2} y2={y} stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
              <circle cx={x1} cy={y} r="3.2" fill={a} />
              <circle cx={x2} cy={y} r="3.2" fill={b} />
            </g>
          );
        })}
        {/* strand backbones */}
        <path
          d={rungs.map((i) => { const y = 8 + (i * (H - 16)) / (rungs.length - 1); const x = 28 + Math.sin((i / (rungs.length - 1)) * Math.PI * 2) * 18; return `${i === 0 ? "M" : "L"} ${x} ${y}`; }).join(" ")}
          fill="none" stroke={`url(#dna-${key})`} strokeWidth="2" opacity="0.7"
        />
        <path
          d={rungs.map((i) => { const y = 8 + (i * (H - 16)) / (rungs.length - 1); const x = 28 - Math.sin((i / (rungs.length - 1)) * Math.PI * 2) * 18; return `${i === 0 ? "M" : "L"} ${x} ${y}`; }).join(" ")}
          fill="none" stroke={`url(#dna-${key})`} strokeWidth="2" opacity="0.7"
        />
      </svg>
      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: a }}>
        {label}
      </span>
    </GlassPanel>
  );
}

export default GenderDNA;
