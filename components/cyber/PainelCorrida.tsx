"use client";
/**
 * PainelCorrida — as CORRIDAS de moto na tela (o engine faz a corrida: components/cyber/engine `iniciarCorrida`,
 * `corridaHud`, `onCorrida`):
 *  - na moto, fora de corrida: o botão "🏁 Corridas" → a lista das pistas (nome, voltas, tamanho, o meu melhor) → Correr;
 *  - correndo: a CONTAGEM grande (3, 2, 1, VAI!), o tempo, a volta, o portão, o DELTA contra a minha melhor (verde =
 *    mais rápido) a cada portão, e a SETA pro próximo portão quando ele não está na frente;
 *  - no fim: o resultado (total, voltas, recorde pessoal) e o RANKING da pista (/api/cyber/corrida) — Correr de novo / Fechar.
 */
import { useEffect, useRef, useState } from "react";
import type { CyberEngine, HudCorrida } from "./engine";
import { PISTAS } from "@/lib/cyber/corrida/pistas";
import { formatarTempo, type EventoCorrida } from "@/lib/cyber/corrida/corrida";

type Ranking = { pista: string; top: { posicao: number; nome: string; cor: string; ms: number; eu: boolean }[]; eu: { ms: number; posicao: number | null } | null };
type Resultado = { pista: string; total: number; voltas: number[]; recorde: boolean; ranking: Ranking | null; salvando: boolean; erro: string | null };

const CAIXA = "rounded-2xl border border-sky-300/25 bg-[#070b1c]/80 text-sky-50 shadow-2xl backdrop-blur";

