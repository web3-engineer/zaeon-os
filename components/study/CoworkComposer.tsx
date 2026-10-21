"use client";

/**
 * CoworkComposer — a janela de input do co-working, no padrão do chat do Claude:
 * textarea que cresce com o conteúdo, fonte tech (~15px), Enter envia, Shift+Enter
 * quebra linha. O ⟁ PERMANECE aqui e abre/fecha a seção Studio. Um botão de envio
 * (seta) à direita. É uma casca controlada — a lógica vive no StudyCoworkChat.
 */

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, Mic, Paperclip, Zap, Compass, Square } from "lucide-react";
import useSTT from "@/lib/voice/useSTT";
import { useAutoFoco } from "@/lib/ui/autofoco";

// execMode = automático (Aura vai ponta-a-ponta) × guiado (pausa nos gates HITL,
// estilo plan-mode do Claude). Fase 0: só a casca — persiste a preferência p/ o
// harness da Fase 1 ler. Espelha docs/AURA_AGENTIC_LAYER_PLAN.md §11.4.
export type ExecMode = "auto" | "guiado";
const EXEC_KEY = "zaeon.execMode";

export type CoworkComposerProps = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  /** Parar a resposta/geração em andamento (gap N). Quando presente + busy, o enviar vira ⏹. */
  onStop?: () => void;
  onToggleStudio: () => void;
  studioOpen?: boolean;
  busy?: boolean;
  /** Sem janela ativa (sessão nova / conversa vazia): o ⟁ "respira" como indicador. */
  idle?: boolean;
  /** Aba/página ativa: quando vira true, o cursor entra direto na barra (auto-focus). */
  active?: boolean;
  placeholder?: string;
  /** Anexos: chamado quando o aluno escolhe arquivo(s). Opcional. */
  onFiles?: (files: File[]) => void;
  /** Notifica mudança de modo (auto/guiado) para quem quiser reagir. Opcional. */
  onExecMode?: (mode: ExecMode) => void;
  /** Slot opcional acima do texto (ex.: chips de estudos em foco). */
  children?: React.ReactNode;
};

