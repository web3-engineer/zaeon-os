"use client";
/**
 * SeletorModelo — a pílula "✦ Gemini 3.5 Flash ▾" no composer do chat: o aluno escolhe com qual modelo fala
 * (lib/chat/modelos). SeloModelo — o selo discreto debaixo da resposta com QUEM RESPONDEU DE VERDADE
 * (o que o servidor usou, inclusive um fallback), pra ninguém precisar adivinhar.
 */
import { useEffect, useRef, useState } from "react";
import { CHAVE_MODELO, MODELOS_CHAT, MODELO_PADRAO, modeloDoId, type ModeloChat } from "@/lib/chat/modelos";

/** A escolha do aparelho (localStorage), com o padrão quando não há ou o id saiu do catálogo. */
export function useModeloEscolhido(): [ModeloChat, (id: string) => void] {
  const [id, setId] = useState<string>(MODELO_PADRAO);
  useEffect(() => {
    try { const salvo = localStorage.getItem(CHAVE_MODELO); if (modeloDoId(salvo)) setId(salvo!); } catch { /* sem storage: padrão */ }
  }, []);
  const escolher = (novo: string) => {
    if (!modeloDoId(novo)) return;
    setId(novo);
    try { localStorage.setItem(CHAVE_MODELO, novo); } catch { /* só não lembra */ }
  };
  return [modeloDoId(id) ?? MODELOS_CHAT[0], escolher];
}

/** Rótulo e cores por provedor — o catálogo mistura Google, Zaeon (local) e Claude (Anthropic). */
const PROVEDOR: Record<ModeloChat["provedor"], { rotulo: string; pilula: string; simbolo: string }> = {
  google: { rotulo: "Google", pilula: "text-sky-700 dark:text-sky-300 border-sky-500/40 bg-sky-500/10", simbolo: "text-sky-600 dark:text-sky-300" },
  zaeon: { rotulo: "Zaeon", pilula: "text-emerald-700 dark:text-emerald-300 border-emerald-500/45 bg-emerald-500/10", simbolo: "text-emerald-600 dark:text-emerald-300" },
  anthropic: { rotulo: "Claude", pilula: "text-violet-700 dark:text-violet-300 border-violet-500/45 bg-violet-500/10", simbolo: "text-violet-600 dark:text-violet-300" },
};
const corDo = (m: ModeloChat) => PROVEDOR[m.provedor].pilula;

export function SeletorModelo({ valor, onChange, desabilitado }: { valor: ModeloChat; onChange: (id: string) => void; desabilitado?: boolean }) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (!raiz.current?.contains(e.target as Node)) setAberto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", fora); document.removeEventListener("keydown", esc); };
  }, [aberto]);

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        disabled={desabilitado}
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        title={`Modelo: ${valor.nome} — ${valor.descricao}. Clique para trocar.`}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-bold font-tech border transition-colors disabled:opacity-50 ${corDo(valor)}`}
      >
        <span aria-hidden className="text-[12px] leading-none">{valor.simbolo}</span>
        {valor.nome}
        <span aria-hidden className="text-[9px] opacity-70">▾</span>
      </button>
      {aberto && (
        <ul
          role="listbox"
          aria-label="Escolher o modelo"
          className="absolute bottom-full mb-2 left-0 z-[80] w-[17.5rem] rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0b0d14]/95 backdrop-blur-xl shadow-xl p-1.5"
        >
          {MODELOS_CHAT.map((m, i) => {
            const sel = m.id === valor.id;
            const separa = i > 0 && MODELOS_CHAT[i - 1].provedor !== m.provedor;
            return (
              <li key={m.id} role="option" aria-selected={sel} className={separa ? "mt-1 pt-1 border-t border-slate-200/70 dark:border-white/10" : ""}>
                <button
                  type="button"
                  onClick={() => { onChange(m.id); setAberto(false); }}
                  className={`w-full text-left flex items-start gap-2 px-2.5 py-2 rounded-xl transition-colors ${sel ? "bg-slate-100 dark:bg-white/10" : "hover:bg-slate-50 dark:hover:bg-white/5"}`}
                >
                  <span aria-hidden className={`mt-0.5 text-[13px] ${PROVEDOR[m.provedor].simbolo}`}>{m.simbolo}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[12.5px] font-semibold text-slate-900 dark:text-white">
                      {m.nome}
                      <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-white/40">{PROVEDOR[m.provedor].rotulo}</span>
                    </span>
                    <span className="block text-[11px] text-slate-500 dark:text-white/50">{m.descricao}</span>
                  </span>
                  {sel && <span aria-hidden className="text-[12px] text-slate-500">✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** O selo debaixo da resposta: quem respondeu de verdade (nome vindo do servidor). */
export function SeloModelo({ nome }: { nome: string }) {
  const local = /· local$/.test(nome);
  const reserva = /· reserva$/.test(nome);
  return (
    <span
      title={reserva ? "O Google falhou e a reserva respondeu" : local ? "Respondido no servidor da Zaeon" : "Modelo que respondeu"}
      className={`inline-flex items-center gap-1 text-[10.5px] font-semibold font-tech px-1.5 py-0.5 rounded-md border
        ${local ? "text-emerald-700 dark:text-emerald-300 border-emerald-500/30" : reserva ? "text-amber-700 dark:text-amber-300 border-amber-500/30" : "text-slate-500 dark:text-white/45 border-slate-200 dark:border-white/10"}`}
    >
      <span aria-hidden>{local ? "⬢" : reserva ? "↺" : "✦"}</span>
      {nome}
    </span>
  );
}
