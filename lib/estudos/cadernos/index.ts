/**
 * lib/estudos/cadernos/index.ts — o registro dos cadernos de campo gerados (um arquivo por caderno nesta pasta).
 * cadernosEstudo.ts agrega isto. Reconstruído pelo main agent após cada lote do Workflow.
 */
import type { CadernoEstudo } from "../cadernosEstudo";
import { caderno as ecovila } from "./ecovila";
import { caderno as cardiovascular } from "./cardiovascular";
import { caderno as cooperativas } from "./cooperativas";

export const CADERNOS_EXTRA: readonly CadernoEstudo[] = [ecovila, cardiovascular, cooperativas];
