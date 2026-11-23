"use client";
/**
 * TelaCarregando — o loading do cyberespaço: um SLIDESHOW de panorâmicas do próprio cyberespaço (fotos tiradas no
 * mundo: a cidadela, a festa do lounge, o olho com os sigilos, o templo, a garagem das motos…) em ORDEM ALEATÓRIA, cada
 * uma entrando e saindo em fade (crossfade) com um zoom lento; embaixo, SÓ a barra clássica (fina, branca), progredindo
 * com as etapas REAIS do engine (lib/cyber/carregamento). #870: em cima da barra, UMA linha curta diz o que está
 * carregando e quanto falta ("Construindo a cidade Zaeon · 42%") — antes era só a barra, e no celular parecia travado. A tela fica NA FRENTE do canvas o tempo
 * inteiro em que o mapa de verdade está sendo montado atrás dela (o usuário não vê o mundo aparecendo aos pedaços) —
 * o som já pode começar enquanto as fotos passam (o engine liga o áudio e a música do lounge durante a montagem) — e
 * só sai, em fade, quando o mundo inteiro está pronto.
 */
import { useEffect, useState } from "react";
import type { Carregando } from "@/lib/cyber/carregamento";

/** as panorâmicas (public/assets/cyber/loading, 1920×1080) */
export const PANORAMAS = ["cidadela-viva", "festa-panoramica", "mandala-serpentes", "olho-sigilos", "templo-sanfoneiro", "garagem-elevador", "motos-biblioteca", "sob-a-ilha", "capela", "templo-tempestade", "merkaba", "lounge-de-baixo", "olho-zaeon", "dj-fitas", "festa-patio", "festa-sofas"] as const;
export const urlDaPanoramica = (nome: (typeof PANORAMAS)[number]) => `/assets/cyber/loading/${nome}.jpg`;
/** cada foto fica `FOTO_MS` na tela; o crossfade dura `FADE_MS` */
export const FOTO_MS = 4200, FADE_MS = 1100;

/** uma ordem aleatória (Fisher–Yates) */
export function embaralhar<T>(lista: readonly T[], acaso: () => number = Math.random): T[] {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(acaso() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; }
  return a;
}

export default function TelaCarregando({ carga, saindo = false }: { carga: Carregando | null; saindo?: boolean }) {
  // a ordem é sorteada só no cliente (sem diferença de hidratação); `i` avança a cada FOTO_MS e dá a volta
  const [ordem, setOrdem] = useState<string[]>([]), [i, setI] = useState(0);
  useEffect(() => { setOrdem(embaralhar(PANORAMAS).map(urlDaPanoramica)); }, []);
  useEffect(() => { if (!ordem.length) return; const id = setInterval(() => setI((k) => k + 1), FOTO_MS); return () => clearInterval(id); }, [ordem]);
  const atual = ordem.length ? ordem[i % ordem.length]! : null, anterior = ordem.length && i > 0 ? ordem[(i - 1) % ordem.length]! : null;
  const pct = Math.round(Math.max(0, Math.min(1, carga?.progresso ?? 0)) * 100);
  return (
    <div role="status" aria-label={`Carregando: ${pct}%`} className={`absolute inset-0 z-[9999] overflow-hidden bg-black transition-opacity duration-700 ${saindo ? "pointer-events-none opacity-0" : "opacity-100"}`}>
      {atual && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* a foto que está SAINDO (por baixo, se apagando) e a que está ENTRANDO (por cima, acendendo + zoom lento) */}
          {anterior && anterior !== atual && (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={`sai-${i}`} src={anterior} alt="" className="absolute inset-0 h-full w-full animate-[pano-sai_1.1s_ease-in_both] object-cover motion-reduce:hidden" draggable={false} />
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={`entra-${i}`} src={atual} alt="" className="absolute inset-0 h-full w-full animate-[pano-entra_5.4s_ease-out_both] object-cover motion-reduce:animate-none motion-reduce:opacity-80" draggable={false} />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,.35)_70%,rgba(0,0,0,.7)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 to-transparent" />
          <style>{`
            @keyframes pano-entra { 0% { opacity: 0; transform: scale(1.03) } 20% { opacity: 1 } 100% { opacity: 1; transform: scale(1.12) } }
            @keyframes pano-sai { 0% { opacity: 1; transform: scale(1.12) } 100% { opacity: 0; transform: scale(1.14) } }
          `}</style>
        </div>
      )}
      {/* a barra: fina, branca, embaixo — com a etapa e a porcentagem em cima (#870) */}
      <div className="absolute inset-x-0 bottom-[9vh] flex flex-col items-center gap-2 px-4">
        <p data-carregando-texto className="max-w-[min(90vw,360px)] text-center text-[13px] font-medium text-white/85 [text-shadow:0_1px_6px_rgba(0,0,0,.8)]">
          {carga?.rotulo ?? "Abrindo o cyberespaço"}{carga?.detalhe ? ` (${carga.detalhe})` : ""} · {pct}%
        </p>
        <div className="h-[3px] w-[240px] overflow-hidden rounded-full bg-white/20 shadow-[0_0_12px_rgba(0,0,0,.6)]">
          <div className="h-full rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.45)]" style={{ width: `${Math.max(2, pct)}%`, transition: "width 160ms linear" }} />
        </div>
      </div>
    </div>
  );
}
