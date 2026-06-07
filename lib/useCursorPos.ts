"use client";
import { useCallback, useEffect, useRef } from "react";

export interface CursorPos {
  x: number;
  y: number;
}

/**
 * Returns a ref that, when attached to a container element via `ref={containerRef}`,
 * continuously tracks the mouse position RELATIVE to that element's top-left corner.
 * Position is stored in `posRef.current` (a ref, not state — no re-renders).
 * Throttled to one update per animation frame.
 */
export function useCursorPos(): {
  containerRef: React.RefObject<HTMLDivElement>;
  posRef: React.RefObject<CursorPos>;
} {
  const containerRef = useRef<HTMLDivElement>(null);
  const posRef = useRef<CursorPos>({ x: 0, y: 0 });
  const rafId = useRef<number>(0);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      posRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("mousemove", handleMouseMove);
    return () => {
      el.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(rafId.current);
    };
  }, [handleMouseMove]);

  return { containerRef, posRef };
}
