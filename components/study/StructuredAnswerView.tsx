"use client";

/**
 * StructuredAnswerView — o RENDERER da resposta estruturada da Aura (gap H/I da §7).
 * Em vez de achatar o `StructuredAnswer` do harness num blocão de texto, dá a cada
 * campo seu tratamento visual — no idioma da Zaeon: **Apple liquid glass**.
 *
 * Camadas do vidro (suave aos olhos):
 *   1. aurora — um brilho gradiente difuso ATRÁS do painel (blur alto), que "respira";
 *   2. painel fosco — backdrop-blur-2xl + hairline claro + sombra macia;
 *   3. brilho especular — uma fina faixa de luz no topo (como o reflexo do vidro Apple);
 *   4. conteúdo — núcleo/desenvolvimento (texto), conceitos (chips), evidência (fontes),
 *      próximos passos (sugestões clicáveis). Entra com fade-up escalonado.
 *
 * Sem dependência de markdown: um formatador inline leve (negrito + bullets) mantém
 * o texto bonito sem lib. `onConcept`/`onNext` viram novos prompts (como o Claude).
 */
import { useEffect, useMemo, useRef } from "react";
import { useTypewriter } from "@/lib/ui/useTypewriter";
import { fonteChat } from "@/lib/ui/chatFontScale";
import { ArrowUpRight, Quote, AlertTriangle, Paperclip, RotateCcw, Link2, ClipboardPaste } from "lucide-react";
import type { StructuredAnswer, Source } from "@/lib/agent/contracts";
import ChatMarkdown from "@/components/study/ChatMarkdown";
import CardVideoChat from "@/components/videodoc/CardVideoChat";
import { videoDocUiOn } from "@/lib/videodoc/documentos";
import { reaBlueprintUiOn } from "@/lib/rea-blueprint/tipos";
import { MOTIVO_CHAT } from "@/lib/videodoc/pedido";

// O texto da resposta passa pelo MESMO formatador do chat (ChatMarkdown): negrito/itálico, títulos, bullets,
// links e MATEMÁTICA ($…$, $$…$$ em KaTeX, ```grafico). Antes era um formatador próprio só com **negrito** —
// a fórmula da atenção do Transformer aparecia crua ("$$\text{Attention}…$$"), no chat e no modo pesquisa.
function Prose({ text, lead }: { text: string; lead?: boolean }) {
  return (
    // Tamanho obedece o A−/A+ do chat (--chat-font-scale; sem a var, fica 100%).
    <div className={lead ? "leading-[1.62]" : "leading-[1.72]"} style={{ fontSize: fonteChat(lead ? 19 : 16) }}>
      <ChatMarkdown text={text} />
    </div>
  );
}

function sourceLabel(s: Source): string {
  return [s.title, s.authors, s.year].filter(Boolean).join(" · ") || s.url || "fonte";
}

/** G2 · o ícone do caminho que existe (o tipo vem de lib/agent/falhas). */
const ICONE_CORRECAO = {
  anexar: Paperclip,
  tentar_de_novo: RotateCcw,
  outro_link: Link2,
  colar_trecho: ClipboardPaste,
} as const;

