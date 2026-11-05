"use client";
/**
 * CerebroPanel — o painel PERSISTENTE do cérebro na aba Chat da Sala de Pesquisa (HANDOFF §3).
 * Amarrado ao scopeId da conversa ativa; sempre mostra algo (5 estados). Desktop = nuvem de
 * partículas (lazy); mobile = lista de regiões + 2 barras + "você está aqui". Tap numa região com
 * msgIds → `onAbrirMensagem` (reabre a conversa que a originou).
 */
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Sparkles, MessageSquare, ChevronDown, History, X } from "lucide-react";
import { pedirConversa } from "@/lib/chat/conversasNav";
import { ARQUETIPOS } from "@/lib/map/arquetipo";
import { andamentoDoPercurso, proximoDoBackbone } from "@/lib/map/backbone";
import { mensagemDeErro } from "@/lib/canal/conexao";
import { ROTULO } from "@/lib/map/bolinha";
import { useIsMobile } from "@/lib/ui/useIsMobile";
import type { MapaNo } from "@/lib/map/tipos";
import { regioesDoMapa, type RegiaoVisual } from "./CerebroCanvas";
import { recencia } from "@/lib/map/memoria";
import { REQ_POR_MODO, requisitoDoNo, resumoDoNo } from "@/lib/map/resumoNo";
import type { CerebroState } from "./useCerebro";
import { EVT_PERCURSO_ABERTO } from "@/lib/onboarding/tourSala";

const CerebroCanvas = dynamic(() => import("./CerebroCanvas"), { ssr: false, loading: () => <div className="h-full w-full bg-[#060a1a]" /> });

const COR: Record<string, string> = { a_conquistar: "#e88a2e", aprendido: "#78beff", aplicado: "#aadcff", validado: "#e0f4ff" };

