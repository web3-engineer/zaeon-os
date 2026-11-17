"use client";
/**
 * PainelDeBaixo — #837 · o painel que sobe de baixo no celular (o "+" da caixa de escrever e o "Aura ▾" do topo).
 * Veio da `/m` (MobileActionsSheet): diálogo modal acessível — role=dialog + aria-modal, Esc fecha, o foco entra no
 * painel, alvos de 44 px, respeita a área segura do iPhone — e o ◀ do Android fecha (useFecharNoVoltar).
 * Vai para o <body> por portal: dentro do laboratório, caixas com `transform` prendiam o `position: fixed`.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useFecharNoVoltar } from "@/lib/ui/useFecharNoVoltar";

/** Alvo de toque mínimo (WCAG 2.5.5 / HIG): 44×44 — o `estilo.ts` da `/m`. */
export const ALVO = "min-h-[44px] min-w-[44px]";
/** Foco visível em todo controle (teclado/leitor de tela). */
export const FOCO = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500";

export default function PainelDeBaixo({ aberto, onFechar, titulo, rotuloFechar, children }: {
  aberto: boolean;
  onFechar: () => void;
  titulo: string;
  rotuloFechar: string;
  children: ReactNode;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  useFecharNoVoltar(aberto, onFechar);
  useEffect(() => {
    if (!aberto) return;
    caixa.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onFechar(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberto, onFechar]);
  if (!aberto || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[700] flex items-end" role="presentation">
      <button type="button" aria-label={rotuloFechar} tabIndex={-1} onClick={onFechar} className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />
      <div ref={caixa} tabIndex={-1} role="dialog" aria-modal="true" aria-label={titulo}
        className="relative w-full max-h-[85dvh] overflow-y-auto rounded-t-3xl border-t border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0e0e18]/95 backdrop-blur-2xl px-4 pt-3 outline-none"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
        <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-white/20" aria-hidden />
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">{titulo}</h2>
          <button type="button" onClick={onFechar} aria-label={rotuloFechar}
            className={`${ALVO} ${FOCO} -mr-2 flex items-center justify-center rounded-full text-slate-500 dark:text-white/60 hover:bg-slate-500/10`}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
