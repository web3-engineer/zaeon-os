"use client";
/**
 * VitrineEstudos — a VITRINE de blueprints em "Estudos" (lib/estudos/vitrine): todo conhecimento pode ser vendido, em
 * frações, em ZAEON stable — e no cyberespaço os estudos são itens de COLECIONADOR. Cada card tem o DESENHO 3D do tema
 * girando (components/estudos/modelos3d), a moldura acesa na cor da raridade com o brilho holográfico, os selos da
 * validação, as frações vendidas e o preço. Os 3D saem de UM canvas WebGL só, por cima da grade, que desenha cada modelo
 * só na área dele (scissor) — sem um contexto por card. O catálogo é simulado e a ZAEON stable ainda não está no ar:
 * comprar é "em breve".
 */
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { CATALOGO, FILTROS, MOEDA, NOME_TIPO, filtrarVitrine, precoTexto, vendido, type FiltroVitrine, type ItemVitrine } from "@/lib/estudos/vitrine";
import { COR_RARIDADE, NOME_RARIDADE } from "@/lib/estudos/blueprint";
import type { ItemEstudo } from "@/lib/estudos/itens";
import { criarModelo } from "./modelos3d";
import { plugar, desplugar, usePluginsChat } from "@/lib/plugins/chatPlugins";
import { ehAgenteOrquestra } from "@/lib/orquestra/catalogo";

const hex = (c: string) => parseInt(c.slice(1), 16);

