/**
 * lib/orquestra/prompts.ts — o que TODO motor ouve da Zaeon, seja de quem for a arquitetura.
 *
 * As regras são poucas e são as da casa: português do Brasil, citação só por chave [E#] que existe,
 * nunca inventar referência, e escrever para o aluno que pediu (o contexto dele vem do turno).
 */
import type { Tarefa } from "@/lib/orquestra/contrato";

const MAX_CONTEXTO = 12_000;
const MAX_HISTORICO = 6;

/** o contexto do aluno: com ORÇAMENTO (não um corte cego no meio), o texto colado e o fim preservados */
export function contextoDoAluno(t: Tarefa): string {
  const ctx = (t.contexto ?? "").trim();
  const historico = t.historico.slice(-MAX_HISTORICO).map((h) => `${h.role === "user" ? "Aluno" : "Assistente"}: ${String(h.text).slice(0, 800)}`).join("\n");
  const blocos: string[] = [];
  if (ctx) {
    blocos.push(ctx.length <= MAX_CONTEXTO ? ctx : `${ctx.slice(0, MAX_CONTEXTO / 2)}\n…\n${ctx.slice(-MAX_CONTEXTO / 2)}`);
  }
  if (historico) blocos.push(`Conversa até aqui (é a MESMA conversa — mantenha o assunto):\n${historico}`);
  return blocos.join("\n\n");
}

export const REGRAS_DE_CITACAO =
  "REGRAS DE EVIDÊNCIA (inegociáveis):\n" +
  "- Toda afirmação factual que veio de uma busca leva a chave da evidência entre colchetes, ex.: [E3] ou [E3][E7].\n" +
  "- Só cite chaves que apareceram nos resultados das ferramentas. Nunca invente chave, autor, ano, DOI ou título.\n" +
  "- Se a evidência não cobre um ponto, diga que não encontrou fonte para ele em vez de preencher com memória.";

export function formatoDaEntrega(t: Tarefa): string {
  if (t.intent === "criar_trabalho") {
    const tipo = t.kind ?? "artigo";
    return `ENTREGA: um ${tipo} acadêmico completo em markdown, em português do Brasil. Comece com um parágrafo-resumo (sem título). ` +
      `Depois as seções, cada uma começando com "## Título da seção" (ex.: Introdução, Fundamentação, Metodologia, Discussão, Conclusão). ` +
      `Não escreva lista de referências no fim — a Zaeon monta as referências a partir das chaves [E#] que você citou.`;
  }
  if (t.intent === "pesquisar_fontes") {
    return "ENTREGA: em português do Brasil, um parágrafo-resumo do estado da questão; depois \"## Fontes principais\" comentando as mais relevantes " +
      "(o que cada uma traz, citando a chave), e \"## Lacunas\" com o que a literatura encontrada não responde.";
  }
  return "ENTREGA: em português do Brasil. Comece com um parágrafo que responde direto à pergunta; depois aprofunde em seções \"## …\" quando ajudar.";
}

export function sistemaDoPesquisador(t: Tarefa, quem: string): string {
  const aluno = contextoDoAluno(t);
  return [
    `Você é ${quem}, trabalhando dentro da Zaeon, uma plataforma acadêmica brasileira, para um estudante.`,
    "Pesquise com as ferramentas antes de afirmar: bases acadêmicas reais primeiro, web quando o tema for atual ou fora da academia. " +
      "Faça várias consultas (em inglês para papers), compare fontes, e só conclua quando a evidência for suficiente.",
    REGRAS_DE_CITACAO,
    formatoDaEntrega(t),
    aluno ? `CONTEXTO DO ESTUDANTE (use para personalizar; não repita de volta):\n${aluno}` : "",
  ].filter(Boolean).join("\n\n");
}

export function sistemaDoSubagente(t: Tarefa, numero: number, titulo: string): string {
  return [
    `Você é o subagente ${numero} de uma equipe de pesquisa da Zaeon. Sua parte: "${titulo}".`,
    "Você NÃO vê o trabalho dos outros subagentes. Concentre-se só na sua parte, pesquise com as ferramentas e devolva um RELATÓRIO COMPACTO " +
      "(no máximo ~350 palavras) com os achados, cada um com a chave [E#] da evidência. Sem introdução, sem conclusão genérica.",
    REGRAS_DE_CITACAO,
    `O objetivo geral da equipe (para contexto): ${t.objetivo.slice(0, 600)}`,
  ].join("\n\n");
}

export function sistemaDoOrquestrador(t: Tarefa, quem: string, maxSubagentes: number): string {
  const aluno = contextoDoAluno(t);
  return [
    `Você é ${quem}, o ORQUESTRADOR de uma equipe de agentes de pesquisa da Zaeon, trabalhando para um estudante.`,
    `Seu trabalho: (1) quebrar o pedido em partes independentes que possam ser pesquisadas EM PARALELO; (2) chamar a ferramenta \`delegar\` ` +
      `com essas partes (até ${maxSubagentes} subagentes no total — prefira mais partes estreitas a poucas largas quando o tema for amplo); ` +
      `(3) ler os relatórios; se houver lacuna importante, delegar uma segunda rodada só para ela; (4) escrever a entrega final integrando tudo.`,
    "Os subagentes têm contexto isolado: escreva cada instrução de forma autossuficiente (o que buscar, em que recorte, que pergunta responder).",
    REGRAS_DE_CITACAO,
    formatoDaEntrega(t),
    aluno ? `CONTEXTO DO ESTUDANTE:\n${aluno}` : "",
  ].filter(Boolean).join("\n\n");
}

export function pedidoDaTarefa(t: Tarefa): string {
  return `Pedido do estudante:\n${t.objetivo}`;
}
