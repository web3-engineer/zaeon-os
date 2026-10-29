/**
 * lib/canais/vozes.ts — quem pode ASSINAR um post (Opção A).
 *
 * Uma função só, em um lugar só, porque três rotas precisam da mesma resposta: o painel (F1), a
 * fila (F2) e o executor (F2). O roster é a mesma fonte do painel de Agents — então o nome que o
 * dono renomeou lá é o nome que assina no mundo. Duplicar isso daria um dia em que a tela mostra
 * "Kekulé" e o post sai assinado "Farmácia".
 *
 * `ativo: false` no AgentProfile tira o agente da lista: agente desligado não assina nada.
 */
import { mergeProfiles, rosterComMentores } from "@/lib/agents/roster";
import type { Voz } from "@/lib/canais/fila";

export type VozComTipo = Voz & { tipo: string };

/** O mínimo de Prisma que isto usa — assim o teste injeta um objeto, não um banco. */
export type FonteDeVozes = {
  mentorTemplate: { findMany(args: unknown): Promise<any[]> };
  agentProfile: { findMany(args?: unknown): Promise<any[]> };
};

export async function vozes(db: FonteDeVozes): Promise<VozComTipo[]> {
  const [mentores, profiles] = await Promise.all([
    db.mentorTemplate.findMany({ select: { slug: true, name: true, course: true, emoji: true, personaText: true, order: true } }),
    db.agentProfile.findMany(),
  ]);
  return mergeProfiles(rosterComMentores(mentores as any), profiles as any)
    .filter((v) => v.ativo)
    .map((v) => ({ agentKey: v.agentKey, nome: v.nome, area: v.curso ?? null, tipo: v.tipo }));
}

/** A voz de um agentKey, ou `null` — quem chama decide o que fazer com a ausência. */
export const vozDoRoster = (elenco: readonly VozComTipo[], agentKey: string): VozComTipo | null =>
  elenco.find((v) => v.agentKey === agentKey) ?? null;
