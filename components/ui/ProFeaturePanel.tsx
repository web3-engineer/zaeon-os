"use client";

import React from "react";
import { Lock } from "lucide-react";
import { GlassPanel, GLASS_ACCENT } from "@/components/ui/GlassPanel";
import { ProLockBadge } from "@/components/ui/ProLockBadge";

/**
 * ProFeaturePanel — the canonical "this feature is gated behind Pro" surface.
 *
 * Used wherever a module is ported behind the Pro flag instead of being
 * rendered (e.g. Projetos in every room, the Collective Build Node in Aulas).
 * The underlying feature code is kept — it is simply not mounted; this panel
 * takes its place in the navigation slot.
 */
export interface ProFeaturePanelProps {
  /** Feature title, e.g. "Projetos". */
  title: string;
  /** One-line description of what the Pro feature does. */
  description: string;
  /** Tooltip on the Pro badge. */
  tooltip?: string;
}

export function ProFeaturePanel({
  title,
  description,
  tooltip = "Ferramenta Pro — em breve",
}: ProFeaturePanelProps) {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <GlassPanel
        variant="inner"
        className="flex max-w-md flex-col items-center gap-4 px-8 py-10 text-center"
      >
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{
            background:
              "linear-gradient(180deg, rgba(139,92,246,0.4), rgba(34,211,238,0.18))",
            border: "1px solid rgba(255,255,255,0.35)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.4), 0 6px 16px -6px rgba(139,92,246,0.8)",
          }}
        >
          <Lock size={22} className="text-white" />
        </div>

        <div className="flex items-center gap-2">
          <h3 className="text-[15px] font-black uppercase tracking-[0.16em] text-white">
            {title}
          </h3>
          <ProLockBadge tooltip={tooltip} />
        </div>

        <p
          className="text-[12px] leading-relaxed"
          style={{ color: GLASS_ACCENT.dimLabel }}
        >
          {description}
        </p>
      </GlassPanel>
    </div>
  );
}

export default ProFeaturePanel;
