/**
 * lib/knowledge-tree/energia.ts — a "ENERGIA" (desafio 1..5) de cada lição. PURO e memoizado por nó.
 *
 *   folha com grau no grafo → deriva do grau (normalizado pelo maior da árvore) + profundidade;
 *   folha sem grau          → reserva pelo tipo da lição (ideia 1.2, relações 2.4, no código 4.2,
 *                             na prática 3.2) + variação estável por hash do id (±0.4);
 *   nó com filhos           → média dos filhos;   raiz → 3.   Sempre dentro de [1, 5].
 *
 * A energia de uma conexão pai→filho é a energia do FILHO.
 */
import { rngDe } from "./rng";
import { filhosDe } from "./progresso";
import type { IndiceArvore, NoArvore, TipoLicaoArvore } from "./tipos";

export const ENERGIA_MIN = 1;
export const ENERGIA_MAX = 5;
export const ENERGIA_RAIZ = 3;

export const ENERGIA_POR_TIPO: Partial<Record<TipoLicaoArvore, number>> = {
  ideia: 1.2,
  relacoes: 2.4,
  codigo: 4.2,
  pratica: 3.2,
};
/** folha de tipo estrutural (módulo/conceito sem filhos): conta como "relações". */
const RESERVA_ESTRUTURAL = 2.4;

export const clampEnergia = (e: number): number =>
  Math.min(ENERGIA_MAX, Math.max(ENERGIA_MIN, Number.isFinite(e) ? e : ENERGIA_RAIZ));

/** variação estável por id, em [-0.4, 0.4). */
export function variacao(id: string): number {
  return (rngDe(id, "energia")() - 0.5) * 0.8;
}

/** A energia de uma FOLHA (sem olhar filhos). */
export function energiaFolha(no: Pick<NoArvore, "id" | "tipo" | "grau">, profundidade: number, grauMax: number): number {
  if (typeof no.grau === "number" && Number.isFinite(no.grau) && no.grau >= 0 && grauMax > 0) {
    const norm = Math.log1p(no.grau) / Math.log1p(grauMax);           // 0..1
    const prof = Math.max(0, profundidade - 1) * 0.25;                 // mais fundo = um pouco mais denso
    return clampEnergia(1 + norm * 3.6 + prof + variacao(no.id) * 0.5);
  }
  const base = ENERGIA_POR_TIPO[no.tipo] ?? RESERVA_ESTRUTURAL;
  return clampEnergia(base + variacao(no.id));
}

const cache = new WeakMap<IndiceArvore, Map<string, number>>();

/** Todas as energias da árvore (memoizadas por índice). */
export function energias(idx: IndiceArvore): Map<string, number> {
  const pronto = cache.get(idx);
  if (pronto) return pronto;
  const m = new Map<string, number>();
  const calc = (id: string): number => {
    const ja = m.get(id);
    if (ja !== undefined) return ja;
    const no = idx.porId.get(id)!;
    const fs = filhosDe(idx, id);
    let e: number;
    if (fs.length) e = fs.reduce((s, f) => s + calc(f), 0) / fs.length;
    else e = energiaFolha(no, idx.profundidade.get(id) ?? 0, idx.grauMax);
    if (id === idx.raiz.id) e = ENERGIA_RAIZ;
    e = Math.round(clampEnergia(e) * 1000) / 1000;   // 3 casas: servidor e navegador desenham igual (hidratação)
    m.set(id, e);
    return e;
  };
  for (const id of idx.ordem) calc(id);
  cache.set(idx, m);
  return m;
}

/** A energia de um nó (memoizada). Nó desconhecido → a da raiz. */
export function energia(idx: IndiceArvore, id: string): number {
  return energias(idx).get(id) ?? ENERGIA_RAIZ;
}
