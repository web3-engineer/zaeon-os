"use client";
/**
 * BolinhaCerebro — a bolinha azul da conversa + o botão "🧠 ver cérebro" (HANDOFF §3). Estados:
 * oculta (nada) · sugerida (azul fraca pulsando, "gerar") · gerando (anel girando) · ativa (anel de
 * completude) · vazia (traçar percurso). Clique: sugerida/vazia → gera; ativa/gerando → abre o painel.
 */
import { ROTULO, type EstadoBolinha } from "@/lib/map/bolinha";

export default function BolinhaCerebro({ estado, completude = 0, onClick, aberto }: { estado: EstadoBolinha; completude?: number; onClick: () => void; aberto?: boolean }) {
  if (estado === "oculta") return null;
  const pct = Math.round(Math.max(0, Math.min(1, completude)) * 100);
  const anel = estado === "ativa" ? `conic-gradient(#49b6ff ${pct}%, rgba(120,160,230,.22) 0)` : estado === "gerando" ? "conic-gradient(#49b6ff 25%, rgba(120,160,230,.22) 0)" : "rgba(73,182,255,.35)";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={!!aberto}
      title={ROTULO[estado]}
      className={`group inline-flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1.5 text-[11px] font-bold transition-colors ${aberto ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-100" : "border-slate-200 text-slate-700 hover:border-cyan-400/50 dark:border-white/10 dark:text-white/70"}`}
    >
      <span className="relative inline-block h-4 w-4 shrink-0 rounded-full" style={{ background: anel, boxShadow: "0 0 8px rgba(73,182,255,.45)" }} aria-hidden>
        <span className={`absolute inset-[3px] rounded-full bg-[#0a1526] ${estado === "sugerida" ? "animate-pulse" : ""}`} />
        {estado === "gerando" && <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-cyan-300" />}
      </span>
      <span className="whitespace-nowrap">🧠 {ROTULO[estado]}</span>
    </button>
  );
}
