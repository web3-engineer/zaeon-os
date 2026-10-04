/**
 * lib/map/resumoNo.ts — o RESUMO de um tópico do mapa de conhecimento (HANDOFF lounge §5.5), PURO.
 * Ao clicar num tópico: o que é, o que precisa ser atendido pra concluí-lo e as gavetas de memória.
 * `resumo`/`req` vêm do modelo (percurso); quando faltam (nós antigos/fallback), derivamos sem LLM.
 */
import { ARQUETIPOS } from "@/lib/map/arquetipo";
import type { MapaNo, ModoValidacao, TipoNo, TipoTopico } from "@/lib/map/tipos";

const O_QUE_E: Record<TipoNo, string> = {
  conceito: "Conceito do estudo", evidencia: "Evidência que sustenta o estudo", passo: "Passo do percurso", secao: "Seção do estudo",
  artefato: "Artefato produzido no estudo", experimento: "Experimento do percurso", entrega: "Entrega do percurso", conclusao: "Conclusão do estudo",
};

/** Critério de avanço por modo de validação (o "gate" do arquétipo). */
export const REQ_POR_MODO: Record<ModoValidacao, string> = {
  humana: "Aplique na prática, registre a evidência (dados, resultado, link) e envie para o seu professor validar — a chancela vira atestado.",
  rubrica: "Entregue o trabalho e atenda aos critérios da rubrica (professor ou par).",
  quiz: "Feche a rede de conceitos e passe na auto-avaliação (quiz).",
  peer: "Compartilhe com um par e incorpore o feedback recebido.",
  cobertura: "Visite os sub-tópicos deste ramo até cobrir o essencial.",
  nenhuma: "Explore até se sentir confortável — não há nota a atingir.",
};

const um = (s: string) => s.replace(/\s+/g, " ").trim();

export function resumoDoNo(n: Pick<MapaNo, "label" | "tipo" | "resumo" | "corpo" | "closet">): string {
  if (n.resumo) return um(n.resumo);
  const base = um(n.corpo || n.closet || "");
  if (base) return base.length > 220 ? base.slice(0, 217) + "…" : base;
  return `${O_QUE_E[n.tipo]}: ${n.label}.`;
}

/** O que precisa ser atendido pra concluir o tópico. O último passo do percurso carrega o critério do estudo. */
export function requisitoDoNo(n: Pick<MapaNo, "req">, ctx: { modoValidacao: ModoValidacao; tipoTopico: TipoTopico; criterioCompletude?: string; ehConclusao: boolean }): string {
  if (n.req) return um(n.req);
  if (ctx.ehConclusao) return um(ctx.criterioCompletude || ARQUETIPOS[ctx.tipoTopico].criterioCompletude);
  return "Entenda e registre o que aprendeu neste tópico para avançar no percurso.";
}
