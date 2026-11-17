/**
 * lib/estudos/cadernos/index.ts — o registro dos cadernos de campo gerados (um arquivo por caderno nesta pasta).
 * O Workflow dos 27 adiciona aqui uma linha de import + a entrada no array. cadernosEstudo.ts agrega isto + a ecovila.
 */
import type { CadernoEstudo } from "../cadernosEstudo";

// <<CADERNOS_IMPORTS>> (o montador adiciona imports aqui)

export const CADERNOS_EXTRA: readonly CadernoEstudo[] = [
  // <<CADERNOS_ENTRIES>> (o montador adiciona entradas aqui)
];
