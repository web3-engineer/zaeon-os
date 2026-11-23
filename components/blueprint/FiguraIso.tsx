"use client";
/**
 * FiguraIso — a MÁQUINA do tema (lib/blueprint/maquina), viva, no padrão do anatomy (wheresryan22/anatomy, MIT):
 * o cartão com "Fig 1" e o título em cima, a dica e a leitura ao vivo embaixo; a legenda (números que selecionam) e a frase
 * do objeto fora do desenho. Passar o mouse numa peça (ou as setas, ou a legenda) DESMONTA aquele conjunto com mola — a
 * vista explodida do Raptor (references/motion.md: mola 64/14.2 com 4 sub-passos, reordenação por profundidade a cada
 * quadro, passeio sozinho quando ninguém mexe, parado fora da tela e com "reduzir movimento").
 * Temas: as variáveis do próprio kit (`.iso`) — tinta ciano no papel azul (blueprint) ou marrom no creme (cartolina, com o
 * traço tremido do filtro #rabisco).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { ISO_CSS, translateAlong } from "@/lib/anatomy/iso-kit";
import { montarMaquina, FORMAS } from "@/lib/blueprint/maquina";
import type { DocBlueprint } from "@/lib/blueprint/tipos";
import { MAO, PAPEL, REDONDA, ROSA, useSkin } from "./skin";

/** os dois temas da prancha, nas variáveis do kit */
export const TEMAS = `
.iso[data-theme="blueprint"]{--anatomy-paper:#0f3a64;--anatomy-face:#15497b;--anatomy-top:#1a548a;--anatomy-shade-0:#0b2d4f;--anatomy-shade-1:#0d3359;--anatomy-shade-2:#103a63;--anatomy-shade-3:#13416f;
  --anatomy-lit-top:#2a7fb8;--anatomy-lit-shade:#1d6497;--anatomy-hi:#e8f6ff;--anatomy-mid:#8cc4e6;--anatomy-lo:#4f86b0;--anatomy-faint:#2d5f8a;--anatomy-lit:#7fe0ff;
  --anatomy-halo:#03101f;--anatomy-halo-opacity:.75;--anatomy-dot:#d6f0ff;--anatomy-red:#ff4d5e;--anatomy-green:#7dffb0;--anatomy-weight:.75px}
.iso[data-theme="cartolina"]{--anatomy-paper:#f7efdd;--anatomy-face:#fffaf0;--anatomy-top:#fbf5e7;--anatomy-shade-0:#ddcfae;--anatomy-shade-1:#e6dabd;--anatomy-shade-2:#eee4cc;--anatomy-shade-3:#f4ecd9;
  --anatomy-lit-top:#ffffff;--anatomy-lit-shade:#efe4c8;--anatomy-hi:#3a2f1e;--anatomy-mid:#7d6644;--anatomy-lo:#ad9670;--anatomy-faint:#d2c19c;--anatomy-lit:#0e7490;
  --anatomy-halo:#8a7350;--anatomy-halo-opacity:.3;--anatomy-dot:#3a2f1e;--anatomy-red:#c0392b;--anatomy-green:#2e7d32;--anatomy-weight:.9px}
.iso[data-theme="barbie"]{--anatomy-paper:#ffe3f1;--anatomy-face:#fff6fb;--anatomy-top:#fffbfd;--anatomy-shade-0:#f6bfdc;--anatomy-shade-1:#f9cde5;--anatomy-shade-2:#fbd9ec;--anatomy-shade-3:#fde6f2;
  --anatomy-lit-top:#ffffff;--anatomy-lit-shade:#ffd1ea;--anatomy-hi:#5b1240;--anatomy-mid:#b0336f;--anatomy-lo:#e48cbd;--anatomy-faint:#f4bfdc;--anatomy-lit:#ff1493;
  --anatomy-halo:#be185d;--anatomy-halo-opacity:.22;--anatomy-dot:#5b1240;--anatomy-red:#e11d48;--anatomy-green:#059669;--anatomy-weight:.85px}
.iso[data-theme="barbie"] .iso-face-text{font-family:${REDONDA.replace(/"/g, "'")}}
.iso[data-theme="cartolina"] .iso-svg{filter:url(#rabisco)}
.iso[data-theme="cartolina"] .iso-face-text{font-family:${MAO.replace(/"/g, "'")}}
/* a seleção (raptor.css): a peça em foco vira o único acento aceso; o resto desce um tom */
.mq-palco[data-focus] .it:not([data-on]):not([data-piece="base"]){--anatomy-hi:var(--anatomy-mid);--anatomy-mid:var(--anatomy-lo)}
.mq-palco[data-focus] .it[data-piece="base"]{--anatomy-mid:var(--anatomy-lo)}
.it[data-on]{--anatomy-hi:var(--anatomy-lit);--anatomy-mid:var(--anatomy-hi)}
.it[data-on] .iso-top,.it[data-on] .tb-shine{fill:var(--anatomy-lit-top)}
.it[data-on] .iso-shade,.it[data-on] .tb-body{fill:var(--anatomy-lit-shade)}
.it[data-on] [data-seamless] > .iso-shade{stroke:var(--anatomy-lit-shade)}
.it[data-on] [data-seamless] > .iso-top{stroke:var(--anatomy-lit-top)}
.it[data-piece]:not([data-piece="base"]){cursor:pointer}
/* peça ainda não construída: sólida (nunca transparente — o anatomy proíbe arame), só um tom abaixo */
[data-estado="futuro"]{--anatomy-hi:var(--anatomy-mid);--anatomy-mid:var(--anatomy-lo);--anatomy-lo:var(--anatomy-faint)}
/* o estado: a lâmpada do pedestal, o líquido do visor, a lente, o LED e a tela */
.mq-lampada-ok path:not(.iso-line){fill:var(--anatomy-green)}
.mq-lampada-trava path:not(.iso-line){fill:var(--anatomy-red)}
.mq-lente-ok path:not(.iso-line){fill:var(--anatomy-lit-top)}
.mq-fluido{stroke-width:1.8}
.mq-tela{fill:var(--anatomy-shade-0);stroke:none}
.mq-varredura{opacity:.55}
.mq-vazio{fill:var(--anatomy-shade-0);stroke:none}
.mq-led-ok{fill:var(--anatomy-green)} .mq-led-trava{fill:var(--anatomy-red)} .mq-led-futuro{fill:var(--anatomy-faint)}
.mq-palco:focus-visible{outline:1px solid var(--anatomy-mid);outline-offset:6px}
/* a FICHA da peça escolhida entra deslizando (e parada, com "reduzir movimento") */
@keyframes mqFicha{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.mq-ficha{animation:mqFicha .26s ease-out}
@media (prefers-reduced-motion: reduce){.mq-ficha{animation:none}}
`;
const COR_ESTADO = {
  ok: { blueprint: "#7dffb0", cartolina: "#2e7d32", barbie: "#059669" }, trava: { blueprint: "#ff4d5e", cartolina: "#c0392b", barbie: "#e11d48" },
  futuro: { blueprint: "rgba(186,230,253,.55)", cartolina: PAPEL.tintaSuave, barbie: ROSA.tintaSuave },
} as const;
/** as cores do cartão e da ficha por skin */
const VISUAL = {
  blueprint: { tinta: "#e8f6ff", suave: "rgba(186,230,253,.72)", borda: "rgba(127,224,255,.28)", aceso: "#7fe0ff", fundoFicha: "rgba(127,224,255,.09)", marca: "rgba(127,224,255,.1)", raio: 3 },
  cartolina: { tinta: PAPEL.tinta, suave: PAPEL.tintaSuave, borda: "rgba(107,90,62,.35)", aceso: "#0e7490", fundoFicha: "rgba(255,255,255,.55)", marca: "rgba(107,90,62,.12)", raio: 6 },
  barbie: { tinta: ROSA.tinta, suave: ROSA.tintaSuave, borda: ROSA.borda, aceso: ROSA.choque, fundoFicha: "rgba(255,255,255,.55)", marca: "rgba(255,255,255,.55)", raio: 22 },
} as const;
const DIZ_ESTADO = { ok: "provada", trava: "travada por um crítico", futuro: "ainda não construída" } as const;
const MOLA = { rigidez: 64, amortecimento: 14.2, subpassos: 4 };

