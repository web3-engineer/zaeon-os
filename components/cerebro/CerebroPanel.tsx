"use client";
/**
 * CerebroPanel — o painel PERSISTENTE do cérebro na aba Chat da Sala de Pesquisa (HANDOFF §3).
 * Amarrado ao scopeId da conversa ativa; sempre mostra algo (5 estados). Desktop = nuvem de
 * partículas (lazy); mobile = lista de regiões + 2 barras + "você está aqui". Tap numa região com
 * msgIds → `onAbrirMensagem` (reabre a conversa que a originou).
 */
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { X, RefreshCw, Sparkles } from "lucide-react";
import { ARQUETIPOS } from "@/lib/map/arquetipo";
import { proximoDoBackbone } from "@/lib/map/backbone";
import { ROTULO } from "@/lib/map/bolinha";
import { useIsMobile } from "@/lib/ui/useIsMobile";
import type { MapaNo } from "@/lib/map/tipos";
import { regioesDoMapa, type RegiaoVisual } from "./CerebroCanvas";
import type { CerebroState } from "./useCerebro";

const CerebroCanvas = dynamic(() => import("./CerebroCanvas"), { ssr: false, loading: () => <div className="h-full w-full bg-[#060a1a]" /> });

const COR: Record<string, string> = { a_conquistar: "#e88a2e", aprendido: "#78beff", aplicado: "#aadcff", validado: "#e0f4ff" };

export default function CerebroPanel({ st, onFechar, onGerar, onAbrirMensagem }: {
  st: CerebroState & { gerar: (t?: string) => Promise<void> };
  onFechar: () => void;
  onGerar?: () => void;
  onAbrirMensagem?: (msgId: string, no: MapaNo) => void;
}) {
  const mobile = useIsMobile();
  const mapa = st.mapa;
  const proximo = useMemo(() => (mapa ? proximoDoBackbone({ nos: mapa.nos, backbone: mapa.backbone, modoValidacao: mapa.modoValidacao }) : null), [mapa]);
  const regioes = useMemo(() => (mapa ? regioesDoMapa(mapa.nos, mapa.backbone, proximo?.id ?? null, ARQUETIPOS[mapa.tipoTopico].gateHumano, st.recentes) : []), [mapa, proximo, st.recentes]);
  const aoRegiao = (r: RegiaoVisual) => { const no = mapa?.nos.find((n) => n.id === r.id); const m = no?.msgIds?.at(-1); if (no && m && onAbrirMensagem) onAbrirMensagem(m, no); };
  const gerar = onGerar ?? (() => void st.gerar());

  return (
    <div className="absolute inset-0 z-[60] flex flex-col bg-[#060a1a] text-[#dbe8ff]" role="dialog" aria-label="Cérebro do estudo">
      {/* cabeçalho */}
      <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-2.5">
        <span className="text-lg" aria-hidden>🧠</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold">{mapa?.titulo || st.tituloSugerido || "Cérebro do estudo"}</p>
          <p className="truncate text-[11px] text-[#9fb6e0]">
            {mapa ? `${ARQUETIPOS[mapa.tipoTopico].rotulo} · ${mapa.objetivo || "objetivo a definir"}` : "arraste pra girar · laranja é o que falta, azul é o que você domina"}
          </p>
        </div>
        {st.estado !== "gerando" && mapa && (
          <button onClick={() => void st.gerar()} title={mapa.backbone.length ? "Retraçar o percurso" : ROTULO.vazia} className="rounded-lg border border-white/15 p-1.5 text-[#9fb6e0] hover:text-white"><RefreshCw size={14} /></button>
        )}
        <button onClick={onFechar} aria-label="Fechar o cérebro" className="rounded-lg border border-white/15 p-1.5 text-[#9fb6e0] hover:text-white"><X size={16} /></button>
      </div>

      {/* corpo por estado */}
      <div className="relative min-h-0 flex-1">
        {st.estado === "ativa" && mapa && (mobile ? <Lista regioes={regioes} nos={mapa.nos} aoRegiao={aoRegiao} /> : <CerebroCanvas regioes={regioes} onRegiao={onAbrirMensagem ? aoRegiao : undefined} />)}
        {st.estado === "gerando" && <Centro><Sparkles className="animate-pulse text-cyan-300" /><p className="text-sm font-semibold">Gerando o cérebro…</p><p className="text-[12px] text-[#9fb6e0]">classificando o tema e traçando o percurso</p></Centro>}
        {(st.estado === "sugerida" || st.estado === "vazia" || st.estado === "oculta") && (
          <Centro>
            <p className="text-sm font-semibold">{st.estado === "vazia" ? "Este estudo ainda não tem percurso." : st.estado === "sugerida" ? "Esta conversa parece um estudo." : "Esta conversa ainda não virou um estudo."}</p>
            <p className="max-w-sm text-[12px] text-[#9fb6e0]">{st.erro ? `Última tentativa falhou: ${st.erro}` : "O cérebro nasce quando você pede: a Aura classifica o tema, traça o percurso e, a cada resposta, acende o que você aprendeu."}</p>
            {st.estado !== "oculta" && <button onClick={gerar} className="mt-2 rounded-xl border border-cyan-300/40 bg-cyan-500/15 px-4 py-2 text-[13px] font-bold text-cyan-100 hover:bg-cyan-500/25">{st.erro ? "Tentar de novo" : ROTULO[st.estado]}</button>}
          </Centro>
        )}
        {/* barras (sempre que há mapa) */}
        {mapa && st.estado === "ativa" && !mobile && (
          <div className="absolute bottom-3 left-3 w-[min(320px,72vw)] rounded-xl border border-[rgba(120,170,255,.22)] bg-[rgba(14,26,54,.6)] p-3 backdrop-blur">
            <Barra rotulo="Progresso" pct={mapa.completudeAprendizado} cor="linear-gradient(90deg,#2f6fd6,#49b6ff)" />
            <Barra rotulo={`Conclusão (${mapa.modoValidacao === "humana" ? "prof" : mapa.modoValidacao})`} pct={mapa.completudeConclusao} cor="linear-gradient(90deg,#b5851f,#ffd56b)" />
          </div>
        )}
      </div>
    </div>
  );
}

