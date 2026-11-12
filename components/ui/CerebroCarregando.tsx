"use client";
/**
 * CerebroCarregando — a tela de carregamento da Zaeon: o BEIJA-FLOR surgindo (sobe e acende, depois respira um
 * brilho) e, embaixo, uma barra fina de progresso em degradê. Sem texto. Usada na entrada do site (intro) e no
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
        <div className="relative animate-[zaeon-flight-in_.65s_ease-out_both] motion-reduce:animate-none">
          <div className="relative animate-[zaeon-hover_2.2s_ease-in-out_infinite] motion-reduce:animate-none">
            <div aria-hidden="true" className="absolute inset-3 rounded-full bg-blue-500 blur-2xl"
              style={{ opacity: 0.18 + pct * 0.0035 }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_BEIJA_FLOR} alt="" width={120} height={120} className="relative h-[120px] w-[120px] select-none object-contain" draggable={false} />
            <div aria-hidden="true"
              className="pointer-events-none absolute inset-0 animate-[zaeon-energy_2.2s_ease-in-out_infinite] mix-blend-screen motion-reduce:hidden"
              style={{
                mask: `url("${LOGO_BEIJA_FLOR}") center / contain no-repeat`,
                backgroundImage: "linear-gradient(115deg, transparent 38%, rgba(91, 223, 255, .72) 50%, transparent 62%)",
                backgroundSize: "240% 100%",
              }}
            />
          </div>
        </div>
        <div className="mt-9 h-[3px] w-[200px] overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.45)] motion-reduce:!transition-none" style={{ width: `${Math.max(2, pct)}%`, transition: "width 160ms linear" }} />
        </div>
      </div>
      <style>{`
        @keyframes zaeon-flight-in {
          from { opacity: 0; transform: translate(-16px, 16px) rotate(-8deg) scale(.85); }
          to { opacity: 1; transform: none; }
        }
        @keyframes zaeon-hover {
          0%, 100% { transform: translateY(2px) rotate(-2deg); }
          50% { transform: translateY(-6px) rotate(2deg); }
        }
        @keyframes zaeon-energy {
          0% { background-position: 100% 0; opacity: 0; }
          18% { opacity: .8; }
          70%, 100% { background-position: 0 0; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
