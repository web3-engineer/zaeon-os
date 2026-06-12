"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * GlassPanel — the single source of the Zaeon "liquid glass" surface.
 *
 * Token values are lifted verbatim from
 * docs/superpowers/specs/2026-06-07-liquid-glass-style-reference.md
 * (the same numbers used by the Sala de Pesquisa `ResearchShell`).
 *
 * Rule (from the rooms-transition PR): no new panel uses inline glass styling.
 * Every glass surface consumes <GlassPanel> with one of the four variants.
 */

export type GlassVariant = "shell" | "inner" | "dock" | "popover";

/** Raw style objects so non-div callers (motion.div, etc.) can spread them. */
export const GLASS_STYLES: Record<GlassVariant, React.CSSProperties> = {
  // §1 Outer Shell
  shell: {
    borderRadius: 22,
    background: "rgba(22,22,34,0.55)",
    border: "1px solid rgba(255,255,255,0.12)",
    backdropFilter: "blur(40px) saturate(180%)",
    WebkitBackdropFilter: "blur(40px) saturate(180%)",
    boxShadow:
      "0 40px 100px -30px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.10)",
  },
  // §2 Inner Panels
  inner: {
    borderRadius: 18,
    background: "rgba(255,255,255,0.045)",
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
  },
  // §4 Dock strip
  dock: {
    borderRadius: 15,
    background: "rgba(0,0,0,0.28)",
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
  },
  // §6 Citation / floating popover
  popover: {
    borderRadius: 14,
    background: "rgba(15,15,28,0.92)",
    border: "1px solid rgba(139,92,246,0.55)",
    backdropFilter: "blur(24px) saturate(160%)",
    WebkitBackdropFilter: "blur(24px) saturate(160%)",
    boxShadow:
      "0 16px 48px -12px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.12)",
  },
};

/** Zaeon accent tokens (§7 Colour Palette). */
export const GLASS_ACCENT = {
  violet: "#8b5cf6",
  cyan: "#22d3ee",
  mutedLabel: "#9595b4",
  dimLabel: "#9a9ab6",
  darkerDim: "#767692",
} as const;

/** Active pill / dock-button decorations (§3, §4) for callers that need them. */
export const GLASS_ACTIVE_PILL: React.CSSProperties = {
  color: "#fff",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.06))",
  border: "1px solid rgba(255,255,255,0.28)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.45), 0 8px 20px -8px rgba(139,92,246,0.85)",
};

export interface GlassPanelProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: GlassVariant;
  /** Render as a different element/component while keeping glass styles. */
  as?: React.ElementType;
}

/**
 * <GlassPanel variant="shell|inner|dock|popover">.
 * Inline `style` from the caller is merged on top of the variant tokens, so
 * one-off layout (grid, height, position) can still be passed without losing
 * the canonical glass look.
 */
export const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
  function GlassPanel(
    { variant = "inner", as, className, style, children, ...rest },
    ref,
  ) {
    const Comp = (as ?? "div") as React.ElementType;
    return (
      <Comp
        ref={ref}
        className={cn(className)}
        style={{ ...GLASS_STYLES[variant], ...style }}
        {...rest}
      >
        {children}
      </Comp>
    );
  },
);

export default GlassPanel;