function Centro({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">{children}</div>;
}
function Barra({ rotulo, pct, cor }: { rotulo: string; pct: number; cor: string }) {
  const p = Math.round(Math.max(0, Math.min(1, pct)) * 100);
  return (
    <div className="my-1.5">
      <div className="mb-1 flex justify-between text-[12px] text-[#b9cdf2]"><span>{rotulo}</span><b>{p}%</b></div>
      <div className="h-2 overflow-hidden rounded-md border border-[rgba(130,170,255,.18)] bg-[rgba(120,160,230,.16)]"><div className="h-full rounded-md transition-[width] duration-1000" style={{ width: `${p}%`, background: cor }} /></div>
    </div>
  );
}

/** Versão mobile: sem canvas. Regiões por estado + barras + "você está aqui". */
function Lista({ regioes, nos, aoRegiao }: { regioes: RegiaoVisual[]; nos: MapaNo[]; aoRegiao: (r: RegiaoVisual) => void }) {
  const acesos = nos.filter((n) => n.estado !== "a_conquistar").length;
  return (
    <div className="h-full overflow-y-auto px-4 py-3">
      <ol className="flex flex-col gap-1.5">
        {regioes.map((r, i) => (
          <li key={r.id}>
            <button onClick={() => aoRegiao(r)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COR[r.estado], boxShadow: `0 0 8px ${COR[r.estado]}` }} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold">{i + 1}. {r.label}</span>
                <span className="block text-[11px] text-[#9fb6e0]">{r.estado.replace("_", " ")}{r.gate ? " · chancela" : ""}{r.aqui ? " · você está aqui" : ""}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[11px] text-[#9fb6e0]">{acesos} de {nos.length} nós acesos.</p>
    </div>
  );
}
