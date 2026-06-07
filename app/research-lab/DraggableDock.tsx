"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "zaeon.dockOrder";

export interface DockItem {
  id: string;
  emoji: string;
  label: string;
  badge?: number;
  active?: boolean;
}

/** Pure: move item from dragIndex to dropIndex. */
export function reorderDock(items: DockItem[], dragIndex: number, dropIndex: number): DockItem[] {
  if (dragIndex === dropIndex) return items;
  const next = [...items];
  const [moved] = next.splice(dragIndex, 1);
  next.splice(dropIndex, 0, moved);
  return next;
}

function readOrder(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}

function applyStoredOrder(items: DockItem[], stored: string[]): DockItem[] {
  if (!stored.length) return items;
  const map = new Map(items.map((it) => [it.id, it]));
  const ordered = stored.map((id) => map.get(id)).filter(Boolean) as DockItem[];
  // append any new items not yet in storage
  const remaining = items.filter((it) => !stored.includes(it.id));
  return [...ordered, ...remaining];
}

interface DraggableDockProps {
  items: DockItem[];
  onAction: (id: string) => void;
}

export default function DraggableDock({ items: propItems, onAction }: DraggableDockProps) {
  const [items, setItems] = useState<DockItem[]>(() =>
    applyStoredOrder(propItems, readOrder()),
  );
  const dragIdx = useRef<number>(-1);

  // Sync active/badge flags from parent without resetting order
  useEffect(() => {
    setItems((prev) => {
      const order = prev.map((p) => p.id);
      const merged = propItems.map((pi) => ({ ...pi }));
      return applyStoredOrder(merged, order);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propItems.map((i) => `${i.id}:${i.badge}:${i.active}`).join(",")]);

  const persist = useCallback((list: DockItem[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.map((i) => i.id)));
  }, []);

  const handleDragStart = (idx: number) => { dragIdx.current = idx; };
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx.current === -1 || dragIdx.current === idx) return;
    setItems((prev) => {
      const next = reorderDock(prev, dragIdx.current, idx);
      dragIdx.current = idx;
      persist(next);
      return next;
    });
  };
  const handleDragEnd = () => { dragIdx.current = -1; };

  return (
    <div
      className="flex gap-1.5 justify-center p-2 rounded-[15px]"
      style={{
        background: "rgba(0,0,0,0.28)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      {items.map((item, idx) => (
        <div
          key={item.id}
          draggable
          onDragStart={() => handleDragStart(idx)}
          onDragOver={(e) => handleDragOver(e, idx)}
          onDragEnd={handleDragEnd}
          onClick={() => onAction(item.id)}
          title={item.label}
          className="relative w-9 h-9 rounded-[11px] flex items-center justify-center text-base cursor-grab select-none transition-all duration-150 hover:-translate-y-0.5 hover:scale-105"
          style={{
            background: item.active
              ? "linear-gradient(180deg, rgba(139,92,246,0.4), rgba(34,211,238,0.18))"
              : "rgba(255,255,255,0.07)",
            border: item.active
              ? "1px solid rgba(255,255,255,0.35)"
              : "1px solid rgba(255,255,255,0.12)",
            boxShadow: item.active
              ? "inset 0 1px 0 rgba(255,255,255,0.4), 0 6px 16px -6px rgba(139,92,246,0.8)"
              : undefined,
          }}
        >
          {item.emoji}
          {/* drag handle indicator */}
          <span className="absolute top-0.5 right-0.5 text-[7px] text-white/20 pointer-events-none leading-none">⠿</span>
          {/* badge */}
          {!!item.badge && item.badge > 0 && (
            <span
              className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full text-[7px] font-black text-white flex items-center justify-center"
              style={{ background: "linear-gradient(90deg,#8b5cf6,#22d3ee)" }}
            >
              {item.badge > 9 ? "9+" : item.badge}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
