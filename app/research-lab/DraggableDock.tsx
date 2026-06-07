"use client";

export interface DockItem {
  id: string;
  emoji: string;
  label: string;
  badge?: number;
  active?: boolean;
}

/**
 * Pure: move item from dragIndex to dropIndex.
 * Kept as an exported pure function for unit tests.
 */
export function reorderDock(items: DockItem[], dragIndex: number, dropIndex: number): DockItem[] {
  if (dragIndex === dropIndex) return items;
  const next = [...items];
  const [moved] = next.splice(dragIndex, 1);
  next.splice(dropIndex, 0, moved);
  return next;
}

interface DraggableDockProps {
  items: DockItem[];
  onAction: (id: string) => void;
}

/** Static dock — order is fixed by DocumentDesktop (＋ → 📁 → 🔖 → 🧠). */
export default function DraggableDock({ items, onAction }: DraggableDockProps) {
  return (
    <div
      className="flex gap-1.5 justify-center p-2 rounded-[15px]"
      style={{
        background: "rgba(0,0,0,0.28)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onAction(item.id)}
          title={item.label}
          className="relative w-9 h-9 rounded-[11px] flex items-center justify-center text-base cursor-pointer select-none transition-all duration-150 hover:-translate-y-0.5 hover:scale-105"
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
          {/* badge */}
          {!!item.badge && item.badge > 0 && (
            <span
              className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full text-[7px] font-black text-white flex items-center justify-center"
              style={{ background: "linear-gradient(90deg,#8b5cf6,#22d3ee)" }}
            >
              {item.badge > 9 ? "9+" : item.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
