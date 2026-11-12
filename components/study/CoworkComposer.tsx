"use client";

/**
 * CoworkComposer — a janela de input do co-working, no padrão do chat do Claude:
 * textarea que cresce com o conteúdo, fonte tech (~15px), Enter envia, Shift+Enter
 * quebra linha. O ⟁ PERMANECE aqui e abre/fecha a seção Studio. Um botão de envio
 * (seta) à direita. É uma casca controlada — a lógica vive no StudyCoworkChat.
 */

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, Mic, Paperclip, Zap, Compass, Square, SlidersHorizontal, Camera } from "lucide-react";
import dynamic from "next/dynamic";
import useSTT, { TEXTO_AVISO_STT } from "@/lib/voice/useSTT";

// Carregado sob demanda (usa APIs de mídia do navegador): não entra no bundle de quem nunca abre a câmera.
const CameraAoVivo = dynamic(() => import("@/components/chat/CameraAoVivo"), { ssr: false });
import { avisarMicrofone } from "@/lib/research/zaeonEventos";
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
  /**
   * #713: as opções da conversa (base, agente, modelo, modo pesquisa, árvore). No celular ficam recolhidas num botão —
   * abertas, a caixa ocupava um quarto da tela; no computador aparecem sempre, como antes.
   */
  opcoes?: React.ReactNode;
  /** alguma opção fora do normal está ligada (ex.: modo pesquisa): o botão das opções ganha um ponto */
  opcoesAtivas?: boolean;
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
  opcoes,
  opcoesAtivas = false,
}: CoworkComposerProps) {
  const [verOpcoes, setVerOpcoes] = useState(false);
  const [camAberta, setCamAberta] = useState(false);
  // Câmera ao vivo ("be my eyes"): o botão só aparece quando o servidor diz que a câmera está ligada
  // (/api/ai/capabilities → `camera`: flag VISAO_CAMERA + credencial Vertex). Default false, falha quieto.
  const [cameraDisponivel, setCameraDisponivel] = useState(false);
  useEffect(() => {
    let vivo = true;
    fetch("/api/ai/capabilities")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (vivo && j && typeof j.camera === "boolean") setCameraDisponivel(j.camera); })
      .catch(() => { /* sem capabilities = sem botão de câmera, e tudo bem */ });
    return () => { vivo = false; };
  }, []);
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
  // #749: contínuo + desliga sozinho depois de 2,5 s de pausa (no modo de uma frase, o Edge às vezes devolvia vazio)
  const { start: ligarMic, stop: desligarMic, listening, supported: sttSupported, ouviu, aviso: avisoMic, limparAviso: limparAvisoMic } = useSTT({
    pausaMs: 2500,
    onResult: (t) => onChange((baseRef.current ? baseRef.current + " " : "") + t),
  });
  // #733: o aviso de por que o microfone desligou some sozinho depois de uns segundos
  useEffect(() => { if (!avisoMic) return; const t = setTimeout(limparAvisoMic, 6000); return () => clearTimeout(t); }, [avisoMic, limparAvisoMic]);
  // #756: com a avatar 3D desenhando, o microfone não trazia texto. Ao tocar no 🎤: "Preparando o microfone…", a avatar
  // faz a pose de pensativa e congela (lib/research/zaeonEventos), e SÓ ENTÃO o microfone liga. Desligou (por qualquer
  // motivo): ela descongela.
  const [preparandoMic, setPreparandoMic] = useState(false);
  const pedidoMic = useRef(0);
  const micAberto = useRef(false);
  const onMic = async () => {
    if (listening || preparandoMic) {
      pedidoMic.current++; setPreparandoMic(false); desligarMic();
      if (micAberto.current) { micAberto.current = false; void avisarMicrofone(false); }
      return;
    }
    baseRef.current = value.trim();
    const meu = ++pedidoMic.current;
    setPreparandoMic(true); limparAvisoMic();
    micAberto.current = true;
    await avisarMicrofone(true);
    if (pedidoMic.current !== meu) return;   // tocou de novo enquanto preparava: cancelou
    setPreparandoMic(false);
    ligarMic();
  };
  useEffect(() => {
    if (listening || preparandoMic || !micAberto.current) return;
    micAberto.current = false; void avisarMicrofone(false);
  }, [listening, preparandoMic]);
  useEffect(() => () => { if (micAberto.current) void avisarMicrofone(false); }, []);
  const micAtivo = listening || preparandoMic;

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
        {/* #728: em tela BAIXA (janela pequena, notebook com zoom) também recolhem — a caixa ocupava quase metade da altura */}
        {opcoes && <div id="opcoes-da-conversa" className={verOpcoes ? "" : `hidden sm:block [@media(max-height:640px)]:!hidden`}>{opcoes}</div>}
        {children}
        {/* #733: o microfone diz o que está fazendo — antes só o botão piscava, e a pessoa falava sem saber se ele ouvia */}
        {sttSupported && (micAtivo || avisoMic) && (
          <div role="status" data-microfone className={`mx-1 mb-1 flex items-center gap-2 rounded-xl px-3 py-1.5 text-[12.5px] font-medium
            ${micAtivo ? "bg-rose-500/10 text-rose-700 dark:text-rose-200" : "bg-amber-500/10 text-amber-800 dark:text-amber-100"}`}>
            {preparandoMic ? (<>
              <span aria-hidden className="h-2 w-2 shrink-0 rounded-full border border-rose-400 border-t-transparent animate-spin" />
              <span>Preparando o microfone…</span>
            </>) : listening ? (<>
              <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-rose-500 animate-pulse" />
              <span>{ouviu ? "Ouvindo… quando parar de falar, ele desliga sozinho." : "Ouvindo… pode falar. O texto aparece aqui embaixo."}</span>
            </>) : avisoMic ? <span>{TEXTO_AVISO_STT[avisoMic]}</span> : null}
          </div>
        )}
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
              className={`w-11 h-11 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-lg leading-none transition-colors
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
            // celular: o texto ocupa a 1ª linha inteira e os botões ficam embaixo (antes os botões espremiam a caixa);
            // 17px no celular (≥16 = o iPhone não dá zoom ao focar)
            className="order-first basis-full md:order-none md:basis-auto flex-1 min-w-[8rem] max-h-[min(220px,25dvh)] resize-none overflow-y-auto bg-transparent outline-none border-0
              font-tech text-[17px] md:text-[22px] leading-[1.55] py-2 px-1 md:px-0 text-slate-800 dark:text-white/90
              placeholder:text-slate-400 dark:placeholder:text-white/30 custom-scrollbar"
          />

          {/* ——— Cluster da DIREITA (estilo Claude): anexar, modo, mic, enviar ——— */}

          {/* Anexar arquivo(s) */}
          <input ref={fileRef} type="file" multiple className="hidden" onChange={onPickFiles} />
          {/* #713: no celular, as opções da conversa abrem por aqui */}
          {opcoes && (
            <button
              type="button"
              onClick={() => setVerOpcoes((v) => !v)}
              aria-expanded={verOpcoes}
              aria-controls="opcoes-da-conversa"
              aria-label={verOpcoes ? "Esconder as opções da conversa" : "Mostrar as opções da conversa"}
              title="Opções da conversa"
              className={`sm:hidden [@media(max-height:640px)]:!flex relative shrink-0 self-end mb-0.5 w-11 h-11 rounded-full flex items-center justify-center transition-colors
                ${verOpcoes ? "text-cyan-600 dark:text-cyan-300 bg-cyan-500/10" : "text-slate-500 dark:text-white/60 hover:bg-slate-500/10"}`}
            >
              <SlidersHorizontal size={17} />
              {opcoesAtivas && !verOpcoes && <span aria-hidden className="absolute right-2 top-2 h-2 w-2 rounded-full bg-violet-500" />}
            </button>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            title="Anexar arquivo"
            aria-label="Anexar arquivo"
            className="ml-auto shrink-0 self-end mb-0.5 w-11 h-11 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-slate-400 dark:text-white/50 hover:bg-slate-500/10 hover:text-slate-600 dark:hover:text-white/80 transition-colors"
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
            className={`shrink-0 self-end mb-0.5 h-11 sm:h-10 pl-2.5 pr-3 rounded-full flex items-center gap-1.5 text-[12px] font-tech font-medium transition-colors
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
              onClick={() => { void onMic(); }}
              title={micAtivo ? "Parar gravação" : "Falar (áudio → texto)"}
              aria-pressed={micAtivo}
              aria-label={micAtivo ? "Parar gravação" : "Falar"}
              className={`shrink-0 self-end mb-0.5 w-11 h-11 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors
                ${micAtivo
                  ? "text-white bg-rose-500 animate-pulse shadow-[0_0_16px_rgba(244,63,94,0.5)]"
                  : "text-slate-400 dark:text-white/50 hover:bg-slate-500/10 hover:text-slate-600 dark:hover:text-white/80"}`}
            >
              <Mic size={17} />
            </button>
          )}

          {/* Câmera ao vivo — "be my eyes" (flag VISAO_CAMERA + credencial Vertex; vem de capabilities) */}
          {cameraDisponivel && (
            <button
              type="button"
              onClick={() => setCamAberta(true)}
              title="Câmera ao vivo — descrever o que a câmera vê"
              aria-label="Abrir câmera ao vivo"
              className="shrink-0 self-end mb-0.5 w-11 h-11 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-slate-400 dark:text-white/50 hover:bg-slate-500/10 hover:text-slate-600 dark:hover:text-white/80 transition-colors"
            >
              <Camera size={17} />
            </button>
          )}
          {camAberta && <CameraAoVivo onFechar={() => setCamAberta(false)} />}

          {/* Enviar OU Parar (gap N §7): quando ocupado e há onStop, vira botão de parar. */}
          {busy && onStop ? (
            <button
              type="button"
              onClick={onStop}
              title="Parar"
              className="shrink-0 self-end mb-0.5 w-11 h-11 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95"
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
              data-tour="enviar"
              className="shrink-0 self-end mb-0.5 w-11 h-11 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
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