export default function StructuredAnswerView({
  answer,
  onConcept,
  onNext,
  typing = false,
  onDigitando,
  acoes,
  onAbrirRea,
  children,
}: {
  answer: StructuredAnswer;
  /** B2: datilografa o núcleo e só depois revela as demais seções. */
  typing?: boolean;
  /** Avisa quando o núcleo começa/termina de ser datilografado (o avatar fala junto). */
  onDigitando?: (ativo: boolean) => void;
  onConcept?: (c: string) => void;
  onNext?: (step: string) => void;
  /** abre o módulo do Blueprint REA desta resposta (engenharia reversa) */
  onAbrirRea?: (id: string) => void;
  children?: React.ReactNode;   // slot p/ artefatos (StudioBlock) embutidos
  /** Mini-ações (copiar/regenerar/👍👎) — entram logo depois do conteúdo, antes dos botões e das Fontes. */
  acoes?: React.ReactNode;
}) {
  const { nucleo, desenvolvimento, conceitos, evidencia, proximos_passos } = answer;
  // fade-up escalonado por seção
  const secs = useMemo(() => {
    const arr: string[] = ["nucleo"];
    if (desenvolvimento) arr.push("dev");
    if (conceitos?.length) arr.push("conceitos");
    if (children) arr.push("art");
    if (evidencia?.length) arr.push("evid");
    if (answer.graficos?.length) arr.push("graficos");
    if (answer.falhas?.length) arr.push("falhas");
    if (proximos_passos?.length) arr.push("next");
    return arr;
  }, [desenvolvimento, conceitos, evidencia, proximos_passos, children, answer.falhas, answer.graficos]);
  const delay = (name: string) => `${secs.indexOf(name) * 70}ms`;
  const tw = useTypewriter(nucleo || "", typing);
  const rest = tw.done; // o resto entra (com o fade-up escalonado) quando o núcleo termina
  const avisar = useRef(onDigitando);
  avisar.current = onDigitando;
  useEffect(() => {
    if (!typing) return;
    avisar.current?.(!tw.done);
  }, [typing, tw.done]);
  useEffect(() => () => avisar.current?.(false), []);

  return (
    <div className="relative max-w-[680px]">
      <style>{`
        @keyframes zAurora { 0%,100% { opacity:.5; transform: translate3d(-4%,-3%,0) scale(1); } 50% { opacity:.8; transform: translate3d(4%,3%,0) scale(1.06); } }
        @keyframes zUp { from { opacity:0; transform: translateY(7px); } to { opacity:1; transform: none; } }
        .z-up { animation: zUp .5s cubic-bezier(.22,.61,.36,1) both; }
        @keyframes zCaret { 0%,45% { opacity:1 } 50%,100% { opacity:0 } }
        .z-caret { display:inline-block; width:2px; height:1em; margin-left:2px; vertical-align:-0.15em; background:currentColor; opacity:.7; animation: zCaret 1s steps(1) infinite; }
      `}</style>

      {/* 1 · aurora difusa atrás do vidro */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[40px] blur-3xl opacity-70 motion-reduce:!animate-none"
        style={{
          background: "radial-gradient(60% 60% at 20% 10%, rgba(37,99,235,0.20), transparent 60%), radial-gradient(60% 60% at 85% 90%, rgba(139,92,246,0.18), transparent 60%), radial-gradient(50% 50% at 60% 40%, rgba(6,182,212,0.16), transparent 60%)",
          animation: "zAurora 9s ease-in-out infinite",
        }}
      />

      {/* 2 · painel fosco (liquid glass) */}
      <div className="relative rounded-[26px] border border-white/60 dark:border-white/10 bg-white/55 dark:bg-white/[0.055] backdrop-blur-2xl shadow-[0_24px_70px_-32px_rgba(37,99,235,0.5)] overflow-hidden">
        {/* 3 · brilho especular no topo */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/40 to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[26px] bg-gradient-to-b from-white/25 dark:from-white/[0.06] to-transparent" style={{ height: "42%" }} />

        <div className="relative px-5 py-4 text-slate-900 dark:text-white font-tech">
          {/* núcleo */}
          {nucleo && (
            <div className="z-up text-slate-900 dark:text-white" style={{ animationDelay: delay("nucleo") }}>
              <Prose text={tw.visible} lead />
              {!tw.done && <span aria-hidden className="z-caret" />}
            </div>
          )}

          {/* desenvolvimento */}
          {rest && desenvolvimento && (
            <div className="z-up mt-3.5 text-slate-900 dark:text-white" style={{ animationDelay: delay("dev") }}>
              <Prose text={desenvolvimento} />
            </div>
          )}

          {/* conceitos — chips de vidro */}
          {rest && conceitos?.length ? (
            <div className="z-up mt-4 flex flex-wrap gap-2" style={{ animationDelay: delay("conceitos") }}>
              {conceitos.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onConcept?.(c)}
                  className="inline-flex items-center px-3 py-1 rounded-full text-[13px] text-cyan-700 dark:text-cyan-200 bg-cyan-500/[0.08] border border-cyan-400/25 backdrop-blur-md hover:bg-cyan-500/[0.16] hover:-translate-y-px transition-all duration-200"
                >
                  {c}
                </button>
              ))}
            </div>
          ) : null}

          {/* artefatos embutidos (StudioBlock via slot) */}
          {rest && children && (
            <div className="z-up mt-4" style={{ animationDelay: delay("art") }}>{children}</div>
          )}

          {/* o VÍDEO do documento pedido no chat (lib/videodoc): o ▶ abre a Zaeon holograma explicando */}
          {rest && answer.videoDoc?.videoId && videoDocUiOn() ? <CardVideoChat videoId={answer.videoDoc.videoId} titulo={answer.videoDoc.titulo} /> : null}
          {rest && answer.videoDoc && !answer.videoDoc.videoId && answer.videoDoc.motivo && videoDocUiOn() ? (
            <div className="mt-3 rounded-xl border border-amber-300/30 bg-amber-300/[0.07] px-3 py-2 text-[12.5px] text-amber-100/90">🎬 {MOTIVO_CHAT[answer.videoDoc.motivo] ?? "Não consegui preparar o vídeo agora."}</div>
          ) : null}

          {/* BLUEPRINT REA (engenharia reversa): um módulo próprio — abre como um paper, mas com o estilo do REA */}
          {rest && answer.reaBlueprint && reaBlueprintUiOn() ? (
            <button type="button" onClick={() => onAbrirRea?.(answer.reaBlueprint!.id)}
              className="mt-3 flex w-full items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-400/[0.06] px-3 py-2.5 text-left transition hover:bg-emerald-400/[0.12]">
              <span className="text-lg">🔬</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-emerald-50">{answer.reaBlueprint.titulo}</span>
                <span className="block text-[11px] text-emerald-200/70">{answer.reaBlueprint.gerando ? "Blueprint de engenharia reversa — montando…" : "Blueprint de engenharia reversa · toque pra abrir"}</span>
              </span>
              <span className="text-[11px] text-emerald-300">{answer.reaBlueprint.gerando ? "…" : "abrir →"}</span>
            </button>
          ) : null}

          {/* mini-ações da mensagem (ordem: conteúdo → ações → botões do harness → Fontes) */}
          {rest && acoes}

          {/* G3 · GRÁFICO da resposta. O SVG vem PRONTO do servidor (lib/agent/grafico) e o número
              foi apurado por código — o modelo não digita valor. `dangerouslySetInnerHTML` é seguro
              aqui porque o SVG é gerado por nós e todo rótulo passa por `escaparSvg`; nada do
              modelo nem do documento entra como marcação. */}
          {rest && answer.graficos?.length ? (
            <div className="z-up mt-4 flex flex-col gap-4" style={{ animationDelay: delay("graficos") }}>
              {answer.graficos.map((g, i) => (
                <figure key={i} className="m-0 px-3.5 py-3 rounded-2xl bg-white/45 dark:bg-white/[0.045] border border-white/55 dark:border-white/10 backdrop-blur-md">
                  <figcaption className="text-[12.5px] font-semibold text-slate-900 dark:text-white mb-2">{g.titulo}</figcaption>
                  <div
                    className="text-slate-900 dark:text-white"
                    role="group"
                    aria-label={g.alt}
                    dangerouslySetInnerHTML={{ __html: g.svg }}
                  />
                  <figcaption className="mt-1.5 text-[11px] text-slate-600 dark:text-white/60">Fonte: {g.fonte}</figcaption>
                </figure>
              ))}
            </div>
          ) : null}

          {/* G2 · A AÇÃO QUE FALHOU, com o caminho que existe. Vem do código (answer.falhas), não do
              modelo. Entra ANTES dos próximos passos de propósito: saber que o arquivo não chegou é
              mais urgente que a sugestão de estudo — foi o que faltou na conversa dos benchmarks. */}
          {rest && answer.falhas?.length ? (
            <div className="z-up mt-4 flex flex-col gap-1.5" style={{ animationDelay: delay("falhas") }}>
              {answer.falhas.map((f, i) => {
                const Icone = ICONE_CORRECAO[f.corrigir.tipo] ?? Paperclip;
                const reenviar = f.corrigir.prompt;
                return (
                  <div
                    key={`${f.tool}:${f.codigo}:${i}`}
                    className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-2xl bg-amber-500/[0.07] border border-amber-500/25 backdrop-blur-md"
                  >
                    <span className="mt-0.5 w-6 h-6 shrink-0 rounded-full flex items-center justify-center bg-amber-500/15 text-amber-600 dark:text-amber-300">
                      <AlertTriangle size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] text-slate-900 dark:text-white">{f.porque}.</p>
                      {reenviar ? (
                        <button
                          type="button"
                          onClick={() => onNext?.(reenviar)}
                          className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12.5px] bg-white/55 dark:bg-white/[0.07] border border-white/60 dark:border-white/10 text-slate-800 dark:text-white/85 hover:border-amber-400/50 transition-colors"
                        >
                          <Icone size={12} /> {f.corrigir.texto}
                        </button>
                      ) : (
                        <p className="mt-1 flex items-start gap-1.5 text-[12.5px] text-slate-700 dark:text-white/70">
                          <Icone size={12} className="mt-[3px] shrink-0" /> <span>{f.corrigir.texto}</span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* próximos passos — sugestões clicáveis (viram novo prompt) */}
          {rest && proximos_passos?.length ? (
            <div className="z-up mt-4 flex flex-col gap-1.5" style={{ animationDelay: delay("next") }}>
              {proximos_passos.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onNext?.(s)}
                  className="group flex items-center gap-2 text-left px-3.5 py-2.5 rounded-2xl bg-white/45 dark:bg-white/[0.045] border border-white/55 dark:border-white/10 backdrop-blur-md hover:border-cyan-400/45 hover:bg-white/70 dark:hover:bg-white/[0.09] transition-all duration-200"
                >
                  <span className="w-6 h-6 rounded-full flex items-center justify-center bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 group-hover:scale-105 transition-transform">
                    <ArrowUpRight size={14} />
                  </span>
                  <span className="text-[14px] text-slate-900 dark:text-white">{s}</span>
                </button>
              ))}
            </div>
          ) : null}

          {/* evidência — SEMPRE o último elemento do card: resposta → botões → Fontes */}
          {rest && evidencia?.length ? (
            <div className="z-up mt-4 pt-3 border-t border-white/50 dark:border-white/10" style={{ animationDelay: delay("evid") }}>
              <div className="flex items-center gap-1.5 text-[12px] text-slate-700 dark:text-white/70 mb-2">
                <Quote size={13} /> Fontes
              </div>
              <div className="flex flex-col gap-1.5">
                {evidencia.map((e, i) => {
                  const label = sourceLabel(e.source);
                  const inner = (
                    <span className="inline-flex items-start gap-2">
                      <span className="mt-[1px] shrink-0 w-[18px] h-[18px] rounded-full bg-slate-500/10 border border-white/40 dark:border-white/10 text-[11px] flex items-center justify-center tabular-nums text-slate-500 dark:text-white/50">{i + 1}</span>
                      <span className="text-[13px] leading-[1.5] text-slate-800 dark:text-white">{label}</span>
                    </span>
                  );
                  return (
                    <div key={i}>
                      {e.source.url
                        ? <a href={e.source.url} target="_blank" rel="noreferrer" className="hover:opacity-80 transition-opacity">{inner}</a>
                        : inner}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
