/**
 * O "PENSAR" de cada fase da Aura (out/2026, "as respostas estão lentas"). O gemini-3.5-flash pensa ~5 s antes da 1ª
 * palavra no nível padrão; medido na mesma pergunta (Vertex global): padrão 1ª palavra 5,2 s / total 6,1 s ·
 * low 4,3 / 5,4 · minimal 1,4 / 3,0. A classificação (um JSON de uma palavra, com prazo de 8 s) e o raciocínio
 * (2–4 frases) não precisam pensar; o rascunho do pipeline completo pensa pouco. Ideia do google-research/harness2
 * (esforço de raciocínio por papel). Ajustável por env SEM deploy de código: PENSAR_ROUTE, PENSAR_REASON,
 * PENSAR_DRAFT, PENSAR_DRAFT_RAPIDO, PENSAR_DRAFT_ELABORADO, PENSAR_PLAN = minimal | low | medium | high | padrao (padrao = não mandar nada).
 */
export type NivelPensar = "minimal" | "low" | "medium" | "high";
export type FasePensar = "route" | "reason" | "draft" | "draft_rapido" | "draft_elaborado" | "plan" | "acao" | "sintese";

export const PENSAR_PADRAO: Record<FasePensar, NivelPensar | undefined> = {
  // draft_elaborado (explicar a fundo, fontes, artefato): minimal — eval em prod (24/out, 12 perguntas, juiz cego por
  // pares): sem raciocínio separado + minimal = 1ª palavra 0,99 s (era 2,7 s) e venceu a atual em 9 de 12.
  // draft (Modo Pesquisa: trabalho completo, revisão) continua low.
  // acao (F2, "que ferramenta chamar agora?"): minimal. É uma escolha num menu curto, com prazo
  // de 12 s, e roda até 2x por turno — raciocínio longo aqui vira latência que o aluno sente
  // ANTES da primeira palavra, sem melhorar uma decisão que é quase sempre "já basta".
  // sintese (F4, comparar 2+ documentos): "low". Diferente da `acao`, aqui raciocinar AJUDA — a
  // tarefa é achar convergência, divergência e lacuna entre textos, não escolher num menu.
  route: "minimal", reason: "minimal", draft_rapido: "minimal", draft_elaborado: "minimal", draft: "low", plan: undefined, acao: "minimal", sintese: "low",
};
const NIVEIS = new Set<NivelPensar>(["minimal", "low", "medium", "high"]);

export function pensarDa(fase: FasePensar, env: Record<string, string | undefined> = process.env): NivelPensar | undefined {
  const v = env[`PENSAR_${fase.toUpperCase()}`]?.trim().toLowerCase();
  if (v === "padrao" || v === "padrão") return undefined;
  if (v && NIVEIS.has(v as NivelPensar)) return v as NivelPensar;
  return PENSAR_PADRAO[fase];
}

/** o pedaço de generationConfig do Vertex pro nível (Gemini 3.x: thinkingLevel; 2.5-flash: só "minimal" → budget 0) */
export function thinkingConfigDo(modelo: string, nivel: NivelPensar | undefined): Record<string, unknown> {
  if (!nivel) return {};
  if (/gemini-3/i.test(modelo)) return { thinkingConfig: { thinkingLevel: nivel } };
  if (/gemini-2\.5-flash/i.test(modelo) && nivel === "minimal") return { thinkingConfig: { thinkingBudget: 0 } };
  return {};   // 2.5-pro não desliga o pensar; outros modelos: nada
}
