"use client";

/**
 * GenderDNA — hélice de DNA **animada** colorida por gênero, restaurada no perfil.
 *
 * Mesma estética do `RealisticDNA` que existia em `app/workstation/page.tsx`
 * (fios verticais girando em rotateY 0→360), agora com cor por gênero lida de
 * `session.user.gender`:
 *   male   → azul   · female → rosa · other → violeta→ciano
 */

import React from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";

type GKey = "male" | "female" | "other";

const THEME: Record<GKey, { c1: string; c2: string; grad: string; label: string; text: string }> = {
  male:   { c1: "bg-blue-500",   c2: "bg-cyan-400",  grad: "from-blue-500 to-cyan-400",   label: "Masculino", text: "#3b82f6" },
  female: { c1: "bg-pink-500",   c2: "bg-rose-400",  grad: "from-pink-500 to-rose-400",   label: "Feminino",  text: "#ec4899" },
  other:  { c1: "bg-violet-500", c2: "bg-cyan-400",  grad: "from-violet-500 to-cyan-400", label: "Neutro",    text: "#8b5cf6" },
};

function resolve(gender: unknown): GKey {
  const g = String(gender || "").toLowerCase();
  if (g.includes("masc") || g === "m" || g === "male") return "male";
  if (g.includes("fem") || g === "f" || g === "female") return "female";
  return "other";
}

export function GenderDNA({
  className = "",
  rungs = 16,
  showLabel = true,
}: {
  className?: string;
  rungs?: number;
  showLabel?: boolean;
}) {
  const { data: session } = useSession();
  const t = THEME[resolve((session?.user as any)?.gender)];

  return (
    <div className={`relative flex min-h-[140px] flex-col items-center justify-center ${className}`}>
      <motion.div
        animate={{ opacity: [0.8, 1, 0.8], scale: [0.98, 1.02, 0.98] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="flex w-full flex-1 flex-col items-center justify-around py-2"
        style={{ perspective: "1000px" }}
        aria-label={`DNA ${t.label}`}
      >
        {[...Array(rungs)].map((_, i) => (
          <motion.div
            key={i}
            className="relative flex w-12 items-center justify-between"
            style={{ height: 3 }}
            animate={{ rotateY: [0, 360] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear", delay: i * 0.15 }}
          >
            <div className={`h-2.5 w-2.5 rounded-full ${t.c1}`} />
            <div className={`h-[2px] flex-1 bg-gradient-to-r ${t.grad}`} />
            <div className={`h-2.5 w-2.5 rounded-full ${t.c2}`} />
          </motion.div>
        ))}
      </motion.div>
      {showLabel && (
        <span className="mt-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: t.text }}>
          DNA · {t.label}
        </span>
      )}
    </div>
  );
}

export default GenderDNA;
