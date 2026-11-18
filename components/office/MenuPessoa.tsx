"use client";
/**
 * MenuPessoa — o que abre ao clicar na foto de uma pessoa na barra do escritório (#425, #427). Um menu só:
 *   "Ver perfil"                → abre a página de perfil DELA (aba Perfil, só leitura, cérebros privados).
 *   "Conversar"                 → abre a conversa de vocês (quando já são contatos);
 *   "Convidar pra conversar"    → manda o convite de contato (quando ainda não são).
 *   "Remover do escritório"     → só pro dono (regra em lib/canal/perfil podeRemover); quem chama confirma antes.
 */
import { useState } from "react";
import { MessageCircle, UserRound, UserMinus, UserPlus } from "lucide-react";
import { VIDRO_POPOVER_SOLIDO, TXT, TXT_MUDO } from "@/lib/canal/vidro";

const ITEM = "w-full min-h-[40px] px-2.5 rounded-xl flex items-center gap-2 text-left text-[12.5px] font-semibold";

export type ConversaComPessoa =
  | { tipo: "abrir"; onClick: () => void }
  | { tipo: "convidar"; onClick: () => Promise<{ ok: boolean; msg: string }> }
  | null;

export default function MenuPessoa({ pessoa, onVerPerfil, conversa, podeRemover, onRemover }: {
  pessoa: { id: string; nome: string; avatar: string | null };
  onVerPerfil: () => void;
  /** null = sem opção de conversa (ex.: é você, ou já estão na conversa de vocês). */
  conversa: ConversaComPessoa;
  podeRemover: boolean;
  onRemover: () => void;
}) {
  const [convite, setConvite] = useState<{ ok: boolean; msg: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const convidar = async () => {
    if (conversa?.tipo !== "convidar" || enviando) return;
    setEnviando(true);
    try { setConvite(await conversa.onClick()); } finally { setEnviando(false); }
  };

  return (
    <div role="dialog" aria-label={`Menu de ${pessoa.nome}`} className={`absolute right-0 top-full mt-1.5 z-30 w-[min(92vw,250px)] p-2 rounded-2xl ${VIDRO_POPOVER_SOLIDO}`}>
      <div className="flex flex-col gap-0.5">
        <p className={`px-2.5 pt-1 pb-1.5 text-[12px] font-bold truncate ${TXT}`}>{pessoa.nome}</p>
        <button type="button" onClick={onVerPerfil} className={`${ITEM} ${TXT} hover:bg-slate-500/10 dark:hover:bg-white/10`}>
          <UserRound className="w-4 h-4" aria-hidden /> Ver perfil
        </button>
        {conversa?.tipo === "abrir" && (
          <button type="button" onClick={conversa.onClick} className={`${ITEM} ${TXT} hover:bg-slate-500/10 dark:hover:bg-white/10`}>
            <MessageCircle className="w-4 h-4" aria-hidden /> Conversar
          </button>
        )}
        {conversa?.tipo === "convidar" && (
          <button type="button" onClick={() => void convidar()} disabled={enviando || !!convite?.ok}
            className={`${ITEM} ${TXT} hover:bg-slate-500/10 dark:hover:bg-white/10 disabled:opacity-50`}>
            <UserPlus className="w-4 h-4" aria-hidden /> {enviando ? "Convidando…" : "Convidar pra conversar"}
          </button>
        )}
        {podeRemover && (
          <button type="button" onClick={onRemover} className={`${ITEM} text-rose-600 dark:text-rose-300 hover:bg-rose-500/10`}>
            <UserMinus className="w-4 h-4" aria-hidden /> Remover do escritório
          </button>
        )}
        {convite && (
          <p role={convite.ok ? "status" : "alert"} className={`px-2.5 pt-1 text-[11.5px] ${convite.ok ? "text-emerald-700 dark:text-emerald-300" : TXT_MUDO}`}>{convite.msg}</p>
        )}
      </div>
    </div>
  );
}
