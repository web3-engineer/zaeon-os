"use client";

/**
 * CyberCta — o botão do cyberespaço COM a barra de carregamento dentro. A pré-carga (lib/cyber/precarga)
 * começa assim que o botão monta, na página inicial; enquanto baixa, o botão mostra a barra e o que está
 * carregando; quando acaba, fica acessível e vira a entrada:
 *   logado → entra direto no cyberespaço (e destrava o som, como o "Conectar");
 *   deslogado → abre o login (o cyberespaço é só pra quem está logado — app/lounge-cosmico).
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { musica } from "@/lib/audio/musica";
import { LOUNGE_ROTA } from "@/lib/ui/loungeHub";
import { estadoPrecarga, ouvirPrecarga, precarregarCorposCyber, precarregarCyber, type EstadoPrecarga } from "@/lib/cyber/precarga";

export function usePrecargaCyber(): EstadoPrecarga {
  const [e, setE] = useState<EstadoPrecarga>(estadoPrecarga());
  useEffect(() => {
    precarregarCyber();
    return ouvirPrecarga(setE);
  }, []);
  return e;
}

export default function CyberCta({ logado, onLogin, className = "" }: { logado: boolean; onLogin: () => void; className?: string }) {
  const router = useRouter();
  const e = usePrecargaCyber();
  const pct = Math.round(e.progresso * 100);
  const pronto = e.pronto;

  const entrar = () => {
    precarregarCorposCyber();
    if (!pronto) return;
    if (!logado) { onLogin(); return; }
    musica().destravar();   // o clique é o gesto que libera o áudio (o cyberespaço já entra com som)
    router.push(LOUNGE_ROTA);
  };

  return (
    <button
      type="button"
      onClick={entrar}
      // #819: os corpos dos personagens (~60 MB) só baixam quando a pessoa mostra que vai jogar — não em toda visita
      onPointerEnter={() => precarregarCorposCyber()}
      onFocus={() => precarregarCorposCyber()}
      onTouchStart={() => precarregarCorposCyber()}
      aria-disabled={!pronto}
      aria-busy={!pronto}
      aria-label={pronto ? "Play game" : `Carregando o game: ${pct}% — ${e.etapa}`}
      title={pronto ? undefined : e.etapa}
      className={`group relative overflow-hidden flex flex-col items-stretch justify-center rounded-full border font-medium uppercase tracking-[0.18em] text-[11px] transition-all bg-transparent w-full sm:w-auto min-w-[250px]
        ${pronto
          ? "border-cyan-400/70 text-cyan-700 dark:text-cyan-200 hover:scale-105 hover:border-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.25)] cursor-pointer"
          : "border-cyan-500/30 text-cyan-700/80 dark:text-cyan-300/80 cursor-progress"} ${className}`}
    >
      <span className="relative z-10 flex items-center justify-center gap-2 px-8 pt-4 pb-3">
        <span aria-hidden>✦</span>
        Play game
        {!pronto && <span className="font-mono tabular-nums text-[10px] text-cyan-600 dark:text-cyan-300/90">{pct}%</span>}
      </span>
      {/* a barra: dentro do botão, colada embaixo */}
      <span aria-hidden className="relative z-10 mx-5 mb-2.5 h-[3px] overflow-hidden rounded-full bg-cyan-500/15">
        <span
          className={`block h-full rounded-full transition-[width] duration-300 ease-out ${pronto ? "bg-gradient-to-r from-cyan-400 to-emerald-300" : "bg-gradient-to-r from-cyan-500 to-cyan-300"}`}
          style={{ width: `${pronto ? 100 : Math.max(3, pct)}%` }}
        />
        {!pronto && <span className="absolute inset-y-0 w-10 animate-[zcVarre_1.6s_linear_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />}
      </span>
      {/* o que está carregando (só enquanto carrega) */}
      {!pronto && (
        <span aria-hidden className="relative z-10 -mt-1 mb-2 px-6 text-center font-mono text-[8px] normal-case tracking-[0.12em] text-slate-500 dark:text-white/45 truncate">
          {e.etapa}
        </span>
      )}
      <style jsx global>{`@keyframes zcVarre { 0% { left: -40px; } 100% { left: 100%; } }`}</style>
    </button>
  );
}
