/**
 * O mapa do cérebro fecha clicando FORA dele. "Fora" se decide pelo CAMINHO do evento (composedPath), não por
 * stopPropagation: no app router o React escuta no próprio `document`, e o painel "segurar o mousedown" não impedia
 * o listener de fora — clicar ou arrastar dentro do cérebro fechava o mapa. O caminho também cobre o rótulo do
 * canvas que é recriado no meio do clique (o alvo some do DOM, mas fica no caminho).
 */
// #845: trocar o tema (lua/sol) não é "sair do mapa" — `data-fica-cerebro` marca o que pode ser tocado sem fechar
export const DENTRO_DO_CEREBRO = "[data-cerebro-painel], [data-bolinha-cerebro], [data-tour-cartao], [data-fica-cerebro]";

export function cliqueForaDoCerebro(e: Pick<Event, "composedPath">): boolean {
  return !e.composedPath().some((n) => typeof Element !== "undefined" && n instanceof Element && n.matches(DENTRO_DO_CEREBRO));
}
