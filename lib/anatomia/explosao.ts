/**
 * lib/anatomia/explosao.ts — o LAYOUT da vista explodida. PURA: aritmética, sem three, sem DOM.
 *
 * Porte de `app/explosion-layout.ts` do human-atlas (MIT — procedência completa em
 * lib/anatomia/atlas.ts). O algoritmo é o deles, linha por linha: empacotamento em prateleiras
 * (shelf packing) das caixas projetadas das peças VISÍVEIS, ordenadas por altura decrescente, com
 * largura-alvo derivada da área total e do aspecto da tela. Depois o conjunto é centrado na origem.
 *
 * Por que isto vive separado da cena: é a única parte da explosão que dá para PROVAR sem GPU —
 * nenhuma célula se sobrepõe, nada escapa da largura-alvo, a ordem não depende do acaso. A cena
 * só interpola para as posições que esta função decide.
 *
 * O desempate por `id` (e não só por altura) é deles e é importante: sem ele, duas peças de mesma
 * altura trocariam de lugar entre quadros conforme a ordem de chegada dos pedaços binários, e a
 * vista explodida tremeria. É estabilidade, não estética.
 */
import type { Parte } from "@/lib/anatomia/atlas";

export type Celula = { x: number; y: number; largura: number; altura: number };

export type Layout = {
  /** célula por id de peça — a cena lê daqui o destino de cada malha */
  celulas: Map<string, Celula>;
  /** extensão ocupada, usada pela câmera para enquadrar o inventário inteiro */
  largura: number;
  altura: number;
};

/** Folga entre peças, em unidades de mundo. Valor do original. */
const FOLGA = 0.04;
/** Menor lado que uma célula pode ter: peças minúsculas ainda precisam de alvo clicável. */
const MINIMO = 0.035;

/**
 * Empacota SÓ as peças visíveis. Cada caixa projetada ganha a sua própria célula.
 *
 * @param partes as peças visíveis no momento (a cena recalcula quando esse conjunto muda)
 * @param aspecto largura/altura do canvas — decide se o inventário fica mais largo ou mais alto
 */
export function criarLayoutDeExplosao(partes: readonly Parte[], aspecto = 1): Layout {
  const cartoes = partes.map((p) => ({
    id: p.id,
    largura: Math.max(MINIMO, p.bounds[1][0] - p.bounds[0][0]) + FOLGA,
    altura: Math.max(MINIMO, p.bounds[1][1] - p.bounds[0][1]) + FOLGA,
  }));

  const area = cartoes.reduce((n, c) => n + c.largura * c.altura, 0);
  const maiorLargura = Math.max(0.3, ...cartoes.map((c) => c.largura));
  const larguraAlvo = Math.max(maiorLargura, Math.sqrt(area * Math.max(0.5, Math.min(1.5, aspecto))) * 1.18);

  // altura decrescente, com desempate ESTÁVEL por id — ver cabeçalho
  cartoes.sort((a, b) => b.altura - a.altura || a.id.localeCompare(b.id));

  const celulas = new Map<string, Celula>();
  let x = 0, y = 0, alturaDaFila = 0, larguraUsada = 0;
  for (const c of cartoes) {
    if (x > 0 && x + c.largura > larguraAlvo) { x = 0; y += alturaDaFila; alturaDaFila = 0; }
    celulas.set(c.id, { x: x + c.largura / 2, y: -y - c.altura / 2, largura: c.largura, altura: c.altura });
    x += c.largura;
    larguraUsada = Math.max(larguraUsada, x);
    alturaDaFila = Math.max(alturaDaFila, c.altura);
  }
  const altura = y + alturaDaFila;

  // centra o conjunto na origem: a câmera enquadra sem precisar saber de onde ele começou
  celulas.forEach((c) => { c.x -= larguraUsada / 2; c.y += altura / 2; });

  return { celulas, largura: larguraUsada, altura };
}
