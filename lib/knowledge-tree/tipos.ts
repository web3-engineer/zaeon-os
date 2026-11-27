/**
 * lib/knowledge-tree/tipos.ts — o contrato da ÁRVORE NEURONAL (components/knowledge-tree/ArvoreNeuronal).
 *
 * Qualquer árvore de conhecimento/curso entra no componente nesta forma: um nó por lição, com filhos.
 * A lógica (progresso, energia, geometria, pulsos) é PURA e mora nos outros arquivos desta pasta;
 * o componente só desenha. Ver docs/ARVORE_NEURONAL.md.
 */

/** O tipo da lição. Nas folhas decide a energia de reserva (quando o grafo não dá o grau). */
export type TipoLicaoArvore = "raiz" | "modulo" | "conceito" | "ideia" | "relacoes" | "codigo" | "pratica";

export type NoArvore = {
  id: string;
  titulo: string;
  tipo: TipoLicaoArvore;
  resumo?: string;
  /** centralidade no grafo real (quantas arestas tocam o que esta lição explica). Opcional. */
  grau?: number;
  filhos: NoArvore[];
};

/** A árvore indexada uma vez: tudo que as funções puras consultam sem andar de novo. */
export type IndiceArvore = {
  raiz: NoArvore;
  porId: Map<string, NoArvore>;
  pai: Map<string, string | null>;
  profundidade: Map<string, number>;
  /** as lições em PRÉ-ORDEM (raiz primeiro): é a ordem do curso. */
  ordem: string[];
  /** descendentes de cada nó (sem ele mesmo), em pré-ordem. */
  descendentes: Map<string, string[]>;
  /** o maior grau da árvore (0 se nenhum nó traz grau). */
  grauMax: number;
};
