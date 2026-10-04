"use client";

import { useRef } from "react";

/** Joystick virtual (touch): arrastar o knob anda; solta e para. Eventos de ponteiro não vazam pro canvas. */
export default function Joystick({ onMove }: { onMove: (x: number, y: number) => void }) {
  const el = useRef<HTMLDivElement>(null), knob = useRef<HTMLDivElement>(null), pid = useRef<number | null>(null);
  const RAIO = 40;
  const set = (e: React.PointerEvent) => {
    const b = el.current!.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy);
    if (d > RAIO) { dx = (dx / d) * RAIO; dy = (dy / d) * RAIO; }
    if (knob.current) knob.current.style.transform = `translate(${dx}px,${dy}px)`;
    onMove(dx / RAIO, dy / RAIO);
  };
  const fim = () => { pid.current = null; if (knob.current) knob.current.style.transform = ""; onMove(0, 0); };
  return (
    <div
      ref={el}
      role="application"
      aria-label="Joystick para andar"
      className="absolute z-[25] h-[116px] w-[116px] rounded-full border border-sky-300/35 bg-sky-300/10 backdrop-blur-sm"
      style={{ left: "max(22px, env(safe-area-inset-left))", bottom: "max(26px, env(safe-area-inset-bottom))", touchAction: "none" }}
      onPointerDown={(e) => { e.stopPropagation(); pid.current = e.pointerId; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* sintético */ } set(e); }}
      onPointerMove={(e) => { e.stopPropagation(); if (e.pointerId === pid.current) set(e); }}
      onPointerUp={(e) => { e.stopPropagation(); if (e.pointerId === pid.current) fim(); }}
      onPointerCancel={(e) => { e.stopPropagation(); if (e.pointerId === pid.current) fim(); }}
    >
      <div ref={knob} className="pointer-events-none absolute left-1/2 top-1/2 -ml-6 -mt-6 h-12 w-12 rounded-full bg-[radial-gradient(circle_at_35%_30%,#d8f4ff,#49b6ff)] shadow-[0_0_18px_rgba(90,200,255,.6)]" />
    </div>
  );
}
