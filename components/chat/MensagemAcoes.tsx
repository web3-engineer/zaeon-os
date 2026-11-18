"use client";

/**
 * MensagemAcoes — a linha discreta de ações embaixo de cada mensagem, como no ChatGPT/Claude.
 *
 * Resposta da IA: copiar · regenerar · 👍/👎 · aprofundar num sub-tema (sub-conversa).
 * Pergunta do aluno: copiar · editar e reenviar.
 *
 * No desktop (quem tem hover) aparece ao passar o mouse na mensagem — a mensagem precisa da
 * classe `group/msg`; no toque fica sempre visível. Teclado: ganha foco → aparece também.
 * Ordem na resposta: conteúdo → ESTAS ações → botões do harness → Fontes.
 */
import { useEffect, useRef, useState } from "react";
import { Check, Copy, GitBranchPlus, Pencil, RotateCcw, Square, ThumbsDown, ThumbsUp, Volume2 } from "lucide-react";
import { EVT_FEEDBACK, lerVotos, votar, type Voto } from "@/lib/chat/feedback";
import { useTTS } from "@/lib/voice/useTTS";

const VISIBILIDADE =
  "transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/msg:opacity-100 focus-within:!opacity-100";
const BTN =
  // #845: no toque, 40×40 (copiar, ouvir, refazer… eram 28 px — difícil de acertar com o dedo)
  "w-7 h-7 [@media(hover:none)]:w-10 [@media(hover:none)]:h-10 rounded-lg flex items-center justify-center text-slate-500 dark:text-white/55 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors disabled:opacity-30 disabled:pointer-events-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500";

async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    // http sem permissão / navegador antigo: o truque do textarea ainda funciona.
    try {
      const ta = document.createElement("textarea");
      ta.value = texto;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function BotaoCopiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(t.current), []);
  return (
    <button
      type="button"
      className={`${BTN} ${copiado ? "!w-auto px-2 gap-1 text-emerald-600 dark:text-emerald-300" : ""}`}
      onClick={async () => {
        if (!(await copiarTexto(texto))) return;
        setCopiado(true);
        clearTimeout(t.current);
        t.current = setTimeout(() => setCopiado(false), 1600);
      }}
      aria-label={copiado ? "Copiado" : "Copiar"}
      title={copiado ? "Copiado" : "Copiar"}
    >
      {copiado ? <><Check size={14} /><span className="text-[11px] font-semibold">copiado</span></> : <Copy size={14} />}
    </button>
  );
}

/**
 * Ouvir a resposta na voz do app (ttsController — um áudio só no app inteiro). O rosto do agente
 * fala junto, com a boca seguindo o volume (usePublicarPresenca). Clicar de novo = parar.
 */
function BotaoOuvir({ texto }: { texto: string }) {
  const tts = useTTS();
  const [meu, setMeu] = useState(false);
  const ativo = meu && (tts.speaking || tts.loading);
  useEffect(() => { if (!tts.speaking && !tts.loading) setMeu(false); }, [tts.speaking, tts.loading]);
  return (
    <button
      type="button"
      className={`${BTN} ${ativo ? "!text-cyan-600 dark:!text-cyan-300" : ""}`}
      onClick={() => { if (ativo) { tts.stop(); setMeu(false); } else { setMeu(true); void tts.speak(texto); } }}
      aria-pressed={ativo}
      aria-label={ativo ? "Parar de ouvir" : "Ouvir resposta"}
      title={ativo ? "Parar de ouvir" : "Ouvir resposta"}
    >
      {ativo ? <Square size={13} /> : <Volume2 size={14} />}
    </button>
  );
}

