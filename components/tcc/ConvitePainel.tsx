"use client";

import { useState } from "react";
import { X, UserPlus, Copy, Check, Link2Off } from "lucide-react";
import type { Convite, PapelConvite } from "@/lib/tcc/client";
import { mensagemDeConvite } from "@/lib/chat/conviteTexto";

/**
 * O painel do CONVITE.
 *
 * 🔴 O texto do escopo não é enfeite: o link concede papel na CONVERSA, e portanto em TODOS os
 * trabalhos dela, inclusive os que nascerem depois (ver lib/tcc/compartilhar.ts). Quem clica em
 * "Convidar" dentro de um documento naturalmente lê "convidar para este documento" — e deixar essa
 * leitura passar seria o botão concedendo mais do que diz. Por isso a frase vem do campo `escopo`
 * que o SERVIDOR devolve, não de uma string solta aqui.
 *
 * Mora em arquivo próprio porque há DUAS portas que o abrem — o painel do documento e o topo da
 * conversa. Duas cópias desta frase seria uma delas envelhecendo em silêncio.
 */
export default function ConvitePainel({ convite, ocupado, tema, onPapel, onRevogar, onFechar }: {
  convite: Convite; ocupado: boolean;
  /** O assunto, pra frase do convite ("vem estudar comigo sobre ___"). Ausente: a frase sai sem ele. */
  tema?: string;
  onPapel: (p: PapelConvite) => void; onRevogar: () => void; onFechar: () => void;
}) {
  const [copiado, setCopiado] = useState<"msg" | "url" | null>(null);
  // o servidor devolve caminho relativo; o que a pessoa envia tem de ser o endereço inteiro
  const url = typeof window === "undefined" ? convite.url : `${window.location.origin}${convite.url}`;
  // O QUE A PESSOA COLA. Antes era o endereço cru; agora é a frase COM o link dentro — pedido do
  // dono, e o verbo muda com o papel (lib/chat/conviteTexto), porque convite que promete escrita
  // num link de leitura é promessa sem lastro.
  const mensagem = mensagemDeConvite({ url, tema, papel: convite.papel });
  const copiar = async (qual: "msg" | "url") => {
    try {
      await navigator.clipboard.writeText(qual === "msg" ? mensagem : url);
      setCopiado(qual); setTimeout(() => setCopiado(null), 2000);
    } catch { /* sem clipboard: o campo fica selecionável */ }
  };
  return (
    <div role="dialog" aria-modal="true" aria-label="Convidar colaborador"
      className="absolute inset-0 z-30 grid place-items-center bg-black/40 p-4" onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[520px] rounded-xl bg-white dark:bg-[#23262d] shadow-2xl border border-slate-200 dark:border-white/10 p-4">
        <div className="flex items-center gap-2 mb-1">
          <UserPlus size={16} className="text-[#2b579a]" aria-hidden />
          <h2 className="font-sans text-[14px] font-semibold text-slate-800 dark:text-white">Convidar para co-criar</h2>
          <span className="flex-1" />
          <button type="button" onClick={onFechar} aria-label="Fechar" className="h-7 w-7 rounded grid place-items-center text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><X size={16} /></button>
        </div>

        <p className="font-sans text-[12px] leading-snug text-slate-600 dark:text-white/70 mb-3">
          Quem abrir este link entra como <strong>{convite.papel === "editor" ? "editor" : "leitor"}</strong>
          {convite.escopo === "conversa" ? " desta conversa — e isso vale para TODOS os trabalhos dela, inclusive os próximos." : "."}
          {convite.papel === "editor" ? " Editor altera o documento junto com você, em tempo real." : " Leitor só acompanha, sem editar."}
        </p>

        <label className="sr-only" htmlFor="convite-msg">Mensagem do convite</label>
        <div className="flex items-start gap-2 mb-2">
          {/* a MENSAGEM, não o endereço: é ela que vai pro WhatsApp. Selecionável pra quem não tem clipboard. */}
          <textarea id="convite-msg" readOnly rows={2} value={mensagem} onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 resize-none rounded-md border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#1b1d22] px-2 py-1.5 font-sans text-[12px] leading-snug text-slate-700 dark:text-white/80" />
          <button type="button" onClick={() => void copiar("msg")}
            className="shrink-0 h-9 px-3 rounded-md inline-flex items-center gap-1.5 text-[12px] font-semibold text-white bg-[#2b579a] hover:bg-[#244a85]">
            {copiado === "msg" ? <Check size={14} /> : <Copy size={14} />}{copiado === "msg" ? "Copiado" : "Copiar convite"}
          </button>
        </div>
        {/* quem quer só o endereço (colar num lugar que já tem texto) não precisa editar a frase à mão */}
        <button type="button" onClick={() => void copiar("url")}
          className="mb-3 inline-flex items-center gap-1 font-sans text-[11px] font-semibold text-slate-500 dark:text-white/50 hover:text-slate-700 dark:hover:text-white/80">
          {copiado === "url" ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
          {copiado === "url" ? "Link copiado" : "Copiar só o link"}
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <span className="font-sans text-[11px] text-slate-500 dark:text-white/50">Gerar como:</span>
          {(["editor", "leitor"] as const).map((pp) => (
            <button key={pp} type="button" disabled={ocupado} onClick={() => onPapel(pp)}
              aria-pressed={convite.papel === pp}
              className={`h-7 px-2.5 rounded-md font-sans text-[11px] font-semibold border disabled:opacity-40 ${
                convite.papel === pp
                  ? "bg-[#2b579a] text-white border-[#2b579a]"
                  : "text-slate-600 dark:text-white/70 border-slate-300 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10"}`}>
              {pp === "editor" ? "Editor" : "Leitor"}
            </button>
          ))}
          <span className="flex-1" />
          <button type="button" disabled={ocupado} onClick={onRevogar}
            title="Invalida todos os links já enviados. Quem já entrou continua na conversa."
            className="h-7 px-2.5 rounded-md inline-flex items-center gap-1.5 font-sans text-[11px] font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-40">
            <Link2Off size={13} aria-hidden /> Revogar links
          </button>
        </div>
      </div>
    </div>
  );
}