export default function CoworkComposer({
  value,
  onChange,
  onSubmit,
  onStop,
  onToggleStudio,
  studioOpen = false,
  busy = false,
  idle = false,
  active = true,
  placeholder = "",
  onFiles,
  onExecMode,
  children,
}: CoworkComposerProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Modo de execução, persistido no localStorage (default: automático).
  const [execMode, setExecMode] = useState<ExecMode>("auto");
  useEffect(() => {
    try {
      const s = localStorage.getItem(EXEC_KEY);
      if (s === "auto" || s === "guiado") setExecMode(s);
    } catch { /* ignore */ }
  }, []);
  const toggleExec = () => {
    setExecMode((m) => {
      const next: ExecMode = m === "auto" ? "guiado" : "auto";
      try { localStorage.setItem(EXEC_KEY, next); } catch { /* ignore */ }
      onExecMode?.(next);
      return next;
    });
  };

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (list && list.length) onFiles?.(Array.from(list));
    e.target.value = "";   // permite reescolher o mesmo arquivo
  };

  // Página inteligente: entrar no módulo = entrar direto na barra de input (cursor
  // piscando), sem precisar clicar.
  //
  // Isto AQUI chutava `setTimeout(..., 60)`. O problema é que `focus()` num elemento
  // dentro de `display:none` é silenciosamente ignorado, e a sala nem sempre já está
  // pintada aos 60ms — quando não estava, o foco simplesmente não acontecia e ninguém
  // tentava de novo. O gancho espera o elemento ficar VISÍVEL em vez de apostar num
  // número. Ver lib/ui/autofoco.ts.
  // `&& !busy`: ao TERMINAR a resposta (busy true→false) o gancho re-arma e devolve o cursor
  // pra barra — o próximo prompt sai sem clicar. Não rouba de quem está escrevendo em outro campo.
  useAutoFoco(ref, active && !busy);

  // Ditado por voz (áudio → texto). Guarda o texto que já existia ao começar a gravar
  // e vai concatenando a transcrição em cima dele.
  const baseRef = useRef("");
  const { toggle: toggleMic, listening, supported: sttSupported } = useSTT({
    onResult: (t) => onChange((baseRef.current ? baseRef.current + " " : "") + t),
  });
  const onMic = () => {
    if (!listening) baseRef.current = value.trim();
    toggleMic();
  };

  // Cresce com o conteúdo até o teto (rola internamente depois disso) — igual ao Claude.
  // O teto é o max-height do CSS do textarea: 220px, mas nunca mais que 25% da tela — com 220px fixos,
  // em tela baixa/coluna estreita a caixa cobria quase metade da conversa. O max-height corta o height daqui.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [value]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !busy) onSubmit();
    }
  };

  return (
    <div className="rounded-[26px] p-[1.5px] bg-gradient-to-r from-blue-500/25 via-cyan-400/25 to-violet-500/25 shadow-[0_18px_50px_-24px_rgba(37,99,235,0.5)]">
      {/* keyframe do ⟁ ocioso: "respira" quando não há conversa ativa */}
      <style>{`
        @keyframes auraBreathe { 0%,100% { opacity:.55; transform: translateY(0) scale(1); } 50% { opacity:1; transform: translateY(-1px) scale(1.06); } }
      `}</style>
      <div className="rounded-[25px] bg-white/85 dark:bg-white/[0.06] backdrop-blur-2xl border border-white/70 dark:border-white/10 px-2.5 py-2">
        {children}
        {/* flex-wrap + min-w no texto: numa coluna estreita os botões descem pra baixo — a caixa de texto NUNCA
            some (com largura 0 ela nem recebe o foco, e o cursor não pisca) */}
        <div className="flex flex-wrap items-end gap-2">
          {/* ⟁ — indicador de estado permanente + abre/fecha o Studio.
              busy → SOBE e some da barra (ele "subiu" pra virar o ícone do loading
              lá na conversa, no AuraThinking). idle → "respira". normal → giro calmo. */}
          <div
            className="self-end mb-0.5 overflow-hidden transition-all duration-300 ease-out"
            style={{
              width: busy ? 0 : 40,
              opacity: busy ? 0 : 1,
              transform: busy ? "translateY(-12px) scale(0.6)" : "none",
              marginRight: busy ? -8 : 0,   // compensa o gap-2 quando colapsa
            }}
            aria-hidden={busy}
          >
            <button
              type="button"
              onClick={onToggleStudio}
              tabIndex={busy ? -1 : 0}
              aria-pressed={studioOpen}
              title={studioOpen ? "Fechar o Studio" : idle ? "Sem conversa ativa — abra o Studio ou fale com a Aura" : "Abrir o Studio (gerar artefatos)"}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-lg leading-none transition-colors
                ${studioOpen ? "text-white shadow-md" : "text-cyan-600 dark:text-cyan-300 hover:bg-cyan-500/10"}`}
              style={studioOpen ? { background: "linear-gradient(135deg,#2563eb,#06b6d4)" } : undefined}
            >
              <span
                className="inline-block motion-reduce:!animate-none"
                style={{ animation: idle && !studioOpen ? "auraBreathe 2.8s ease-in-out infinite" : undefined }}
              >
                <span
                  className="inline-block motion-reduce:!animate-none"
                  style={{ animation: "spin 16s linear infinite", filter: "drop-shadow(0 0 4px rgba(34,211,238,0.5))" }}
                >⟁</span>
              </span>
            </button>
          </div>

          {/* Texto — font-tech, tamanho estilo Claude */}
          <textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder={placeholder}
            className="flex-1 min-w-[8rem] max-h-[min(220px,25dvh)] resize-none overflow-y-auto bg-transparent outline-none border-0
              font-tech text-[22px] leading-[1.55] py-2 text-slate-800 dark:text-white/90
              placeholder:text-slate-400 dark:placeholder:text-white/30 custom-scrollbar"
          />

          {/* ——— Cluster da DIREITA (estilo Claude): anexar, modo, mic, enviar ——— */}

          {/* Anexar arquivo(s) */}
          <input ref={fileRef} type="file" multiple className="hidden" onChange={onPickFiles} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            title="Anexar arquivo"
            className="shrink-0 self-end mb-0.5 w-10 h-10 rounded-full flex items-center justify-center text-slate-400 dark:text-white/50 hover:bg-slate-500/10 hover:text-slate-600 dark:hover:text-white/80 transition-colors"
          >
            <Paperclip size={17} />
          </button>

          {/* Modo automático × guiado (HITL, plan-mode do Claude) */}
          <button
            type="button"
            onClick={toggleExec}
            aria-pressed={execMode === "guiado"}
            title={execMode === "auto"
              ? "Modo automático — a Aura vai ponta-a-ponta. Clique p/ modo guiado."
              : "Modo guiado — a Aura pausa p/ sua aprovação. Clique p/ modo automático."}
            className={`shrink-0 self-end mb-0.5 h-10 pl-2.5 pr-3 rounded-full flex items-center gap-1.5 text-[12px] font-tech font-medium transition-colors
              ${execMode === "guiado"
                ? "text-violet-600 dark:text-violet-300 bg-violet-500/12 hover:bg-violet-500/20"
                : "text-cyan-600 dark:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20"}`}
          >
            {execMode === "auto" ? <Zap size={15} /> : <Compass size={15} />}
            <span className="hidden sm:inline">{execMode === "auto" ? "Auto" : "Guiado"}</span>
          </button>

          {/* Microfone — áudio → texto (ditado) */}
          {sttSupported && (
            <button
              type="button"
              onClick={onMic}
              title={listening ? "Parar gravação" : "Falar (áudio → texto)"}
              aria-pressed={listening}
              className={`shrink-0 self-end mb-0.5 w-10 h-10 rounded-full flex items-center justify-center transition-colors
                ${listening
                  ? "text-white bg-rose-500 animate-pulse shadow-[0_0_16px_rgba(244,63,94,0.5)]"
                  : "text-slate-400 dark:text-white/50 hover:bg-slate-500/10 hover:text-slate-600 dark:hover:text-white/80"}`}
            >
              <Mic size={17} />
            </button>
          )}

          {/* Enviar OU Parar (gap N §7): quando ocupado e há onStop, vira botão de parar. */}
          {busy && onStop ? (
            <button
              type="button"
              onClick={onStop}
              title="Parar"
              className="shrink-0 self-end mb-0.5 w-10 h-10 rounded-full flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95"
              style={{ background: "linear-gradient(135deg,#e11d48,#f43f5e)" }}
            >
              <Square size={14} className="fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => value.trim() && !busy && onSubmit()}
              disabled={!value.trim() || busy}
              title="Enviar"
              className="shrink-0 self-end mb-0.5 w-10 h-10 rounded-full flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
              style={{ background: "linear-gradient(135deg,#2563eb,#06b6d4)" }}
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={17} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
