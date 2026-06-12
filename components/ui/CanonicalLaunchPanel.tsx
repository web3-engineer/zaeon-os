"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { GlassPanel, GLASS_ACCENT } from "@/components/ui/GlassPanel";

/**
 * CanonicalLaunchPanel — shown in a room slot whose content was consolidated
 * into a single canonical surface. Instead of each room embedding its own
 * (duplicate) module, the slot points to the one canonical page.
 *
 *   research → /research-lab  (the gold-standard Sala de Pesquisa)
 *   news     → /news          (the canonical Notícias mural)
 *
 * The old per-room module files are kept on disk (deletion deferred); they are
 * simply no longer mounted.
 */
const PRESETS = {
  research: {
    title: "Sala de Pesquisa",
    href: "/research-lab",
    description:
      "A Pesquisa agora vive na Sala de Pesquisa — o ambiente canônico, em liquid glass.",
    cta: "Abrir Sala de Pesquisa",
  },
  news: {
    title: "Notícias",
    href: "/news",
    description: "As Notícias agora vivem no mural canônico de Notícias.",
    cta: "Abrir Notícias",
  },
} as const;

export function CanonicalLaunchPanel({
  target,
}: {
  target: keyof typeof PRESETS;
}) {
  const p = PRESETS[target];
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <GlassPanel
        variant="inner"
        className="flex max-w-md flex-col items-center gap-4 px-8 py-10 text-center"
      >
        <h3 className="text-[15px] font-black uppercase tracking-[0.16em] text-white">
          {p.title}
        </h3>
        <p
          className="text-[12px] leading-relaxed"
          style={{ color: GLASS_ACCENT.dimLabel }}
        >
          {p.description}
        </p>
        <Link
          href={p.href}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-transform hover:scale-[1.03]"
          style={{
            background:
              "linear-gradient(180deg, rgba(139,92,246,0.55), rgba(34,211,238,0.22))",
            border: "1px solid rgba(255,255,255,0.35)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.4), 0 8px 20px -8px rgba(139,92,246,0.85)",
          }}
        >
          {p.cta}
          <ArrowUpRight size={14} />
        </Link>
      </GlassPanel>
    </div>
  );
}

export default CanonicalLaunchPanel;
