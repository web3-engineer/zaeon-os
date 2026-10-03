/**
 * lib/map/arquetipo.ts — memória ADAPTATIVA por tipo de tópico (HANDOFF_CEREBRO_AURA §4). PURO.
 *
 * O mapa de aprendizado vale pra qualquer tópico; o GATE de conclusão e o sentido de "validado"
 * mudam com o arquétipo. A tabela abaixo é o único lugar com essas regras — o gerador, a
 * bússola e (na PR-D) os pesos de AURA leem daqui.
 */
import { isModoValidacao, isTipoTopico, type ModoValidacao, type TipoNo, type TipoTopico } from "@/lib/map/tipos";

export type Arquetipo = {
  tipo: TipoTopico;
  rotulo: string;
  /** Como o estudo se conclui (default; o modelo pode refinar dentro do permitido). */
  modoValidacao: ModoValidacao;
  /** Modos aceitáveis pra este arquétipo (o resto é rejeitado na sanitização). */
  modosPermitidos: readonly ModoValidacao[];
  /** Tipo do nó final do backbone. */
  noConclusao: TipoNo;
  criterioCompletude: string;
  /** Como a bússola fala do "que falta". */
  vocabulario: { gate: string; falta: string };
  /** Se o gate exige um humano (prof/instituição) — só este dá atestado on-chain (PR-D). */
  gateHumano: boolean;
};

export const ARQUETIPOS: Record<TipoTopico, Arquetipo> = {
  aplicavel: {
    tipo: "aplicavel", rotulo: "Aplicável", modoValidacao: "humana", modosPermitidos: ["humana"], noConclusao: "experimento",
    criterioCompletude: "Comprovação validada por professor ou instituição, com evidência (dados, laudo, resultado)",
    vocabulario: { gate: "comprovação validada por um professor/instituição", falta: "aplicar e comprovar" }, gateHumano: true,
  },
  habilidade: {
    tipo: "habilidade", rotulo: "Habilidade", modoValidacao: "rubrica", modosPermitidos: ["rubrica", "humana", "peer"], noConclusao: "entrega",
    criterioCompletude: "Entrega ou demonstração avaliada por rubrica (professor ou par opcional)",
    vocabulario: { gate: "uma entrega avaliada pela rubrica", falta: "praticar e entregar" }, gateHumano: false,
  },
  conceitual: {
    tipo: "conceitual", rotulo: "Conceitual", modoValidacao: "quiz", modosPermitidos: ["quiz", "peer", "humana"], noConclusao: "conclusao",
    criterioCompletude: "Rede de conceitos fechada e auto-avaliação (quiz) aprovada; ensaio revisado opcional",
    vocabulario: { gate: "a auto-avaliação dos conceitos", falta: "fechar a rede de conceitos" }, gateHumano: false,
  },
  exploratorio: {
    tipo: "exploratorio", rotulo: "Exploratório", modoValidacao: "cobertura", modosPermitidos: ["cobertura"], noConclusao: "conclusao",
    criterioCompletude: "Cobertura dos sub-tópicos do mapa (todos os ramos visitados)",
    vocabulario: { gate: "a cobertura dos ramos", falta: "percorrer os ramos que faltam" }, gateHumano: false,
  },
  criativo: {
    tipo: "criativo", rotulo: "Criativo", modoValidacao: "peer", modosPermitidos: ["peer", "rubrica", "humana", "nenhuma"], noConclusao: "entrega",
    criterioCompletude: "Artefato produzido e feedback por critério (não há 'verdade' a validar)",
    vocabulario: { gate: "o artefato com feedback por critério", falta: "produzir e iterar o artefato" }, gateHumano: false,
  },
};

export const arquetipoDe = (t: TipoTopico): Arquetipo => ARQUETIPOS[t];

// ───────────────────────────── classificação ─────────────────────────────