/** os BLUEPRINTS da pessoa (lib/blueprint/itens) como itens raros — vêm de /api/estudos/itens (cardId "blueprint") */
function SeusBlueprints() {
  const [meus, setMeus] = useState<ItemEstudo[]>([]);
  useEffect(() => {
    let vivo = true;
    fetch("/api/estudos/itens", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((j: { itens?: ItemEstudo[] } | null) => {
      if (vivo) setMeus((j?.itens ?? []).filter((i) => i.cardId === "blueprint"));
    }).catch(() => null);
    return () => { vivo = false; };
  }, []);
  if (!meus.length) return null;
  return (
    <div className="mt-5">
      <div className="font-mono text-[10px] tracking-[0.3em] text-sky-300/80">SEUS BLUEPRINTS · ITENS RAROS</div>
      <div className="mt-2 flex gap-3 overflow-x-auto pb-1">
        {meus.map((it) => {
          const cor = COR_RARIDADE[it.raridade];
          return (
            <div key={it.id} className="min-w-[220px] flex-none rounded-md border px-3 py-2" style={{ borderColor: cor, boxShadow: `0 0 18px ${cor}33`, background: "rgba(8,30,56,.8)" }}>
              <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.14em]" style={{ color: cor }}><span>{NOME_RARIDADE[it.raridade].toUpperCase()}</span><span>nível {it.nivel}</span></div>
              <div className="mt-1 truncate font-mono text-[13px] font-semibold text-white">{it.titulo}</div>
              <div className="mt-1 font-mono text-[10.5px] text-sky-200/70">{it.componentes} peças · {it.fontes} fontes{it.vendavel ? <span className="ml-1 text-emerald-300">· VENDÁVEL</span> : null}</div>
              {it.proxima && <div className="mt-1 font-mono text-[10px] text-sky-200/50">faltam {it.proxima.faltam} pra {NOME_RARIDADE[it.proxima.raridade]}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function VitrineEstudos() {
  const [filtro, setFiltro] = useState<FiltroVitrine>("todos"), [busca, setBusca] = useState(""), [aberto, setAberto] = useState<ItemVitrine | null>(null);
  const plugados = usePluginsChat();
  // o ESTADO dos agentes da orquestra pra este aluno (liberado / exige plano / em breve) — lib/orquestra/loja
  const [estadoOrq, setEstadoOrq] = useState<Record<string, { estado: string; aviso: string | null }>>({});
  useEffect(() => {
    let vivo = true;
    fetch("/api/orquestra/agentes", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!vivo || !Array.isArray(d?.agentes)) return;
      setEstadoOrq(Object.fromEntries(d.agentes.map((a: { id: string; estado: string; aviso: string | null }) => [a.id, { estado: a.estado, aviso: a.aviso }])));
    }).catch(() => undefined);
    return () => { vivo = false; };
  }, []);
  const itens = useMemo(() => filtrarVitrine(CATALOGO, filtro, busca), [filtro, busca]);
  const moldura = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null), slots = useRef(new Map<string, HTMLDivElement>());

  // ── o canvas único dos 3D (scissor por card) ──
  useEffect(() => {
    const cv = canvas.current, mol = moldura.current; if (!cv || !mol) return;
    let R: THREE.WebGLRenderer;
    try { R = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true }); } catch { return; }   // (sem WebGL: os cards ficam sem o 3D)
    R.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); R.setClearColor(0x000000, 0); R.setScissorTest(true);
    const cenas = new Map<string, { cena: THREE.Scene; cam: THREE.PerspectiveCamera; modelo: ReturnType<typeof criarModelo> }>();
    for (const it of CATALOGO) {
      const cena = new THREE.Scene(), cam = new THREE.PerspectiveCamera(35, 1, 0.1, 50), modelo = criarModelo(it.modelo, hex(COR_RARIDADE[it.raridade]));
      cam.position.set(2.6, 1.6, 3.4); cam.lookAt(0, -0.1, 0); cena.add(modelo.group); cenas.set(it.id, { cena, cam, modelo });
    }
    let raf = 0, ultimo = 0; const t0 = performance.now(), reduz = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const quadro = (agora: number) => {
      raf = requestAnimationFrame(quadro);
      if (document.visibilityState !== "visible" || agora - ultimo < 33) return; ultimo = agora;   // (~30 fps basta)
      const caixa = mol.getBoundingClientRect(), w = Math.round(caixa.width), h = Math.round(caixa.height);
      if (cv.width !== Math.round(w * R.getPixelRatio()) || cv.height !== Math.round(h * R.getPixelRatio())) R.setSize(w, h, false);
      R.setScissor(0, 0, w, h); R.clear();
      const t = (agora - t0) / 1000;
      for (const [id, el] of slots.current) {
        const c = cenas.get(id); if (!c) continue;
        const r = el.getBoundingClientRect(), x = r.left - caixa.left, y = r.top - caixa.top;
        if (y + r.height < 0 || y > h || x + r.width < 0 || x > w) continue;
        const yb = h - y - r.height;
        R.setViewport(x, yb, r.width, r.height); R.setScissor(x, yb, r.width, r.height);
        c.cam.aspect = r.width / Math.max(1, r.height); c.cam.updateProjectionMatrix();
        c.modelo.group.rotation.y = reduz ? 0.6 : t * 0.45 + id.length; c.modelo.group.position.y = reduz ? 0 : Math.sin(t * 1.2 + id.length) * 0.05;
        R.render(c.cena, c.cam);
      }
    };
    raf = requestAnimationFrame(quadro);
    return () => { cancelAnimationFrame(raf); for (const c of cenas.values()) c.modelo.dispose(); R.dispose(); };
  }, []);

  return (
    <div ref={moldura} className="relative h-full w-full overflow-hidden" style={{ background: "radial-gradient(ellipse at 50% 0%, #0f3460 0%, #071a33 55%, #030c1a 100%)" }}>
      <div className="absolute inset-0 overflow-y-auto">
        <div className="mx-auto max-w-[1280px] px-4 pb-16 pt-6 md:px-8">
          <div className="font-mono text-[10px] tracking-[0.3em] text-sky-300/80">VITRINE · BLUEPRINTS</div>
          <h2 className="mt-1 font-display text-[26px] font-bold text-white md:text-[34px]">Todo conhecimento pode ser vendido.</h2>
          <p className="mt-1 max-w-3xl text-[14px] leading-relaxed text-sky-100/75">
            Cursos, códigos, trabalhos nunca publicados, negócios, plantações, prédios — blueprints de ponta a ponta, validados e vendidos em <b>frações</b>.
            Faça você mesmo (DYOM) ou pague um agente de IA pra fazer. Os que vêm de criadores open source e da comunidade são <b>grátis</b>.
          </p>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 font-mono text-[10.5px] text-amber-100/90">
            ◎ preços em {MOEDA.nome} — catálogo de exemplo; a moeda ainda não está no ar
          </div>

          <SeusBlueprints />

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {FILTROS.map((f) => (
              <button key={f.id} type="button" onClick={() => setFiltro(f.id)} className={`rounded-full border px-3 py-1.5 font-mono text-[11px] tracking-wide transition ${filtro === f.id ? "border-sky-300 bg-sky-300/15 text-white" : "border-sky-300/25 text-sky-100/70 hover:text-white"}`}>{f.nome}</button>
            ))}
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="buscar blueprint…" className="ml-auto min-w-[200px] rounded-full border border-sky-300/25 bg-sky-950/40 px-3 py-1.5 font-mono text-[12px] text-sky-50 outline-none placeholder:text-sky-200/40" />
          </div>

          <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-5">
            {itens.map((it) => {
              const cor = COR_RARIDADE[it.raridade], pct = Math.round(vendido(it) * 100);
              return (
                <article key={it.id} className="group relative flex flex-col overflow-hidden rounded-xl" style={{ border: `1.5px solid ${cor}`, background: "linear-gradient(180deg, rgba(10,38,70,.92), rgba(4,14,30,.96))", boxShadow: `0 0 ${it.raridade === "lendaria" ? 34 : it.raridade === "epica" ? 24 : 14}px ${cor}44` }}>
                  {/* o brilho holográfico (passa ao passar o mouse) */}
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: `linear-gradient(115deg, transparent 30%, ${cor}22 45%, rgba(255,255,255,.12) 50%, ${cor}22 55%, transparent 70%)` }} />
                  <div className="flex items-center justify-between px-3 pt-3 font-mono text-[10px] tracking-[0.18em]">
                    <span style={{ color: cor }}>{NOME_RARIDADE[it.raridade].toUpperCase()}</span>
                    <span className="text-sky-200/70">{NOME_TIPO[it.tipo].toUpperCase()}</span>
                  </div>
                  {/* o 3D do tema (desenhado pelo canvas único, por cima) */}
                  <div ref={(el) => { if (el) slots.current.set(it.id, el); else slots.current.delete(it.id); }} className="relative mx-3 mt-2 h-[150px] rounded-md" style={{ backgroundImage: "linear-gradient(rgba(150,205,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(150,205,255,.07) 1px, transparent 1px)", backgroundSize: "16px 16px", border: "1px solid rgba(127,224,255,.15)" }}>
                    {it.preco === 0 && <span className="absolute left-2 top-2 rounded-sm bg-emerald-400 px-1.5 py-0.5 font-mono text-[9.5px] font-black tracking-[0.15em] text-slate-950">GRÁTIS</span>}
                    {it.plugavel && <span className="absolute right-2 top-2 rounded-sm border border-cyan-300/60 bg-cyan-300/10 px-1.5 py-0.5 font-mono text-[9.5px] font-black tracking-[0.12em] text-cyan-100">{plugados.includes(it.plugavel) ? "✓ NOS SEUS AGENTES" : "⬡ AGENTE COM IDE"}</span>}
                    {it.ironia && <span className="absolute right-2 top-2 rounded-sm border border-pink-300/50 px-1.5 py-0.5 font-mono text-[9.5px] tracking-[0.1em] text-pink-200">IRONIA</span>}
                  </div>
                  <div className="flex flex-1 flex-col px-3 pb-3 pt-2.5">
                    <h3 className="font-display text-[16px] font-bold leading-tight text-white">{it.titulo}</h3>
                    <p className="mt-1 text-[12.5px] leading-snug text-sky-100/70">{it.subtitulo}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5 font-mono text-[9.5px] tracking-wide">
                      <span className="rounded-sm border border-sky-300/30 px-1.5 py-0.5 text-sky-100/80">{it.execucao === "dyom" ? "FAÇA VOCÊ MESMO" : "UM AGENTE FAZ"}</span>
                      {it.selos.supervisionado && <span className="rounded-sm border border-emerald-300/40 px-1.5 py-0.5 text-emerald-200">✓ SUPERVISIONADO</span>}
                      {it.selos.linksOk && <span className="rounded-sm border border-emerald-300/30 px-1.5 py-0.5 text-emerald-200/80">✓ LINKS</span>}
                      {it.selos.codigoPrivado && <span className="rounded-sm border border-violet-300/40 px-1.5 py-0.5 text-violet-200">🔒 CÓDIGO PRIVADO</span>}
                    </div>
                    <div className="mt-2.5 font-mono text-[10px] text-sky-200/60">por {it.autor} · profundidade {it.profundidade}</div>
                    {it.fracoes.total > 1 && (
                      <div className="mt-2">
                        <div className="flex justify-between font-mono text-[10px] text-sky-200/70"><span>{it.fracoes.vendidas.toLocaleString("pt-BR")} / {it.fracoes.total.toLocaleString("pt-BR")} frações</span><span>{pct}%</span></div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sky-950/70"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${cor}, #7dffb0)` }} /></div>
                      </div>
                    )}
                    <div className="mt-auto flex items-end justify-between pt-3">
                      <div><div className="font-display text-[20px] font-bold" style={{ color: it.preco ? cor : "#7dffb0" }}>{it.plugavel && ehAgenteOrquestra(it.plugavel) ? "no plano Pro" : precoTexto(it.preco)}</div>{it.preco > 0 && <div className="font-mono text-[9.5px] text-sky-200/50">por fração</div>}</div>
                      <button type="button" onClick={() => setAberto(it)} className="rounded-full border px-3 py-1.5 font-mono text-[11px] text-white transition hover:bg-white/10" style={{ borderColor: `${cor}99` }}>ver blueprint →</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {!itens.length && <p className="mt-10 text-center font-mono text-[12px] text-sky-200/60">nenhum blueprint com esse filtro</p>}
        </div>
      </div>
      <canvas ref={canvas} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />

      {aberto && (
        <div role="dialog" aria-modal="true" aria-label={aberto.titulo} className="absolute inset-0 z-20 flex items-center justify-center bg-[#020b18]/80 p-4 backdrop-blur-sm" onClick={() => setAberto(null)}>
          <div className="w-full max-w-lg rounded-md p-5" style={{ border: `1.5px solid ${COR_RARIDADE[aberto.raridade]}`, background: "#0b2c4d" }} onClick={(e) => e.stopPropagation()}>
            <div className="font-mono text-[10px] tracking-[0.3em]" style={{ color: COR_RARIDADE[aberto.raridade] }}>BLUEPRINT · {NOME_RARIDADE[aberto.raridade].toUpperCase()}</div>
            <h3 className="mt-1 font-display text-[22px] font-bold text-white">{aberto.titulo}</h3>
            <p className="mt-1 text-[13px] text-sky-100/75">{aberto.subtitulo}</p>
            <div className="mt-4 font-mono text-[10.5px] tracking-[0.2em] text-sky-300/90">O QUE VEM</div>
            <ul className="mt-1.5 space-y-1 text-[13px] text-sky-50/90">{aberto.entrega.map((e) => <li key={e}>▸ {e}</li>)}</ul>
            <div className="mt-4 flex flex-wrap gap-1.5 font-mono text-[10px] text-sky-200/70">{aberto.tags.map((t) => <span key={t} className="rounded-sm border border-sky-300/25 px-1.5 py-0.5">#{t}</span>)}</div>
            <div className="mt-5 flex items-center justify-between gap-3">
              <div className="font-display text-[22px] font-bold" style={{ color: COR_RARIDADE[aberto.raridade] }}>{aberto.plugavel && ehAgenteOrquestra(aberto.plugavel) ? "no plano Pro" : precoTexto(aberto.preco)}</div>
              {aberto.plugavel && ehAgenteOrquestra(aberto.plugavel) && estadoOrq[aberto.plugavel]?.estado !== "liberado" && !plugados.includes(aberto.plugavel) ? (
                <div role="status" className="max-w-[60%] rounded-full border border-white/20 bg-white/5 px-4 py-2 text-center font-mono text-[11px] font-bold text-sky-100/80">
                  {estadoOrq[aberto.plugavel]?.estado === "exige_plano" ? "🔒 " : "⏳ "}{estadoOrq[aberto.plugavel]?.aviso ?? "verificando…"}
                </div>
              ) : aberto.plugavel ? (
                plugados.includes(aberto.plugavel) ? (
                  <button type="button" onClick={() => desplugar(aberto.plugavel!)} className="rounded-full border border-emerald-300/60 bg-emerald-300/10 px-4 py-2 font-mono text-[12px] font-black text-emerald-100 hover:bg-emerald-300/20">✓ nos seus agentes · remover</button>
                ) : (
                  <button type="button" onClick={() => plugar(aberto.plugavel!)} className="rounded-full bg-gradient-to-b from-cyan-200 to-cyan-400 px-4 py-2 font-mono text-[12px] font-black text-slate-950 hover:brightness-110">⬡ adicionar aos meus agentes</button>
                )
              ) : (
                <button type="button" disabled title={`A ${MOEDA.nome} ainda não está no ar`} className="rounded-full bg-gradient-to-b from-amber-200 to-amber-400 px-4 py-2 font-mono text-[12px] font-black text-slate-950 disabled:opacity-50">{aberto.preco ? "comprar fração — em breve" : "pegar grátis — em breve"}</button>
              )}
            </div>
            <p className="mt-2 text-right font-mono text-[10px] text-sky-200/50">{aberto.plugavel ? `${ehAgenteOrquestra(aberto.plugavel) ? "incluso no plano" : "grátis"} · depois, clique no rosto do agente na sidebar e escolha ${aberto.titulo}` : `catálogo de exemplo · a ${MOEDA.nome} ainda não está no ar`}</p>
          </div>
        </div>
      )}
    </div>
  );
}
