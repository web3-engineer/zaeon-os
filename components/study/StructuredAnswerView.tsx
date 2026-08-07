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
import { useMemo } from "react";
import { ArrowUpRight, Quote } from "lucide-react";
import type { StructuredAnswer, Source } from "@/lib/agent/contracts";

// ── formatador inline mínimo (negrito **x** + linhas "- " viram bullets) ──
function fmtInline(s: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    out.push(<strong key={k++} className="font-semibold text-slate-900 dark:text-white">{m[1]}</strong>);
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

function Prose({ text, lead }: { text: string; lead?: boolean }) {
  const lines = text.split(/\n+/).filter((l) => l.trim());
  return (
    <div className={lead ? "text-[19px] leading-[1.62]" : "text-[16px] leading-[1.72]"}>
      {lines.map((l, i) => {
        const bullet = /^[-*•]\s+/.test(l);
        return bullet ? (
          <div key={i} className="flex gap-2.5 my-1">
            <span className="mt-[9px] w-1.5 h-1.5 rounded-full bg-cyan-400/80 shrink-0" />
            <span>{fmtInline(l.replace(/^[-*•]\s+/, ""))}</span>
          </div>
        ) : (
          <p key={i} className={i > 0 ? "mt-2.5" : ""}>{fmtInline(l)}</p>
        );
      })}
    </div>
  );
}

function sourceLabel(s: Source): string {
  return [s.title, s.authors, s.year].filter(Boolean).join(" · ") || s.url || "fonte";
}

export default function StructuredAnswerView({
  answer,
  onConcept,
  onNext,
  children,
}: {
  answer: StructuredAnswer;
  onConcept?: (c: string) => void;
  onNext?: (step: string) => void;
  children?: React.ReactNode;   // slot p/ artefatos (StudioBlock) embutidos
}) {
  const { nucleo, desenvolvimento, conceitos, evidencia, proximos_passos } = answer;
  // fade-up escalonado por seção
  const secs = useMemo(() => {
    const arr: string[] = ["nucleo"];
    if (desenvolvimento) arr.push("dev");
    if (conceitos?.length) arr.push("conceitos");
    if (children) arr.push("art");
    if (evidencia?.length) arr.push("evid");
    if (proximos_passos?.length) arr.push("next");
    return arr;
  }, [desenvolvimento, conceitos, evidencia, proximos_passos, children]);
  const delay = (name: string) => `${secs.indexOf(name) * 70}ms`;

  return (
    <div className="relative max-w-[680px]">
      <style>{`
        @keyframes zAurora { 0%,100% { opacity:.5; transform: translate3d(-4%,-3%,0) scale(1); } 50% { opacity:.8; transform: translate3d(4%,3%,0) scale(1.06); } }
        @keyframes zUp { from { opacity:0; transform: translateY(7px); } to { opacity:1; transform: none; } }
        .z-up { animation: zUp .5s cubic-bezier(.22,.61,.36,1) both; }
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

        <div className="relative px-5 py-4 text-slate-700 dark:text-white/85 font-tech">
          {/* núcleo */}
          {nucleo && (
            <div className="z-up text-slate-800 dark:text-white/90" style={{ animationDelay: delay("nucleo") }}>
              <Prose text={nucleo} lead />
            </div>
          )}

          {/* desenvolvimento */}
          {desenvolvimento && (
            <div className="z-up mt-3.5 text-slate-600 dark:text-white/70" style={{ animationDelay: delay("dev") }}>
              <Prose text={desenvolvimento} />
            </div>
          )}

          {/* conceitos — chips de vidro */}
          {conceitos?.length ? (
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
          {children && (
            <div className="z-up mt-4" style={{ animationDelay: delay("art") }}>{children}</div>
          )}

          {/* evidência — rodapé de fontes com citações numeradas */}
          {evidencia?.length ? (
            <div className="z-up mt-4 pt-3 border-t border-white/50 dark:border-white/10" style={{ animationDelay: delay("evid") }}>
              <div className="flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-white/45 mb-2">
                <Quote size={13} /> Fontes
              </div>
              <div className="flex flex-col gap-1.5">
                {evidencia.map((e, i) => {
                  const label = sourceLabel(e.source);
                  const inner = (
                    <span className="inline-flex items-start gap-2">
                      <span className="mt-[1px] shrink-0 w-[18px] h-[18px] rounded-full bg-slate-500/10 border border-white/40 dark:border-white/10 text-[11px] flex items-center justify-center tabular-nums text-slate-500 dark:text-white/50">{i + 1}</span>
                      <span className="text-[13px] leading-[1.5] text-slate-600 dark:text-white/65">{label}</span>
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

          {/* próximos passos — sugestões clicáveis (viram novo prompt) */}
          {proximos_passos?.length ? (
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
                  <span className="text-[14px] text-slate-700 dark:text-white/80">{s}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
