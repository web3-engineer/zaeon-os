/**
 * lib/forja/adaptadores/index.ts — barril dos adaptadores de SAÍDA dos engines → modelo da Forja.
 * Cada engine é um provedor cuja saída (graph.json / knowledge-graph.json) é normalizada aqui, puro.
 */
export { graphifyParaGrafo, arestaDeRelation, tipoDoNoGraphify } from "./graphify";
export type { GraphifyJson } from "./graphify";
export {
  understandParaGrafo, understandParaArvore, temperaturaDoPasso,
  tipoDoNoUA, arestaDeEdgeType, temperaturaDeComplexidade,
} from "./understand";
export type { UnderstandJson } from "./understand";
