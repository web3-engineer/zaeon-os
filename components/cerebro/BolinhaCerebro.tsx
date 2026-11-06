"use client";
/**
 * BolinhaCerebro — a bolinha azul da conversa + o botão "ver mapa" (HANDOFF §3). Estados:
 * oculta (nada) · sugerida (azul fraca pulsando, "gerar") · gerando (anel girando) · ativa (anel de
 * completude) · vazia (traçar percurso). Clique: sugerida/vazia → gera (SEM abrir: a barra de carregamento corre
 * aqui mesmo); ativa → abre o painel. O mapa só abre quando a pessoa entra nele.
 */
import { ROTULO, type EstadoBolinha } from "@/lib/map/bolinha";

/** `soSinal`: só a bolinha (sem o nome do estado) — o traçador de percurso no topo da sala, com o rótulo no `title`. */
export default function BolinhaCerebro({ estado, completude = 0, onClick, aberto, soSinal = false }: { estado: EstadoBolinha; completude?: number; onClick: () => void; aberto?: boolean; soSinal?: boolean }) {
  if (estado === "oculta") return null;
  const pct = Math.round(Math.max(0, Math.min(1, completude)) * 100);
  // #638: o número do anel é quanto do percurso já foi aprendido — a dica do mouse diz isso
  const rotulo = estado === "ativa" ? `${ROTULO.ativa} · ${pct}% aprendido` : ROTULO[estado];
  const anel = estado === "ativa" ? `conic-gradient(#49b6ff ${pct}%, rgba(120,160,230,.22) 0)` : estado === "gerando" ? "conic-gradient(#49b6ff 25%, rgba(120,160,230,.22) 0)" : "rgba(73,182,255,.35)";
  return (
    <button
      type="button"
      data-bolinha-cerebro
      data-tour="gerar-percurso"
      onClick={onClick}
      aria-pressed={!!aberto}
      title={rotulo}
      aria-label={rotulo}
      className={`group inline-flex shrink-0 items-center gap-2.5 rounded-full border ${soSinal ? "p-1" : "pl-1.5 pr-3.5 py-1.5"} text-[12px] font-bold transition-colors ${aberto ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-800 dark:text-cyan-100" : "border-slate-200 text-slate-700 hover:border-cyan-400/50 dark:border-white/10 dark:text-white/70"}`}
    >
      {/* a bolinha azul — grande o bastante pra ler o anel de completude */}
      <span className="relative inline-block h-7 w-7 shrink-0 rounded-full" style={{ background: anel, boxShadow: "0 0 14px rgba(73,182,255,.55)" }} aria-hidden>
        <span className={`absolute inset-[5px] rounded-full bg-[#0a1526] ${estado === "sugerida" ? "animate-pulse" : ""}`} />
        {estado === "ativa" && <span className="absolute inset-0 grid place-items-center text-[9px] font-black text-cyan-100">{pct}</span>}
        {estado === "gerando" && <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-cyan-300" />}
      </span>
      {!soSinal && (
        // #713: no celular só a bolinha (o nome tirava o espaço das abas); o `aria-label` segura o significado
        <span className="hidden sm:flex flex-col items-start gap-1">
          <span className="whitespace-nowrap">{ROTULO[estado]}</span>
          {/* gerando: a barra de carregamento corre no próprio botão — o mapa abre quando a pessoa clicar nele pronto */}
          {estado === "gerando" && (
            <span role="progressbar" aria-label="Gerando o mapa" className="block h-1 w-24 overflow-hidden rounded-full bg-cyan-500/15">
              <span className="block h-full w-1/3 animate-[bolinha-gerando_1.4s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-cyan-300 to-sky-500" />
              <style>{`@keyframes bolinha-gerando{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`}</style>
            </span>
          )}
        </span>
      )}
    </button>
  );
}
