"use client";

/**
 * ArvoreNeuronal — a árvore de conhecimento/curso como TECIDO NEURONAL, orientada a dados.
 *
 * Recebe um grafo (NoArvore: id, título, tipo, filhos) + o conjunto de lições concluídas e desenha:
 *   - a RAIZ no centro (r=21, gradiente branco→dourado→rosa→violeta, brilho com batimento de 3,15 s,
 *     sem anel nenhum);
 *   - cada aresta pai→filho como AXÔNIO afilado e preenchido (1–3 fibras, colaterais com botão
 *     sináptico, arborização terminal), na energia (desafio 1..5) do filho, sem traço tracejado;
 *   - o SINAL (bolhas de luz) nascendo na raiz e descendo em cascata;
 *   - nós concluídos em azul, pendentes em violeta; anel contínuo de progresso nos nós com descendentes.
 *
 * O fluxo de lições (pré-ordem; "concluir ✓", "próxima lição ▸", "começar a jornada ▸") e o painel de
 * progresso vivem aqui; a PERSISTÊNCIA é de quem usa (props concluidas/onConcluir/onReiniciar).
 * A lógica é pura em lib/knowledge-tree/*; este arquivo só pinta. Ver docs/ARVORE_NEURONAL.md.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  caminhoAte, contagemDentro, expandirCaminho, filhosDe, frac, indexar, licaoParaContinuar,
  nosVisiveis, proximaDe, resumoProgresso, visaoGeral,
} from "@/lib/knowledge-tree/progresso";
import { energias } from "@/lib/knowledge-tree/energia";
import { corEnergia, corNucleo } from "@/lib/knowledge-tree/cores";
import { caixaDe, crepita, dendritos, geometriaAresta, layoutRadial, type PosNo } from "@/lib/knowledge-tree/geometria";
import { beginPulso, duracaoPulso, inicio, quantidadePulsos } from "@/lib/knowledge-tree/pulsos";
import type { NoArvore } from "@/lib/knowledge-tree/tipos";

export const TEXTOS_ARVORE = {
  voltar: "‹ voltar à árvore",
  concluir: "concluir ✓",
  proxima: "próxima lição ▸",
  comecarJornada: "começar a jornada ▸",
  comecar: "começar ▸",
  continuar: "continuar ▸",
  visaoGeral: "visão geral",
  reiniciar: "reiniciar progresso",
  confirmarReinicio: "clique de novo para reiniciar",
  concluida: "✓ concluída",
  dentro: "dentro",
  licoes: "lições",
  completa: "Árvore completa: todas as lições concluídas.",
  dentroDesta: "Dentro desta lição",
  licaoDe: (i: number, n: number) => `lição ${i} de ${n}`,
  desafio: (e: number) => `desafio ${e}/5`,
  fechar: "fechar",
  progresso: "Progresso do curso",
};

export type ArvoreNeuronalProps = {
  arvore: NoArvore;
  concluidas: ReadonlySet<string> | readonly string[];
  onConcluir: (ids: string[]) => void;
  onReiniciar: () => void;
  /** o miolo da lição (texto, exercícios). */
  renderLicao?: (no: NoArvore) => ReactNode;
  /** painel ao lado da lição (ex.: editor da prática). */
  renderLado?: (no: NoArvore) => ReactNode;
  titulo?: string;
  subtitulo?: string;
  onFechar?: () => void;
  onLicaoAberta?: (id: string | null) => void;
  /** quanto a árvore fica à mostra antes de abrir a próxima lição (ms). */
  atrasoProximaMs?: number;
  /** força o modo simplificado (celular): menos fibras/pulsos, sem dendritos. */
  simples?: boolean;
  /** força sem animação (senão segue prefers-reduced-motion). */
  semMovimento?: boolean;
};

const R_RAIZ = 21;
const raioNo = (prof: number, temFilhos: boolean) => (prof === 0 ? R_RAIZ : prof === 1 ? 11 : temFilhos ? 9 : 7);
const cortar = (s: string, n: number) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "");
const AR_PADRAO = 1200 / 820;
type Caixa = { x: number; y: number; w: number; h: number };