export type Classificacao = { tipoTopico: TipoTopico; objetivo: string; modoValidacao: ModoValidacao; criterioCompletude: string; fonte: "modelo" | "heuristica" };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Pistas lexicais por arquétipo (ordem = prioridade do desempate). Só o fallback; o modelo decide quando responde. */
const PISTAS: [TipoTopico, RegExp][] = [
  ["criativo", /\b(compor|comp[oô]r|escrever (um|uma|o|a)? ?(conto|poema|roteiro|m[uú]sica|hist[oó]ria)|conto|poema|roteiro|ilustra[cç][aã]o|desenhar|pintar|cria[cç][aã]o art|design de)\b/],
  ["habilidade", /\b(programar|programa[cç][aã]o|aprender a (tocar|falar|usar|dirigir|cozinhar)|tocar (viol[aã]o|piano|guitarra|bateria)|idioma|ingl[eê]s|espanhol|franc[eê]s|japon[eê]s|falar|digitar|nadar|t[eé]cnica de)\b/],
  ["aplicavel", /\b(solo|circuito|doen[cç]a|tratamento|cultivo|planta[cç][aã]o|motor|reator|f[oó]rmula[cç][aã]o|sintetizar|cultura de c[eé]lulas|experimento|medir|an[aá]lise de|diagn[oó]stico|protocolo|irriga[cç][aã]o|fertiliza)\b/],
  ["exploratorio", /\b(panorama|vis[aã]o geral|introdu[cç][aã]o a|o que [eé]|hist[oó]rico d|campo d[ae]|[aá]reas d[ae]|tend[eê]ncias|estado da arte|mapa d[oe])\b/],
  ["conceitual", /\b(filosofia|hist[oó]ria|teoria|epistemolog|[eé]tica|sociolog|conceito|fundamentos|l[oó]gica|metaf[ií]sica|antropolog|lingu[ií]stica|econom|direito)\b/],
];

/** Classificação sem modelo: pistas lexicais; nada bate → exploratório (o mais neutro). */
export function classificarHeuristica(topico: string): Classificacao {
  const t = norm(topico);
  let tipo: TipoTopico = "exploratorio";
  for (const [k, re] of PISTAS) if (re.test(t)) { tipo = k; break; }
  const a = ARQUETIPOS[tipo];
  return { tipoTopico: tipo, objetivo: objetivoPadrao(tipo, topico), modoValidacao: a.modoValidacao, criterioCompletude: a.criterioCompletude, fonte: "heuristica" };
}

function objetivoPadrao(tipo: TipoTopico, topico: string): string {
  const t = topico.trim().slice(0, 120) || "o tema";
  switch (tipo) {
    case "aplicavel": return `Aplicar ${t} num caso real e comprovar o resultado com evidência`;
    case "habilidade": return `Demonstrar ${t} numa entrega avaliável`;
    case "conceitual": return `Dominar os conceitos centrais de ${t} e explicá-los com as próprias palavras`;
    case "criativo": return `Produzir um artefato de ${t} e iterar com feedback`;
    default: return `Mapear os sub-tópicos de ${t} e saber onde aprofundar`;
  }
}

/**
 * Sanitiza o JSON do modelo. Tipo inválido → null (quem chama usa a heurística). Modo fora do
 * permitido pro arquétipo → o default do arquétipo (o modelo não "promove" um conceitual a
 * validação humana nem rebaixa um aplicável a quiz). Objetivo vazio/longo demais → padrão.
 */
export function sanitizeClassificacao(raw: unknown, topico: string): Classificacao | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const tipo = typeof r.tipoTopico === "string" ? norm(r.tipoTopico).replace(/[^a-z]/g, "") : "";
  if (!isTipoTopico(tipo)) return null;
  const a = ARQUETIPOS[tipo];
  const modo = isModoValidacao(r.modoValidacao) && a.modosPermitidos.includes(r.modoValidacao) ? r.modoValidacao : a.modoValidacao;
  const objetivo = typeof r.objetivo === "string" && r.objetivo.trim().length >= 8 ? r.objetivo.trim().slice(0, 300) : objetivoPadrao(tipo, topico);
  const criterio = typeof r.criterioCompletude === "string" && r.criterioCompletude.trim().length >= 8 ? r.criterioCompletude.trim().slice(0, 300) : a.criterioCompletude;
  return { tipoTopico: tipo, objetivo, modoValidacao: modo, criterioCompletude: criterio, fonte: "modelo" };
}

export const CLASSIFICAR_SYSTEM =
  "Você é a Aura classificando um TÓPICO de estudo (PT-BR) num arquétipo e delimitando um OBJETIVO alcançável. " +
  "Arquétipos: \"aplicavel\" (solo, circuito, doença — termina em comprovação validada por humano), " +
  "\"habilidade\" (programar, tocar, idioma — termina em entrega/demonstração por rubrica), " +
  "\"conceitual\" (filosofia, história, teoria — rede de conceitos + quiz), " +
  "\"exploratorio\" (panorama de um campo — cobertura dos ramos), \"criativo\" (compor, escrever — artefato + feedback por critério). " +
  "O objetivo tem de ser FECHÁVEL (\"aprender programação\" nunca fecha; \"publicar uma API REST com testes\" fecha). " +
  "Responda SOMENTE JSON: {\"tipoTopico\":\"…\",\"objetivo\":\"…\",\"modoValidacao\":\"humana|rubrica|quiz|peer|cobertura|nenhuma\",\"criterioCompletude\":\"…\"}";