export default function CerebroPanel({ st, onFechar, onGerar, onAbrirMensagem }: {
  st: CerebroState & { gerar: (t?: string) => Promise<void>; refazer: () => Promise<void>; refetch: (r?: string[]) => Promise<void> };
  onFechar: () => void;
  onGerar?: () => void;
  onAbrirMensagem?: (msgId: string, no: MapaNo) => void;
}) {
  const mobile = useIsMobile();
  const mapa = st.mapa;
  const [aplicando, setAplicando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  // "Apliquei": o aluno marca o próximo nó do percurso como aplicado (com evidência). Modo humana →
  // vai pra fila do professor; outros modos → o gate é automático.
  // #661: a evidência é obrigatória e é escrita numa caixinha do mapa (antes: a janelinha cinza do navegador, que
  // aceitava OK com ela vazia)
  const [caixa, setCaixa] = useState<MapaNo | null>(null);
  // #705: o erro do envio fica DENTRO da caixinha, perto do Enviar (antes saía solto por cima do mapa)
  const [erroCaixa, setErroCaixa] = useState<string | null>(null);
  const [evidencia, setEvidencia] = useState("");
  const [confirmarRefazer, setConfirmarRefazer] = useState(false);
  const aplicar = async (no: MapaNo) => {
    if (!mapa || !evidencia.trim()) return;
    setAplicando(no.id); setAviso(null); setErroCaixa(null);
    try {
      const r = await fetch(`/api/map/${mapa.id}/node/${encodeURIComponent(no.id)}/apply`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ evidencia: evidencia.trim() }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error || `HTTP ${r.status}`);
      setAviso(d.validacao ? "Enviado pra validação do seu professor." : "Aplicado! O percurso avançou.");
      setCaixa(null); setEvidencia("");
      // #705: o envio deu certo; se só a atualização do mapa falhar, o aviso diz isso (e não que a aplicação falhou)
      try { await st.refetch([no.id]); } catch { setAviso((a) => `${a ?? "Aplicado!"} O mapa não atualizou: feche e abra de novo para ver.`); }
    } catch (e: any) { setErroCaixa(mensagemDeErro(e, "sua aplicação não foi enviada")); } finally { setAplicando(null); }
  };
  const proximo = useMemo(() => (mapa ? proximoDoBackbone({ nos: mapa.nos, backbone: mapa.backbone, modoValidacao: mapa.modoValidacao }) : null), [mapa]);
  const { regioes, sinapses } = useMemo(() => (mapa ? regioesDoMapa(mapa.nos, mapa.backbone, proximo?.id ?? null, ARQUETIPOS[mapa.tipoTopico].gateHumano, st.recentes, mapa.arestas) : { regioes: [], sinapses: [] }), [mapa, proximo, st.recentes]);
  // Tocar um nó abre a FICHA: closet + gavetas verbatim (memória) + "abrir a conversa".
  const [fichaId, setFichaId] = useState<string | null>(null);
  const ficha = useMemo(() => (mapa && fichaId ? mapa.nos.find((n) => n.id === fichaId) ?? null : null), [mapa, fichaId]);
  const membros = useMemo(() => (mapa && ficha ? mapa.nos.filter((n) => n.id !== ficha.id && n.regiao === ficha.id && (n.drawers?.length ?? 0) > 0) : []), [mapa, ficha]);
  const aoRegiao = (r: RegiaoVisual) => setFichaId((cur) => (cur === r.id ? null : r.id));
  // Esc fecha (o clique fora e a bolinha são tratados por quem monta o painel — o mapa é modal, sem "x").
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); if (confirmarRefazer) setConfirmarRefazer(false); else if (caixa) setCaixa(null); else if (fichaId) setFichaId(null); else onFechar(); } }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [confirmarRefazer, caixa, fichaId, onFechar]);
  const gerar = onGerar ?? (() => void st.gerar());
  // o tour do laboratório (lib/onboarding/tourSala) anda quando o mapa do percurso abre PRONTO
  const temMapa = !!mapa;
  useEffect(() => { if (temMapa) window.dispatchEvent(new CustomEvent(EVT_PERCURSO_ABERTO)); }, [temMapa]);
  const [anteriores, setAnteriores] = useState(false);
  const andamento = mapa && st.estado === "ativa" ? andamentoDoPercurso(mapa.backbone, proximo?.id) : null;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}
      className="absolute inset-0 z-50 flex flex-col bg-[#060a1a] text-[#dbe8ff]" role="dialog" aria-modal="true" aria-label="Mapa de conhecimento" data-tour="percurso-view" data-cerebro-painel
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* SEM barra, título nem "x" no topo: o botão CIRCULAR que gera/retraça e "mapas anteriores" flutuam por cima
          do cérebro; sair = clicar fora (quem monta o painel) ou Esc */}
      <div className="absolute left-3 top-3 z-20 flex flex-wrap items-center gap-2">
        {/* #661: sair do mapa à vista (clicar fora e Esc continuam valendo, mas ninguém descobria) */}
        <button
          type="button"
          onClick={onFechar}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-bold text-[#dbe8ff] hover:border-white/30 hover:text-white"
        >
          <X size={13} /> Voltar à conversa
        </button>
        <button
          onClick={st.estado === "gerando" ? undefined : mapa?.backbone.length ? () => setConfirmarRefazer(true) : gerar}
          disabled={st.estado === "gerando"}
          aria-label={mapa?.backbone.length ? "Refazer o percurso" : ROTULO[st.estado === "oculta" ? "vazia" : st.estado] || "Gerar o percurso"}
          title={mapa?.backbone.length ? "Refazer o percurso" : "Gerar o percurso"}
          className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border border-cyan-300/40 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25 disabled:opacity-70"
        >
          {st.estado === "gerando" ? <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-cyan-300" aria-hidden /> : null}
          {mapa?.backbone.length ? <RefreshCw size={15} /> : <Sparkles size={15} />}
        </button>
        <button
          onClick={() => setAnteriores((v) => !v)}
          aria-pressed={anteriores}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${anteriores ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-100" : "border-white/15 text-[#9fb6e0] hover:text-white"}`}
        >
          <History size={13} /> Mapas anteriores
        </button>
        {/* #661: em que etapa a pessoa está */}
        {andamento && <span data-andamento className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-bold text-[#9fe0ff]">{andamento}</span>}
      </div>
      {/* #661: refazer pede confirmação, porque as etapas podem mudar */}
      {confirmarRefazer && st.estado === "ativa" && (
        <div data-confirma-refazer className="absolute left-3 top-14 z-30 w-[min(360px,88vw)] rounded-2xl border border-cyan-300/40 bg-[rgba(10,21,38,.97)] p-3 shadow-2xl">
          <p className="text-[13px] font-bold text-cyan-100">Refazer o percurso?</p>
          <p className="mt-1 text-[12px] text-[#9fb6e0]">O que você já estudou fica guardado, mas as etapas podem mudar.</p>
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setConfirmarRefazer(false)} className="rounded-lg px-3 py-1.5 text-[12px] font-bold text-[#9fb6e0] hover:text-white">Cancelar</button>
            <button type="button" onClick={() => { setConfirmarRefazer(false); void st.refazer(); }} className="rounded-lg border border-cyan-300/40 bg-cyan-500/15 px-3 py-1.5 text-[12px] font-bold text-cyan-100 hover:bg-cyan-500/25">Refazer</button>
          </div>
        </div>
      )}
      {st.estado === "ativa" && st.erro && <p role="alert" className="absolute bottom-3 left-3 z-20 max-w-[min(420px,88vw)] rounded-xl bg-[rgba(10,21,38,.95)] px-3 py-2 text-[12px] text-amber-100">{st.erro}</p>}
      {/* sub-aba: as GAVETAS dos mapas gerados antes (abre embaixo dos botões) */}
      {anteriores && <div className="absolute left-3 top-14 z-20 w-[min(420px,88vw)] overflow-hidden rounded-2xl border border-white/10 shadow-2xl"><MapasAnteriores atualId={mapa?.id ?? null} onFechar={() => setAnteriores(false)} /></div>}

      {/* corpo por estado — clicar no vazio fecha a ficha (sem "x") */}
      <div className="relative min-h-0 flex-1" onClick={(e) => { const t = e.target as Element; if (fichaId && !t.closest(".cerebro-node, [data-ficha], [data-cerebro-acao]")) setFichaId(null); }}>
        {st.estado === "ativa" && mapa && (mobile ? <Lista regioes={regioes} aoRegiao={aoRegiao} /> : <CerebroCanvas regioes={regioes} sinapses={sinapses} onRegiao={aoRegiao} destaque={fichaId} />)}
        {/* FICHA do nó: closet + gavetas (verbatim) + abrir a conversa */}
        {ficha && st.estado === "ativa" && (
          <motion.aside data-ficha initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="absolute bottom-3 right-3 top-3 z-10 flex w-[min(360px,88vw)] flex-col rounded-2xl border border-[rgba(120,170,255,.25)] bg-[rgba(10,21,38,.92)] backdrop-blur">
            <div className="flex items-start gap-2 border-b border-white/10 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold">{ficha.label}</p>
                <p className="text-[11px] text-[#9fb6e0]">{ficha.estado.replace("_", " ")}</p>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {/* RESUMO: o que é · o que precisa ser atendido pra concluir · (no último passo) como é validado */}
              {mapa && (() => {
                const conclusao = mapa.backbone[mapa.backbone.length - 1] === ficha.id;
                return (
                  <div className="mb-3 space-y-2.5 border-b border-white/10 pb-3">
                    <div><p className="text-[10px] font-bold uppercase tracking-wider text-[#78beff]">O que é</p><p className="text-[12.5px] leading-snug text-[#dbe8ff]">{resumoDoNo(ficha)}</p></div>
                    <div><p className="text-[10px] font-bold uppercase tracking-wider text-[#ffd56b]">Para concluir</p><p className="text-[12.5px] leading-snug text-[#dbe8ff]">{requisitoDoNo(ficha, { modoValidacao: mapa.modoValidacao, tipoTopico: mapa.tipoTopico, criterioCompletude: mapa.criterioCompletude, ehConclusao: conclusao })}</p></div>
                    {conclusao && <div><p className="text-[10px] font-bold uppercase tracking-wider text-[#9fe0ff]">Validação</p><p className="text-[12.5px] leading-snug text-[#dbe8ff]">{REQ_POR_MODO[mapa.modoValidacao]}</p></div>}
                  </div>
                );
              })()}
              {((ficha.drawers?.length ?? 0) > 0 || membros.length > 0) && <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#49b6ff]">Memória</p>}
              {(ficha.drawers?.length ?? 0) === 0 && membros.length === 0 && <p className="text-[12px] text-[#9fb6e0]">Ainda sem memória aqui — o que você conversar sobre isto vira gaveta.</p>}
              {[ficha, ...membros].map((n) => (n.drawers?.length ? (
                <div key={n.id} className="mb-3">
                  {n.id !== ficha.id && <p className="mb-1 text-[11px] font-bold text-[#78beff]">◦ {n.label}</p>}
                  {[...n.drawers].reverse().map((d, i) => (
                    <div key={i} className="mb-2 rounded-xl border border-[rgba(73,182,255,.25)] bg-[rgba(73,182,255,.06)] p-2.5">
                      <p className="whitespace-pre-wrap text-[12px] leading-snug text-[#dbe8ff]">{d.texto}</p>
                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-[#9fb6e0]">
                        <span>{d.ts ? new Date(d.ts).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}{d.ts && recencia(d.ts, Date.now()) > 0.7 ? " · recente" : ""}</span>
                        {d.msgIds[0] && onAbrirMensagem && <button onClick={() => onAbrirMensagem(d.msgIds[0]!, n)} className="inline-flex items-center gap-1 text-[#9fe0ff] hover:underline"><MessageSquare size={11} /> abrir a conversa</button>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null))}
            </div>
          </motion.aside>
        )}
        {st.estado === "gerando" && (
          <Centro>
            <Sparkles className="animate-pulse text-cyan-300" />
            <p className="text-sm font-semibold">Gerando o mapa…</p>
            {/* a barra de progresso só existe durante a GERAÇÃO (nunca no mapa pronto) */}
            <div role="progressbar" aria-label="Gerando o mapa" className="h-1.5 w-[min(260px,70vw)] overflow-hidden rounded-full bg-white/10"><div className="h-full w-1/3 animate-[cerebro-gerando_1.4s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-cyan-200 to-sky-400" /></div>
            <style>{`@keyframes cerebro-gerando{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`}</style>
          </Centro>
        )}
        {(st.estado === "sugerida" || st.estado === "vazia" || st.estado === "oculta") && (
          <Centro>
            <p className="text-sm font-semibold">{st.estado === "vazia" ? "Este estudo ainda não tem percurso." : st.estado === "sugerida" ? "Esta conversa parece um estudo." : "Esta conversa ainda não virou um estudo."}</p>
            {st.erro && <p className="max-w-sm text-[12px] text-[#9fb6e0]">Última tentativa falhou: {st.erro}</p>}
            {st.estado !== "oculta" && <button onClick={gerar} className="mt-2 rounded-xl border border-cyan-300/40 bg-cyan-500/15 px-4 py-2 text-[13px] font-bold text-cyan-100 hover:bg-cyan-500/25">{st.erro ? "Tentar de novo" : ROTULO[st.estado]}</button>}
          </Centro>
        )}
        {/* ação do aluno: aplicar o próximo nó do percurso */}
        {mapa && st.estado === "ativa" && proximo && (
          <div data-cerebro-acao className="absolute right-3 top-3 flex flex-col items-end gap-1">
            <button
              onClick={() => { setAviso(null); setErroCaixa(null); setCaixa(proximo); }}
              disabled={aplicando === proximo.id || proximo.estado === "aplicado"}
              className="rounded-xl border border-amber-300/50 bg-amber-500/15 px-3 py-1.5 text-[12px] font-bold text-amber-100 hover:bg-amber-500/25 disabled:opacity-50"
              title={proximo.estado === "aplicado" ? "Aguardando validação" : `Marcar "${proximo.label}" como aplicado`}
            >
              {proximo.estado === "aplicado" ? "⏳ aguardando validação" : `✓ Apliquei: ${proximo.label}`}
            </button>
            {caixa && (
              <form
                data-caixa-apliquei
                onSubmit={(e) => { e.preventDefault(); void aplicar(caixa); }}
                className="w-[min(400px,86vw)] rounded-2xl border border-amber-300/40 bg-[rgba(10,21,38,.97)] p-3 shadow-2xl"
              >
                <label htmlFor="evidencia-apliquei" className="block text-[13px] font-bold text-amber-100">Como você aplicou esta etapa?</label>
                <p className="mt-0.5 mb-2 truncate text-[11.5px] text-[#9fb6e0]" title={caixa.label}>{caixa.label}</p>
                <textarea
                  id="evidencia-apliquei"
                  autoFocus
                  rows={3}
                  maxLength={4000}
                  value={evidencia}
                  onChange={(e) => setEvidencia(e.target.value)}
                  placeholder="Conte o que você fez: um resultado, um link, um trecho de código…"
                  className="w-full resize-y rounded-xl border border-[rgba(120,170,255,.35)] bg-white/[0.04] px-2.5 py-2 text-[12.5px] text-[#dbe8ff] outline-none placeholder:text-[#7f93b8] focus:border-amber-300/60"
                />
                {erroCaixa && <p role="alert" className="mt-2 rounded-lg bg-rose-500/15 px-2.5 py-1.5 text-[12px] text-rose-100">{erroCaixa}</p>}
                <div className="mt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setCaixa(null)} className="rounded-xl border border-white/20 px-3 py-1.5 text-[12px] font-bold text-[#dbe8ff] hover:bg-white/10">Cancelar</button>
                  <button type="submit" disabled={!evidencia.trim() || aplicando === caixa.id} className="rounded-xl border border-amber-300/50 bg-amber-500/20 px-3 py-1.5 text-[12px] font-bold text-amber-100 hover:bg-amber-500/30 disabled:opacity-40">✓ Enviar</button>
                </div>
              </form>
            )}
            {aviso && <span className="rounded-lg bg-black/50 px-2 py-1 text-[11px] text-[#cfe0ff]">{aviso}</span>}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Centro({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">{children}</div>;
}
/** Versão mobile: sem canvas. Regiões por estado + barras + "você está aqui". */
function Lista({ regioes, aoRegiao }: { regioes: RegiaoVisual[]; aoRegiao: (r: RegiaoVisual) => void }) {
  return (
    <div className="h-full overflow-y-auto px-4 py-3">
      <ol className="flex flex-col gap-1.5">
        {regioes.map((r, i) => (
          <li key={r.id}>
            <button data-ficha onClick={() => aoRegiao(r)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COR[r.estado], boxShadow: `0 0 8px ${COR[r.estado]}` }} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold">{i + 1}. {r.label}</span>
                <span className="block text-[11px] text-[#9fb6e0]">{r.estado.replace("_", " ")}{r.gavetas ? ` · ${r.gavetas} gaveta${r.gavetas > 1 ? "s" : ""}` : ""}{r.gate ? " · chancela" : ""}{r.aqui ? " · você está aqui" : ""}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

type MapaResumo = { id: string; scopeId: string; surface: string; titulo: string; tipoTopico: string; objetivo: string; modoValidacao: string; passos: number; aprendizado: number; conclusao: number; updatedAt: string };

/** Gavetas expansíveis com os mapas gerados anteriormente (GET /api/map?lista=1). Abrir = vai pra conversa daquele mapa. */
function MapasAnteriores({ atualId, onFechar }: { atualId: string | null; onFechar: () => void }) {
  const [lista, setLista] = useState<MapaResumo[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    fetch("/api/map?lista=1", { cache: "no-store" })
      .then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => { if (vivo) setLista(Array.isArray(d?.mapas) ? d.mapas : []); })
      .catch((e) => { if (vivo) { setErro(mensagemDeErro(e, "os mapas não foram carregados")); setLista([]); } });
    return () => { vivo = false; };
  }, []);
  const abrir = (m: MapaResumo) => {
    pedirConversa({ sala: m.surface === "pesquisa" ? "pesquisa" : "estudos", id: m.scopeId });
    onFechar();
  };
  return (
    <div className="shrink-0 max-h-[46%] overflow-y-auto border-b border-white/10 bg-[#070c1f] px-3 py-2">
      {lista === null && <p className="px-1 py-2 text-[12px] text-[#9fb6e0]">Carregando os mapas…</p>}
      {erro && <p className="px-1 py-2 text-[12px] text-rose-300">{erro}</p>}
      {lista && lista.length === 0 && !erro && <p className="px-1 py-2 text-[12px] text-[#9fb6e0]">Nenhum mapa gerado ainda.</p>}
      <ul className="flex flex-col gap-1">
        {(lista ?? []).map((m) => {
          const exp = aberto === m.id;
          return (
            <li key={m.id} className={`rounded-xl border ${m.id === atualId ? "border-cyan-400/40 bg-cyan-500/[0.07]" : "border-white/10 bg-white/[0.03]"}`}>
              <button type="button" onClick={() => setAberto(exp ? null : m.id)} aria-expanded={exp} className="flex w-full items-center gap-2 px-3 py-2 text-left">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: m.passos ? "#49b6ff" : "rgba(120,160,230,.35)", boxShadow: m.passos ? "0 0 8px #49b6ff" : undefined }} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-[#dbe8ff]">{m.titulo || "Estudo"}</span>
                <span className="shrink-0 text-[10px] text-[#9fb6e0]">{Math.round(m.aprendizado * 100)}%</span>
                <ChevronDown size={14} className={`shrink-0 text-[#9fb6e0] transition-transform ${exp ? "rotate-180" : ""}`} aria-hidden />
              </button>
              {exp && (
                <div className="px-3 pb-3">
                  <p className="text-[11px] text-[#9fb6e0]">{(ARQUETIPOS as any)[m.tipoTopico]?.rotulo ?? m.tipoTopico} · {m.objetivo || "objetivo a definir"} · {m.passos} passo{m.passos === 1 ? "" : "s"}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10" title={`aprendizado ${Math.round(m.aprendizado * 100)}%`}><div className="h-full bg-[#78beff]" style={{ width: `${Math.round(m.aprendizado * 100)}%` }} /></div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10" title={`conclusão ${Math.round(m.conclusao * 100)}%`}><div className="h-full bg-[#ffd56b]" style={{ width: `${Math.round(m.conclusao * 100)}%` }} /></div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-[#9fb6e0]">
                    <span>{new Date(m.updatedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
                    {m.id === atualId ? <span className="text-cyan-200">este mapa</span> : <button type="button" onClick={() => abrir(m)} className="inline-flex items-center gap-1 text-[#9fe0ff] hover:underline"><MessageSquare size={11} /> abrir a conversa</button>}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
