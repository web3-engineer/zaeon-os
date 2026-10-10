/**
 * Cyberespaço — o COMBATE da arena (PURO): o COMBO de 3 golpes de espada, quando cada golpe ACERTA (a janela ativa, o
 * alcance e o arco na frente de quem bate), a VIDA, o empurrão, a queda e o renascer. A esquiva é o começo do DASH
 * (lib/cyber/movimento `intocavel`): golpe que chega nessa hora não pega.
 * Quem decide se levou o golpe é QUEM APANHA (o próprio cliente — é ele que sabe se estava no dash): o atacante só
 * conta pra sala que golpeou (o número do golpe na presença), e cada um confere em si.
 */
import { ITENS, multiplicadorDoNivel, type IdItem } from "./inventario";

export const VIDA_MAX = 100;
/** um golpe do combo: duração (s), a janela em que a lâmina CORTA (s, do começo), o dano (× o da arma), o quanto
 *  empurra (m/s) e o quanto o corpo AVANÇA no golpe (m) */
export type Golpe = { n: 1 | 2 | 3; dur: number; ativoIni: number; ativoFim: number; dano: number; empurra: number; avanco: number; alcanceExtra: number };
/** a VELOCIDADE dos golpes (o dono escolhe): os golpes são animados LENTOS, com o peso da montante (antecipação que
 *  segura lá em cima, o corte ganhando embalo, a inércia passando do ponto) — e tocados `RITMO_GOLPES`× mais rápido */
export const RITMO_GOLPES = 1.5;
/** o combo como foi ANIMADO (lento, pesado) — o jogo usa o `COMBO`, já no ritmo */
const COMBO_ANIMADO: readonly Golpe[] = [
  // a DUAS MÃOS, no ritmo dos jogos de ação (Devil May Cry): antecipação longa, corte rápido, recuperação que pesa
  { n: 1, dur: 1.0, ativoIni: 0.42, ativoFim: 0.58, dano: 1.25, empurra: 4.5, avanco: 1.2, alcanceExtra: 0.1 },    // diagonal descendo
  { n: 2, dur: 1.0, ativoIni: 0.38, ativoFim: 0.54, dano: 1.45, empurra: 5.5, avanco: 1.0, alcanceExtra: 0.1 },   // diagonal subindo, de volta
  { n: 3, dur: 1.4, ativoIni: 0.62, ativoFim: 0.8, dano: 2.6, empurra: 12, avanco: 2.0, alcanceExtra: 0.6 },     // o PESADO por cima (esmaga o chão)
];
export const COMBO: readonly Golpe[] = COMBO_ANIMADO.map((g) => ({ ...g, dur: g.dur / RITMO_GOLPES, ativoIni: g.ativoIni / RITMO_GOLPES, ativoFim: g.ativoFim / RITMO_GOLPES }));
/** depois de um golpe acabar, quanto tempo o próximo do combo ainda encadeia (s) */
export const JANELA_COMBO = 0.45;
/** o HIT-STOP (s): quando o golpe PEGA, a ação congela um instante (o peso do impacto, como nos jogos de ação) */
export const HIT_STOP: Record<1 | 2 | 3, number> = { 1: 0.07, 2: 0.08, 3: 0.13 };
/** o raio do corpo de quem apanha (m) — a lâmina pega até a borda dele */
export const RAIO_CORPO = 0.45;
/** caído (s) e invulnerável depois de renascer (s) */
export const CAIDO = 3, PROTECAO_RENASCER = 2;

export type EstadoAtaque = { golpe: Golpe; ini: number; seq: number };
/** o próximo golpe ao apertar atacar `agora`: no meio de um golpe → fica na FILA (encadeia quando ele acabar); logo
 *  depois de um → o seguinte do combo; parado há mais tempo → o 1º */
export function proximoGolpe(atual: EstadoAtaque | null, agora: number): Golpe {
  if (!atual) return COMBO[0]!;
  const fim = atual.ini + atual.golpe.dur;
  if (agora <= fim + JANELA_COMBO) return COMBO[atual.golpe.n % COMBO.length]!;
  return COMBO[0]!;
}
/** está cortando agora? (a janela ativa do golpe) */
export const cortando = (a: EstadoAtaque | null, agora: number) => !!a && agora - a.ini >= a.golpe.ativoIni && agora - a.ini <= a.golpe.ativoFim;
/** a janela que corta CRUZOU o intervalo [t0, t1] (o quadro)? — com fps baixo a janela (~0,12 s) cabe entre dois quadros */
export const cortouEntre = (a: EstadoAtaque | null, t0: number, t1: number) => !!a && a.ini + a.golpe.ativoIni <= t1 && a.ini + a.golpe.ativoFim >= t0;
/** o golpe acabou? */
export const acabou = (a: EstadoAtaque | null, agora: number) => !a || agora - a.ini >= a.golpe.dur;

/** o golpe de quem está em (x, z) virado pra `rumo` (o rumo do corpo: atan2(dx, dz)) pega o alvo em (x, z)? */
export function acerta(atacante: { x: number; z: number; rumo: number }, alvo: { x: number; z: number }, arma: IdItem, g: Golpe): boolean {
  const a = ITENS[arma].arma, dx = alvo.x - atacante.x, dz = alvo.z - atacante.z, d = Math.hypot(dx, dz);
  if (d > a.alcance + g.alcanceExtra + RAIO_CORPO) return false;
  if (d < RAIO_CORPO) return true;   // colado: pega
  let dif = Math.atan2(dx, dz) - atacante.rumo; while (dif > Math.PI) dif -= 2 * Math.PI; while (dif < -Math.PI) dif += 2 * Math.PI;
  return Math.abs(dif) <= a.arco + Math.atan2(RAIO_CORPO, d);
}
/** o dano de um golpe com a arma */
export const danoDoGolpe = (arma: IdItem, g: Golpe) => Math.round(ITENS[arma].arma.dano * g.dano * multiplicadorDoNivel(ITENS[arma].nivel));

/** levar um golpe: desviando (o começo do dash) ou protegido (acabou de renascer) não pega; senão tira vida e empurra
 *  pra longe de quem bateu */
export function levarGolpe(vida: number, o: { arma: IdItem; golpe: Golpe; de: { x: number; z: number }; em: { x: number; z: number }; desviando: boolean; protegido: boolean }):
  { vida: number; pegou: boolean; desviou: boolean; empurrao: { x: number; z: number }; caiu: boolean } {
  if (o.desviando || o.protegido || vida <= 0) return { vida, pegou: false, desviou: o.desviando, empurrao: { x: 0, z: 0 }, caiu: false };
  const nova = Math.max(0, vida - danoDoGolpe(o.arma, o.golpe)), dx = o.em.x - o.de.x, dz = o.em.z - o.de.z, d = Math.hypot(dx, dz) || 1;
  return { vida: nova, pegou: true, desviou: false, empurrao: { x: (dx / d) * o.golpe.empurra, z: (dz / d) * o.golpe.empurra }, caiu: nova <= 0 };
}

/** o GOLPE na presença (rede): um inteiro — a sequência (cada golpe novo soma 1) × 4 + o número do golpe (1–3) */
export const codificarGolpe = (seq: number, n: 1 | 2 | 3) => (seq % 100000) * 4 + n;
export const decodificarGolpe = (v: number) => ({ seq: Math.floor(v / 4), n: (v % 4) as 0 | 1 | 2 | 3 });
