/**
 * #873 — PEÇA JURÍDICA no chat (petição, contestação, recurso, contrato, parecer, procuração, notificação).
 *
 * O que acontecia (23/11): "faz uma petição inicial de ação de cobrança… pra eu baixar" não virava documento. A Zaeon
 * só conhecia 4 tipos de trabalho (artigo, relatório, TCC, pesquisa), todos no formato acadêmico (ABNT, introdução,
 * metodologia). Pedido de peça caía em "explicar o conceito": um parágrafo sobre o que uma petição tem + guia de estudo.
 *
 * Aqui:
 *  - `pedePecaJuridica` reconhece o pedido e o TIPO da peça (puro, testável);
 *  - `esqueletoDaPeca` dá a estrutura da peça (não a do artigo): endereçamento, qualificação, fatos, direito, pedidos…;
 *  - `gerarPecaEmBackground` escreve a peça inteira numa chamada pelo ENVELOPE (lib/llm/envelope: os provedores
 *    atuais — nada de Google direto) e grava no mesmo documento do editor, que já tem "Exportar".
 * Toda peça abre com o AVISO: é modelo pra estudo, precisa de revisão de advogado. Dado que o aluno não deu (nome, CPF,
 * endereço, nº do processo) fica entre colchetes — a IA não inventa.
 */

/** minúsculas sem acento */
const norm = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export type TipoPeca = "peticao_inicial" | "contestacao" | "recurso" | "contrato" | "parecer" | "procuracao" | "notificacao" | "peca";

/** o rótulo (tipo do trabalho no editor e no topo do chat) */
export const TIPO_TRABALHO_PECA = "Peça jurídica";

export const AVISO_PECA =
  "Modelo gerado pela Zaeon para estudo. Não substitui um advogado: confira a lei, os prazos e a competência, " +
  "preencha os dados entre colchetes e peça a revisão de um profissional antes de usar ou protocolar.";

const FECHAMENTO = "FECHAMENTO (LOCAL, DATA E ASSINATURA)";

const PECAS: { tipo: TipoPeca; nome: string; re: RegExp; secoes: string[] }[] = [
  { tipo: "contestacao", nome: "Contestação", re: /\bcontestacao\b/,
    secoes: ["ENDEREÇAMENTO", "QUALIFICAÇÃO DAS PARTES", "SÍNTESE DA PETIÇÃO INICIAL", "DAS PRELIMINARES", "DO MÉRITO", "DOS PEDIDOS", "DAS PROVAS", FECHAMENTO] },
  { tipo: "recurso", nome: "Recurso", re: /\b(recurso|apelacao|agravo|embargos de declaracao)\b/,
    secoes: ["ENDEREÇAMENTO E INTERPOSIÇÃO", "DO CABIMENTO E DA TEMPESTIVIDADE", "SÍNTESE DOS FATOS E DA DECISÃO RECORRIDA", "DAS RAZÕES PARA A REFORMA", "DOS PEDIDOS", FECHAMENTO] },
  { tipo: "peticao_inicial", nome: "Petição inicial", re: /\bpeticao\b|\bacao de\b|\bmandado de seguranca\b|\bhabeas corpus\b/,
    secoes: ["ENDEREÇAMENTO", "QUALIFICAÇÃO DAS PARTES", "DOS FATOS", "DO DIREITO", "DOS PEDIDOS", "DAS PROVAS", "DO VALOR DA CAUSA", FECHAMENTO] },
  { tipo: "contrato", nome: "Contrato", re: /\b(contrato|distrato)\b/,
    secoes: ["QUALIFICAÇÃO DAS PARTES", "DO OBJETO", "DAS OBRIGAÇÕES DAS PARTES", "DO PREÇO E DO PAGAMENTO", "DO PRAZO", "DA RESCISÃO", "DAS PENALIDADES", "DO FORO", "ASSINATURAS E TESTEMUNHAS"] },
  { tipo: "parecer", nome: "Parecer jurídico", re: /\bparecer\b/,
    secoes: ["EMENTA", "RELATÓRIO", "FUNDAMENTAÇÃO", "CONCLUSÃO", FECHAMENTO] },
  { tipo: "procuracao", nome: "Procuração", re: /\bprocuracao\b/,
    secoes: ["OUTORGANTE", "OUTORGADO", "PODERES", "VALIDADE, LOCAL, DATA E ASSINATURA"] },
  { tipo: "notificacao", nome: "Notificação extrajudicial", re: /\bnotificacao\b/,
    secoes: ["NOTIFICANTE E NOTIFICADO", "DOS FATOS", "DA NOTIFICAÇÃO", "DO PRAZO E DAS CONSEQUÊNCIAS", FECHAMENTO] },
];
const GENERICA = { tipo: "peca" as const, nome: "Peça jurídica", secoes: ["ENDEREÇAMENTO", "QUALIFICAÇÃO DAS PARTES", "DOS FATOS", "DO DIREITO", "DOS PEDIDOS", FECHAMENTO] };
/** "peça jurídica", "peça processual", "documento jurídico" sem dizer qual */
const PECA_GENERICA_RE = /\bpeca (juridica|processual)\b|\bdocumento juridico\b|\bminuta\b/;

