"use client";

/**
 * OnboardingGuide — overlay do tour (Bento conduz). A CONVERSA é por VOZ + chat widget
 * (eventos zaeon:onboard:say). Aqui a gente só DESTACA o elemento e mostra um
 * cardzinho com a FUNÇÃO (emoji + texto curto). O tour avança pela AÇÃO:
 *  - clickTarget  → quando o usuário clica no próprio elemento destacado;
 *  - advanceEvent → quando a ação realmente acontece (ex.: a pesquisa começou);
 *  - info         → passo só explicativo, com um "Ok" leve pra seguir.
 * Sem botão genérico de "Continuar" nos passos de ação (evita pular etapas).
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TOUR_STEPS, getTour, subscribeTour, nextTour, skipTour } from "@/lib/onboarding/tour";

export default function OnboardingGuide() {
  const [mounted, setMounted] = useState(false);
  const [tour, setTour] = useState(getTour());
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => subscribeTour(setTour), []);

  const step = tour.active ? TOUR_STEPS[tour.index] : null;

  // Mede (e re-mede) o elemento destacado.
  useEffect(() => {
    if (!step?.target) { setRect(null); return; }
    let raf = 0;
    const measure = () => {
      const el = document.querySelector(step.target!) as HTMLElement | null;
      setRect(el ? el.getBoundingClientRect() : null);
      raf = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(raf);
  }, [step?.target, tour.index]);

  // Avança ao CLICAR no próprio elemento destacado.
  useEffect(() => {
    if (!step?.clickTarget || !step.target) return;
    const el = document.querySelector(step.target) as HTMLElement | null;
    if (!el) return;
    const onClick = () => setTimeout(() => nextTour(), 250);
    el.addEventListener("click", onClick, { once: true });
    return () => el.removeEventListener("click", onClick);
  }, [step?.target, step?.clickTarget, tour.index]);

  // Avança quando a AÇÃO acontece (evento real da app).
  useEffect(() => {
    if (!step?.advanceEvent) return;
    const onEvt = () => nextTour();
    window.addEventListener(step.advanceEvent, onEvt as EventListener, { once: true });
    return () => window.removeEventListener(step.advanceEvent!, onEvt as EventListener);
  }, [step?.advanceEvent, tour.index]);

  if (!mounted || !step) return null;

  const total = TOUR_STEPS.length;
  const pad = 8;
  const ring = rect
    ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : null;

  const chip = ring
    ? { top: Math.min(window.innerHeight - 130, ring.top + ring.height + 10), left: Math.max(12, Math.min(window.innerWidth - 320, ring.left)) }
    : { top: window.innerHeight - 140, left: window.innerWidth / 2 - 160 };

  return createPortal(
    <div className="fixed inset-0 z-[1200] pointer-events-none">
      {/* anel de destaque ao redor do elemento da vez */}
      {ring && (
        <div
          className="absolute rounded-2xl transition-all duration-300"
          style={{
            top: ring.top, left: ring.left, width: ring.width, height: ring.height,
            boxShadow: "0 0 0 9999px rgba(2,6,23,0.5), 0 0 0 2px rgba(34,211,238,0.95), 0 0 26px 4px rgba(34,211,238,0.55)",
          }}
        />
      )}

      {/* card: FUNÇÃO (emoji + texto) · progresso · (Ok só se explicativo) · Pular */}
      <div
        className="absolute pointer-events-auto w-[300px] rounded-2xl border border-cyan-400/40 bg-white dark:bg-[#0b1220] shadow-2xl p-3.5"
        style={{ top: chip.top, left: chip.left }}
      >
        <div className="flex items-start gap-2 mb-2">
          <p className="text-[12.5px] font-bold leading-snug text-slate-800 dark:text-white flex-1">{step.hint}</p>
          <span className="text-[10px] font-mono text-slate-400 shrink-0 mt-0.5">{tour.index + 1}/{total}</span>
        </div>
        <div className="h-1 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden mb-2.5">
          <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 transition-all" style={{ width: `${((tour.index + 1) / total) * 100}%` }} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <button onClick={skipTour} className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white/80">
            Pular tour
          </button>
          {step.info ? (
            <button onClick={() => nextTour()} className="px-4 py-2 rounded-full text-white text-[11px] font-black uppercase tracking-wide hover:scale-[1.03] transition-transform" style={{ background: "linear-gradient(135deg,#06b6d4,#7c3aed)" }}>
              {step.cta || "Ok"}
            </button>
          ) : (
            // Passo guiado por AÇÃO: cue visual sutil (sem texto), o tour avança quando a ação acontece.
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" aria-hidden />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
