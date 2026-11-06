"use client";
/**
 * PastasEmpilhadas — o topo do módulo do chat como PASTAS SOBREPOSTAS (no lugar das pills). A CONVERSA é a pasta da
 * frente; os DOCUMENTOS dela (a pesquisa, PDFs no leitor, TCC, cartolina, diagramas, aulas) ficam empilhados atrás,
 * com as abas à mostra. Trocar = puxar a pasta: a escolhida vem pra frente (mais alta, clara, com o friso de luz em
 * cima, colada no corpo do módulo); as de trás afundam em 3D (trapézio em perspectiva, mais escuras, mais baixas).
 * As bordas de cada uma ficam inteiras e clicáveis — só as quinas inclinadas se sobrepõem.
 * GERANDO: enquanto a Aura responde na pasta da frente (`gerando` = id dela), o friso vira um SCANNER — uma luz nasce
 * no começo da aba e corre até o fim, em loop, até a resposta acabar. Com movimento reduzido: só o friso mais aceso.
 */
import { useEffect, useRef, type ReactNode } from "react";

export type Pasta = {
  id: string;
  rotulo: string;
  icone?: ReactNode;
  /** dica do hover (o nome inteiro) */
  titulo?: string;
  /** o ✕ da pasta (sem ele, a pasta não fecha — a conversa, a pesquisa) */
  onFechar?: () => void;
};

const FRISO = "linear-gradient(90deg, rgba(34,211,238,0) 0%, rgba(34,211,238,0.95) 22%, rgba(167,139,250,0.95) 78%, rgba(167,139,250,0) 100%)";
/** a luz que varre o friso durante a geração: o miolo quase branco, as pontas no ciano e no roxo do friso */
const VARREDURA = "linear-gradient(90deg, rgba(34,211,238,0) 0%, rgba(34,211,238,0.9) 30%, rgba(236,254,255,1) 50%, rgba(167,139,250,0.9) 70%, rgba(167,139,250,0) 100%)";
const CSS_VARREDURA = `
@keyframes pe-varre { from { transform: translateX(-100%) } to { transform: translateX(300%) } }
.pe-varre { animation: pe-varre 1.2s cubic-bezier(.45,0,.55,1) infinite; }
@media (prefers-reduced-motion: reduce) { .pe-varre { display: none } }
`;

