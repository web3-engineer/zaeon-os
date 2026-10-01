"use client";
/**
 * Composer do app mobile: fixo no rodapé (acima da barra de gestos), textarea que cresce
 * até 6 linhas, Enter envia (Shift+Enter quebra linha), "+" abre as ações.
 */
import { useEffect, useRef } from "react";
import { ALVO, FOCO, VIDRO } from "@/components/mobile/estilo";

export function MobileComposer({ valor, onMudar, onEnviar, onMais, desabilitado, placeholder, rotuloEnviar = "Enviar" }: {
  valor: string;
  onMudar: (v: string) => void;
  onEnviar: () => void;
  onMais?: () => void;
  desabilitado?: boolean;
  placeholder: string;
  rotuloEnviar?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  // auto-grow: volta a 1 linha e cresce até o teto (o resto rola dentro do campo)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 6 * 24 + 20) + "px";
  }, [valor]);
  const podeEnviar = !desabilitado && !!valor.trim();
  return (
    <form
      // nomeado = landmark "form": quem usa leitor de tela pula direto pro campo
      aria-label="Escrever mensagem"
      onSubmit={(e) => { e.preventDefault(); if (podeEnviar) onEnviar(); }}
      className={`sticky bottom-0 z-20 border-t ${VIDRO} px-3 pt-2`}
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-end gap-2">
        {onMais && (
          <button type="button" onClick={onMais} aria-label="Mais ações" aria-haspopup="dialog"
            className={`${ALVO} ${FOCO} shrink-0 rounded-full text-2xl leading-none text-slate-700 dark:text-white/80 hover:bg-slate-900/5 dark:hover:bg-white/10`}>
            +
          </button>
        )}
        <label htmlFor="m-composer" className="sr-only">Mensagem</label>
        <textarea
          id="m-composer" ref={ref} rows={1} value={valor} placeholder={placeholder}
          onChange={(e) => onMudar(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (podeEnviar) onEnviar(); } }}
          enterKeyHint="send"
          className={`${FOCO} min-h-[44px] flex-1 resize-none rounded-2xl border border-slate-300/70 dark:border-white/15 bg-white/80 dark:bg-white/[0.06] px-4 py-2.5 text-[16px] leading-6 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-white/40`}
        />
        <button type="submit" disabled={!podeEnviar} aria-label={rotuloEnviar}
          className={`${ALVO} ${FOCO} shrink-0 rounded-full bg-cyan-700 text-white text-lg disabled:opacity-40 dark:bg-cyan-500 dark:text-slate-950`}>
          ↑
        </button>
      </div>
    </form>
  );
}
