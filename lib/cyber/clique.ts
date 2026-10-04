/** Regras do clique/hover no cyberespaço (HANDOFF §2.3). PURO. */
export type AlvoClique = "monitor" | "aproximar" | "colega" | "chao";

/**
 * Prioridade: monitor (em hover e perto, e só o MEU — a base é privada) → colega perto → chão.
 * Clicar no monitor de longe (ou no de outra pessoa) não entra: no meu, leva até a base; no alheio, vira chão.
 */
export function decidirClique(o: { noMonitor: boolean; baseMinha: boolean; pertoDaBase: boolean; noColega: boolean; colegaPerto: boolean }): AlvoClique {
  if (o.noMonitor && o.baseMinha) return o.pertoDaBase ? "monitor" : "aproximar";
  if (o.noColega && o.colegaPerto) return "colega";
  return "chao";
}

/** Rótulo flutuante sobre o monitor em hover. */
export function rotuloMonitor(o: { baseMinha: boolean; pertoDaBase: boolean; dono: string }): string {
  if (!o.baseMinha) return `Base de ${o.dono} · privada`;
  return o.pertoDaBase ? "⏎ Entrar na Sala de Estudos" : "Chegue perto para entrar";
}
