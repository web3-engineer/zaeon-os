"use client";
/**
 * CerebroCarregando — a tela de carregamento da Zaeon: o BEIJA-FLOR surgindo (sobe e acende, depois respira um
 * brilho) e, embaixo, a barra clássica estilo macOS (fina, branca). Sem texto. Usada na entrada do site (intro) e no
 * carregamento do cyberespaço. `progresso` 0..1; `saindo` = fade-out.
 */
export const LOGO_BEIJA_FLOR = "/assets/zaeon-hummingbird.png";

export default function CerebroCarregando({ progresso, saindo = false, fixo = false, children }: { progresso: number; saindo?: boolean; fixo?: boolean; children?: React.ReactNode }) {
  const pct = Math.round(Math.max(0, Math.min(1, progresso)) * 100);
  return (
    <div role="status" aria-label={`Carregando: ${pct}%`}
      className={`${fixo ? "fixed" : "absolute"} inset-0 z-[9999] flex flex-col items-center justify-center bg-black transition-opacity duration-500 ${saindo ? "pointer-events-none opacity-0" : "opacity-100"}`}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(29,78,216,.22)_0%,transparent_55%)]" />
      {children}
      <div className="relative flex flex-col items-center">
        <div className="relative animate-[cerebro-surge_1.4s_cubic-bezier(.22,.61,.36,1)_both] motion-reduce:animate-none">
          <div aria-hidden="true" className="absolute inset-2 animate-[cerebro-brilho_2.8s_ease-in-out_1.4s_infinite] rounded-full bg-blue-500/40 blur-2xl motion-reduce:animate-none" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_BEIJA_FLOR} alt="" width={120} height={120} className="relative h-[120px] w-[120px] select-none object-contain" draggable={false} />
        </div>
        <div className="mt-9 h-[3px] w-[200px] overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.35)]" style={{ width: `${Math.max(2, pct)}%`, transition: "width 160ms linear" }} />
        </div>
      </div>
      <style>{`
        @keyframes cerebro-surge { 0% { opacity: 0; transform: translateY(14px) scale(.86); filter: blur(6px) brightness(.6) } 100% { opacity: 1; transform: none; filter: none } }
        @keyframes cerebro-brilho { 0%,100% { opacity: .35; transform: scale(.92) } 50% { opacity: .8; transform: scale(1.08) } }
      `}</style>
    </div>
  );
}
