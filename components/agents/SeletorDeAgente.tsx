"use client";
/**
 * SeletorDeAgente — clicar no ROSTO do agente na aba de conversa abre esta lista: Aura, Zenita, Nina (cada uma é o avatar
 * do painel dos documentos), Octa Code (se adicionado no
 * Marketplace)… Escolher outro dispara a troca (quem chama mostra o loading até a tela do novo agente estar pronta).
 * Vai num portal com posição fixa: a sidebar recorta o que passa da borda dela.
 */
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Trans, useTranslation } from "react-i18next";
import type { AgenteChat, AgenteChatId } from "@/lib/agents/chatAgentes";

export default function SeletorDeAgente({ ancora, agentes, atual, icone, onEscolher, onFechar }: {
  ancora: DOMRect;
  agentes: AgenteChat[];
  atual: AgenteChatId;
  icone: (id: AgenteChatId) => React.ReactNode;
  onEscolher: (id: AgenteChatId) => void;
  onFechar: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  useEffect(() => {
    const fora = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) onFechar(); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onFechar(); };
    const t = setTimeout(() => document.addEventListener("mousedown", fora), 0);
    document.addEventListener("keydown", esc);
    ref.current?.querySelector<HTMLButtonElement>("[aria-checked=true]")?.focus();
    return () => { clearTimeout(t); document.removeEventListener("mousedown", fora); document.removeEventListener("keydown", esc); };
  }, [onFechar]);

  const naDireita = ancora.left < window.innerWidth / 2;
  const estilo: React.CSSProperties = {
    top: Math.min(ancora.top, window.innerHeight - 64 - agentes.length * 56),
    ...(naDireita ? { left: ancora.right + 12 } : { right: window.innerWidth - ancora.left + 12 }),
  };

  return createPortal(
    <div ref={ref} role="menu" aria-label={t("labSidebar.agent")} style={estilo}
      className="fixed z-[700] w-[248px] p-1.5 rounded-2xl border backdrop-blur-2xl shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6)]
        bg-white/90 border-blue-200/80 dark:bg-[rgba(22,22,34,0.92)] dark:border-white/10">
      <div className="px-2.5 pt-1.5 pb-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-white/40">{t("labSidebar.chatWith")}</div>
      {agentes.map((a) => (
        <button key={a.id} type="button" role="menuitemradio" aria-checked={a.id === atual}
          onClick={() => (a.id === atual ? onFechar() : onEscolher(a.id))}
          className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
            ${a.id === atual ? "bg-blue-500/10 dark:bg-white/[0.08]" : "hover:bg-slate-100 dark:hover:bg-white/[0.06]"}`}>
          <span className="grid place-items-center w-8 h-8 rounded-full shrink-0 bg-slate-100 dark:bg-white/5 text-cyan-600 dark:text-cyan-300">{icone(a.id)}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-bold text-slate-900 dark:text-white">{a.nome}</span>
            <span className="block text-[11px] text-slate-500 dark:text-white/50 truncate">{t(`labSidebar.agentRole.${a.id}`, { defaultValue: a.papel })}</span>
          </span>
          {a.id === atual && <span className="text-cyan-500 text-[13px]" aria-hidden>✓</span>}
        </button>
      ))}
      {!agentes.some((a) => a.id === "octa") && (
        <p className="px-2.5 pt-1 pb-1.5 text-[11px] leading-snug text-slate-500 dark:text-white/45"><Trans i18nKey="labSidebar.moreAgents" components={{ b: <b /> }} /></p>
      )}
    </div>,
    document.body,
  );
}
