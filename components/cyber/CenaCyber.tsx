"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LAB_ROTA } from "@/lib/ui/loungeHub";
import type { MensagemChat, Presenca } from "@/lib/lounge3d/tipos";
import { CyberEngine, type PessoaCyber } from "./engine";
import Joystick from "./Joystick";

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
};

const FRASES = ["O conhecimento que não dorme trabalha por você.", "Toda descoberta começa com uma pergunta.", "Aqui, estudar é explorar o cosmos.", "Pequenos passos diários viram galáxias.", "A mente curiosa nunca anoitece."];
const OPCOES = [["estudar", "✦", "Estudar"], ["pesquisar", "🔭", "Pesquisar"], ["projetos", "🛠", "Projetos"], ["comunidade", "👥", "Comunidade"]] as const;

export default function CenaCyber(p: CenaCyberProps) {
  const router = useRouter();
  const tela = p.modo === "tela";
  const cont = useRef<HTMLDivElement>(null), overlay = useRef<HTMLDivElement>(null);
  const menuEl = useRef<HTMLDivElement>(null), holdEl = useRef<HTMLDivElement>(null), monLabel = useRef<HTMLDivElement>(null);
  const engine = useRef<CyberEngine | null>(null);
  const [pronto, setPronto] = useState(false), [perto, setPerto] = useState(false), [menu, setMenu] = useState(!tela);
  const [falandoCom, setFalandoCom] = useState<string | null>(null), [abrindo, setAbrindo] = useState(false), [copiado, setCopiado] = useState(false);
  const [correndo, setCorrendo] = useState(false), [txt, setTxt] = useState(""), [falha, setFalha] = useState(false);
  const touch = useMemo(() => typeof window !== "undefined" && (matchMedia("(pointer:coarse)").matches || "ontouchstart" in window), []);
  const low = useMemo(() => touch || (typeof window !== "undefined" && Math.min(innerWidth, innerHeight) < 520), [touch]);
  const frase = useMemo(() => FRASES[Math.floor(Math.random() * FRASES.length)]!, []);

  // callbacks sempre frescos sem recriar a engine
  const cb = useRef(p); cb.current = p;
  const entrarEstudo = useCallback(() => { setAbrindo(true); setTimeout(() => router.push(LAB_ROTA), 700); }, [router]);

  useEffect(() => {
    if (!cont.current || !overlay.current) return;
    try {
      const e = new CyberEngine({
        container: cont.current, overlay: overlay.current, els: { menu: menuEl.current, hold: holdEl.current, monLabel: monLabel.current },
        eu: cb.current.eu, membros: cb.current.membros, menu: !tela, low, teclasSempre: tela,
        remotos: cb.current.remotos, enviarPos: (x) => cb.current.enviarPos?.(x),
        onPerto: setPerto, onFalarCom: setFalandoCom, onEntrarEstudo: entrarEstudo,
        onSessao: () => { setMenu(false); cb.current.onSessaoIniciada?.(); }, onPronto: () => setPronto(true),
      });
      engine.current = e;
      return () => { e.dispose(); engine.current = null; };
    } catch { setFalha(true); }
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

      {/* MENU de jogo: projetado no monitor; opção = play (ou segurar ESPAÇO) */}
      {!tela && (
        <>
          {menu && <p className="pointer-events-none absolute inset-x-0 top-[11%] z-[6] px-6 text-center text-[clamp(16px,2.6vw,26px)] font-light text-white/90 [text-shadow:0_0_24px_rgba(120,170,255,.5)]">{frase}</p>}
          <div ref={menuEl} className={`${menu ? "flex" : "hidden"} absolute z-[6] min-w-[190px] -translate-x-1/2 -translate-y-1/2 flex-col gap-1.5 rounded-2xl border border-sky-300/30 bg-[#0a0e22]/80 p-3 backdrop-blur`}>
            <span className="px-1 text-[10px] tracking-[0.3em] text-sky-300/80">ZAEON</span>
            {OPCOES.map(([go, ico, nome]) => (
              <button key={go} type="button" onClick={() => engine.current?.iniciar(go)} className="flex min-h-[40px] items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold text-white/95 transition hover:bg-sky-300/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"><span aria-hidden="true">{ico}</span>{nome}</button>
            ))}
          </div>
          {menu && (
            <div className="pointer-events-none absolute inset-x-0 bottom-[5%] z-[6] px-4 text-center text-[12px] text-sky-100/80">
              {touch ? "toque numa opção para viajar pro cyberespaço" : <>pressione e segure <kbd className="rounded-md border border-sky-300/35 bg-sky-300/15 px-2 py-px font-mono text-[11px]">ESPAÇO</kbd> para viajar pro cyberespaço</>}
              <div className="mx-auto mt-2 h-1.5 w-[min(260px,70vw)] overflow-hidden rounded-full bg-white/10"><div ref={holdEl} className="h-full w-0 rounded-full bg-gradient-to-r from-cyan-200 to-sky-400 shadow-[0_0_14px_rgba(90,200,255,.7)]" /></div>
            </div>
          )}
        </>
      )}

      {/* HUD de jogo (fora do menu) */}
      {!menu && (
        <>
          {!(touch && tela) && <p className="pointer-events-none absolute left-1/2 top-[64px] z-20 max-w-[92vw] -translate-x-1/2 rounded-full border border-violet-300/20 bg-[#0e0c24]/55 px-3 py-1 text-center text-[11.5px] text-violet-200/90">
            {touch ? "joystick p/ andar · toque no chão p/ ir · pinça p/ zoom" : "WASD/clique p/ andar · Shift correr · Espaço pular · perto de um colega p/ falar · na sua base p/ estudar"}
          </p>}
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

          {tela && (
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
              <button type="button" aria-label="Correr" aria-pressed={correndo} onPointerDown={(e) => { e.stopPropagation(); setCorrendo(engine.current?.alternarCorrer() ?? false); }} className={`absolute z-[25] flex h-[62px] w-[62px] touch-none items-center justify-center rounded-full border border-sky-300/45 text-[12px] font-extrabold backdrop-blur ${correndo ? "bg-gradient-to-b from-cyan-200 to-sky-400 text-slate-950" : "bg-sky-950/55 text-sky-50"}`} style={{ right: "max(94px, calc(env(safe-area-inset-right) + 72px))", bottom: "max(30px, env(safe-area-inset-bottom))" }}>CORRER</button>
              <button type="button" aria-label="Pular" onPointerDown={(e) => { e.stopPropagation(); engine.current?.pular(); }} className="absolute z-[25] flex h-[62px] w-[62px] touch-none items-center justify-center rounded-full border border-sky-300/45 bg-sky-950/55 text-[12px] font-extrabold text-sky-50 backdrop-blur" style={{ right: "max(22px, env(safe-area-inset-right))", bottom: "max(30px, env(safe-area-inset-bottom))" }}>PULAR</button>
            </>
          )}
        </>
      )}

      {abrindo && <div role="status" className="absolute inset-0 z-40 flex items-center justify-center bg-[#04040c]/60 text-[15px] tracking-[0.12em] text-sky-100 backdrop-blur-sm">abrindo a Sala de Estudos…</div>}
      {!pronto && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-[#03030a]">
          <span className="text-base font-bold tracking-[0.28em] text-sky-100">ZAEON</span>
          <div className="h-1.5 w-[220px] overflow-hidden rounded-full bg-white/10"><div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-cyan-200 to-sky-400" /></div>
        </div>
      )}
    </div>
  );
}