/** quem quer APRENDER a fazer (explicação), não receber a peça */
const QUER_APRENDER_RE = /\b(como (se )?(faz|fazer|faco|escrever|redigir|elaborar)|me ensin|ensina|o que e|o que sao|explica|explique|diferenca entre|quais (sao )?os requisitos|estrutura de uma)\b/;
/** verbos de pedir a peça pronta */
const GERAR_RE = /(^|\s)(gere|gerar|gera|crie|criar|cria|faca|fazer|faz|monte|montar|produza|escreva|escrever|redija|redigir|elabore|elaborar|prepare|preparar|minute|minutar|quero (?:um|uma)|preciso de (?:um|uma)|me (?:da|de|manda|mande|passa|passe) (?:um|uma))(\s|$)/;
/** pedido de trabalho ACADÊMICO sobre o tema ("artigo sobre contratos") — esse é artigo, não peça */
const ACADEMICO_RE = /\b(artigo|tcc|monografia|dissertacao|tese|ensaio|resenha|relatorio|paper|trabalho academico|redacao)\b/;

/** O tipo da peça pedida, ou null quando o texto não pede uma peça pronta. PURO. */
export function pedePecaJuridica(texto: string): TipoPeca | null {
  const t = norm(texto);
  if (!GERAR_RE.test(t) || QUER_APRENDER_RE.test(t) || ACADEMICO_RE.test(t)) return null;
  for (const p of PECAS) if (p.re.test(t)) return p.tipo;
  return PECA_GENERICA_RE.test(t) ? "peca" : null;
}

const daPeca = (tipo: TipoPeca) => PECAS.find((p) => p.tipo === tipo) ?? GENERICA;

/** a estrutura da peça: o AVISO primeiro, depois as partes da peça */
export function esqueletoDaPeca(tipo: TipoPeca): string[] {
  return ["OBSERVAÇÃO", ...daPeca(tipo).secoes];
}

export const nomeDaPeca = (tipo: TipoPeca) => daPeca(tipo).nome;

/** "faz uma petição inicial de ação de cobrança por aluguel atrasado" → "Petição inicial — ação de cobrança por aluguel atrasado" */
export function tituloDaPeca(tipo: TipoPeca, pedido: string): string {
  const limpo = String(pedido || "").replace(/\s+/g, " ").trim().replace(/[.!?]+$/, "");
  const m = limpo.match(/\b(?:de|sobre|para|pra|contra|referente a)\s+(.+)$/i);
  let tema = (m ? m[1] : "").replace(/,?\s*(em|num|no formato de)\s+(documento|word|pdf|arquivo).*$/i, "").replace(/,?\s*pra eu baixar.*$/i, "").trim();
  // "petição inicial de ação de cobrança": o "de" pega já o assunto; tira o nome da peça se ele vier repetido
  if (norm(tema).startsWith(norm(nomeDaPeca(tipo)))) tema = tema.slice(nomeDaPeca(tipo).length).trim();
  const titulo = tema ? `${nomeDaPeca(tipo)} — ${tema}` : nomeDaPeca(tipo);
  return titulo.slice(0, 200);
}

