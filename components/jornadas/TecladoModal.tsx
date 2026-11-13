"use client";

/**
 * TecladoModal — o teclado tocável do Plano de Trabalho, num modal de vidro líquido (sheet que sobe).
 * Toque pelo mouse, pelo dedo (touch) ou pelas teclas do PC (A S D F G H J K + W E T Y U). Dois modos:
 * TOCAR LIVRE e TOCAR JUNTO (a nota-alvo acende na pauta; acerte e ela avança).
 *
 * O som é um sintetizador simples de OSCILADORES (toca em qualquer lugar sem baixar banco de sons — o
 * timbre vira piano de verdade quando migrarmos pro soundfont do app). O desenho da pauta é o abcjs.
 * Cada acerto chama `aoTocar` (vira sinal de atividade pro Guia); terminar a sequência chama `aoConcluir`.
 */
import { useCallback, useEffect, useRef, useState } from "react";

type NotaId = "C4" | "C#4" | "D4" | "D#4" | "E4" | "F4" | "F#4" | "G4" | "G#4" | "A4" | "A#4" | "B4" | "C5";
type Tecla = { id: NotaId; t: "b" | "w"; pc: string; f: number; l: string };

const KEYS: Tecla[] = [
  { id: "C4", t: "w", pc: "a", f: 261.63, l: "Dó" }, { id: "C#4", t: "b", pc: "w", f: 277.18, l: "Dó#" },
  { id: "D4", t: "w", pc: "s", f: 293.66, l: "Ré" }, { id: "D#4", t: "b", pc: "e", f: 311.13, l: "Ré#" },
  { id: "E4", t: "w", pc: "d", f: 329.63, l: "Mi" }, { id: "F4", t: "w", pc: "f", f: 349.23, l: "Fá" },
  { id: "F#4", t: "b", pc: "t", f: 369.99, l: "Fá#" }, { id: "G4", t: "w", pc: "g", f: 392.0, l: "Sol" },
  { id: "G#4", t: "b", pc: "y", f: 415.3, l: "Sol#" }, { id: "A4", t: "w", pc: "h", f: 440.0, l: "Lá" },
  { id: "A#4", t: "b", pc: "u", f: 466.16, l: "Lá#" }, { id: "B4", t: "w", pc: "j", f: 493.88, l: "Si" },
  { id: "C5", t: "w", pc: "k", f: 523.25, l: "Dó" },
];
const BY_ID = Object.fromEntries(KEYS.map((k) => [k.id, k])) as Record<NotaId, Tecla>;
const BY_PC = Object.fromEntries(KEYS.map((k) => [k.pc, k])) as Record<string, Tecla>;
const POS_W: Record<string, number> = { C4: 0, D4: 1, E4: 2, F4: 3, G4: 4, A4: 5, B4: 6, C5: 7 };
const DEPOIS: Record<string, string> = { "C#4": "C4", "D#4": "D4", "F#4": "F4", "G#4": "G4", "A#4": "A4" };

export type AlvoTeclado = { abc: string; titulo: string; seq: NotaId[]; spq?: number };

const ESCALA: AlvoTeclado = {
  titulo: "Escala de Dó",
  abc: "X:1\nT:Escala de Dó\nM:4/4\nL:1/4\nQ:1/4=84\nK:C\nC D E F | G A B c | c B A G | F E D C |]",
  seq: ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5", "C5", "B4", "A4", "G4", "F4", "E4", "D4", "C4"],
  spq: 60 / 84,
};