/** arco contínuo (sem tracejado) de 0 até `f` da volta, começando no topo. */
function arco(cx: number, cy: number, r: number, f: number): string {
  const a = Math.min(0.9999, Math.max(0, f)) * Math.PI * 2;
  const x0 = cx, y0 = cy - r;
  const x1 = cx + r * Math.sin(a), y1 = cy - r * Math.cos(a);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${a > Math.PI ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

export default function ArvoreNeuronal(props: ArvoreNeuronalProps) {
  const { arvore, onConcluir, onReiniciar, renderLicao, renderLado, titulo, subtitulo, onFechar, onLicaoAberta } = props;
  const atraso = props.atrasoProximaMs ?? 1300;
  const T = TEXTOS_ARVORE;
  const idx = useMemo(() => indexar(arvore), [arvore]);
  const ener = useMemo(() => energias(idx), [idx]);
  const concluidas = useMemo(() => new Set(props.concluidas), [props.concluidas]);
  const raiz = idx.raiz.id;

  const [expandidos, setExpandidos] = useState<Set<string>>(() => expandirCaminho(idx, licaoParaContinuar(idx, concluidas) ?? raiz));
  const [licao, setLicao] = useState<string | null>(null);
  const [foco, setFoco] = useState<string | null>(null);
  const [completa, setCompleta] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [reduzido, setReduzido] = useState(!!props.semMovimento);
  const [estreito, setEstreito] = useState(false);
  const [relogio, setRelogio] = useState<number | null>(null);
  const [epoca, setEpoca] = useState(0);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tituloLicaoRef = useRef<HTMLHeadingElement | null>(null);
  const vb = useRef<Caixa>({ x: -600, y: -410, w: 1200, h: 820 });
  const tween = useRef<{ a: Caixa; b: Caixa; t0: number; dur: number } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const ultimoNo = useRef<string | null>(null);

  // árvore nova (outro curso) → recomeça o estado de navegação
  useEffect(() => {
    setExpandidos(expandirCaminho(idx, licaoParaContinuar(idx, concluidas) ?? raiz));
    setLicao(null); setFoco(null); setCompleta(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);
  useEffect(() => { onLicaoAberta?.(licao); }, [licao, onLicaoAberta]);

  // prefers-reduced-motion + largura (celular = simplificado)
  useEffect(() => {
    if (props.semMovimento) { setReduzido(true); return; }
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduzido(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, [props.semMovimento]);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setEstreito(el.getBoundingClientRect().width < 560));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const simples = props.simples ?? estreito;

  const visiveis = useMemo(() => nosVisiveis(idx, expandidos), [idx, expandidos]);
  const pos = useMemo(() => layoutRadial(idx, visiveis, { raio: simples ? 140 : 170, separacao: simples ? 52 : 66 }), [idx, visiveis, simples]);
  const muitos = visiveis.length > 40;
  const proximo = useMemo(() => licaoParaContinuar(idx, concluidas), [idx, concluidas]);
  const resumo = resumoProgresso(idx, concluidas);

  // o relógio do SVG no momento em que a cena (re)nasce: os pulsos começam a contar daqui
  useEffect(() => {
    const s = svgRef.current as (SVGSVGElement & { getCurrentTime?: () => number }) | null;
    setRelogio(s && typeof s.getCurrentTime === "function" ? s.getCurrentTime() : 0);
  }, [visiveis, epoca]);

  /** o rótulo de um nó: texto, lado (−1 esq · 0 embaixo/em cima · 1 dir) e largura estimada. No celular, sempre
   *  embaixo do nó e curto, pra a árvore não ficar larga demais (e miúda) numa tela em pé. */
  const rotuloDe = (id: string, p: PosNo, r: number) => {
    const max = simples ? 18 : p.prof === 1 ? 30 : 24;
    const texto = cortar(idx.porId.get(id)?.titulo ?? "", max);
    const lado = simples ? 0 : Math.cos(p.ang) < -0.25 ? -1 : Math.cos(p.ang) > 0.25 ? 1 : 0;
    const x = p.x + lado * (r + 10);
    const y = p.y + (lado === 0 ? (!simples && Math.sin(p.ang) < 0 ? -(r + 12) : r + 20) : 4);
    return { texto, lado, x, y, larg: texto.length * (p.prof === 1 ? 7 : 6) + 16 };
  };
  /** a caixa da árvore visível INCLUINDO os rótulos (nada cortado na borda). */
  const caixaComRotulos = (): Caixa => {
    const pts: { x: number; y: number }[] = [];
    for (const [id, p] of pos) {
      pts.push(p);
      if (id === raiz || (simples && p.prof > 1)) continue;
      const rt = rotuloDe(id, p, raioNo(p.prof, filhosDe(idx, id).length > 0));
      if (rt.lado) pts.push({ x: rt.x + rt.lado * rt.larg, y: rt.y });
      else pts.push({ x: rt.x - rt.larg / 2, y: rt.y + 6 }, { x: rt.x + rt.larg / 2, y: rt.y - 12 });
    }
    return caixaDe(pts, simples ? 30 : 70);
  };

  // ─── câmera (viewBox) ───
  const aplicarVB = useCallback(() => {
    svgRef.current?.setAttribute("viewBox", `${vb.current.x.toFixed(1)} ${vb.current.y.toFixed(1)} ${vb.current.w.toFixed(1)} ${vb.current.h.toFixed(1)}`);
  }, []);
  const proporcao = () => {
    const r = svgRef.current?.getBoundingClientRect();
    return r && r.width > 0 && r.height > 0 ? r.width / r.height : AR_PADRAO;
  };
  const enquadrar = useCallback((c: Caixa, dur = 520) => {
    const ar = proporcao();
    let { w, h } = c;
    if (w / h < ar) w = h * ar; else h = w / ar;
    const alvo = { x: c.x + c.w / 2 - w / 2, y: c.y + c.h / 2 - h / 2, w, h };
    if (typeof requestAnimationFrame !== "function" || dur <= 0) { vb.current = alvo; aplicarVB(); return; }
    tween.current = { a: { ...vb.current }, b: alvo, t0: performance.now(), dur };
  }, [aplicarVB]);
  useEffect(() => {
    if (typeof requestAnimationFrame !== "function") return;
    let raf = 0;
    const loop = () => {
      const tw = tween.current;
      if (tw) {
        const k = Math.min(1, Math.max(0, (performance.now() - tw.t0) / tw.dur)), e = 1 - Math.pow(1 - k, 3);
        vb.current = { x: tw.a.x + (tw.b.x - tw.a.x) * e, y: tw.a.y + (tw.b.y - tw.a.y) * e, w: tw.a.w + (tw.b.w - tw.a.w) * e, h: tw.a.h + (tw.b.h - tw.a.h) * e };
        aplicarVB();
        if (k >= 1) tween.current = null;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [aplicarVB]);
  // enquadra: o nó em foco (perto) ou a árvore visível inteira
  useEffect(() => {
    const p = foco ? pos.get(foco) : undefined;
    if (p) enquadrar({ x: p.x - 300, y: p.y - 210, w: 600, h: 420 });
    else enquadrar(caixaComRotulos());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos, foco, enquadrar]);

  // zoom (roda) + arrastar
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    let pan: { x: number; y: number; vx: number; vy: number } | null = null;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); tween.current = null;
      const r = svg.getBoundingClientRect();
      if (!r.width) return;
      const sx = vb.current.x + ((e.clientX - r.left) / r.width) * vb.current.w;
      const sy = vb.current.y + ((e.clientY - r.top) / r.height) * vb.current.h;
      const f = e.deltaY > 0 ? 1.12 : 0.89;
      const nw = Math.min(6000, Math.max(220, vb.current.w * f)), nh = nw / (r.width / r.height);
      vb.current = { x: sx - (sx - vb.current.x) * (nw / vb.current.w), y: sy - (sy - vb.current.y) * (nh / vb.current.h), w: nw, h: nh };
      aplicarVB();
    };
    const onDown = (e: PointerEvent) => {
      if ((e.target as Element)?.closest?.(".an-no")) return;
      pan = { x: e.clientX, y: e.clientY, vx: vb.current.x, vy: vb.current.y }; tween.current = null;
      try { svg.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    };
    const onMove = (e: PointerEvent) => {
      if (!pan) return;
      const r = svg.getBoundingClientRect();
      if (!r.width) return;
      vb.current = { ...vb.current, x: pan.vx - ((e.clientX - pan.x) / r.width) * vb.current.w, y: pan.vy - ((e.clientY - pan.y) / r.height) * vb.current.h };
      aplicarVB();
    };
    const onUp = () => { pan = null; };
    svg.addEventListener("wheel", onWheel, { passive: false });
    svg.addEventListener("pointerdown", onDown); svg.addEventListener("pointermove", onMove);
    svg.addEventListener("pointerup", onUp); svg.addEventListener("pointercancel", onUp);
    return () => {
      svg.removeEventListener("wheel", onWheel); svg.removeEventListener("pointerdown", onDown);
      svg.removeEventListener("pointermove", onMove); svg.removeEventListener("pointerup", onUp); svg.removeEventListener("pointercancel", onUp);
    };
  }, [aplicarVB]);

  // ─── fluxo de lições ───
  const limparTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const abrir = useCallback((id: string) => {
    limparTimers();
    setCompleta(false);
    setExpandidos((ex) => { const s = new Set(ex); for (const c of caminhoAte(idx, id)) s.add(c); return s; });
    setFoco(id);
    ultimoNo.current = id;
    setLicao(id);
  }, [idx]);
  const voltar = useCallback(() => {
    setLicao(null);
    setFoco(null);
    setEpoca((e) => e + 1);
    const volta = ultimoNo.current;
    if (volta) timers.current.push(setTimeout(() => {
      const alvo = Array.from(rootRef.current?.querySelectorAll<SVGGElement>("[data-no]") ?? []).find((g) => g.getAttribute("data-no") === volta);
      alvo?.focus?.();
    }, 30));
  }, []);
  const concluirAtual = useCallback(() => {
    if (!licao) return;
    if (!concluidas.has(licao)) onConcluir([licao]);
    voltar();
  }, [licao, concluidas, onConcluir, voltar]);
  const proxima = useCallback(() => {
    if (!licao) return;
    const depois = new Set(concluidas); depois.add(licao);
    if (!concluidas.has(licao)) onConcluir([licao]);
    const prox = proximaDe(idx, licao, depois);
    limparTimers();
    if (!prox) { setLicao(null); setFoco(null); setExpandidos(visaoGeral(idx, depois)); setCompleta(true); return; }
    setLicao(null);
    setExpandidos(expandirCaminho(idx, prox));   // abre só o caminho até a próxima; recolhe o resto
    setFoco(prox);
    setEpoca((e) => e + 1);
    timers.current.push(setTimeout(() => abrir(prox), atraso));
  }, [licao, concluidas, onConcluir, idx, abrir, atraso]);

  const continuar = () => { const id = licaoParaContinuar(idx, concluidas); if (id) abrir(id); };
  const verTudo = () => { limparTimers(); setFoco(null); setExpandidos(visaoGeral(idx, concluidas)); setEpoca((e) => e + 1); };
  const reiniciar = () => {
    if (!confirmando) {
      setConfirmando(true);
      timers.current.push(setTimeout(() => setConfirmando(false), 4000));
      return;
    }
    setConfirmando(false); setCompleta(false); setFoco(null);
    setExpandidos(new Set([raiz]));
    onReiniciar();
  };

  useEffect(() => { if (licao) tituloLicaoRef.current?.focus?.(); }, [licao]);
  const teclaNo = (id: string) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrir(id); }
  };
  const teclaLicao = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); voltar(); } };

  // ─── desenho ───
  const agora = relogio ?? 0;
  const animar = !reduzido && relogio !== null;
  const arestas: ReactNode[] = [], brilhos: ReactNode[] = [], pulsos: ReactNode[] = [], nos: ReactNode[] = [], rotulos: ReactNode[] = [];
  for (const id of visiveis) {
    const p = pos.get(id)!;
    const no = idx.porId.get(id)!;
    const temFilhos = filhosDe(idx, id).length > 0;
    const r = raioNo(p.prof, temFilhos);
    const e = ener.get(id) ?? 3;
    const feito = concluidas.has(id);
    const ehRaiz = id === raiz;
    const pai = idx.pai.get(id);
    if (pai != null && pos.has(pai)) {
      const pp = pos.get(pai)! as PosNo;
      const rp = raioNo(pp.prof, true);
      const g = geometriaAresta(pp, p, e, id, rp, r, simples);
      const cor = corEnergia(e, feito), nuc = corNucleo(e, feito);
      arestas.push(
        <g key={"a" + id} className="an-aresta" data-aresta={id} data-energia={e.toFixed(2)}>
          {g.fibras.map((d, k) => <path key={k} d={d} fill={cor} fillOpacity={feito ? 0.95 : 0.82} />)}
          <path d={g.nucleo} fill={nuc} fillOpacity={0.9} />
          {g.colaterais.map((c, k) => (
            <g key={"c" + k}><path d={c.d} fill={cor} fillOpacity={0.75} /><circle cx={c.botao.x} cy={c.botao.y} r={c.botao.r} fill={nuc} /></g>
          ))}
          {g.terminais.map((c, k) => (
            <g key={"t" + k}><path d={c.d} fill={cor} fillOpacity={0.8} /><circle cx={c.botao.x} cy={c.botao.y} r={c.botao.r} fill={nuc} /></g>
          ))}
        </g>,
      );
      brilhos.push(
        <path key={"b" + id} d={g.eixo} fill="none" stroke={cor} strokeWidth={4 + e * 1.6} strokeOpacity={feito ? 0.42 : 0.3}
          strokeLinecap="round" className={crepita(e) && animar ? "an-crepita" : undefined} />,
      );
      if (animar) {
        const dur = duracaoPulso(e);
        const destaque = feito || id === proximo;
        const n = quantidadePulsos(e, { destaque, muitos, simples });
        const ini = inicio(idx, id);
        const rb = 2.6 + e * 0.75;
        for (let q = 0; q < n; q++) {
          const b = beginPulso(agora, ini, q, dur, n).toFixed(3) + "s";
          pulsos.push(
            <g key={`p${id}:${epoca}:${agora.toFixed(2)}:${q}`} opacity={0} className="an-pulso">
              <set attributeName="opacity" to="1" begin={b} fill="freeze" />
              <circle r={rb} fill={feito ? "url(#an-sinal-c)" : "url(#an-sinal-p)"} />
              <animateMotion dur={dur.toFixed(3) + "s"} begin={b} repeatCount="indefinite" path={g.eixo} rotate="auto" />
            </g>,
          );
        }
      }
    }
    const dentro = contagemDentro(idx, id, concluidas);
    const rotuloAria = `${no.titulo}. ${ehRaiz ? "Início da jornada" : feito ? "Concluída" : "Pendente"}${dentro.total ? `, ${dentro.feitas} de ${dentro.total} dentro` : ""}. Desafio ${Math.round(e)} de 5.`;
    if (ehRaiz) {
      nos.push(
        <g key={"n" + id} className="an-no an-no-raiz" data-no={id} role="button" tabIndex={0} aria-label={rotuloAria}
          onClick={() => abrir(id)} onKeyDown={teclaNo(id)}>
          <circle className={animar ? "an-coracao" : undefined} cx={p.x} cy={p.y} r={R_RAIZ * 2.6} fill="url(#an-raiz-brilho)" />
          <circle cx={p.x} cy={p.y} r={R_RAIZ} fill="url(#an-raiz)" />
          <title>{no.titulo}</title>
        </g>,
      );
    } else {
      const cor = corEnergia(e, feito);
      const f = frac(idx, id, concluidas);
      nos.push(
        <g key={"n" + id} className={"an-no" + (feito ? " an-feito" : "") + (id === proximo ? " an-proximo" : "")} data-no={id}
          role="button" tabIndex={0} aria-label={rotuloAria} onClick={() => abrir(id)} onKeyDown={teclaNo(id)}>
          <circle cx={p.x} cy={p.y} r={r + 14} fill="transparent" />
          {!simples && dendritos(p, r, e, id).map((d, k) => <path key={k} d={d} fill={cor} fillOpacity={0.7} />)}
          {feito && <circle cx={p.x} cy={p.y} r={r * 2.3} fill="url(#an-brilho-c)" />}
          {id === proximo && !feito && <circle className={animar ? "an-respira" : undefined} cx={p.x} cy={p.y} r={r * 2.2} fill="url(#an-brilho-p)" />}
          <circle cx={p.x} cy={p.y} r={r} fill={feito ? "url(#an-no-c)" : "#16121f"} stroke={cor} strokeWidth={2.2} />
          {!feito && <circle cx={p.x} cy={p.y} r={Math.max(1.8, r * 0.32)} fill={cor} />}
          {dentro.total > 0 && (
            <g className="an-anel" data-frac={f.toFixed(3)}>
              <circle cx={p.x} cy={p.y} r={r + 5} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth={2.4} />
              {f > 0 && (f >= 1
                ? <circle cx={p.x} cy={p.y} r={r + 5} fill="none" stroke="#38bdf8" strokeWidth={2.4} />
                : <path d={arco(p.x, p.y, r + 5, f)} fill="none" stroke="#38bdf8" strokeWidth={2.4} strokeLinecap="round" />)}
            </g>
          )}
          <title>{no.titulo}</title>
        </g>,
      );
    }
    if (!ehRaiz && !(simples && p.prof > 1)) {
      const rt = rotuloDe(id, p, r);
      rotulos.push(
        <text key={"r" + id} x={rt.x} y={rt.y} textAnchor={rt.lado < 0 ? "end" : rt.lado > 0 ? "start" : "middle"}
          className={"an-rot" + (p.prof > 1 ? " an-rot-f" : "")} aria-hidden="true">{rt.texto}</text>,
      );
    }
  }

  const noLicao = licao ? idx.porId.get(licao) ?? null : null;
  const lado = noLicao && renderLado ? renderLado(noLicao) : null;
  const iLicao = licao ? idx.ordem.indexOf(licao) + 1 : 0;

  return (
    <div ref={rootRef} className={"an-root" + (simples ? " an-simples" : "") + (reduzido ? " an-quieto" : "") + (licao ? " an-com-licao" : "")}>
      <style dangerouslySetInnerHTML={{ __html: ESTILO }} />
      <i className="an-canto tl" /><i className="an-canto tr" /><i className="an-canto bl" /><i className="an-canto br" />
      {titulo && <div className="an-hud tl">{titulo}</div>}
      {subtitulo && <div className="an-hud bl">{subtitulo}</div>}
      {onFechar && <button type="button" className="an-fechar" onClick={onFechar}>{T.fechar}</button>}

      <section className={"an-painel" + (onFechar ? " com-fechar" : "")} aria-label={T.progresso}>
        <div className="an-painel-linha">
          <span data-testid="an-contagem">{resumo.feitas}/{resumo.total} {T.licoes}</span>
          <span data-testid="an-pct">{resumo.pct}%</span>
        </div>
        <div className="an-barra" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={resumo.pct} aria-label={T.progresso}>
          <i style={{ width: resumo.pct + "%" }} />
        </div>
        <div className="an-painel-botoes">
          {resumo.feitas < resumo.total && (
            <button type="button" className="an-btn an-pill" onClick={continuar}>{resumo.feitas === 0 ? T.comecar : T.continuar}</button>
          )}
          <button type="button" className="an-btn an-ghost" onClick={verTudo}>{T.visaoGeral}</button>
          <button type="button" className={"an-btn an-ghost" + (confirmando ? " an-alerta" : "")} onClick={reiniciar}>
            {confirmando ? T.confirmarReinicio : T.reiniciar}
          </button>
        </div>
      </section>

      {completa && <div className="an-aviso" role="status">{T.completa}</div>}

      <svg ref={svgRef} className={"an-svg" + (licao ? " an-fade" : "")} viewBox="-600 -410 1200 820" preserveAspectRatio="xMidYMid meet"
        aria-label={titulo ? `Árvore de ${titulo}` : "Árvore de lições"} role="group">
        <defs>
          <filter id="an-blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4" /></filter>
          <radialGradient id="an-raiz" cx="38%" cy="34%" r="70%">
            <stop offset="0%" stopColor="#ffffff" /><stop offset="32%" stopColor="#fde68a" />
            <stop offset="66%" stopColor="#f472b6" /><stop offset="100%" stopColor="#7c3aed" />
          </radialGradient>
          <radialGradient id="an-raiz-brilho">
            <stop offset="0%" stopColor="#fbcfe8" stopOpacity="0.55" /><stop offset="45%" stopColor="#c084fc" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="an-no-c" cx="40%" cy="36%" r="70%">
            <stop offset="0%" stopColor="#f0fdff" /><stop offset="55%" stopColor="#38bdf8" /><stop offset="100%" stopColor="#1d4ed8" />
          </radialGradient>
          <radialGradient id="an-brilho-c"><stop offset="0%" stopColor="#38bdf8" stopOpacity="0.5" /><stop offset="100%" stopColor="#38bdf8" stopOpacity="0" /></radialGradient>
          <radialGradient id="an-brilho-p"><stop offset="0%" stopColor="#e879f9" stopOpacity="0.45" /><stop offset="100%" stopColor="#e879f9" stopOpacity="0" /></radialGradient>
          <radialGradient id="an-sinal-p"><stop offset="0%" stopColor="#ffffff" stopOpacity="1" /><stop offset="40%" stopColor="#fbcfe8" stopOpacity="0.8" /><stop offset="100%" stopColor="#e879f9" stopOpacity="0" /></radialGradient>
          <radialGradient id="an-sinal-c"><stop offset="0%" stopColor="#ffffff" stopOpacity="1" /><stop offset="40%" stopColor="#a5f3fc" stopOpacity="0.8" /><stop offset="100%" stopColor="#22d3ee" stopOpacity="0" /></radialGradient>
        </defs>
        {/* o blur é UM filtro no grupo dos brilhos centrais (nunca por pulso) */}
        <g className="an-brilhos" filter="url(#an-blur)">{brilhos}</g>
        <g className="an-arestas">{arestas}</g>
        <g className="an-pulsos" aria-hidden="true">{pulsos}</g>
        <g className="an-nos">{nos}</g>
        <g className="an-rotulos">{rotulos}</g>
      </svg>

      {noLicao && (
        <div className="an-licao" role="dialog" aria-modal="false" aria-labelledby="an-licao-titulo" onKeyDown={teclaLicao}>
          <div className={"an-par" + (lado ? " com-lado" : "")}>
            <article className="an-card">
              <div className="an-tag">
                <span>{T.licaoDe(iLicao, idx.ordem.length)}</span>
                <span>·</span>
                <span>{T.desafio(Math.round(ener.get(noLicao.id) ?? 3))}</span>
                {concluidas.has(noLicao.id) && <span className="an-ok">{T.concluida}</span>}
              </div>
              <h1 id="an-licao-titulo" ref={tituloLicaoRef} tabIndex={-1}>{noLicao.titulo}</h1>
              <div className="an-corpo">{renderLicao ? renderLicao(noLicao) : (noLicao.resumo ? <p>{noLicao.resumo}</p> : null)}</div>
              {filhosDe(idx, noLicao.id).length > 0 && (
                <>
                  <h3 className="an-sub">{T.dentroDesta}</h3>
                  <div className="an-filhos">
                    {filhosDe(idx, noLicao.id).map((fid) => {
                      const f = idx.porId.get(fid)!;
                      const d = contagemDentro(idx, fid, concluidas);
                      const ok = concluidas.has(fid);
                      return (
                        <button key={fid} type="button" className={"an-filho" + (ok ? " ok" : "")} onClick={() => abrir(fid)} data-filho={fid}>
                          <b>{f.titulo}</b>
                          <span className="an-filho-meta">
                            {ok && <span className="an-ok">{T.concluida}</span>}
                            {d.total > 0 && <span>{d.feitas}/{d.total} {T.dentro}</span>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              <nav className="an-nav">
                <button type="button" className="an-btn an-ghost" onClick={voltar}>{T.voltar}</button>
                <span className="an-nav-dir">
                  {noLicao.id !== raiz && <button type="button" className="an-btn an-ghost" onClick={concluirAtual}>{T.concluir}</button>}
                  <button type="button" className="an-btn an-pill" onClick={proxima}>{noLicao.id === raiz ? T.comecarJornada : T.proxima}</button>
                </span>
              </nav>
            </article>
            {lado && <aside className="an-lado">{lado}</aside>}
          </div>
        </div>
      )}
    </div>
  );
}

const ESTILO = `
.an-root{position:absolute;inset:0;overflow:hidden;container-type:inline-size;background:#0d0b14;color:#eef2ff;
  font-family:ui-sans-serif,system-ui,-apple-system,"SF Pro Display",Segoe UI,Roboto,sans-serif}
.an-svg{position:absolute;inset:0;width:100%;height:100%;touch-action:none;transition:opacity .35s ease}
.an-svg.an-fade{opacity:.08;pointer-events:none}
.an-canto{position:absolute;width:14px;height:14px;border:1px solid rgba(255,255,255,.38);z-index:9;pointer-events:none}
.an-canto.tl{left:14px;top:14px;border-right:0;border-bottom:0}.an-canto.tr{right:14px;top:14px;border-left:0;border-bottom:0}
.an-canto.bl{left:14px;bottom:14px;border-right:0;border-top:0}.an-canto.br{right:14px;bottom:14px;border-left:0;border-top:0}
.an-hud{position:absolute;z-index:9;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;letter-spacing:.09em;text-transform:uppercase;pointer-events:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.an-hud.tl{left:28px;top:24px;color:#f1f5f9;max-width:48%}
.an-hud.bl{left:28px;bottom:24px;color:#6ee7b7;max-width:55%}
.an-fechar{position:absolute;right:30px;top:20px;z-index:14;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.07);color:#e8eeff;border-radius:999px;padding:5px 13px;font-size:12px;cursor:pointer}
.an-painel{position:absolute;right:22px;top:20px;z-index:13;width:236px;padding:12px 14px;border-radius:18px;background:rgba(20,17,30,.86);border:1px solid rgba(255,255,255,.12);backdrop-filter:blur(10px);box-shadow:0 16px 48px rgba(0,0,0,.45)}
.an-painel.com-fechar{top:58px}
.an-com-licao .an-painel,.an-com-licao .an-aviso{display:none}
.an-painel-linha{display:flex;justify-content:space-between;font-size:12.5px;color:#e8eeff;font-variant-numeric:tabular-nums}
.an-barra{margin:8px 0 10px;height:6px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden}
.an-barra i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#2563eb,#38bdf8);transition:width .4s ease}
.an-painel-botoes{display:flex;flex-wrap:wrap;gap:6px}
.an-btn{border-radius:999px;padding:7px 13px;font-size:12.5px;cursor:pointer;border:0;color:#fff;line-height:1.1}
.an-btn:focus-visible,.an-no:focus-visible,.an-filho:focus-visible,.an-fechar:focus-visible{outline:2px solid #7dd3fc;outline-offset:2px}
.an-pill{background:linear-gradient(90deg,#c026d3,#7c3aed 50%,#2563eb);font-weight:700;box-shadow:0 8px 22px rgba(124,58,237,.38)}
.an-ghost{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.18);color:#e8eeff}
.an-ghost:hover,.an-pill:hover,.an-fechar:hover{filter:brightness(1.18)}
.an-alerta{border-color:rgba(251,113,133,.7);color:#fecdd3;background:rgba(244,63,94,.16)}
.an-aviso{position:absolute;left:50%;top:22px;transform:translateX(-50%);z-index:13;padding:9px 16px;border-radius:999px;background:rgba(37,99,235,.22);border:1px solid rgba(56,189,248,.5);color:#e0f2fe;font-size:13px}
.an-no{cursor:pointer;outline:none}
.an-no:hover circle{filter:brightness(1.15)}
.an-rot{font-size:12.5px;fill:#f4f6ff;paint-order:stroke;stroke:#0d0b14;stroke-width:4px;stroke-linejoin:round;pointer-events:none;user-select:none}
.an-rot-f{font-size:10.5px;fill:#dbe3ff}
.an-coracao{transform-box:fill-box;transform-origin:center;animation:an-bate 3.15s ease-in-out infinite}
@keyframes an-bate{0%,100%{opacity:.55;transform:scale(1)}14%{opacity:1;transform:scale(1.12)}28%{opacity:.7;transform:scale(1.02)}42%{opacity:.95;transform:scale(1.08)}}
.an-respira{transform-box:fill-box;transform-origin:center;animation:an-respira 2.8s ease-in-out infinite}
@keyframes an-respira{0%,100%{opacity:.45}50%{opacity:1}}
.an-crepita{animation:an-crepita 1.1s steps(6,end) infinite}
@keyframes an-crepita{0%{stroke-opacity:.3}20%{stroke-opacity:.55}40%{stroke-opacity:.34}60%{stroke-opacity:.6}80%{stroke-opacity:.38}100%{stroke-opacity:.3}}
.an-quieto .an-coracao,.an-quieto .an-respira,.an-quieto .an-crepita{animation:none}
@media (prefers-reduced-motion:reduce){.an-coracao,.an-respira,.an-crepita{animation:none}.an-barra i,.an-svg{transition:none}}
.an-licao{position:absolute;inset:0;z-index:12;display:grid;place-items:center;overflow:auto;padding:24px}
.an-par{width:min(760px,100%);min-width:0}
.an-par.com-lado{width:min(1280px,100%);display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);gap:40px;align-items:start}
.an-card{min-width:0;border-radius:26px;padding:26px 28px;background:#1b1824;border:1px solid rgba(255,255,255,.12);box-shadow:0 30px 90px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.06)}
.an-lado{min-width:0;border-radius:26px;border:1px solid rgba(255,255,255,.12);background:#1b1824;box-shadow:0 24px 64px rgba(0,0,0,.45)}
.an-tag{display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-family:ui-monospace,monospace;font-size:11px;color:#a5b4fc;text-transform:uppercase;letter-spacing:.06em}
.an-ok{color:#7dd3fc;font-weight:700;text-transform:none;letter-spacing:0}
.an-card h1{font-size:23px;margin:10px 0 4px;color:#fff;outline:none}
.an-sub{font-size:12px;text-transform:uppercase;letter-spacing:.1em;margin:22px 0 8px;color:#c4b5fd}
.an-corpo p{font-size:15px;line-height:1.62;color:rgba(232,238,255,.92)}
.an-filhos{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px}
.an-filho{text-align:left;border-radius:14px;padding:10px 12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);color:#eef2ff;cursor:pointer;display:flex;flex-direction:column;gap:4px;font-size:13px}
.an-filho.ok{border-color:rgba(56,189,248,.55);background:rgba(37,99,235,.14)}
.an-filho-meta{display:flex;gap:8px;font-size:11.5px;color:#c7d2fe}
.an-nav{display:flex;justify-content:space-between;gap:10px;margin-top:22px;flex-wrap:wrap}
.an-nav-dir{display:flex;gap:8px;flex-wrap:wrap}
@container (max-width:760px){
  .an-painel{width:auto;left:14px;right:14px;top:auto;bottom:14px}
  .an-painel.com-fechar{top:auto}
  .an-hud.bl{display:none}
  .an-licao{padding:12px;place-items:start center}
  .an-par.com-lado{grid-template-columns:minmax(0,1fr);gap:20px}
  .an-card{padding:20px 18px}
}
`;
