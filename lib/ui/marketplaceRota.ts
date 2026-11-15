/**
 * lib/ui/marketplaceRota.ts — #824 · o Marketplace no menu principal, no lugar de "Assistentes".
 *
 * O Marketplace (a vitrine) mora DENTRO da Sala de Estudos (a aba "community", no pé da sidebar do laboratório). O
 * menu principal entra por `/marketplace`, que manda pro laboratório já nessa aba. Como trocar de aba lá dentro não
 * muda de página, o laboratório AVISA quando está no Marketplace (evento + `?aba=marketplace` no endereço, pra
 * recarregar e voltar caírem no mesmo lugar) e o menu acende o item certo.
 *
 * Os endereços antigos (/assistentes, /plugin-store, /mentores) continuam no ar: é onde se adicionam os assistentes
 * (o chat e o MentorPill levam pra lá).
 */
export const ROTA_MARKETPLACE = "/marketplace";
export const DESTINO_MARKETPLACE = "/research-lab?tab=sala-de-estudos&aba=marketplace";
export const EVT_MARKETPLACE = "zaeon:marketplace";

/** o endereço pede o Marketplace? (`?aba=marketplace`) — PURO */
export function pedeMarketplace(search: string): boolean {
  return new URLSearchParams(search).get("aba") === "marketplace";
}

/** o endereço com/sem o `aba=marketplace`, mantendo o resto — PURO */
export function comMarketplace(search: string, noMarketplace: boolean): string {
  const q = new URLSearchParams(search);
  if (noMarketplace) {
    q.set("tab", "sala-de-estudos");
    q.set("aba", "marketplace");
  } else if (q.get("aba") === "marketplace") {
    q.delete("aba");
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

let noMarketplaceAgora = false;
/** o laboratório avisa se está no Marketplace (o menu, que monta antes ou depois, lê com `estaNoMarketplace`) */
export function avisarMarketplace(on: boolean): void {
  if (noMarketplaceAgora === on) return;
  noMarketplaceAgora = on;
  window.dispatchEvent(new CustomEvent<boolean>(EVT_MARKETPLACE, { detail: on }));
}
export const estaNoMarketplace = (): boolean => noMarketplaceAgora;

export type ItemMenu = "docs" | "about" | "laboratorio" | "marketplace" | "news";
/** qual item do menu principal acende — PURO */
export function itemAtivo(pathname: string, noMarketplace: boolean): ItemMenu | null {
  if (pathname.startsWith(ROTA_MARKETPLACE)) return "marketplace";
  if (pathname.startsWith("/research-lab")) return noMarketplace ? "marketplace" : "laboratorio";
  if (pathname.startsWith("/docs")) return "docs";
  if (pathname.startsWith("/about")) return "about";
  if (pathname.startsWith("/news")) return "news";
  return null;
}
