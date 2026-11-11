"use client";

/**
 * ZaeonDocumentos — a AVATAR da IA no lugar dos documentos do laboratório (out/2026). O dono: "os arquivos ficam na
 * seção do ícone da pasta; se jogarmos um arquivo na avatar, ela apenas reage lendo aquilo ou pensando; o tablet é uma
 * tela holográfica sem nada escrito; a avatar sempre tem animações; a troca de avatar é no seletor do canto superior
 * esquerdo, sem deixar a anterior presa em alguma tarefa" — e "a geração 3D não pode compartilhar essa thread".
 * Por isso este componente NÃO desenha nada: a cena inteira (components/research/avatarCena) roda num WEB WORKER
 * (avatar.worker) num OffscreenCanvas; aqui só o <canvas>, o tamanho/visibilidade e os sinais do chat viram mensagens.
 * Sem OffscreenCanvas com WebGL (navegador antigo), o retrato estático dela — nunca o 3D na thread principal.
 */
import { useEffect, useRef, useState } from "react";
import { EVT_ZAEON_ESCREVENDO, EVT_ZAEON_MICROFONE, gerandoAgora, nomeDaPersona, type DetalheMicrofone, type PersonaId } from "@/lib/research/zaeonEventos";
import type { DaCena, ParaCena } from "./avatarMensagens";
import { segurarPrecarga } from "@/lib/cyber/precarga";

const CIANO = "#7fe8ff";
/** #756 · quanto ela leva até a pose de pensativa antes de congelar (o "pensar" do roteiro vai de 0 a 1,4 s) */
export const POSE_PENSATIVA_MS = 1000;
/** dá pra rodar a cena num worker? (OffscreenCanvas transferível + WebGL nele) */
function temOffscreen(): boolean {
  if (typeof window === "undefined" || typeof OffscreenCanvas === "undefined" || !("transferControlToOffscreen" in HTMLCanvasElement.prototype)) return false;
  try { return !!new OffscreenCanvas(1, 1).getContext("webgl2"); } catch { return false; }
}

