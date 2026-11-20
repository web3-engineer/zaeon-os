"use client";
/**
 * SinoConvites — o sino de notificações do escritório (#423), entre o seletor de escritórios e o "+".
 * Por enquanto só convites: os recebidos (Aceitar / Recusar), os que você enviou e o histórico com o
 * status de cada um. Regras (lista, frases, bolinha) em lib/canal/sino.ts; dados e chamadas no CoworkingCanal.
 * Visual: o vidro do escritório (lib/canal/vidro) + o sino do lucide-react, como o resto do app.
 * #425: data/hora em cada aviso ("agora", "há 5 min", "ontem", "16/10") e o "Limpar" (só os já respondidos);
 * clicar num convite ACEITO abre a conversa com a pessoa (e o sino fecha).
 */
import { useRef } from "react";
import { Bell } from "lucide-react";
import { useCabeNaTela } from "@/lib/ui/useCabeNaTela";
import AgentAvatar from "@/components/agents/AgentAvatar";
import { podeLimpar, tempoRelativo, type ItemSino } from "@/lib/canal/sino";
import { VIDRO_CHIP, VIDRO_POPOVER_SOLIDO, TXT, TXT_2, TXT_MUDO, TOQUE } from "@/lib/canal/vidro";

const ROTULO: Record<ItemSino["status"], string> = { pendente: "pendente", aceito: "aceito", recusado: "recusado" };
const COR: Record<ItemSino["status"], string> = {
  pendente: "bg-amber-400/20 text-amber-800 dark:text-amber-200",
  aceito: "bg-emerald-400/20 text-emerald-800 dark:text-emerald-200",
  recusado: "bg-rose-400/20 text-rose-700 dark:text-rose-200",
};

export default function SinoConvites({ itens, contador, aberto, onAlternar, ocupado, onResponder, onAbrir, onLimpar, limpando = false, agora }: {
  itens: ItemSino[];
  /** número da bolinha (lib/canal/sino contadorDoSino). */
  contador: number;
  aberto: boolean;
  onAlternar: () => void;
  /** id do convite sendo respondido (botões desligados). */
  ocupado: string | null;
  onResponder: (id: string, acao: "aceitar" | "recusar") => void;
  /** #425: abre a conversa de um convite aceito (quem chama fecha o sino). */
  onAbrir?: (canalId: string) => void;
  /** #425: tira do sino os convites já respondidos (fica no banco). */
  onLimpar?: () => void;
  limpando?: boolean;
  /** "agora" pra calcular o "há 5 min" (padrão: o relógio; os testes fixam). */
  agora?: number;
}) {
  // #850: no celular o painel abria a partir do sino e ficava 188 px fora da tela
  const painelRef = useRef<HTMLDivElement>(null);
  useCabeNaTela(painelRef, aberto);
  const ref = agora ?? Date.now();
  return (
    <div className="relative shrink-0">
      <button type="button" onClick={onAlternar} aria-expanded={aberto} aria-haspopup="dialog"
        aria-label={contador > 0 ? `Notificações (${contador} nova${contador > 1 ? "s" : ""})` : "Notificações"} title="Notificações"
        className={`${TOQUE} relative grid place-items-center rounded-2xl ${VIDRO_CHIP} ${TXT}`}>
        <Bell className="w-[18px] h-[18px]" aria-hidden />
        {contador > 0 && (
          <span aria-hidden className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] px-1 grid place-items-center rounded-full text-[9.5px] font-black bg-rose-500 text-white">
            {contador > 99 ? "99+" : contador}
          </span>
        )}
      </button>

      {aberto && (
        <div ref={painelRef} role="dialog" aria-label="Notificações" className={`absolute left-0 top-full mt-1.5 z-30 w-[min(92vw,340px)] p-2 rounded-2xl ${VIDRO_POPOVER_SOLIDO}`}>
          <div className="flex items-center justify-between gap-2 px-2 pt-1 pb-2">
            <p className={`text-[10.5px] font-bold uppercase tracking-wider ${TXT_MUDO}`}>Convites</p>
            {onLimpar && podeLimpar(itens) && (
              <button type="button" onClick={onLimpar} disabled={limpando} title="Tirar do sino os convites já respondidos (os pendentes ficam)"
                className={`min-h-[28px] px-2 rounded-lg text-[11px] font-bold ${TXT_2} hover:bg-slate-500/10 dark:hover:bg-white/10 disabled:opacity-40`}>Limpar</button>
            )}
          </div>
          {itens.length === 0 ? (
            <p className={`px-2 pb-2 text-[12.5px] ${TXT_2}`}>Nenhum convite por aqui ainda.</p>
          ) : (
            <ul className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto">
              {itens.map((it) => (
                <li key={it.id} className="flex items-center gap-2 px-2 py-1.5 rounded-xl">
                  <AgentAvatar src={it.pessoa.avatar} nome={it.pessoa.nome} size={26} />
                  {(() => {
                    const corpo = (<>
                      <span className={`text-[12.5px] leading-snug ${TXT}`}>{it.texto}</span>
                      {it.em != null && (
                        <time dateTime={new Date(it.em).toISOString()} title={new Date(it.em).toLocaleString("pt-BR")} className={`text-[10.5px] ${TXT_MUDO}`}>
                          {tempoRelativo(it.em, ref)}
                        </time>
                      )}
                    </>);
                    const canalId = it.canalId;
                    // aceito: o aviso inteiro é um botão que abre a conversa
                    return canalId && onAbrir ? (
                      <button type="button" onClick={() => onAbrir(canalId)} aria-label={`Abrir a conversa com ${it.pessoa.nome}`} title="Abrir a conversa"
                        className="flex-1 min-w-0 flex flex-col items-start text-left rounded-lg -mx-1 px-1 hover:bg-slate-500/10 dark:hover:bg-white/10">{corpo}</button>
                    ) : (
                      <span className="flex-1 min-w-0 flex flex-col">{corpo}</span>
                    );
                  })()}
                  {it.acao ? (
                    <span className="flex items-center gap-1 shrink-0">
                      <button type="button" onClick={() => onResponder(it.id, "aceitar")} disabled={ocupado === it.id}
                        aria-label={`Aceitar o convite de ${it.pessoa.nome}`}
                        className="min-h-[32px] px-2.5 rounded-lg text-[11.5px] font-bold bg-blue-600 text-white dark:bg-cyan-400 dark:text-slate-900 disabled:opacity-40">Aceitar</button>
                      <button type="button" onClick={() => onResponder(it.id, "recusar")} disabled={ocupado === it.id}
                        aria-label={`Recusar o convite de ${it.pessoa.nome}`}
                        className={`min-h-[32px] px-2.5 rounded-lg text-[11.5px] font-bold ${VIDRO_CHIP} ${TXT_2} disabled:opacity-40`}>Recusar</button>
                    </span>
                  ) : (
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10.5px] font-bold ${COR[it.status]}`}>{ROTULO[it.status]}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