export const PECA_SYS = [
  "Você redige PEÇAS JURÍDICAS brasileiras (petições, contestações, recursos, contratos, pareceres, procurações, notificações) como MODELO para estudo.",
  "Escreva em português formal, com a estrutura e a linguagem de uma peça de verdade — NÃO é artigo acadêmico: sem resumo, sem introdução teórica, sem metodologia, sem referências ABNT.",
  "Use a legislação brasileira aplicável ao caso (Código Civil, CPC, CDC, Lei do Inquilinato etc.), citando o artigo só quando tiver certeza. Não invente jurisprudência, número de processo nem julgado.",
  "Todo dado que o pedido NÃO trouxe (nomes, CPF/CNPJ, endereços, vara, comarca, datas, número do processo, valores não informados) fica entre colchetes em MAIÚSCULAS, ex.: [NOME DO AUTOR], [CPF], [COMARCA]. Nunca invente esses dados.",
  "Use EXATAMENTE as seções pedidas, na ordem, com o corpo de cada uma completo (parágrafos, e nos pedidos/cláusulas uma lista numerada).",
  'Responda SOMENTE JSON válido: {"titulo":"<título curto da peça>","secoes":[{"titulo":"<título da seção>","corpo":"<texto>"}]}',
].join("\n");

export function pecaUser(tipo: TipoPeca, pedido: string): string {
  const secoes = daPeca(tipo).secoes;
  return [
    `Tipo de peça: ${nomeDaPeca(tipo)}.`,
    `Pedido do aluno: ${String(pedido || "").slice(0, 4000)}`,
    `Seções, nesta ordem: ${secoes.join(" | ")}.`,
  ].join("\n");
}

type SaidaPeca = { titulo?: string; secoes?: { titulo?: string; corpo?: string }[] };
type Gen = (sys: string, user: string) => Promise<SaidaPeca | null>;

const genPadrao: Gen = async (sys, user) => {
  // o envelope (lib/llm/envelope) escolhe o provedor; nada de Vertex direto aqui
  const { geminiJson } = await import("@/lib/scholar/gemini");
  return geminiJson<SaidaPeca>(sys, user, { temperature: 0.3, timeoutMs: 90_000 });
};

/** As seções que o modelo escreveu, com o AVISO na frente (sempre o nosso texto, nunca o do modelo). PURO. */
export function secoesDaPeca(tipo: TipoPeca, saida: SaidaPeca | null): { titulo: string; corpo: string }[] {
  const doModelo = (saida?.secoes ?? [])
    .map((s) => ({ titulo: String(s?.titulo ?? "").trim().toUpperCase().slice(0, 120), corpo: String(s?.corpo ?? "").trim() }))
    .filter((s) => s.titulo && s.corpo && !/^OBSERVA/.test(s.titulo));
  return [{ titulo: "OBSERVAÇÃO", corpo: AVISO_PECA }, ...doModelo];
}

/**
 * Escreve a peça no documento já criado (com o esqueleto) e marca "pronto". Nunca lança: falhou → status "erro"
 * (o editor mostra) e o aviso fica no documento.
 */
export async function gerarPecaEmBackground(workId: string, userId: string, pedido: string, tipo: TipoPeca, gen: Gen = genPadrao): Promise<void> {
  const store = await import("@/lib/tcc/store");
  try {
    const saida = await gen(PECA_SYS, pecaUser(tipo, pedido));
    const secoes = secoesDaPeca(tipo, saida);
    if (secoes.length < 2) throw new Error("peça vazia");
    const r = await store.aplicarNoTcc(workId, userId, (t) => {
      const porTitulo = new Map(t.secoes.map((s) => [s.titulo.trim().toUpperCase(), s]));
      return secoes.map((s) => {
        const existe = porTitulo.get(s.titulo);
        return existe ? { op: "substituir" as const, secaoId: existe.id, corpo: s.corpo } : { op: "inserir" as const, titulo: s.titulo, corpo: s.corpo };
      });
    }, "estudos");
    if (!r.ok) throw new Error(`não gravou: ${r.reason ?? "?"}`);
    await store.marcarStatus(workId, userId, "pronto");
  } catch (e: any) {
    console.warn("[peca] geração falhou:", e?.message ?? e);
    await store.marcarStatus(workId, userId, "erro").catch(() => {});
  }
}
