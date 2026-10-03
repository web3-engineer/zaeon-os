/**
 * lib/map/realtime.ts — o cérebro REAGE AO VIVO (HANDOFF_CEREBRO_AURA §3). Canal privado por mapa
 * (`private-cerebro-<mapaId>`, autorizado em /api/map/pusher-auth por getMapaForUser), eventos:
 *   "turno"  → nós novos/tocados + completudes (o painel acende o que mudou)
 *   "gerado" → o chain worker terminou (backbone pronto) / "erro"
 * Best-effort via triggerSafe (sem Pusher = silêncio; o cliente tem poll de fallback).
 */
import { triggerSafe } from "@/lib/collab/realtime";

export const EV_TURNO = "turno";
export const EV_GERADO = "gerado";
export const EV_ERRO = "erro";

const OID = /^[a-f0-9]{24}$/i;

export const canalCerebro = (mapaId: string) => `private-cerebro-${mapaId}`;

/** mapaId a partir do nome do canal (null = não é canal do cérebro / id inválido). */
export function mapaIdDeCanal(channel: string): string | null {
  const m = /^private-cerebro-([a-f0-9]{24})$/i.exec(channel ?? "");
  return m ? m[1]! : null;
}

export type EventoTurno = { mapaId: string; novos: string[]; tocados: string[]; completudeAprendizado?: number; completudeConclusao?: number; at: number };
export type EventoGerado = { mapaId: string; backbone: string[]; tipoTopico: string; degraded: boolean; at: number };

export async function avisarTurno(ev: Omit<EventoTurno, "at">): Promise<void> {
  if (!OID.test(ev.mapaId)) return;
  await triggerSafe(canalCerebro(ev.mapaId), EV_TURNO, { ...ev, at: Date.now() });
}
export async function avisarGerado(ev: Omit<EventoGerado, "at">): Promise<void> {
  if (!OID.test(ev.mapaId)) return;
  await triggerSafe(canalCerebro(ev.mapaId), EV_GERADO, { ...ev, at: Date.now() });
}
export async function avisarErro(mapaId: string, motivo: string): Promise<void> {
  if (!OID.test(mapaId)) return;
  await triggerSafe(canalCerebro(mapaId), EV_ERRO, { mapaId, motivo: motivo.slice(0, 200), at: Date.now() });
}