export function AcoesResposta({ msgId, texto, onRegenerar, onAprofundar, ocupado = false, className = "" }: {
  msgId: string;
  /** O que vai pro clipboard (texto puro da resposta). */
  texto: string;
  onRegenerar?: () => void;
  /** Abre uma sub-conversa (sub-tema do mesmo nicho) ligada à conversa atual. */
  onAprofundar?: () => void;
  /** Respondendo agora: regenerar/aprofundar esperam. */
  ocupado?: boolean;
  className?: string;
}) {
  const [voto, setVoto] = useState<Voto | null>(null);
  useEffect(() => { setVoto(lerVotos(localStorage)[msgId] ?? null); }, [msgId]);
  const dar = (v: Voto) => {
    const novo = voto === v ? null : v;
    votar(localStorage, msgId, novo);
    setVoto(novo);
    window.dispatchEvent(new CustomEvent(EVT_FEEDBACK, { detail: { msgId, voto: novo } }));
  };
  if (!texto.trim()) return null;
  return (
    <div className={`flex items-center gap-0.5 mt-1.5 ${VISIBILIDADE} ${className}`} role="toolbar" aria-label="Ações da resposta">
      <BotaoCopiar texto={texto} />
      <BotaoOuvir texto={texto} />
      {onRegenerar && (
        <button type="button" className={BTN} onClick={onRegenerar} disabled={ocupado} aria-label="Regenerar resposta" title="Regenerar resposta">
          <RotateCcw size={14} />
        </button>
      )}
      <button type="button" className={`${BTN} ${voto === "up" ? "!text-emerald-600 dark:!text-emerald-300" : ""}`} onClick={() => dar("up")} aria-pressed={voto === "up"} aria-label="Boa resposta" title="Boa resposta">
        <ThumbsUp size={14} />
      </button>
      <button type="button" className={`${BTN} ${voto === "down" ? "!text-rose-600 dark:!text-rose-300" : ""}`} onClick={() => dar("down")} aria-pressed={voto === "down"} aria-label="Resposta ruim" title="Resposta ruim">
        <ThumbsDown size={14} />
      </button>
      {onAprofundar && (
        <button type="button" className={BTN} onClick={onAprofundar} disabled={ocupado} aria-label="Aprofundar num sub-tema" title="Aprofundar num sub-tema (nova sub-conversa)">
          <GitBranchPlus size={14} />
        </button>
      )}
    </div>
  );
}

export function AcoesPergunta({ texto, onEditar, ocupado = false, className = "" }: {
  texto: string;
  onEditar?: () => void;
  ocupado?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-end gap-0.5 mt-1 ${VISIBILIDADE} ${className}`} role="toolbar" aria-label="Ações da pergunta">
      <BotaoCopiar texto={texto} />
      {onEditar && (
        <button type="button" className={BTN} onClick={onEditar} disabled={ocupado} aria-label="Editar a pergunta" title="Editar e reenviar">
          <Pencil size={14} />
        </button>
      )}
    </div>
  );
}

/** Edição da pergunta no lugar (estilo ChatGPT): Enter reenvia, Esc cancela. */
export function EdicaoPergunta({ inicial, onEnviar, onCancelar }: {
  inicial: string;
  onEnviar: (texto: string) => void;
  onCancelar: () => void;
}) {
  const [texto, setTexto] = useState(inicial);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);
  const enviar = () => { const t = texto.trim(); if (t) onEnviar(t); };
  return (
    <div className="w-full max-w-[88%] rounded-2xl border border-cyan-400/50 bg-white dark:bg-white/[0.06] p-2">
      <textarea
        ref={ref}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") { e.preventDefault(); onCancelar(); }
          else if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); enviar(); }
        }}
        rows={Math.min(8, Math.max(2, texto.split("\n").length))}
        aria-label="Editar a pergunta"
        className="w-full resize-none bg-transparent px-2 py-1 text-[16px] leading-relaxed text-slate-900 dark:text-white outline-none"
      />
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancelar} className="px-3 py-1.5 rounded-full text-[12px] font-semibold text-slate-600 dark:text-white/70 hover:bg-slate-900/5 dark:hover:bg-white/10">Cancelar</button>
        <button type="button" onClick={enviar} disabled={!texto.trim()} className="px-3 py-1.5 rounded-full text-[12px] font-semibold bg-black text-white dark:bg-white dark:text-black disabled:opacity-40">Enviar</button>
      </div>
    </div>
  );
}
