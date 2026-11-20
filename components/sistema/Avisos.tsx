"use client";
/**
 * Avisos — #850 (PR 2) · desenha o quadro de lib/ui/avisos.ts: os avisos pequenos embaixo (toast) e a
 * janelinha de "tem certeza?" / "qual o nome?" com o visual do app, no lugar de alert/confirm/prompt.
 *
 * - Avisos: embaixo e no meio; no celular ficam acima da barra de baixo. Leitor de tela anuncia (aria-live).
 * - Janelinha: fundo escurecido, foco preso dentro, Esc = cancelar, Enter = seguir. Em coisa séria (perigo),
 *   o foco começa no Cancelar — um Enter distraído não apaga nada.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { assinar, fecharAviso, quadroAtual, registrarDesenho, type Pergunta, type Quadro } from "@/lib/ui/avisos";
import { TOQUE, TXT, TXT_2, VIDRO_POPOVER_SOLIDO } from "@/lib/canal/vidro";

const VAZIO: Quadro = { avisos: [], pergunta: null };

export function Avisos() {
  const quadro = useSyncExternalStore(assinar, quadroAtual, () => VAZIO);
  useEffect(() => registrarDesenho(), []);
  const { t } = useTranslation();

  return (
    <>
      <div aria-live="polite" role="status"
        className="pointer-events-none fixed inset-x-0 z-[200] flex flex-col items-center gap-2 px-4 bottom-[calc(env(safe-area-inset-bottom)+88px)] sm:bottom-6">
        {quadro.avisos.map((a) => (
          <div key={a.id} data-aviso={a.tipo}
            className={`pointer-events-auto flex w-full max-w-[420px] items-center gap-3 rounded-2xl px-4 py-2.5 text-[14px] ${VIDRO_POPOVER_SOLIDO}
              ${a.tipo === "erro" ? "border-rose-400/60 text-rose-700 dark:text-rose-200" : TXT}`}>
            <span aria-hidden className="shrink-0">{a.tipo === "erro" ? "⚠️" : a.tipo === "info" ? "ℹ️" : "✓"}</span>
            <span className="min-w-0 flex-1">{a.texto}</span>
            {a.acao && (
              <button type="button" onClick={() => { a.acao!.fazer(); fecharAviso(a.id); }}
                className={`${TOQUE} -my-2 shrink-0 rounded-xl px-2 font-bold text-blue-700 dark:text-cyan-300`}>
                {a.acao.rotulo}
              </button>
            )}
            <button type="button" onClick={() => fecharAviso(a.id)} aria-label={t("avisos.fechar")}
              className={`${TOQUE} -my-2 -mr-2 shrink-0 rounded-xl ${TXT_2}`}>×</button>
          </div>
        ))}
      </div>
      {quadro.pergunta && <Janela key={quadro.pergunta.id} p={quadro.pergunta} />}
    </>
  );
}

function Janela({ p }: { p: Pergunta }) {
  const { t } = useTranslation();
  const [valor, setValor] = useState(p.valor ?? "");
  const caixa = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const seguirRef = useRef<HTMLButtonElement>(null);
  const cancelar = () => p.responder(p.modo === "texto" ? null : false);
  const seguir = () => p.responder(p.modo === "texto" ? valor : true);

  // foco: no campo (texto), no Cancelar (perigo) ou no botão de seguir; ao fechar, volta pra onde estava
  useEffect(() => {
    const antes = document.activeElement as HTMLElement | null;
    (p.modo === "texto" ? campo.current : p.perigo ? cancelarRef.current : seguirRef.current)?.focus();
    if (p.modo === "texto") campo.current?.select();
    return () => { if (antes && antes.isConnected) antes.focus(); };
  }, [p]);

  const teclas = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cancelar(); return; }
    if (e.key === "Enter" && p.modo === "texto" && e.target === campo.current) {
      e.preventDefault();
      if (p.opcional || valor.trim()) seguir();
      return;
    }
    if (e.key !== "Tab") return;
    const focaveis = [...(caixa.current?.querySelectorAll<HTMLElement>("button, input") ?? [])];
    if (!focaveis.length) return;
    const i = focaveis.indexOf(document.activeElement as HTMLElement);
    const prox = e.shiftKey ? (i <= 0 ? focaveis.length - 1 : i - 1) : (i === focaveis.length - 1 ? 0 : i + 1);
    e.preventDefault(); focaveis[prox]!.focus();
  };

  const botao = p.botao ?? (p.modo === "texto" ? t("avisos.ok") : t("avisos.confirmar"));
  return (
    <div className="fixed inset-0 z-[210] flex items-end sm:items-center justify-center bg-slate-950/55 p-3 sm:p-6"
      onMouseDown={(e) => { if (e.target === e.currentTarget) cancelar(); }}>
      <div ref={caixa} role={p.perigo ? "alertdialog" : "dialog"} aria-modal="true" aria-labelledby={`aviso-t-${p.id}`}
        aria-describedby={p.texto ? `aviso-d-${p.id}` : undefined} onKeyDown={teclas}
        className={`w-full max-w-[420px] rounded-3xl p-5 ${VIDRO_POPOVER_SOLIDO} mb-[env(safe-area-inset-bottom)]`}>
        <h2 id={`aviso-t-${p.id}`} className={`text-[16px] font-bold ${TXT}`}>{p.titulo}</h2>
        {p.texto && <p id={`aviso-d-${p.id}`} className={`mt-1.5 text-[14px] leading-relaxed ${TXT_2}`}>{p.texto}</p>}
        {p.modo === "texto" && (
          <input ref={campo} value={valor} onChange={(e) => setValor(e.target.value)} placeholder={p.dica} aria-label={p.titulo}
            className={`mt-3 w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-white/[0.06] px-3 text-[15px] ${TXT} outline-none focus:border-blue-500`} />
        )}
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button ref={cancelarRef} type="button" onClick={cancelar}
            className={`${TOQUE} rounded-2xl px-4 text-[14px] font-semibold border border-slate-300 dark:border-white/15 ${TXT}`}>
            {t("avisos.cancelar")}
          </button>
          <button ref={seguirRef} type="button" onClick={seguir} disabled={p.modo === "texto" && !p.opcional && !valor.trim()}
            className={`${TOQUE} rounded-2xl px-4 text-[14px] font-bold text-white disabled:opacity-50 ${p.perigo ? "bg-rose-600 hover:bg-rose-500" : "bg-blue-600 hover:bg-blue-500"}`}>
            {botao}
          </button>
        </div>
      </div>
    </div>
  );
}
