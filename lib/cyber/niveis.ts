/**
 * Cyberespaço — os NÍVEIS (PURO): de que nível é um ponto do mundo (lib/cyber/nivelAtivo). Os níveis são regiões
 * SEPARADAS do espaço — nenhum encosta no outro:
 *  - as SALAS da Zaeon (lounge — com o templo e a garagem das motos dele —, garagem, biblioteca, jardim): lá no alto,
 *    cada uma no seu disco. Só se entra nelas por TELEPORTE (o buraco negro, o portal do Droid);
 *  - os níveis ABERTOS — a central da Zaeon (o hub), a praça (40 m abaixo, longe) e a Solana —: dá pra ir de um pro
 *    outro VOANDO (mochila, moto, carro, nave), e o nível troca quando se chega lá (o "streaming").
 */
import { CIDADE, naSala, type NomeSala } from "./ceu";
import { noComplexo } from "./temploCosmico";
import { PRACA } from "./praca";
import { PLATAFORMAS } from "./plataformas";
import { TEMPLO } from "./templo";
import type { IdNivel } from "./nivelAtivo";
import { naveDoPonto, nivelDaNave } from "./navesRegiao";
import { nivelDaMinhaNave } from "./minhaNave";

export type { IdNivel } from "./nivelAtivo";
const SALAS = Object.keys(CIDADE.salas) as NomeSala[];
/** o alcance (m, do centro da sala) do nível de cada sala: o lounge leva o templo e a garagem dele junto */
export const raioDoNivel = (s: NomeSala) => CIDADE.salas[s].r + (s === "lounge" ? TEMPLO.r * 2 + 90 : 30);
/** acima disto (m, sobre o piso da central) é a altura das salas */
const ALTO_DAS_SALAS = 30;

/** a SALA cujo nível contém o ponto (no alto, perto do disco dela), ou null */
export function salaDoPonto(p: { x: number; z: number }, y: number): NomeSala | null {
  if (y < CIDADE.pisoY + ALTO_DAS_SALAS) return null;
  const lx = p.x - CIDADE.centro.x, lz = p.z - CIDADE.centro.z;
  for (const s of SALAS) { const L = CIDADE.salas[s]; if (Math.hypot(lx - L.x, lz - L.z) <= raioDoNivel(s)) return s; }
  if (noComplexo(naSala(CIDADE.salas.lounge, lx, lz), 25)) return "lounge";   // o TEMPLO CÓSMICO (o salão e os braços — lib/cyber/temploCosmico) é do nível do lounge
  return null;
}

/** o nível ABERTO mais natural pro ponto: a praça (embaixo e perto dela), a Solana (perto dela) ou a central */
export function nivelAberto(p: { x: number; z: number }, y: number): "zaeon" | "praca" | "solana" {
  const S = PLATAFORMAS.solana;
  if (Math.hypot(p.x - S.centro.x, p.z - S.centro.z) <= S.r + 60 && Math.abs(y - S.y) < 80) return "solana";
  const dZaeon = Math.hypot(p.x - CIDADE.centro.x, p.z - CIDADE.centro.z), dPraca = Math.hypot(p.x - PRACA.x, p.z - PRACA.z);
  if (dPraca <= PRACA.r + 120 && dPraca < dZaeon && y < CIDADE.pisoY - 10) return "praca";
  return "zaeon";
}

/** o nível de um ponto (quem está ali — outra pessoa, um bot, um objeto) */
export const nivelDoPonto = (p: { x: number; z: number }, y: number): IdNivel => { const mn = nivelDaMinhaNave(p, y); if (mn) return mn; const nv = naveDoPonto(p, y); return nv ? nivelDaNave(nv) : salaDoPonto(p, y) ?? nivelAberto(p, y); };   // (uma NAVE COWORKING é um nível fechado, como uma sala: só se sai pelo portal)

/** o MEU nível no próximo quadro: numa sala, só se sai por teleporte (`saltou`); nos abertos, troca voando, mas só
 *  depois de `firme` s no novo (sem piscar na divisa) */
export function proximoNivel(atual: IdNivel | null, p: { x: number; z: number }, y: number, saltou: boolean): IdNivel {
  const aqui = nivelDoPonto(p, y);
  if (atual === null || saltou) return aqui;
  const emSala = atual !== "zaeon" && atual !== "praca" && atual !== "solana";
  if (emSala) return atual;   // (voando pra fora da sala, continua nela: o resto não existe)
  const s = salaDoPonto(p, y); if (s) return atual;   // (voando por cima de onde uma sala fica: ela não existe daqui)
  return aqui;
}
