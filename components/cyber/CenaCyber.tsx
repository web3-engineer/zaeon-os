"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LAB_ENTRADA, MSG_ENTRAR_ESTUDO, ehMsgEntrarEstudo } from "@/lib/ui/loungeHub";
import { detectarPerfil, precisaGirar, qualidadeDe } from "@/lib/cyber/dispositivo";
import type { MensagemChat, Presenca } from "@/lib/lounge3d/tipos";
import { landmarksOn, type POI } from "@/lib/cyber/landmarks";
import { CyberEngine, type PessoaCyber } from "./engine";
import Joystick from "./Joystick";
import ControlesVoo from "./ControlesVoo";

export type CenaCyberProps = {
  /** "janela": prévia na landing (começa no menu, sem rede). "tela": cyberespaço inteiro (já em play, com a sala). */
  modo: "janela" | "tela";
  eu: PessoaCyber;
  membros: PessoaCyber[];
  remotos?: { current: Map<string, Presenca> };
  enviarPos?: (p: { x: number; z: number; facing: number; moving: boolean; sit: boolean }) => void;
  chat?: MensagemChat[];
  enviarChat?: (texto: string) => Promise<void> | void;
  /** só o dono da sala tem o token → só ele convida. */
  tokenConvite?: string | null;
  online?: number;
  /** aviso de rede ("tempo real indisponível", "sala cheia"…). */
  aviso?: string | null;
  onSessaoIniciada?: () => void;
  /** dono da Zaeon (vem do SERVIDOR) — só pinta os botões; quem decide é `pedirAcesso` */
  souFundador?: boolean;
  /** AÇÃO PRIVILEGIADA: pede ao servidor pra subir ao topo da Zaeon (POST /api/lounge3d/[id]/topo) */
  pedirAcesso?: (alvo: "topo" | "ceu" | "nave") => Promise<{ ok: boolean; erro?: string }>;
};