export default function PainelCorrida({ engine, moto, evento }: { engine: React.MutableRefObject<CyberEngine | null>; moto: boolean; evento: (EventoCorrida & { pista: string }) | null }) {
  const [aberto, setAberto] = useState(false);
  const [hud, setHud] = useState<HudCorrida | null>(null);
  const [delta, setDelta] = useState<{ v: number; ate: number } | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [rankings, setRankings] = useState<Record<string, Ranking>>({});
  const recordeAntes = useRef<number | null>(null);

  // o HUD: lê o engine ~12 vezes por segundo
  useEffect(() => {
    const id = setInterval(() => setHud(engine.current?.corridaHud ?? null), 80);
    return () => clearInterval(id);
  }, [engine]);
  // a lista: os rankings das pistas (o meu melhor)
  useEffect(() => {
    if (!aberto) return;
    for (const p of PISTAS) void fetch(`/api/cyber/corrida?pista=${p.id}`).then((r) => (r.ok ? r.json() : null)).then((j: Ranking | null) => { if (j) setRankings((x) => ({ ...x, [p.id]: j })); }).catch(() => undefined);
  }, [aberto]);
  // os eventos: delta nos portões/voltas; no fim, grava e mostra o ranking
  useEffect(() => {
    if (!evento) return;
    if ((evento.tipo === "portao" || evento.tipo === "volta") && evento.delta !== null) setDelta({ v: evento.delta, ate: Date.now() + 1800 });
    if (evento.tipo === "fim") {
      const total = evento.total, recorde = recordeAntes.current === null || total < recordeAntes.current;
      setResultado({ pista: evento.pista, total, voltas: evento.voltas, recorde, ranking: null, salvando: true, erro: null });
      void fetch("/api/cyber/corrida", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pista: evento.pista, ms: Math.round(total * 1000), voltas: evento.voltas.map((v) => Math.round(v * 1000)) }) })
        .then(async (r) => { const j = await r.json().catch(() => null); setResultado((x) => x && { ...x, salvando: false, ranking: r.ok ? (j as Ranking) : null, erro: r.ok ? null : r.status === 401 ? "Entre na sua conta pra entrar no ranking." : "Não deu pra salvar o tempo." }); })
        .catch(() => setResultado((x) => x && { ...x, salvando: false, erro: "Sem conexão: o tempo não foi pro ranking." }));
    }
  }, [evento]);

  const correr = (id: string) => {
    recordeAntes.current = rankings[id]?.eu?.ms != null ? rankings[id]!.eu!.ms / 1000 : null;
    setResultado(null); setDelta(null);
    if (engine.current?.iniciarCorrida(id)) setAberto(false);
  };
  const fechar = () => { setResultado(null); engine.current?.sairCorrida(); };

  // ── o resultado ──
  if (resultado) {
    const p = PISTAS.find((x) => x.id === resultado.pista);
    return (
      <div className={`absolute left-1/2 top-1/2 z-[40] w-[min(420px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 p-5 ${CAIXA}`}>
        <div className="text-[12px] uppercase tracking-[0.18em] text-sky-200/70">{p?.nome} · chegada</div>
        <div className="mt-1 font-mono text-[40px] font-extrabold leading-none">{formatarTempo(resultado.total)}</div>
        {resultado.recorde && <div className="mt-1 text-[13px] font-bold text-amber-300">★ recorde pessoal</div>}
        <div className="mt-2 flex flex-wrap gap-x-3 text-[12px] text-sky-100/75">{resultado.voltas.map((v, i) => <span key={i}>V{i + 1} {formatarTempo(v)}</span>)}</div>
        <div className="mt-4 text-[12px] font-bold uppercase tracking-wider text-sky-200/70">Ranking</div>
        {resultado.salvando && <div className="mt-2 text-[13px] text-sky-100/70">salvando…</div>}
        {resultado.erro && <div className="mt-2 text-[13px] text-rose-300">{resultado.erro}</div>}
        {resultado.ranking && (
          <ol className="mt-2 space-y-1 text-[13px]">
            {resultado.ranking.top.map((l) => (
              <li key={l.posicao} className={`flex items-center gap-2 rounded-lg px-2 py-1 ${l.eu ? "bg-sky-400/15" : ""}`}>
                <span className="w-5 text-right font-bold text-sky-200/70">{l.posicao}</span>
                <span className="flex-1 truncate" style={{ color: l.cor }}>{l.nome}</span>
                <span className="font-mono">{formatarTempo(l.ms / 1000)}</span>
              </li>
            ))}
            {resultado.ranking.eu && (resultado.ranking.eu.posicao ?? 99) > 10 && <li className="px-2 text-[12px] text-sky-100/70">você: {resultado.ranking.eu.posicao ? `${resultado.ranking.eu.posicao}º` : ""} · {formatarTempo(resultado.ranking.eu.ms / 1000)}</li>}
          </ol>
        )}
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={() => correr(resultado.pista)} className="flex-1 rounded-full bg-sky-400 px-4 py-2 text-[14px] font-extrabold text-[#04101c]">Correr de novo</button>
          <button type="button" onClick={fechar} className="rounded-full border border-white/20 px-4 py-2 text-[14px] font-bold">Fechar</button>
        </div>
      </div>
    );
  }

  // ── correndo ──
  if (hud) {
    const d = delta && Date.now() < delta.ate ? delta.v : null, setaVisivel = hud.fase === "correndo" && Math.abs(hud.seta) > 0.45;
    return (
      <>
        <div className={`pointer-events-none absolute left-1/2 top-3 z-[30] -translate-x-1/2 px-4 py-2 text-center ${CAIXA}`}>
          <div className="text-[11px] uppercase tracking-[0.16em] text-sky-200/70">{hud.nome}</div>
          <div className="font-mono text-[26px] font-extrabold leading-tight">{formatarTempo(hud.tempo)}</div>
          <div className="flex justify-center gap-3 text-[12px] text-sky-100/80"><span>Volta <b>{hud.volta}</b>/{hud.voltas}</span><span>Portão <b>{hud.portao}</b>/{hud.nPortoes}</span></div>
          {d !== null && <div className={`mt-0.5 font-mono text-[15px] font-bold ${d < 0 ? "text-emerald-300" : "text-rose-300"}`}>{d < 0 ? "−" : "+"}{Math.abs(d).toFixed(2)}s</div>}
        </div>
        {hud.fase === "contagem" && <div className="pointer-events-none absolute left-1/2 top-[38%] z-[30] -translate-x-1/2 font-mono text-[110px] font-black text-white drop-shadow-[0_0_30px_rgba(69,214,255,0.8)]">{hud.contagem}</div>}
        {hud.fase === "correndo" && hud.tempo < 1 && <div className="pointer-events-none absolute left-1/2 top-[38%] z-[30] -translate-x-1/2 text-[80px] font-black text-emerald-300 drop-shadow-[0_0_30px_rgba(110,255,180,0.8)]">VAI!</div>}
        {setaVisivel && (
          <div className="pointer-events-none absolute left-1/2 top-[30%] z-[30] -translate-x-1/2 text-center">
            <div className="text-[44px] leading-none text-amber-300 drop-shadow-[0_0_12px_rgba(255,196,107,0.9)]" style={{ transform: `rotate(${hud.seta}rad)` }}>⬆</div>
            <div className="text-[12px] font-bold text-amber-100">portão a {Math.round(hud.dist)} m</div>
          </div>
        )}
        <button type="button" onClick={() => engine.current?.sairCorrida()} className="absolute z-[31] rounded-full border border-white/20 bg-[#070b1c]/70 px-3 py-1.5 text-[12px] font-bold text-sky-50" style={{ right: "max(16px, env(safe-area-inset-right))", top: 68 }}>Sair da corrida</button>
      </>
    );
  }

  if (!moto) return null;
  // ── na moto: o botão e a lista ──
  return (
    <>
      <button type="button" onClick={() => setAberto((v) => !v)} className="absolute left-1/2 top-3 z-[30] -translate-x-1/2 rounded-full border border-sky-300/40 bg-[#070b1c]/75 px-4 py-2 text-[13px] font-extrabold text-sky-50 backdrop-blur hover:bg-sky-400/20">🏁 Corridas</button>
      {aberto && (
        <div className={`absolute left-1/2 top-16 z-[31] w-[min(420px,calc(100vw-32px))] -translate-x-1/2 p-4 ${CAIXA}`}>
          <div className="mb-2 text-[12px] uppercase tracking-[0.18em] text-sky-200/70">Corridas · contra o relógio</div>
          <div className="space-y-2">
            {PISTAS.map((p) => {
              const r = rankings[p.id];
              return (
                <div key={p.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: p.cor }} /><b className="text-[15px]">{p.nome}</b><span className="ml-auto text-[12px] text-sky-100/70">{p.voltas} voltas · {(p.comprimento / 1000).toFixed(1)} km</span></div>
                  <div className="mt-1 text-[12px] text-sky-100/70">{p.desc}</div>
                  <div className="mt-2 flex items-center gap-2 text-[12px]">
                    <span className="text-sky-100/80">{r?.eu ? <>seu melhor <b className="font-mono">{formatarTempo(r.eu.ms / 1000)}</b>{r.eu.posicao ? ` · ${r.eu.posicao}º` : ""}</> : r?.top[0] ? <>recorde <b className="font-mono">{formatarTempo(r.top[0].ms / 1000)}</b> · {r.top[0].nome}</> : "sem tempos ainda"}</span>
                    <button type="button" onClick={() => correr(p.id)} className="ml-auto rounded-full bg-sky-400 px-4 py-1.5 text-[13px] font-extrabold text-[#04101c]">Correr</button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-[11px] text-sky-100/60">Passe pelos portões na ordem. Os âmbar enchem o boost. A moto vai pro grid da pista.</div>
        </div>
      )}
    </>
  );
}
