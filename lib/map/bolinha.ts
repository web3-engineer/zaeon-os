/**
 * lib/map/bolinha.ts — os ESTADOS da bolinha/painel (HANDOFF_CEREBRO_AURA §3), PUROS e
 * client-safe. "Sempre mostra algo, nunca quebra":
 *   oculta → conversa comum · sugerida → azul fraca pulsando ("gerar cérebro") · gerando →
 *   loading do backbone · ativa → cérebro vivo · vazia → falhou/sem percurso (re-tentar).
 */
export type EstadoBolinha = "oculta" | "sugerida" | "gerando" | "ativa" | "vazia";

export function estadoDaBolinha(i: { estudavel: boolean; mapaId: string | null; temMapa: boolean; backbone: number; gerando?: boolean }): EstadoBolinha {
  if (i.gerando) return "gerando";
  if (i.temMapa && i.backbone > 0) return "ativa";
  if (i.temMapa || i.mapaId) return "vazia";     // mapa existe (turnos) mas sem percurso: oferece gerar
  if (i.estudavel) return "sugerida";
  return "oculta";
}

export const ROTULO: Record<EstadoBolinha, string> = {
  oculta: "", sugerida: "Gerar cérebro", gerando: "Gerando o cérebro…", ativa: "Ver cérebro", vazia: "Traçar percurso",
};
