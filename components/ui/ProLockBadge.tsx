"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * ProLockBadge — the single reusable "🔒 Pro" seal.
 *
 * Every feature gated behind the Pro tier (Projetos, Collective Build Node, …)
 * renders this badge instead of inventing its own lock styling. Glass-on-glass,
 * violet/cyan accent, with a configurable tooltip.
 */

export interface ProLockBadgeProps {
  /** Tooltip text shown on hover/focus. */
  tooltip?: string;
  /** Visible label next to the lock. Defaults to "Pro". */
  label?: string;
  /** Compact icon-only pill (no text label). */
  compact?: boolean;
  className?: string;
}

export function ProLockBadge({
  tooltip = "Ferramenta Pro — em breve",
  label = "Pro",
  compact = false,
  className,
}: ProLockBadgeProps) {
  const [show, setShow] = useState(false);

  return (
    <span
      className={cn("relative inline-flex items-center", className)}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      tabIndex={0}
      role="note"
      aria-label={`${label}. ${tooltip}`}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full font-black uppercase tracking-[0.12em] text-white select-none",
          compact ? "px-1.5 py-0.5 text-[8px]" : "px-2 py-[3px] text-[9px]",
        )}
        style={{
          background:
            "linear-gradient(180deg, rgba(139,92,246,0.45), rgba(34,211,238,0.20))",
          border: "1px solid rgba(255,255,255,0.28)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.40), 0 6px 16px -6px rgba(139,92,246,0.8)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        <span aria-hidden>🔒</span>
        {!compact && <span>{label}</span>}
      </span>

      {show && tooltip && (
        <span
          role="tooltip"
          className="absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-[10px] px-2.5 py-1.5 text-[10px] font-medium text-[#e7e7f5]"
          style={{
            background: "rgba(15,15,28,0.92)",
            border: "1px solid rgba(139,92,246,0.55)",
            backdropFilter: "blur(24px) saturate(160%)",
            WebkitBackdropFilter: "blur(24px) saturate(160%)",
            boxShadow:
              "0 16px 48px -12px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.12)",
          }}
        >
          {tooltip}
        </span>
      )}
    </span>
  );
}

export default ProLockBadge;
