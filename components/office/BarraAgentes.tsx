"use client";
/**
 * BarraAgentes — os agentes que dá pra chamar, em cima do campo de mensagem (toque = @). Quem está NA CONVERSA
 * (canal.agentes) vem primeiro e destacado; os outros (os meus contratados) vêm depois, apagados.
 * #443: saiu do CoworkingCanal pra ser testável — a agente dispensada sai do destaque, e volta quando chamada com @.
 */
import AgentAvatar from "@/components/agents/AgentAvatar";
import { rotulo, type EstadoAgente } from "@/lib/canal/estadoAgente";
import { VIDRO_CHIP, TXT, TXT_MUDO } from "@/lib/canal/vidro";

export type AgenteDaBarra = { agentKey: string; nome: string; emoji: string; curso: string | null; avatarUrl: string | null };

export default function BarraAgentes({ agentes, naConversa, digitando, estado, onChamar }: {
  agentes: readonly AgenteDaBarra[];
  /** quem está na conversa agora (canal.agentes) */
  naConversa: readonly string[];
  /** quem está escrevendo agora */
  digitando: readonly string[];
  estado: Readonly<Record<string, EstadoAgente>>;
  onChamar: (agentKey: string) => void;
}) {
  const presentes = agentes.filter((a) => naConversa.includes(a.agentKey));
  const outros = agentes.filter((a) => !naConversa.includes(a.agentKey));
  if (!presentes.length && !outros.length) return null;
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" data-testid="barra-agentes">
      {[...presentes, ...outros].map((a) => {
        const presente = naConversa.includes(a.agentKey);
        const escrevendo = digitando.includes(a.agentKey);
        const descanso = estado[a.agentKey] === "descanso";
        return (
          <button key={a.agentKey} type="button" onClick={() => onChamar(a.agentKey)} data-agente={a.agentKey} data-na-conversa={presente ? "sim" : "nao"}
            title={descanso ? rotulo(a.nome, "descanso") : `@${a.agentKey}${a.curso ? ` · ${a.curso}` : ""}`}
            className={`shrink-0 min-h-[44px] pl-1 pr-2.5 rounded-full flex items-center gap-1.5 text-[12px] font-semibold ${VIDRO_CHIP} ${presente ? TXT : TXT_MUDO} ${descanso ? "opacity-60" : ""}`}>
            <AgentAvatar src={a.avatarUrl} nome={a.nome} size={26} emoji={a.emoji} agentId={a.agentKey} estado={escrevendo ? "falando" : "idle"} className={escrevendo ? "ring-2 ring-cyan-400/80" : ""} />
            {a.nome}
            {descanso && <span className={`text-[10px] font-medium ${TXT_MUDO}`}>em descanso</span>}
          </button>
        );
      })}
    </div>
  );
}
