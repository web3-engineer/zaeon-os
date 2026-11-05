"use client";
/**
 * As conversas de uma sala que NÃO está aberta, embaixo do nome dela na sidebar principal: o
 * "+ Nova" e as recentes (lidas do aparelho — lib/chat/threads). Clicar entra na sala e abre a
 * conversa (lib/chat/conversasNav). A sala aberta usa a lista completa (ConversasSidebar), por portal.
 */
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { arvoreDeThreads, listarThreads, rotulosDasThreads, ESCOPO_COWORK, ESCOPO_PESQUISA, type Thread } from "@/lib/chat/threads";
import { useArmazemDaConta } from "@/lib/chat/contaNoNavegador";
import { pedirConversa, type SalaChat } from "@/lib/chat/conversasNav";

export default function ConversasDaSala({ sala, onEntrar, max = 5 }: {
  sala: SalaChat;
  /** troca a sala ativa (a página) */
  onEntrar: () => void;
  max?: number;
}) {
  const [recentes, setRecentes] = useState<Thread[]>([]);
  const area = useArmazemDaConta();
  useEffect(() => {
    setRecentes([]);
    if (!area) return;
    try {
      const lista = listarThreads(area.armazem, sala === "pesquisa" ? ESCOPO_PESQUISA : ESCOPO_COWORK);
      setRecentes(arvoreDeThreads(lista).map((n) => n.thread).slice(0, max));
    } catch { /* aba anônima: só o "+ Nova" */ }
  }, [sala, max, area]);

  // #705: títulos repetidos ganham a data
  const rotulos = rotulosDasThreads(recentes);
  const ir = (p: { id?: string; nova?: boolean }) => { pedirConversa({ sala, ...p }); onEntrar(); };
  return (
    <div className="flex flex-col gap-0.5">
      <button type="button" onClick={() => ir({ nova: true })} title={sala === "pesquisa" ? "Nova pesquisa" : "Nova conversa"} aria-label={sala === "pesquisa" ? "Nova pesquisa" : "Nova conversa"}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] font-semibold text-slate-700 dark:text-white/75 hover:bg-slate-900/[0.05] dark:hover:bg-white/[0.06]">
        <Plus size={14} /> Nova
      </button>
      {recentes.map((t) => (
        <button key={t.id} type="button" onClick={() => ir({ id: t.id })} title={rotulos.get(t.id) ?? t.titulo}
          className="text-left truncate px-2 py-1.5 rounded-lg text-[12.5px] text-slate-600 dark:text-white/60 hover:bg-slate-900/[0.05] dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white">
          {rotulos.get(t.id) ?? t.titulo}
        </button>
      ))}
    </div>
  );
}