export default function ZaeonDocumentos({ persona, lendo = false, reagir = 0 }: {
  persona: PersonaId;
  /** um documento em análise agora (ela lê) */
  lendo?: boolean;
  /** cresce a cada arquivo jogado NELA: ela reage (lê ou pensa) */
  reagir?: number;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const nome = nomeDaPersona(persona);
  const [estado, setEstado] = useState<"carregando" | "pronto" | "erro" | "estatico">("carregando");
  const [escrevendo, setEscrevendo] = useState(false);
  const worker = useRef<Worker | null>(null);
  const enviar = (m: ParaCena, transferir?: Transferable[]) => worker.current?.postMessage(m, transferir ?? []);
  const personaRef = useRef(persona), lendoRef = useRef(lendo);
  lendoRef.current = lendo;
  // REGRA: o 3D (o worker + ~19 MB de VRM e movimento) só começa com a página OCIOSA e nenhuma resposta chegando —
  // o download não disputa a rede nem a CPU com a geração do texto. Até lá, o retrato estático.
  const [podeIniciar, setPodeIniciar] = useState(false);
  const gerandoRef = useRef(false);
  if (typeof window !== "undefined" && !podeIniciar) gerandoRef.current = gerandoRef.current || gerandoAgora();   // (montou no meio de uma resposta)
  useEffect(() => {
    if (podeIniciar) return;
    let cancelado = false, id = 0;
    const tentar = () => {
      gerandoRef.current = gerandoAgora() || gerandoRef.current;
      if (cancelado || gerandoRef.current) return;   // (volta a tentar quando a resposta acabar — o listener abaixo)
      const ric = (window as unknown as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
      const ok = () => { if (!cancelado && !gerandoRef.current && !gerandoAgora()) setPodeIniciar(true); };
      id = ric ? ric(ok, { timeout: 2500 }) : window.setTimeout(ok, 1200);
    };
    const fim = (e: Event) => { gerandoRef.current = !!(e as CustomEvent).detail; if (!gerandoRef.current) tentar(); };
    window.addEventListener(EVT_ZAEON_ESCREVENDO, fim);
    tentar();
    return () => { cancelado = true; window.removeEventListener(EVT_ZAEON_ESCREVENDO, fim); const cic = (window as unknown as { cancelIdleCallback?: (n: number) => void }).cancelIdleCallback; if (cic) cic(id); else clearTimeout(id); };
  }, [podeIniciar]);

  // o WORKER: nasce com o canvas transferido (quando pode) e morre com o painel
  useEffect(() => {
    const el = caixa.current; if (!el || !podeIniciar) return;
    if (!temOffscreen()) { setEstado("estatico"); return; }
    // o canvas nasce AQUI (um por montagem: um canvas só se transfere uma vez)
    const cv = document.createElement("canvas"); cv.className = "absolute inset-0 block h-full w-full"; el.prepend(cv);
    const w = new Worker(new URL("./avatar.worker.ts", import.meta.url), { type: "module" });
    worker.current = w;
    // enquanto ela CARREGA (e de novo a cada troca de persona), a pré-carga do cyberespaço espera — ela é uma por aba
    // e segue quando a pessoa vem da landing pro chat, roubando a banda (curta) da avatar (lib/cyber/precarga)
    let soltar: (() => void) | null = null;
    w.onmessage = (e: MessageEvent<DaCena>) => {
      const m = e.data;
      if (m.tipo === "estado") {
        if (m.estado === "carregando") soltar ??= segurarPrecarga();
        else { soltar?.(); soltar = null; }
        setEstado(m.estado);
      }
      else if (m.tipo === "diag" && process.env.NODE_ENV !== "production") (window as unknown as { __avatarDiag?: DaCena }).__avatarDiag = m;
    };
    w.onerror = (ev) => { console.warn("[avatar] o worker caiu:", ev.message); setEstado("erro"); };
    const off = cv.transferControlToOffscreen();
    w.postMessage({ tipo: "iniciar", canvas: off, largura: el.clientWidth, altura: el.clientHeight, dpr: window.devicePixelRatio || 1, persona: personaRef.current } satisfies ParaCena, [off]);
    w.postMessage({ tipo: "sinais", lendo: lendoRef.current, escrevendo: gerandoRef.current } satisfies ParaCena);
    // o TAMANHO e a VISIBILIDADE (fora da tela ou aba escondida: a cena para de desenhar)
    const ro = new ResizeObserver(() => w.postMessage({ tipo: "tamanho", largura: el.clientWidth, altura: el.clientHeight } satisfies ParaCena));
    ro.observe(el);
    let naTela = true;
    // #756 · MICROFONE ligado: ela fica congelada na pose de pensativa (não desenha), senão o microfone não traz texto
    let microfone = false, congelar = 0;
    const avisar = () => w.postMessage({ tipo: "visivel", visivel: naTela && !document.hidden && !microfone } satisfies ParaCena);
    const io = new IntersectionObserver(([en]) => { naTela = !!en?.isIntersecting; avisar(); }, { threshold: 0.01 }); io.observe(el);
    document.addEventListener("visibilitychange", avisar);
    const aoMicrofone = (e: Event) => {
      const d = (e as CustomEvent<DetalheMicrofone>).detail;
      if (!d || d.ligado === microfone) return;
      clearTimeout(congelar);
      if (d.ligado) {
        // a pose: o começo do roteiro da resposta ("pensar": mão no queixo, olhos acesos — os 1,4 s antes dos poderes)
        w.postMessage({ tipo: "sinais", lendo: false, escrevendo: true } satisfies ParaCena);
        if (!naTela || document.hidden) { microfone = true; avisar(); return; }   // ninguém vê: congela já, sem esperar
        d.esperar.push(new Promise<void>((pronto) => { congelar = window.setTimeout(() => { microfone = true; avisar(); pronto(); }, POSE_PENSATIVA_MS); }));
      } else {
        microfone = false; avisar();
        w.postMessage({ tipo: "sinais", lendo: lendoRef.current, escrevendo: gerandoRef.current } satisfies ParaCena);
      }
    };
    window.addEventListener(EVT_ZAEON_MICROFONE, aoMicrofone);
    if (process.env.NODE_ENV !== "production") (window as unknown as { __avatarWorker?: Worker }).__avatarWorker = w;
    return () => {
      ro.disconnect(); io.disconnect(); document.removeEventListener("visibilitychange", avisar);
      window.removeEventListener(EVT_ZAEON_MICROFONE, aoMicrofone); clearTimeout(congelar);
      soltar?.(); soltar = null;
      w.postMessage({ tipo: "fim" } satisfies ParaCena); setTimeout(() => w.terminate(), 500); worker.current = null; cv.remove();
    };
  }, [podeIniciar]);

  // QUEM está no painel (a troca: o worker solta o corpo anterior na hora)
  useEffect(() => { personaRef.current = persona; enviar({ tipo: "persona", persona }); }, [persona]);
  // o que ela está fazendo
  useEffect(() => { enviar({ tipo: "sinais", lendo, escrevendo }); }, [lendo, escrevendo]);
  useEffect(() => {
    const ev = (e: Event) => { gerandoRef.current = !!(e as CustomEvent).detail; setEscrevendo(gerandoRef.current); };
    window.addEventListener(EVT_ZAEON_ESCREVENDO, ev); return () => window.removeEventListener(EVT_ZAEON_ESCREVENDO, ev);
  }, []);
  const reagiu = useRef(reagir);
  useEffect(() => { if (reagir !== reagiu.current) { reagiu.current = reagir; enviar({ tipo: "reagir" }); } }, [reagir]);

  return (
    <div ref={caixa} className="relative h-full min-h-[320px] w-full overflow-hidden" style={{ background: `radial-gradient(ellipse 80% 60% at 50% 45%, ${CIANO}14, transparent 70%)` }}>
      {(estado === "estatico" || !podeIniciar) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/avatars/${persona}/idle.webp`} alt={nome} className="absolute inset-x-0 bottom-0 mx-auto h-[88%] w-auto object-contain object-bottom" />
      )}
      <button type="button" aria-label={`Falar com a ${nome}`} title={nome} onClick={() => enviar({ tipo: "gesto" })} className="absolute inset-x-[18%] bottom-[20%] top-[2%] z-[1] cursor-pointer rounded-full" />
      {escrevendo && <p className="pointer-events-none absolute inset-x-0 bottom-3 z-[2] text-center text-[9px] font-black uppercase tracking-[0.2em] text-cyan-200/70">a {nome} está escrevendo…</p>}
      {podeIniciar && (estado === "carregando" || estado === "erro") && <p className="pointer-events-none absolute inset-x-0 bottom-3 z-[2] text-center text-[9px] font-black uppercase tracking-[0.2em] text-white/35">{estado === "erro" ? `a ${nome} não carregou` : `a ${nome} está chegando…`}</p>}
    </div>
  );
}
