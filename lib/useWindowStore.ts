"use client";
import { useCallback, useState } from "react";

export interface WindowEntry {
  /** "research" is the permanent first tab. All others are document ids (file.id). */
  id: string;
  label: string;
  emoji: string;
  type: "research" | "document";
}

const RESEARCH_WINDOW: WindowEntry = {
  id: "research",
  label: "Minha pesquisa",
  emoji: "📝",
  type: "research",
};

/** Pure: add or ignore duplicate. Research window always at index 0. */
export function addWindowEntry(
  windows: WindowEntry[],
  entry: WindowEntry,
): WindowEntry[] {
  if (windows.some((w) => w.id === entry.id)) return windows;
  return [...windows, entry];
}

/** Pure: remove a document window. Research window is never removed. */
export function removeWindowEntry(
  windows: WindowEntry[],
  id: string,
): WindowEntry[] {
  if (id === "research") return windows;
  return windows.filter((w) => w.id !== id);
}

export function useWindowStore() {
  const [windows, setWindows] = useState<WindowEntry[]>([RESEARCH_WINDOW]);
  const [activeId, setActiveId] = useState<string>("research");

  const addWindow = useCallback((entry: WindowEntry) => {
    setWindows((prev) => addWindowEntry(prev, entry));
  }, []);

  const removeWindow = useCallback(
    (id: string) => {
      setWindows((prev) => {
        const next = removeWindowEntry(prev, id);
        // if we removed the active window, fall back to research
        if (id === activeId) setActiveId("research");
        return next;
      });
    },
    [activeId],
  );

  return { windows, activeId, setActiveId, addWindow, removeWindow };
}
