/**
 * lib/rag/porDocumento.ts — cobertura POR DOCUMENTO na busca da base (F4 de
 * docs/PLANO_HARNESS_AGENTICO.md). PURO.
 *
 * O PROBLEMA (§4.3): a busca do turno é um top-k=8 PLANO sobre todos os documentos misturados. Isso
 * responde "qual o método do texto 3?" e NÃO responde "o que esses 10 textos dizem em comum sobre
 * X" — que é a pergunta acadêmica de verdade. Com 10 documentos na base, um único deles pode levar
 * os 8 melhores trechos e os outros nove não aparecem no prompt.
 *
 * O QUE ISTO NÃO É: não é RAPTOR. O RAPTOR (parthsarthi03/raptor, ICLR 2024) embute, CLUSTERIZA e
 * resume recursivamente os trechos numa árvore PERSISTENTE, e a busca puxa de vários níveis. Fazer
 * isso aqui exigiria reindexar toda a base e manter a árvore viva — e o dono já decidiu, no plano do
 * documento, que o RAPTOR fica opcional.
 *
 * O QUE ISTO É: a mesma ideia de "vários níveis", montada POR PERGUNTA e jogada fora depois — uma
 * consulta mais larga, reagrupada por documento, e uma síntese cruzada em cima (lib/agent/sintese).
 * Sem índice novo, sem reindexação, e o nível fino (os trechos crus) continua no prompt do mesmo
 * jeito: o rascunho passa a ver OS DOIS níveis.
 */
import { K_PADRAO, type TrechoAchado } from "./busca";

/**
 * O `k` da consulta LARGA. 40 não é chute: com o teto de 10 documentos por conversa que o dono
 * fixou, são 4 trechos por documento no caso em que a relevância se distribui por igual — folga
 * suficiente pra todo documento aparecer, e ainda é UMA consulta SQL (sem modelo, sem embed novo:
 * o vetor da pergunta é o compartilhado).
 */
export const K_AMPLO = 40;

/** Trechos por documento no agrupamento. 3 cobre "o que este texto diz sobre X" sem virar despejo. */
export const TRECHOS_POR_DOC = 3;

/** Documentos no agrupamento — o mesmo teto de 10 arquivos por trabalho que o dono fixou. */
export const MAX_DOCS = 10;

/** Abaixo de 2 documentos não existe "síntese cruzada" — é um documento, e o caminho normal serve. */
export const MIN_DOCS_SINTESE = 2;

export type DocDaBase = {
  documentoId: string;
  titulo: string;
  publico: boolean;
  /** os melhores trechos DESTE documento para a pergunta */
  trechos: TrechoAchado[];
  /** o melhor score do documento — é por ele que os documentos são ordenados */
  melhor: number;
};

/** O score comparável de um trecho (o ramo texto não tem similaridade; `score` é o que a busca deu). */
const pontos = (t: TrechoAchado): number => (Number.isFinite(t.score) ? t.score : (t.similaridade ?? 0));

/**
 * Reagrupa o resultado plano POR DOCUMENTO, preservando a ordem de relevância dentro de cada um e
 * ordenando os documentos pelo melhor trecho. Puro: a consulta larga continua sendo uma só.
 */
export function agruparPorDocumento(
  trechos: readonly TrechoAchado[],
  opts: { porDoc?: number; maxDocs?: number } = {},
): DocDaBase[] {
  const porDoc = Math.max(1, Math.floor(opts.porDoc ?? TRECHOS_POR_DOC));
  const maxDocs = Math.max(1, Math.floor(opts.maxDocs ?? MAX_DOCS));
  const mapa = new Map<string, DocDaBase>();
  for (const t of trechos) {
    if (!t?.documentoId) continue;
    const atual = mapa.get(t.documentoId);
    if (!atual) {
      mapa.set(t.documentoId, {
        documentoId: t.documentoId,
        titulo: String(t.titulo ?? "").trim() || "documento sem título",
        publico: t.publico === true,
        trechos: [t],
        melhor: pontos(t),
      });
      continue;
    }
    if (atual.trechos.length < porDoc) atual.trechos.push(t);
    atual.melhor = Math.max(atual.melhor, pontos(t));
  }
  return [...mapa.values()].sort((a, b) => b.melhor - a.melhor).slice(0, maxDocs);
}

/**
 * Os trechos que vão pro BLOCO DE CITAÇÃO do prompt — e eles têm de continuar sendo os mesmos de
 * antes. `blocoDaBase` numera `[B1]..[Bn]` por POSIÇÃO e o modelo devolve `citacoes_base: [n]`:
 * trocar a lista por uma maior desalinharia toda citação. Então a consulta larga serve a síntese, e
 * o bloco de citação recebe o top-k de sempre, idêntico ao que receberia sem a F4.
 */
export function trechosParaCitar(trechos: readonly TrechoAchado[], k = K_PADRAO): TrechoAchado[] {
  return trechos.slice(0, Math.max(1, Math.floor(k)));
}

/** Vale sintetizar? (dois documentos ou mais em jogo) */
export function valeSintetizar(docs: readonly unknown[]): boolean {
  return docs.length >= MIN_DOCS_SINTESE;
}
