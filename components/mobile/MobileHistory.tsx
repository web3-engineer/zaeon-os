"use client";
/**
 * Drawer de histórico: conversas de Estudos (locais, por aparelho) e pesquisas (servidor).
 * Diálogo acessível: role=dialog, Esc fecha, foco entra no drawer e Tab circula dentro dele.
 */
import { useEffect, useRef, useState } from "react";
import { ALVO, FOCO } from "@/components/mobile/estilo";

export type ConversaLocal = { id: string; titulo: string; at: number };

export function MobileHistory({ aberto, onFechar, surface, conversas, onAbrirConversa, onNovaConversa, onAbrirPesquisa }: {
  aberto: boolean;
  onFechar: () => void;
  surface: "estudos" | "pesquisa";
  conversas: ConversaLocal[];
  onAbrirConversa: (id: string) => void;
  onNovaConversa: () => void;
  onAbrirPesquisa: (id: string) => void;
}) {
  const painel = useRef<HTMLDivElement>(null);
  const [pesquisas, setPesquisas] = useState<Array<{ id: string; query: string; status: string }>>([]);

  useEffect(() => {
    if (!aberto || surface !== "pesquisa") return;
    let vivo = true;
    fetch("/api/ai/scholar/sessions")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivo && Array.isArray(d?.sessions)) setPesquisas(d.sessions); })
      .catch(() => { /* offline: lista vazia */ });
    return () => { vivo = false; };
  }, [aberto, surface]);

  useEffect(() => {
    if (!aberto) return;
    const el = painel.current;
    el?.querySelector<HTMLElement>("button")?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onFechar(); return; }
      if (e.key !== "Tab" || !el) return;
      // prende o Tab dentro do drawer (sem isso o foco "vaza" pra página de trás)
      const focaveis = [...el.querySelectorAll<HTMLElement>("button, a[href]")].filter((x) => !x.hasAttribute("disabled"));
      if (!focaveis.length) return;
      const [pri, ult] = [focaveis[0], focaveis[focaveis.length - 1]];
      if (e.shiftKey && document.activeElement === pri) { e.preventDefault(); ult.focus(); }
      else if (!e.shiftKey && document.activeElement === ult) { e.preventDefault(); pri.focus(); }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aberto, onFechar]);

  if (!aberto) return null;
  const item = `${ALVO} ${FOCO} w-full rounded-xl px-3 py-2.5 text-left text-[15px] text-slate-800 dark:text-white/85 hover:bg-slate-900/5 dark:hover:bg-white/10`;
  return (
    <div className="fixed inset-0 z-50 flex" role="presentation">
      <div ref={painel} role="dialog" aria-modal="true" aria-label="Histórico"
        className="relative h-full w-[85%] max-w-sm overflow-y-auto bg-white dark:bg-slate-950 px-3"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))", paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Histórico</h2>
          <button type="button" onClick={onFechar} aria-label="Fechar histórico" className={`${ALVO} ${FOCO} rounded-full text-xl text-slate-600 dark:text-white/70`}>×</button>
        </div>
        {surface === "estudos" ? (
          <>
            <button type="button" onClick={() => { onNovaConversa(); onFechar(); }} className={`${item} font-semibold text-cyan-800 dark:text-cyan-300`}>+ Nova conversa</button>
            <ul className="mt-1">
              {conversas.length === 0 && <li className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">Nenhuma conversa ainda.</li>}
              {conversas.map((c) => (
                <li key={c.id}><button type="button" onClick={() => { onAbrirConversa(c.id); onFechar(); }} className={item}>{c.titulo}</button></li>
              ))}
            </ul>
          </>
        ) : (
          <ul>
            {pesquisas.length === 0 && <li className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">Nenhuma pesquisa ainda.</li>}
            {pesquisas.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => { onAbrirPesquisa(p.id); onFechar(); }} className={item}>
                  {p.query}{p.status !== "done" ? <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">({p.status === "error" ? "falhou" : "em andamento"})</span> : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button type="button" aria-label="Fechar" tabIndex={-1} onClick={onFechar} className="flex-1 bg-black/40" />
    </div>
  );
}
