"use client";

/**
 * AgentePilula — o rosto do agente AO LADO de cada resposta (sem nome: quem responde é ela).
 * Só a resposta mais recente (`ultima`) fica VIVA e reage ao turno (pensa → fala no stream →
 * sorri ao concluir; ouve quando o usuário digita a próxima) e compartilha o layoutId com as
 * boas-vindas (na 1ª mensagem o rosto grande "viaja" até aqui). As antigas ficam no quadro
 * estático. Posicionado pelo chamador (coluna à esquerda da bolha). Sem avatar vivo → nada.
 */
import { motion } from "framer-motion";
import AgentAvatar from "@/components/agents/AgentAvatar";
import { useManifesto } from "./hooks";
import { layoutIdRosto } from "./BoasVindasAgente";
import type { SinalAvatar } from "@/lib/avatars/estados";

/** Largura reservada pra coluna do rosto (classe Tailwind do recuo das respostas). */
/** o espaço do rosto ao lado da resposta. #837: no celular o rosto vai EM CIMA (os 48 px do lado espremiam a resposta
 *  em meia tela) — o rostinho tem 36 px, o `pt-11` dá a folga. */
export const RECUO_ROSTO = "relative pl-12 max-md:pl-0 max-md:pt-11";

export default function AgentePilula({ agentId, nome, estado, boca = null, ultima = true, className = "" }: { agentId: string; nome: string; estado: SinalAvatar; /** modo voz: nível da voz tocando */ boca?: number | null; ultima?: boolean; className?: string }) {
  const manifest = useManifesto(agentId);
  if (!manifest) return null;
  const rosto = (
    <AgentAvatar agentId={agentId} manifest={manifest} nome={nome} size={36} estado={ultima ? estado : "idle"} boca={ultima ? boca : null} vivo={ultima} destaque={ultima}
      className="ring-2 ring-white/80 dark:ring-white/10 shadow-[0_8px_20px_-10px_rgba(124,58,237,0.7)]" />
  );
  if (!ultima) return <span className={`inline-flex rounded-full ${className}`}>{rosto}</span>;
  return (
    <motion.span layoutId={layoutIdRosto(agentId)} className={`inline-flex rounded-full ${className}`} transition={{ type: "spring", stiffness: 140, damping: 22 }}>
      {rosto}
    </motion.span>
  );
}
