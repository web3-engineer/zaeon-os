/**
 * Cyberespaço — o NÍVEL ATIVO (PURO, sem imports de valor: lib/cyber/ceu depende dele). Out/2026, o dono: "as áreas
 * não se tocam mais — aparece uma de cada vez pro jogador". A Zaeon central é o HUB; cada sala (lounge, garagem,
 * biblioteca, jardim), a praça e a Solana são NÍVEIS próprios: só o nível em que a pessoa está existe pra ela (se
 * desenha e é chão). Entre eles, só pelos buracos negros (lib/cyber/buracos — o túnel).
 *
 * `null` = o modo antigo, tudo junto (quem não define o nível — o worker da frota de IAs, os testes — continua vendo o
 * mapa inteiro). O ENGINE define o nível da pessoa a cada quadro.
 */
import type { NomeSala } from "./ceu";
import type { Regiao } from "./regiaoUsuario";

/** a separação em níveis (desligar = volta o mapa inteiro, com as escadas) */
export const NIVEIS_SEPARADOS = true as boolean;

export type IdNivel = "zaeon" | NomeSala | "praca" | "solana" | `nave-${Regiao}`;   // (as NAVES COWORKING de cada região — lib/cyber/navesRegiao)
export const IDS_NIVEIS: readonly IdNivel[] = ["zaeon", "lounge", "garagem", "biblioteca", "jardim", "praca", "solana"];

let ativo: IdNivel | null = null;
/** o nível da pessoa (null = tudo junto) */
export const nivelAtivo = (): IdNivel | null => ativo;
export function definirNivel(n: IdNivel | null) { ativo = NIVEIS_SEPARADOS ? n : null; }
/** esta sala é chão/visível agora? */
export const salaAtiva = (s: NomeSala) => ativo === null || ativo === s;
/** a plataforma central da Zaeon (o hub) é chão agora? */
export const hubAtivo = () => ativo === null || ativo === "zaeon";
/** as ESCADAS de pedra entre a central e as salas existem? (com os níveis separados, não: no lugar delas, os fios
 *  cósmicos até os buracos negros) */
export const escadasExistem = () => !NIVEIS_SEPARADOS || ativo === null;