export default function CenaCyber(p: CenaCyberProps) {
  const router = useRouter();
  const tela = p.modo === "tela";
  const cont = useRef<HTMLDivElement>(null), overlay = useRef<HTMLDivElement>(null);
  const monLabel = useRef<HTMLDivElement>(null);
  const engine = useRef<CyberEngine | null>(null);
  const [pronto, setPronto] = useState(false), [perto, setPerto] = useState(false), [menu, setMenu] = useState(!tela);
  const [falandoCom, setFalandoCom] = useState<string | null>(null), [abrindo, setAbrindo] = useState(false), [copiado, setCopiado] = useState(false);
  const [rota, setRota] = useState<"heliporto" | "qg" | "zaeon" | null>(null);
  const [voo, setVoo] = useState<{ y: number } | null>(null);
  const [qg, setQg] = useState({ noCeu: false, navePerto: false, pilotando: false, pousado: true }), [fade, setFade] = useState(false), [aviso2, setAviso2] = useState<string | null>(null);
  const avisar = useCallback((m: string) => { setAviso2(m); setTimeout(() => setAviso2((x) => (x === m ? null : x)), 3500); }, []);
  /** corte com fade (portal: sem animação de viagem) */
  const comFade = useCallback((acao: () => void) => { setFade(true); setTimeout(() => { acao(); setTimeout(() => setFade(false), 260); }, 360); }, []);
  /** ação privilegiada: pergunta ao SERVIDOR antes (cb sempre fresco via ref) */
  const pedir = useCallback(async (alvo: "topo" | "ceu" | "nave", ok: () => void) => {
    const fn = cb.current.pedirAcesso;
    if (!cb.current.souFundador || !fn) { avisar(alvo === "ceu" ? "A Zaeon é a base do dono — o portal não abre pra você." : alvo === "nave" ? "Só o dono pilota a nave." : "Só o dono sobe ao topo."); return; }
    try { const r = await fn(alvo); if (r.ok) ok(); else avisar(r.erro ?? "Não autorizado."); } catch { avisar("Sem conexão."); }
  }, [avisar]);
  const [poiAberto, setPoiAberto] = useState<POI | null>(null), [noTopo, setNoTopo] = useState(false), [subindo, setSubindo] = useState(false), [erroTopo, setErroTopo] = useState<string | null>(null);
  const [correndo, setCorrendo] = useState(false), [txt, setTxt] = useState(""), [falha, setFalha] = useState(false);
  const touch = useMemo(() => typeof window !== "undefined" && (matchMedia("(pointer:coarse)").matches || "ontouchstart" in window), []);
  // ONDE está rodando (celular × desktop, aparelho fraco) → capas de efeito só onde precisa (lib/cyber/dispositivo)
  const perfil = useMemo(() => typeof window === "undefined" ? { movel: false, leve: false, fraco: false } : detectarPerfil({
    coarse: matchMedia("(pointer: coarse)").matches, toques: navigator.maxTouchPoints || 0, ua: navigator.userAgent, largura: innerWidth, altura: innerHeight,
    memoriaGB: (navigator as Navigator & { deviceMemory?: number }).deviceMemory, nucleos: navigator.hardwareConcurrency || undefined,
  }), []);
  const qualidade = useMemo(() => qualidadeDe(perfil), [perfil]);
  const low = qualidade.leve;
  // celular: o cyberespaço é NA HORIZONTAL — em pé, pede pra girar e pausa a cena
  const [girar, setGirar] = useState(false);
  useEffect(() => {
    if (!tela) return;
    const ver = () => setGirar(precisaGirar(perfil, innerWidth, innerHeight));
    ver(); window.addEventListener("resize", ver); window.addEventListener("orientationchange", ver);
    return () => { window.removeEventListener("resize", ver); window.removeEventListener("orientationchange", ver); };
  }, [tela, perfil]);
  useEffect(() => { engine.current?.pausar(girar); }, [girar, pronto]);
  /** Android: tela cheia + trava na horizontal (precisa de gesto do usuário); no iPhone só girar resolve */
  const telaCheiaHorizontal = useCallback(async () => {
    try { await document.documentElement.requestFullscreen?.({ navigationUI: "hide" }); } catch { /* sem tela cheia */ }
    try { await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.("landscape"); } catch { /* sem trava (iOS) */ }
  }, []);

  // callbacks sempre frescos sem recriar a engine
  const cb = useRef(p); cb.current = p;
  // contrato: a intenção sai como postMessage({type:"zaeon:enter-study"}) (mesma origem) → router.push("/research-lab?tab=pesquisa")
  const entrarEstudo = useCallback(() => { window.postMessage({ type: MSG_ENTRAR_ESTUDO }, window.location.origin); }, []);
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (!ehMsgEntrarEstudo(e.data, e.origin, window.location.origin)) return;
      // O cyberespaço é pesado (WebGL + GLB): ao ir estudar ele é DESMONTADO já — nada de ficar vivo no background.
      engine.current?.dispose(); engine.current = null;
      setAbrindo(true);
      router.push(LAB_ENTRADA);   // primeira tela do laboratório = aba de Pesquisa
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [router]);

  useEffect(() => {
    if (!cont.current || !overlay.current) return;
    let cancelado = false, e: CyberEngine | null = null;
    CyberEngine.criar({
      container: cont.current, overlay: overlay.current, els: { menu: null, hold: null, monLabel: monLabel.current },
      eu: cb.current.eu, membros: cb.current.membros, menu: !tela, low, qualidade, teclasSempre: tela,
      remotos: cb.current.remotos, enviarPos: (x) => cb.current.enviarPos?.(x),
      onPerto: setPerto, onFalarCom: setFalandoCom, onEntrarEstudo: entrarEstudo,
      onSessao: () => { setMenu(false); cb.current.onSessaoIniciada?.(); }, onPronto: () => setPronto(true),
      landmarks: landmarksOn(), onLandmark: (poi) => { setErroTopo(null); setPoiAberto(poi); }, onTopo: (v) => { setNoTopo(v); if (v) setPoiAberto(null); },
      onPortalCeu: () => { void pedir("ceu", () => comFade(() => engine.current?.entrarNoCeu())); },
      onEmbarcar: () => { void pedir("nave", () => engine.current?.embarcar()); },
      onEstadoQG: setQg,
      onVoo: setVoo,
      onRota: setRota,
    }).then((eng) => { if (cancelado) { eng.dispose(); return; } e = eng; engine.current = eng; eng.setPessoas(cb.current.membros); })
      .catch(() => { if (!cancelado) setFalha(true); });
    return () => { cancelado = true; e?.dispose(); engine.current = null; };
    // a engine é criada uma vez por montagem; mudanças vão por métodos
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { engine.current?.setPessoas(p.membros); }, [p.membros]);

  // chat da sala → balões sobre os avatares
  const vistas = useRef(0);
  useEffect(() => {
    const c = p.chat ?? [];
    if (c.length < vistas.current) vistas.current = 0;
    for (let i = vistas.current; i < c.length; i++) engine.current?.falar(c[i]!.userId, c[i]!.texto);
    vistas.current = c.length;
  }, [p.chat]);

  if (falha) return <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#03030a] px-6 text-center text-sm text-white/70">Não deu para iniciar o cyberespaço 3D neste aparelho.<button onClick={entrarEstudo} className="min-h-[44px] rounded-full bg-cyan-400 px-5 font-semibold text-slate-950">Ir para a Sala de Estudos</button></div>;

  const enviar = () => { const t = txt.trim(); if (!t) return; void p.enviarChat?.(t); setTxt(""); };
  const convidar = async () => {
    if (!p.tokenConvite) return;
    const url = `${location.origin}/lounge-cosmico?sala=${p.tokenConvite}`;
    try { await navigator.clipboard.writeText(url); } catch { window.prompt("Copie o link de convite:", url); }
    setCopiado(true); setTimeout(() => setCopiado(false), 2200);
  };

  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-[#03030a] text-[#e7ecff]">
      <div ref={cont} className="absolute inset-0" />
      <div ref={overlay} className="pointer-events-none absolute inset-0 overflow-hidden" />

      {/* rótulo do monitor (hover) */}
      <div ref={monLabel} className="pointer-events-none absolute z-[22] hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full bg-gradient-to-b from-cyan-100 to-sky-400 px-3 py-1.5 text-[12.5px] font-bold text-slate-950 shadow-[0_0_18px_rgba(90,200,255,.7)] data-[longe=true]:border data-[longe=true]:border-sky-300/35 data-[longe=true]:bg-slate-900/80 data-[longe=true]:from-transparent data-[longe=true]:to-transparent data-[longe=true]:text-sky-100 data-[longe=true]:shadow-none" />

      {/* janela da landing = só a VISTA do cyberespaço: sem menu, sem frases, sem tutorial */}

      {/* HUD de jogo (fora do menu) */}
      {!menu && (
        <>
          {/* interface limpa: sem dicas/tutorial na tela */}
          {tela && (
            <button type="button" onClick={() => router.push("/")} className="absolute left-3 top-3 z-20 min-h-[44px] rounded-full border border-white/20 bg-black/50 px-4 text-xs font-medium text-white backdrop-blur focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400">← Sair</button>
          )}
          {tela && (
            <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
              {typeof p.online === "number" && <span className="rounded-full border border-white/15 bg-black/50 px-3 py-2 text-xs text-white/80">{p.online}/5 online</span>}
              {p.tokenConvite && <button type="button" onClick={convidar} className="min-h-[44px] rounded-full border border-cyan-300/40 bg-cyan-400/15 px-4 text-xs font-semibold text-cyan-100 backdrop-blur focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400">{copiado ? "Link copiado ✓" : "Convidar"}</button>}
            </div>
          )}
          {p.aviso && <p role="status" className="absolute left-1/2 top-[120px] z-20 -translate-x-1/2 rounded-full bg-amber-300/90 px-3 py-1 text-xs font-medium text-slate-900">{p.aviso}</p>}

          {perto && (
            <button type="button" onClick={entrarEstudo} className="absolute left-1/2 z-[21] min-h-[44px] -translate-x-1/2 animate-pulse rounded-full bg-gradient-to-b from-cyan-200 to-sky-400 px-6 text-sm font-extrabold text-slate-950 shadow-[0_0_26px_rgba(90,200,255,.75)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" style={{ bottom: touch ? 168 : tela ? 150 : 28 }}>✦ Estudar</button>
          )}

          {tela && !(touch && qg.pilotando) && (   // celular pilotando: o chat sai da frente dos atalhos/controles
            <div className="absolute z-20 w-[min(68vw,300px)] rounded-2xl border border-violet-300/25 bg-[#0a081e]/70 p-2.5 backdrop-blur" style={touch ? { left: 10, top: 64 } : { left: 16, bottom: 16 }}>
              <div className="h-4 px-1 text-[10.5px] text-cyan-200">{falandoCom ? `💬 falando com ${falandoCom}` : ""}</div>
              <div className="mb-1.5 flex max-h-[96px] flex-col gap-0.5 overflow-y-auto px-1 text-[12.5px] text-violet-100" aria-live="polite">
                {(p.chat ?? []).slice(-8).map((m) => <div key={m.id}><b style={{ color: m.color }}>{m.name}:</b> {m.texto}</div>)}
              </div>
              <input value={txt} onChange={(e) => setTxt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") enviar(); }} maxLength={400} placeholder="Falar…  (Enter)" aria-label="Falar na sala" className="w-full rounded-xl border border-violet-300/30 bg-[#0a081e]/70 px-3 py-2 text-[13px] text-white outline-none focus:border-cyan-300" />
            </div>
          )}

          {touch && (
            <>
              <Joystick onMove={(x, y) => engine.current?.setJoystick(x, y)} />
              {qg.pilotando ? null : (<>
              <button type="button" aria-label="Correr" aria-pressed={correndo} onPointerDown={(e) => { e.stopPropagation(); setCorrendo(engine.current?.alternarCorrer() ?? false); }} className={`absolute z-[25] flex h-[62px] w-[62px] touch-none items-center justify-center rounded-full border border-sky-300/45 text-[12px] font-extrabold backdrop-blur ${correndo ? "bg-gradient-to-b from-cyan-200 to-sky-400 text-slate-950" : "bg-sky-950/55 text-sky-50"}`} style={{ right: "max(94px, calc(env(safe-area-inset-right) + 72px))", bottom: "max(30px, env(safe-area-inset-bottom))" }}>CORRER</button>
              <button type="button" aria-label="Voar (segurar)" onPointerDown={(e) => { e.stopPropagation(); try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* sem captura */ } engine.current?.comandoJet(true); }} onPointerUp={() => engine.current?.comandoJet(false)} onPointerCancel={() => engine.current?.comandoJet(false)} onLostPointerCapture={() => engine.current?.comandoJet(false)} onContextMenu={(e) => e.preventDefault()} className="absolute z-[25] flex h-[62px] w-[62px] touch-none items-center justify-center rounded-full border border-sky-300/45 bg-sky-950/55 text-[12px] font-extrabold text-sky-50 backdrop-blur" style={{ right: "max(22px, env(safe-area-inset-right))", bottom: "max(30px, env(safe-area-inset-bottom))" }}>VOAR</button>
              </>)}
            </>
          )}
        </>
      )}

      {/* entrando nos estudos: SÓ uma barra de loading, nenhum texto */}
      {/* painel do marco (proximidade + clique): nome, org, link; "Subir ao topo" só pro dono e validado no SERVIDOR */}
      {poiAberto && !menu && (
        <div role="dialog" aria-label={poiAberto.nome} className="absolute left-1/2 top-[110px] z-30 w-[min(92vw,340px)] -translate-x-1/2 rounded-2xl border border-sky-300/35 bg-[#070c22]/90 p-4 text-sm shadow-[0_0_40px_-10px_rgba(90,200,255,.6)] backdrop-blur">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1"><p className="text-base font-extrabold tracking-wide text-sky-100">{poiAberto.nome}</p><p className="mt-0.5 text-white/70">{poiAberto.org}</p></div>
            <button type="button" aria-label="Fechar" onClick={() => setPoiAberto(null)} className="min-h-[36px] min-w-[36px] rounded-full border border-white/15 text-white/70 hover:text-white">×</button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {poiAberto.link && <button type="button" onClick={() => router.push(poiAberto.link!)} className="min-h-[40px] rounded-full border border-sky-300/40 bg-sky-400/15 px-4 font-semibold text-sky-100">Abrir</button>}
            {poiAberto.acesso === "dono" && p.souFundador && p.pedirAcesso && (
              <button type="button" disabled={subindo} onClick={async () => {
                setSubindo(true); setErroTopo(null);
                try { const r = await p.pedirAcesso!("topo"); if (r.ok) engine.current?.subir(); else setErroTopo(r.erro ?? "Não foi possível subir."); }
                catch { setErroTopo("Sem conexão."); } finally { setSubindo(false); }
              }} className="min-h-[40px] rounded-full bg-gradient-to-b from-cyan-200 to-sky-400 px-4 font-extrabold text-slate-950 disabled:opacity-60">{subindo ? "Subindo…" : "Subir ao topo"}</button>
            )}
          </div>
          {erroTopo && <p role="alert" className="mt-2 text-rose-300">{erroTopo}</p>}
        </div>
      )}
      {/* QG: nave e cidade (as ações privilegiadas passam pelo servidor em `pedir`) */}
      {!menu && qg.navePerto && !qg.pilotando && p.souFundador && (
        <button type="button" onClick={() => void pedir("nave", () => engine.current?.embarcar())} className="absolute left-1/2 top-[164px] z-30 min-h-[44px] -translate-x-1/2 rounded-full bg-gradient-to-b from-cyan-200 to-sky-400 px-5 text-sm font-extrabold text-slate-950 shadow-[0_0_24px_rgba(90,200,255,.6)]">🚀 Embarcar na nave</button>
      )}
      {!menu && qg.pilotando && <ControlesVoo engine={engine} touch={touch} pousado={qg.pousado} />}
      {!menu && qg.pilotando && (
        <div className="absolute left-1/2 top-[110px] z-30 flex -translate-x-1/2 flex-col items-center gap-2">
          {voo && !qg.pousado && <p className="rounded-full bg-[#070c22]/70 px-3 py-1 text-center text-xs font-bold tabular-nums text-sky-100 backdrop-blur">↕ {voo.y} m</p>}
          {/* atalhos (só no começo do voo, com a nave pousada): a nave voa sozinha, à vista de todos; qualquer botão de movimento cancela */}
          {rota ? (
            <button type="button" onClick={() => engine.current?.pararRota()} className="min-h-[40px] rounded-full border border-amber-200/45 bg-[#1a0f08]/85 px-4 text-xs font-semibold text-amber-100 backdrop-blur">■ Parar</button>
          ) : qg.pousado && (
            <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Atalhos de voo">
              {([["heliporto", "Heliporto"], ["qg", "QG do Andrei"], ["zaeon", "Zaeon"]] as const).map(([d, rot]) => (
                <button key={d} type="button" onClick={() => engine.current?.irPara(d)} className="min-h-[40px] rounded-full border border-sky-300/40 bg-[#070c22]/85 px-4 text-xs font-semibold text-sky-100 backdrop-blur">{rot}</button>
              ))}
            </div>
          )}
          {qg.pousado && <button type="button" onClick={() => engine.current?.desembarcar()} className="min-h-[44px] rounded-full border border-sky-300/40 bg-[#070c22]/85 px-5 text-sm font-semibold text-sky-100 backdrop-blur">Sair da nave{touch ? "" : " (F)"}</button>}
        </div>
      )}
      {!menu && qg.noCeu && !qg.pilotando && (
        <button type="button" onClick={() => comFade(() => engine.current?.voltarDaCidade())} className="absolute right-3 top-[64px] z-30 min-h-[44px] rounded-full border border-amber-200/40 bg-[#1a0f08]/80 px-4 text-xs font-semibold text-amber-100 backdrop-blur">↩ Voltar à praça</button>
      )}
      {aviso2 && <p role="status" className="absolute left-1/2 top-[164px] z-40 -translate-x-1/2 rounded-full bg-[#1a0f08]/90 px-4 py-2 text-xs text-amber-100">{aviso2}</p>}
      <div aria-hidden="true" className={`pointer-events-none absolute inset-0 z-[45] bg-black transition-opacity duration-300 ${fade ? "opacity-100" : "opacity-0"}`} />
      {/* celular em pé: o cyberespaço roda na horizontal (a cena fica pausada até girar) */}
      {girar && (
        <div role="dialog" aria-label="Gire o celular" className="absolute inset-0 z-[60] flex flex-col items-center justify-center gap-5 bg-[#03030a]/95 px-8 text-center text-sky-100">
          <svg aria-hidden="true" width="84" height="84" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-300">
            <rect x="7" y="2.5" width="10" height="17" rx="2" /><path d="M19.5 14.5a7.5 7.5 0 0 1-6 6.9" /><path d="m13.5 21.4 1.6-1.9-2.2-.9" />
          </svg>
          <p className="text-base font-bold">Gire o celular</p>
          <p className="max-w-[260px] text-sm text-sky-100/70">O cyberespaço roda na horizontal.</p>
          <button type="button" onClick={() => void telaCheiaHorizontal()} className="min-h-[44px] rounded-full bg-gradient-to-b from-cyan-200 to-sky-400 px-5 text-sm font-extrabold text-slate-950">Tela cheia na horizontal</button>
        </div>
      )}

      {noTopo && !menu && (
        <button type="button" onClick={() => engine.current?.descer()} className="absolute left-1/2 top-[110px] z-30 min-h-[44px] -translate-x-1/2 rounded-full border border-sky-300/40 bg-[#070c22]/85 px-5 text-sm font-semibold text-sky-100 backdrop-blur">↓ Descer da Zaeon</button>
      )}

      {abrindo && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#03030a]">
          <div role="progressbar" aria-label="Carregando" className="h-1.5 w-[220px] overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/3 animate-[cyber-entrando_1.2s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-cyan-200 to-sky-400" />
          </div>
          <style>{`@keyframes cyber-entrando{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`}</style>
        </div>
      )}
      {!pronto && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-[#03030a]">
          <div className="h-1.5 w-[220px] overflow-hidden rounded-full bg-white/10"><div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-cyan-200 to-sky-400" /></div>
        </div>
      )}
    </div>
  );
}
