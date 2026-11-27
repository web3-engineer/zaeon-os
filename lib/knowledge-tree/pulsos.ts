/**
 * lib/knowledge-tree/pulsos.ts — o SINAL que corre pelos axônios (PURO).
 *
 * O primeiro pulso NASCE na raiz e desce em cascata: cada aresta só começa quando o pulso da aresta do
 * pai termina. inicio(c) = 0 para os filhos da raiz; senão inicio(pai) + duração(pai).
 * duração(e) = 1.7 + (5 − e)·0.6 s (energia alta = sinal mais rápido).
 */
import { energia } from "./energia";
import type { IndiceArvore } from "./tipos";

export const duracaoPulso = (e: number): number => 1.7 + (5 - e) * 0.6;

const cacheInicio = new WeakMap<IndiceArvore, Map<string, number>>();

/** Quando (s, a partir do nascimento) o primeiro pulso entra na aresta pai→id. Raiz/desconhecido = 0. */
export function inicio(idx: IndiceArvore, id: string): number {
  let m = cacheInicio.get(idx);
  if (!m) { m = new Map(); cacheInicio.set(idx, m); }
  const ja = m.get(id);
  if (ja !== undefined) return ja;
  const pai = idx.pai.get(id);
  let v = 0;
  if (pai != null && pai !== idx.raiz.id) v = inicio(idx, pai) + duracaoPulso(energia(idx, pai));
  m.set(id, v);
  return v;
}

export type ContextoPulso = { destaque: boolean; muitos: boolean; simples?: boolean };

/**
 * Quantos pulsos correm numa aresta: proporcional à energia (≈ e). Concluídos/próximo: 100%;
 * pendentes: 60%; metade se a tela tem mais de 40 nós visíveis; metade de novo no celular. Mínimo 1.
 */
export function quantidadePulsos(e: number, c: ContextoPulso): number {
  let f = c.destaque ? 1 : 0.6;
  if (c.muitos) f *= 0.5;
  if (c.simples) f *= 0.5;
  return Math.max(1, Math.round(Math.max(1, e) * f));
}

/** O `begin` (s, no relógio do SVG) do q-ésimo de n pulsos de uma aresta. */
export function beginPulso(agora: number, ini: number, q: number, dur: number, n: number): number {
  return agora + ini + (q * dur) / Math.max(1, n);
}