export default function TecladoModal({
  aberto, onFechar, alvo = ESCALA, aoTocar, aoConcluir,
}: {
  aberto: boolean; onFechar: () => void; alvo?: AlvoTeclado; aoTocar?: () => void; aoConcluir?: () => void;
}) {
  const [modo, setModo] = useState<"livre" | "junto">("livre");
  const [status, setStatus] = useState("Toque com o dedo, o mouse, ou as teclas A S D F G H J K.");
  const pautaRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const vivosRef = useRef<Record<string, { o: OscillatorNode; g: GainNode }>>({});
  const alvoIdx = useRef(0);

  const ac = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const svgNotas = useCallback(() => Array.from(pautaRef.current?.querySelectorAll(".abcjs-note") ?? []) as HTMLElement[], []);
  const marcar = useCallback(() => {
    const ns = svgNotas();
    ns.forEach((n, i) => {
      n.querySelectorAll<HTMLElement>("*").forEach((x) => (x.style.fill = i < alvoIdx.current ? "#10b981" : i === alvoIdx.current ? "#f59e0b" : ""));
    });
    if (alvoIdx.current >= alvo.seq.length) { setStatus(`🎉 Você tocou a ${alvo.titulo}!`); }
    else { const k = BY_ID[alvo.seq[alvoIdx.current]]; setStatus(`Toque ${k.l} (tecla ${k.pc.toUpperCase()}) — ${alvoIdx.current + 1}/${alvo.seq.length}`); }
  }, [alvo, svgNotas]);

  // desenha a pauta quando entra no modo "junto"
  useEffect(() => {
    if (!aberto || modo !== "junto" || !pautaRef.current) return;
    let vivo = true;
    alvoIdx.current = 0;
    import("abcjs").then((m) => {
      if (!vivo || !pautaRef.current) return;
      const abcjs = (m as unknown as { default?: typeof m }).default ?? m;
      (abcjs as { renderAbc: (el: HTMLElement, s: string, o?: Record<string, unknown>) => unknown }).renderAbc(pautaRef.current, alvo.abc, { responsive: "resize", add_classes: true, paddingtop: 4, paddingbottom: 4 });
      marcar();
    }).catch(() => {});
    return () => { vivo = false; };
  }, [aberto, modo, alvo, marcar]);

  const liga = useCallback((k: Tecla) => {
    if (vivosRef.current[k.id]) return;
    const c = ac();
    const o = c.createOscillator(), g = c.createGain();
    o.type = "triangle"; o.frequency.value = k.f;
    g.gain.setValueAtTime(0, c.currentTime); g.gain.linearRampToValueAtTime(0.26, c.currentTime + 0.015);
    o.connect(g).connect(c.destination); o.start();
    vivosRef.current[k.id] = { o, g };
    aoTocar?.();
    if (modo === "junto" && alvoIdx.current < alvo.seq.length) {
      if (k.id === alvo.seq[alvoIdx.current]) { alvoIdx.current++; marcar(); if (alvoIdx.current >= alvo.seq.length) aoConcluir?.(); }
    }
  }, [ac, modo, alvo, marcar, aoTocar, aoConcluir]);

  const desliga = useCallback((id: string) => {
    const v = vivosRef.current[id];
    if (!v) return;
    delete vivosRef.current[id];
    const c = ctxRef.current!;
    v.g.gain.setTargetAtTime(0, c.currentTime, 0.06); v.o.stop(c.currentTime + 0.3);
  }, []);

  // teclado do PC (só com o modal aberto)
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => { if (e.repeat) return; const k = BY_PC[e.key.toLowerCase()]; if (k) { e.preventDefault(); liga(k); } };
    const onUp = (e: KeyboardEvent) => { const k = BY_PC[e.key.toLowerCase()]; if (k) desliga(k.id); };
    window.addEventListener("keydown", onKey); window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onUp); };
  }, [aberto, liga, desliga]);

  // limpeza ao fechar
  useEffect(() => { if (!aberto) { Object.keys(vivosRef.current).forEach(desliga); } }, [aberto, desliga]);

  if (!aberto) return null;
  const whites = KEYS.filter((k) => k.t === "w");
  const wW = 100 / whites.length;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center" style={{ background: "rgba(30,26,18,.28)", backdropFilter: "blur(6px)" }}
      onPointerDown={(e) => { if (e.target === e.currentTarget) onFechar(); }}>
      <div className="m-3 w-full max-w-[760px] rounded-[26px] p-4 pb-5"
        style={{ background: "rgba(250,247,240,.78)", border: "1px solid rgba(255,255,255,.75)", backdropFilter: "blur(30px) saturate(1.6)", boxShadow: "0 -10px 50px rgba(40,34,20,.3), inset 0 1px 0 rgba(255,255,255,.8)", animation: "tecUp .28s cubic-bezier(.2,.8,.2,1)" }}>
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[18px]">🎹</span>
          <span className="font-semibold text-slate-800" style={{ fontFamily: "Fraunces, Georgia, serif" }}>Teclado</span>
          <div className="ml-3 flex gap-1.5">
            {(["livre", "junto"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setModo(m)}
                className="rounded-full px-3 py-1 text-[12.5px] font-semibold"
                style={modo === m ? { background: "linear-gradient(180deg,rgba(74,166,189,.95),rgba(43,109,126,.95))", color: "#fff" } : { background: "rgba(255,255,255,.6)", color: "#2b2a26", border: "1px solid rgba(255,255,255,.75)" }}>
                {m === "livre" ? "tocar livre" : "🎯 tocar junto"}
              </button>
            ))}
          </div>
          <button type="button" aria-label="Fechar" onClick={onFechar} className="ml-auto grid h-8 w-8 place-items-center rounded-full text-[16px] text-slate-600" style={{ background: "rgba(0,0,0,.06)" }}>✕</button>
        </div>
        <div className="mb-3 min-h-[22px] text-[13.5px] font-semibold text-slate-700">{status}</div>
        {modo === "junto" && <div ref={pautaRef} className="mb-3 overflow-x-auto rounded-xl bg-[#fffdf8] px-2 py-1 text-slate-900" style={{ border: "1px solid rgba(120,110,90,.18)" }} />}
        <div className="relative flex h-[150px] overflow-hidden rounded-b-xl" style={{ boxShadow: "0 8px 24px rgba(0,0,0,.25)" }}
          onPointerDown={(e) => { const t = (e.target as HTMLElement).closest<HTMLElement>("[data-id]"); if (t) { e.preventDefault(); liga(BY_ID[t.dataset.id as NotaId]); } }}
          onPointerUp={(e) => { const t = (e.target as HTMLElement).closest<HTMLElement>("[data-id]"); if (t) desliga(t.dataset.id!); }}
          onPointerLeave={(e) => { const t = (e.target as HTMLElement).closest<HTMLElement>("[data-id]"); if (t) desliga(t.dataset.id!); }}>
          {whites.map((k) => (
            <div key={k.id} data-id={k.id} className="relative flex-1 cursor-pointer rounded-b-[7px] border border-t-0 border-[#c9cfd8]" style={{ background: "linear-gradient(#fff,#eef1f4)" }}>
              <span className="pointer-events-none absolute inset-x-0 bottom-[22px] text-center text-[9px] text-[#9aa6b4]" style={{ fontFamily: "ui-monospace, monospace" }}>{k.pc.toUpperCase()}</span>
              <span className="pointer-events-none absolute inset-x-0 bottom-[7px] text-center text-[11px] font-semibold text-[#6b7580]">{k.l}</span>
            </div>
          ))}
          {KEYS.filter((k) => k.t === "b").map((k) => (
            <div key={k.id} data-id={k.id} className="absolute top-0 h-[60%] cursor-pointer rounded-b-[5px] border border-black" style={{ width: "9%", left: `${wW * (POS_W[DEPOIS[k.id]] + 1) - 4.5}%`, background: "linear-gradient(#2a2f3a,#0d1017)", zIndex: 2 }}>
              <span className="pointer-events-none absolute inset-x-0 bottom-[7px] text-center text-[8px] text-[#9bd]" style={{ fontFamily: "ui-monospace, monospace" }}>{k.pc.toUpperCase()}</span>
            </div>
          ))}
        </div>
        <style>{`@keyframes tecUp { from { transform: translateY(20px) } to { transform: none } }`}</style>
      </div>
    </div>
  );
}