export default function PastasEmpilhadas({ pastas, ativa, gerando = null, onAbrir, antes, depois, rotulo = "Documentos da conversa", aoMedirAltura }: {
  /** a 1ª é a CONVERSA; as demais, os documentos (na ordem em que abriram) */
  pastas: Pasta[];
  ativa: string;
  /** id da pasta cuja resposta está sendo gerada agora — o friso dela varre (só se for a da frente) */
  gerando?: string | null;
  onAbrir: (id: string) => void;
  /** à esquerda das pastas (a bolinha do percurso) */
  antes?: ReactNode;
  /** à direita (o ＋, a gaveta de diagramas, o A−/A+) */
  depois?: ReactNode;
  rotulo?: string;
  /** #640: a altura de VERDADE desta barra (cresce com o "Ver mapa") — quem abre telas por cima começa nela */
  aoMedirAltura?: (px: number) => void;
}) {
  const n = pastas.length;
  const barra = useRef<HTMLDivElement>(null);
  const medir = useRef(aoMedirAltura);
  medir.current = aoMedirAltura;
  useEffect(() => {
    const el = barra.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => medir.current?.(Math.round(el.getBoundingClientRect().height)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={barra} className="relative shrink-0 flex items-end gap-2 px-3 pt-2.5 min-h-[46px] bg-slate-100/80 dark:bg-black/30">
      {gerando && <style>{CSS_VARREDURA}</style>}
      {antes}
      <div role="tablist" aria-label={rotulo} className="flex min-w-0 flex-1 items-end overflow-x-auto overflow-y-hidden no-scrollbar pl-1 pt-1">
        {pastas.map((p, i) => {
          const frente = p.id === ativa;
          const varrendo = frente && gerando === p.id;
          // as de trás: quanto mais pra direita, mais "funda" (z menor) — a da frente fica acima de todas
          const z = frente ? 40 : 30 - i;
          return (
            <div
              key={p.id}
              role="tab"
              data-tour={i === 0 ? "pasta-conversa" : undefined}
              aria-selected={frente}
              aria-busy={varrendo || undefined}
              tabIndex={0}
              title={p.titulo ?? p.rotulo}
              onClick={() => onAbrir(p.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onAbrir(p.id); } }}
              style={{ zIndex: z, marginLeft: i === 0 ? 0 : -10 }}
              className={`group relative shrink-0 cursor-pointer select-none outline-none transition-[transform,opacity] duration-200 ease-out
                ${frente ? "translate-y-0" : "translate-y-[3px] hover:-translate-y-0.5 focus-visible:-translate-y-0.5"}`}
            >
              {/* o corpo da aba: um trapézio em perspectiva (o texto fica fora da transformação, reto) */}
              <span
                aria-hidden
                className={`absolute inset-0 rounded-t-[12px] border border-b-0 transition-colors duration-200
                  ${frente
                    ? "bg-white dark:bg-[#0b0f1d] border-slate-300 dark:border-white/15 shadow-[0_-8px_22px_-10px_rgba(34,211,238,0.55),6px_0_14px_-8px_rgba(0,0,0,0.55),-6px_0_14px_-8px_rgba(0,0,0,0.55)]"
                    : "bg-slate-200/90 dark:bg-[#070910] border-slate-300/80 dark:border-white/[0.08] group-hover:bg-slate-100 dark:group-hover:bg-[#121522] shadow-[inset_0_-10px_14px_-12px_rgba(0,0,0,0.6)]"}`}
                style={{ transform: `perspective(90px) rotateX(${frente ? 7 : 12}deg)`, transformOrigin: "bottom" }}
              />
              {/* o friso de luz no alto da pasta da frente — a distinção dela das de trás */}
              {frente && (
                <span aria-hidden data-friso className="absolute left-3 right-3 top-0 h-[2px] overflow-hidden rounded-full transition-shadow duration-300"
                  style={{ background: FRISO, boxShadow: varrendo ? "0 0 14px rgba(34,211,238,0.85), 0 0 4px rgba(167,139,250,0.9)" : "0 0 10px rgba(34,211,238,0.55)" }}>
                  {/* o scanner: um terço do friso, correndo do começo ao fim enquanto a resposta não termina */}
                  {varrendo && <span data-varredura className="pe-varre absolute inset-y-0 left-0 w-1/3 rounded-full" style={{ background: VARREDURA }} />}
                </span>
              )}
              <span className={`relative flex items-center gap-1.5 whitespace-nowrap px-4 ${frente ? "h-[36px] text-slate-900 dark:text-white" : "h-[31px] text-slate-600 dark:text-white/55 group-hover:text-slate-800 dark:group-hover:text-white/85"}`}>
                {p.icone && <span className="shrink-0 leading-none text-[12px]">{p.icone}</span>}
                <span className="max-w-[96px] sm:max-w-[170px] truncate text-[11px] font-black tracking-wide">{p.rotulo}</span>
                {p.onFechar && (
                  <button
                    type="button"
                    aria-label={`Fechar ${p.rotulo}`}
                    onClick={(e) => { e.stopPropagation(); p.onFechar!(); }}
                    className={`-mr-1.5 ml-0.5 grid h-5 w-5 place-items-center rounded-full text-[12px] leading-none transition-opacity hover:bg-black/10 dark:hover:bg-white/10 ${frente ? "opacity-60 hover:opacity-100" : "opacity-0 group-hover:opacity-60 hover:!opacity-100"}`}
                  >×</button>
                )}
              </span>
            </div>
          );
        })}
        {n > 1 && <span className="sr-only">{n - 1} documento(s) atrás da conversa</span>}
      </div>
      {depois && <div className="flex shrink-0 items-center gap-1 sm:gap-1.5 pb-1.5">{depois}</div>}
      {/* a borda do módulo: a pasta da frente passa por cima dela */}
      <span aria-hidden className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-slate-300 dark:bg-white/[0.09]" style={{ zIndex: 35 }} />
    </div>
  );
}

/** O corpo do módulo logo abaixo das pastas: a mesma cor da pasta da frente, pra ela e o conteúdo serem uma peça só. */
export const CORPO_DA_PASTA = "bg-white dark:bg-[#0b0f1d]";