export default function FiguraIso({ doc, alca }: { doc: DocBlueprint; alca?: (e: React.PointerEvent) => void }) {
  const skin = useSkin(), tema = skin;
  const m = useMemo(() => montarMaquina(doc), [doc]);
  const palco = useRef<HTMLDivElement>(null), leitura = useRef<HTMLSpanElement>(null);
  const [sel, setSel] = useState<number | null>(null), [fixa, setFixa] = useState<number | null>(null);
  const escolher = useRef<(i: number | null, porQuem: "pessoa" | "passeio") => void>(() => {});
  /** CLICAR numa peça (no desenho ou na legenda) a FIXA: a ficha fica nela até clicar de novo; o mouse só pré-visualiza */
  const fixar = useRef<(i: number) => void>(() => {});

  useEffect(() => {
    const raiz = palco.current, svg = raiz?.querySelector("svg");
    if (!m || !raiz || !svg) return;
    const itens = [...svg.querySelectorAll<SVGGElement>(".it")];
    const meta = itens.map((el) => ({ el, peca: el.dataset.piece === "base" ? null : Number(el.dataset.piece), k: Number(el.dataset.k), m: el.dataset.m ? (el.dataset.m.split(",").map(Number) as [number, number, number]) : null }));
    const V = m.V, lift = meta.map((it) => (it.m ? it.m[0] * V[0] + it.m[1] * V[1] + it.m[2] * V[2] : 0));
    const molas = m.legenda.map(() => ({ x: 0, v: 0, alvo: 0 }));
    const calmo = matchMedia("(prefers-reduced-motion: reduce)");
    let fixo: number | null = null, foco: number | null = null, quadro = 0, ultimo = 0, visivel = false, passeando = !calmo.matches, relogio = 0, ocioso = 0, passo = -1, ordem = meta.map((_, i) => i);
    const resumo = () => { const ok = m.legenda.filter((l) => l.estado === "ok").length; return `${m.legenda.length} peças · ${ok} provada${ok === 1 ? "" : "s"}`; };
    const diz = () => {
      const qualquerMexendo = molas.some((s) => Math.abs(s.alvo - s.x) > 0.02);
      const l = foco === null ? null : m.legenda[foco];
      const texto = l ? `${String(l.n).padStart(2, "0")} · ${l.nome} · ${qualquerMexendo ? (molas[foco!]!.alvo ? "desmontando" : "montando") : DIZ_ESTADO[l.estado]}` : qualquerMexendo ? "montando" : resumo();
      if (leitura.current && leitura.current.textContent !== texto) leitura.current.textContent = texto;
    };
    const marca = () => {
      for (const it of meta) { if (it.peca !== null && it.peca === foco) it.el.setAttribute("data-on", ""); else it.el.removeAttribute("data-on"); }
      if (foco === null) raiz.removeAttribute("data-focus"); else raiz.setAttribute("data-focus", "");
      raiz.setAttribute("aria-valuetext", foco === null ? resumo() : `${m.legenda[foco]!.nome}: ${DIZ_ESTADO[m.legenda[foco]!.estado]}`);
    };
    const coloca = () => {
      meta.forEach((it, i) => {
        if (!it.m || it.peca === null) return;
        const x = molas[it.peca]!.x;
        if (Math.abs(x) < 1e-4) it.el.removeAttribute("transform");
        else it.el.setAttribute("transform", translateAlong(m.P, [it.m[0] * x, it.m[1] * x, it.m[2] * x]));
        void i;
      });
      // reordena pela profundidade de agora (motion.md: "Depth re-sorting of moving parts"), só quando a ordem mudou
      const chave = (i: number) => meta[i]!.k + lift[i]! * (meta[i]!.peca === null ? 0 : molas[meta[i]!.peca!]!.x);
      const nova = meta.map((_, i) => i).sort((a, b) => chave(a) - chave(b));
      if (nova.some((v, i) => v !== ordem[i])) {
        const frag = document.createDocumentFragment();
        for (const i of nova) frag.appendChild(meta[i]!.el);
        svg.appendChild(frag);
        ordem = nova;
      }
    };
    const tick = (agora: number) => {
      const dt = ultimo ? Math.min((agora - ultimo) / 1000, 1 / 30) : 1 / 60;
      ultimo = agora;
      if (passeando) {
        relogio += dt;
        const p = Math.floor(relogio / 2.6) % (m.legenda.length + 1);
        if (relogio > 1.4 && p !== passo) { passo = p; escolher.current(p < m.legenda.length ? p : null, "passeio"); }
      }
      let mexendo = false;
      for (const s of molas) {
        if (calmo.matches) { s.x = s.alvo; s.v = 0; continue; }
        for (let j = 0; j < MOLA.subpassos; j++) {
          const h = dt / MOLA.subpassos;
          s.v += ((s.alvo - s.x) * MOLA.rigidez - s.v * MOLA.amortecimento) * h;
          s.x += s.v * h;
        }
        if (Math.abs(s.alvo - s.x) < 5e-4 && Math.abs(s.v) < 5e-4) { s.x = s.alvo; s.v = 0; } else mexendo = true;
      }
      coloca(); diz();
      quadro = visivel && (mexendo || passeando) ? requestAnimationFrame(tick) : 0;
    };
    const roda = () => { if (!quadro && visivel) { ultimo = 0; quadro = requestAnimationFrame(tick); } };
    escolher.current = (i, porQuem) => {
      if (porQuem === "pessoa") {
        passeando = false; clearTimeout(ocioso);
        ocioso = window.setTimeout(() => { if (fixo !== null) return; passeando = !calmo.matches; relogio = 1.4; passo = -1; roda(); }, 3600);
      }
      if (i === foco) return;
      foco = i;
      molas.forEach((s, j) => (s.alvo = j === i ? 1 : 0));
      marca(); setSel(i); roda();
    };
    const pecaDe = (ev: Event) => { const p = ((ev.target as Element).closest?.(".it") as SVGGElement | null)?.dataset.piece; return p && p !== "base" ? Number(p) : null; };
    const sobre = (ev: PointerEvent) => { const p = pecaDe(ev); escolher.current(p ?? fixo, "pessoa"); };
    const sai = () => escolher.current(fixo, "pessoa");
    fixar.current = (i) => { fixo = fixo === i ? null : i; setFixa(fixo); escolher.current(i, "pessoa"); };
    const clique = (ev: MouseEvent) => { const p = pecaDe(ev); if (p !== null) fixar.current(p); };
    const tecla = (ev: KeyboardEvent) => {
      const n = m.legenda.length;
      const para = ev.key === "ArrowRight" || ev.key === "ArrowDown" ? ((foco ?? -1) + 1) % n : ev.key === "ArrowLeft" || ev.key === "ArrowUp" ? ((foco ?? n) - 1 + n) % n : ev.key === "Home" ? 0 : ev.key === "End" ? n - 1 : ev.key === "Escape" ? null : undefined;
      if (para === undefined) return;
      ev.preventDefault(); ev.stopPropagation(); escolher.current(para, "pessoa");
    };
    svg.addEventListener("pointermove", sobre);
    svg.addEventListener("pointerleave", sai);
    svg.addEventListener("click", clique);
    raiz.addEventListener("keydown", tecla);
    const io = new IntersectionObserver((es) => { visivel = es[es.length - 1]!.isIntersecting; if (visivel) roda(); }, { rootMargin: "120px 0px" });
    io.observe(raiz);
    marca(); diz();
    return () => { io.disconnect(); cancelAnimationFrame(quadro); clearTimeout(ocioso); svg.removeEventListener("pointermove", sobre); svg.removeEventListener("pointerleave", sai); svg.removeEventListener("click", clique); raiz.removeEventListener("keydown", tecla); };
  }, [m]);

  if (!m) return null;
  const v = VISUAL[tema], { tinta, suave, borda } = v, l = sel === null ? null : m.legenda[sel] ?? null;
  const corDe = (e: keyof typeof COR_ESTADO) => COR_ESTADO[e][tema];
  const mix = (c: string, pct: number) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;
  return (
    <div className="iso" data-theme={tema}>
      <style>{ISO_CSS + TEMAS}</style>
      {/* o CARTÃO do anatomy: Fig 1 / título em cima, dica / leitura ao vivo embaixo; nada de texto dentro do desenho */}
      <div className="relative border px-4 pb-3 pt-3" style={{ borderColor: borda, borderRadius: v.raio, ...(tema === "barbie" ? { background: "rgba(255,255,255,.28)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" } : {}) }}>
        <div className={`flex items-baseline justify-between font-mono text-[11px] tracking-[0.18em] ${alca ? "cursor-grab active:cursor-grabbing" : ""}`} style={{ color: suave }} onPointerDown={alca}>
          <span>FIG 1</span><span className="max-w-[70%] truncate text-right uppercase">{doc.titulo}</span>
        </div>
        <div ref={palco} className="mq-palco outline-none" tabIndex={0} role="slider" aria-valuemin={0} aria-valuemax={m.legenda.length} aria-valuenow={sel === null ? 0 : sel + 1}
          aria-label="A máquina do estudo: setas escolhem a peça, Esc solta">
          <svg className="iso-svg" viewBox={`0 0 ${m.largura} ${m.altura}`} role="img" aria-label={`A máquina do tema: ${m.legenda.map((l) => `${l.codigo} ${l.nome}`).join(", ")}`}
            style={{ width: "100%", height: "auto", maxHeight: 560 }} dangerouslySetInnerHTML={{ __html: m.svg }} />
        </div>
        <div className="flex items-baseline justify-between gap-4 font-mono text-[11px] tracking-[0.14em]" style={{ color: suave }}>
          {/* #870: no celular não tem mouse — o texto de toque aparece em tela de toque (hover: none) */}
          <span className="uppercase [@media(hover:none)]:hidden">passe o mouse pra desmontar · clique pra fixar</span>
          <span className="uppercase hidden [@media(hover:none)]:inline">toque numa peça pra destacar · toque de novo pra soltar</span>
          <span ref={leitura} className="truncate text-right" style={{ color: tinta }} aria-live="off" />
        </div>
      </div>
      {/* a FICHA da peça escolhida: grande e destacada, com a cor do estado — o que é, pra que serve, a fase e o que trava */}
      <div className="mx-auto mt-3 max-w-[900px]" aria-live="polite">
        {l ? (
          <div key={sel} className="mq-ficha relative overflow-hidden px-5 py-4" style={{
            borderRadius: v.raio + 4, background: v.fundoFicha, border: `1.5px solid ${corDe(l.estado)}`, color: tinta,
            boxShadow: `0 0 0 4px ${mix(corDe(l.estado), 13)}, 0 0 32px ${mix(corDe(l.estado), 25)}`, ...(tema === "barbie" ? { backdropFilter: "blur(16px) saturate(160%)", WebkitBackdropFilter: "blur(16px) saturate(160%)" } : {}),
          }}>
            <span aria-hidden className="absolute inset-y-0 left-0 w-1.5" style={{ background: corDe(l.estado) }} />
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 flex-none place-items-center rounded-full font-mono text-[18px] font-bold" style={{ background: corDe(l.estado), color: tema === "blueprint" ? "#05162a" : "#fff" }}>{String(l.n).padStart(2, "0")}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h4 className="text-[20px] font-bold leading-tight">{l.nome}</h4>
                  <span className="rounded-full px-2.5 py-0.5 text-[12px] font-semibold" style={{ background: `${mix(corDe(l.estado), 15)}`, color: corDe(l.estado) }}>{DIZ_ESTADO[l.estado]}</span>
                  <span className="rounded-full px-2.5 py-0.5 text-[12px]" style={{ background: v.marca, color: suave }}>fase {l.fase}</span>
                  <span className="ml-auto text-[11.5px]" style={{ color: suave }}>{fixa === sel ? "📌 fixada · clique de novo pra soltar" : "clique pra fixar"}</span>
                </div>
                {l.sub && <p className="mt-1.5 text-[16px] leading-snug">{l.sub}</p>}
                <p className="mt-1.5 text-[13.5px]" style={{ color: suave }}>na máquina: <b style={{ color: tinta }}>{FORMAS[l.forma].split(":")[0]}</b> — {FORMAS[l.forma].split(":")[1]?.trim()}</p>
                {l.critico && (
                  <div className="mt-2.5 px-3 py-2 text-[13.5px]" style={{ borderRadius: v.raio, background: `${mix(corDe(l.critico.aberto ? "trava" : "ok"), 12)}`, borderLeft: `3px solid ${corDe(l.critico.aberto ? "trava" : "ok")}` }}>
                    <b style={{ color: corDe(l.critico.aberto ? "trava" : "ok") }}>{l.critico.aberto ? "o que trava: " : "provado: "}</b>{l.critico.titulo}
                    <span style={{ color: suave }}> — prova: {l.critico.prova}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="px-5 py-4 text-center text-[14px]" style={{ borderRadius: v.raio + 4, border: `1px dashed ${borda}`, color: suave }}>
            Passe o mouse ou clique numa peça da máquina (ou num número abaixo) pra ver o que ela é.
          </div>
        )}
      </div>
      {doc.objeto && <p className="mx-auto mt-2 max-w-[680px] text-center text-[14px] italic" style={{ color: suave }}>{doc.objeto}</p>}
      {/* a LEGENDA: números que selecionam, como passar o mouse (references/craft.md §9) */}
      <ol className="mx-auto mt-2 grid max-w-[760px] grid-cols-1 gap-x-6 gap-y-0.5 sm:grid-cols-2">
        {m.legenda.map((it, i) => (
          <li key={it.n}>
            <button type="button" onMouseEnter={() => escolher.current(i, "pessoa")} onFocus={() => escolher.current(i, "pessoa")} onClick={() => fixar.current(i)} aria-pressed={fixa === i}
              className="flex w-full items-baseline gap-2 rounded-sm px-1 py-0.5 text-left text-[13px] leading-snug transition" title={FORMAS[it.forma]}
              style={{ color: tinta, background: sel === i ? v.marca : undefined }}>
              <span className="font-mono text-[12px] font-bold" style={{ color: corDe(it.estado) }}>{String(it.n).padStart(2, "0")}</span>
              <span><b>{it.nome}</b>{it.estado === "ok" ? " ✓" : it.estado === "trava" ? " ✕" : ""}{fixa === i ? " 📌" : ""}{it.sub ? <span style={{ color: suave }}> — {it.sub}</span> : null}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

