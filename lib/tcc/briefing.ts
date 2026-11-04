/**
 * lib/tcc/briefing.ts — ler o PEDIDO inteiro, em vez de fatiá-lo. PURO.
 *
 * ───────────────────────── o defeito que isto conserta ─────────────────────────
 *
 * O motor de documento reduzia a mensagem a um "tema" por `temaDoPedido()`, escrita para um caso
 * só: "crie um TCC **sobre** a fotossíntese" → "a fotossíntese". Sem "sobre"/"tema:", ela fazia
 * `prompt.slice(0, 160)`. Medido com um pedido real de 1754 caracteres, o tema saiu assim:
 *
 *   "Você é um redator acadêmico e cientista da computação sênior. Sua tarefa é redigir a
 *    primeira versão de um artigo científico em conformidade com as diretrizes m"
 *
 * O preâmbulo da INSTRUÇÃO, cortado no meio da palavra — e isso virava o título do documento, a
 * consulta do `retrievePapers`, a pergunta da busca na base e o `tema` de cada seção. 91% do
 * pedido (estrutura, 5 referências obrigatórias, vocabulário de marcadores, tom, entregáveis)
 * nunca chegava ao modelo. O dono descreveu exatamente assim: "o prompt foi computado de maneira
 * literal, o output foi obliterado".
 *
 * ───────────────────────── o que este módulo faz, e o que NÃO faz ─────────────────────────
 *
 * Ele LÊ o pedido e separa o que já está escrito lá: plano de seções, referências obrigatórias,
 * vocabulário de marcadores. É extração, não interpretação — nada aqui chama modelo, e nada aqui
 * inventa. O que não se reconhece com segurança fica de fora, e aí o motor segue como antes.
 *
 * `ehBriefing: false` é o caminho de hoje byte a byte: pedido de uma linha continua indo pelo
 * `temaDoPedido`, e nenhum TCC que já funciona muda de comportamento.
 *
 * O TEMA de um briefing fica VAZIO de propósito. Num pedido longo o assunto raramente está numa
 * frase recortável, e chutar é o que produziu o defeito. Quem nomeia é o esboço (uma chamada que
 * já acontece), que passa a receber o pedido inteiro — ver lib/tcc/gerar.ts.
 */

/** Teto do que viaja pro prompt do escritor. Pedido gigante não pode comer o orçamento do turno. */
export const MAX_INSTRUCOES = 6000;
/** Acima disto, ou com estrutura explícita, é briefing — não "crie um TCC sobre X". */
export const MIN_BRIEFING = 400;
export const MAX_REFERENCIAS = 24;
export const MAX_SECOES = 20;

export type SecaoPedida = {
  /** o número que o pedido deu (pra respeitar a ordem dele, não a do template) */
  numero: number;
  titulo: string;
  /** o pedido mandou NÃO escrever esta seção, só deixar marcadores? (ex.: "insira apenas os marcadores") */
  soMarcadores?: boolean;
};

export type Briefing = {
  /** o assunto, quando o pedido o diz com "sobre/tema:". Vazio num briefing — ver o cabeçalho. */
  tema: string;
  /** referências que o pedido mandou usar. Não-vazio = o motor NÃO busca literatura (decisão do dono). */
  referencias: string[];
  /** o plano de seções do pedido. Não-vazio = vence o template ABNT (decisão do dono). */
  secoes: SecaoPedida[];
  /** os marcadores de lacuna que o PEDIDO usa (ex.: "COMPLETAR", "VERIFICAR CITAÇÃO"). */
  marcadores: string[];
  /**
   * O que o pedido manda entregar NA RESPOSTA, e não no documento ("ao final, forneça uma lista
   * em tópicos com os dados que eu preciso fornecer"). Ver `entregaveisDoTurno`.
   */
  entregaveis: string[];
  /** o pedido inteiro, limitado — é isto que o escritor passa a ver em vez de 160 caracteres. */
  instrucoes: string;
  /** false = pedido simples; o motor segue exatamente como antes. */
  ehBriefing: boolean;
};

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** "- Seção 1: Introdução e Justificativa (…)" → { numero: 1, titulo: "Introdução e Justificativa" } */
const LINHA_SECAO = /^\s*[-*•]?\s*se[çc][ãa]o\s*(\d{1,2})\s*[:\-–]\s*(.+?)\s*$/i;
/** "[COMPLETAR: descrição]" · "[VERIFICAR CITAÇÃO]" · "[INSERIR TABELA 1: …]" */
const MARCADOR = /\[([A-ZÀ-ÚÂ-ÛÃÕÇ][A-ZÀ-ÚÂ-ÛÃÕÇ\s]{2,40}?)(?:\s*\d+)?\s*(?::|\])/g;
/** o cabeçalho que abre a lista de referências obrigatórias */
const CABECALHO_REFS = /refer[eê]ncias?\b.*\b(obrigat|fornecid|permitid|exclusiv)/i;
/** uma linha de lista: "- Autor et al. (2024), \"Título\"" */
const ITEM_LISTA = /^\s*(?:[-*•]|\d{1,2}[.)])\s+(.{8,})$/;

const limpar = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * As referências que o pedido IMPÔS. Só lê o que vem depois de um cabeçalho explícito ("REFERÊNCIAS
 * OBRIGATÓRIAS", "…fornecidas", "…permitidas"): sem cabeçalho não há como distinguir uma lista de
 * referências de qualquer outra lista do pedido, e adivinhar aqui seria inventar a bibliografia —
 * exatamente o que a plataforma inteira se recusa a fazer.
 */
export function referenciasDoPedido(prompt: string): string[] {
  const linhas = String(prompt || "").split(/\r?\n/);
  const i = linhas.findIndex((l) => CABECALHO_REFS.test(l));
  if (i < 0) return [];
  const out: string[] = [];
  for (const linha of linhas.slice(i + 1)) {
    const m = linha.match(ITEM_LISTA);
    if (m) { out.push(limpar(m[1])); continue; }
    if (!linha.trim()) { if (out.length) break; continue; }   // linha em branco FECHA a lista
    if (out.length) break;                                     // prosa depois da lista = acabou
  }
  return out.slice(0, MAX_REFERENCIAS);
}

/**
 * O plano de seções do pedido. Uma seção entra como "só marcadores" quando o próprio pedido diz
 * para não escrevê-la (o caso "para as Seções 4 e 5, insira apenas os marcadores de tabelas").
 */
export function secoesDoPedido(prompt: string): SecaoPedida[] {
  const texto = String(prompt || "");
  const achadas = new Map<number, SecaoPedida>();
  for (const linha of texto.split(/\r?\n/)) {
    const m = linha.match(LINHA_SECAO);
    if (!m) continue;
    const numero = Number(m[1]);
    if (!Number.isInteger(numero) || numero < 1 || numero > 99) continue;
    // tira o parêntese explicativo do fim: "Introdução e Justificativa (problematizando…)"
    const titulo = limpar(m[2].replace(/\s*\([^)]*\)\s*$/, "")).slice(0, 120);
    if (titulo && !achadas.has(numero)) achadas.set(numero, { numero, titulo });
  }
  // "(Para as Seções 4 e 5, insira apenas os marcadores …)" — o pedido diz para NÃO redigir
  const so = semAcento(texto).match(/para\s+as?\s+se[çc]o?[ãa]?o?e?s?\s+([\d,\se]+?)\s*,?\s*insira\s+apenas/i);
  if (so) {
    for (const n of so[1].match(/\d{1,2}/g) ?? []) {
      const numero = Number(n);
      const ja = achadas.get(numero);
      achadas.set(numero, { numero, titulo: ja?.titulo ?? `Seção ${numero}`, soMarcadores: true });
    }
  }
  return [...achadas.values()].sort((a, b) => a.numero - b.numero).slice(0, MAX_SECOES);
}

/** Os marcadores de lacuna que o pedido usa — pra o escritor falar a MESMA língua, não a dele. */
export function marcadoresDoPedido(prompt: string): string[] {
  const out = new Set<string>();
  for (const m of String(prompt || "").matchAll(MARCADOR)) {
    const nome = limpar(m[1]).toUpperCase();
    // "ex.:" e afins não são marcador; nome curto demais também não
    if (nome.length >= 3 && !/^EX\b/.test(nome)) out.add(nome);
  }
  return [...out].slice(0, 8);
}

/** "crie um artigo sobre X" → "X". Só o caminho simples; num briefing devolve vazio (ver cabeçalho). */
function temaSimples(prompt: string): string {
  const t = limpar(prompt);
  const m = t.match(/\b(?:sobre|acerca de|a respeito de|com o tema|tema:)\s+(.+)$/i);
  if (!m) return "";
  return m[1].replace(/[.!?]+$/, "").trim().slice(0, 160);
}

/**
 * É um briefing (pedido elaborado) ou um pedido de uma linha? O caminho simples não pode mudar:
 * é o que os TCCs de hoje usam.
 */
export function ehBriefing(prompt: string): boolean {
  const t = String(prompt || "");
  if (t.length >= MIN_BRIEFING) return true;
  if (secoesDoPedido(t).length >= 2) return true;
  if (referenciasDoPedido(t).length >= 2) return true;
  return false;
}

/**
 * ───────── O BURACO DE ROTEAMENTO, e o que este pedaço resolve ─────────
 *
 * Um pedido pode conter DUAS entregas: o documento ("redija as seções 1, 2, 3 e 6") e algo que é
 * da RESPOSTA ("ao final, forneça uma lista em tópicos com todos os dados empíricos que eu preciso
 * fornecer"). Hoje o turno é binário — ou vira documento, ou vira resposta —, então a segunda
 * entrega simplesmente não acontecia: o pedido inteiro era roteado para a geração do documento, e
 * a lista, que não é seção de trabalho nenhum, sumia sem aviso.
 *
 * Não é defeito do escritor, e por isso NÃO se conserta lá: uma lista de "o que você precisa me
 * mandar" não pertence ao artigo — ela seria removida antes da entrega, como o próprio modelo SOTA
 * escreveu ao intitulá-la "remover antes da submissão". O lugar dela é a bolha do chat.
 *
 * A DETECÇÃO É CONSERVADORA DE PROPÓSITO: exige um marcador de fecho ("ao final", "por fim", "ao
 * término"…) JUNTO de um verbo de entrega. Frase solta no imperativo não entra. Errar para o lado
 * de não detectar devolve o comportamento de hoje; errar para o outro lado jogaria instrução do
 * documento dentro da resposta, que é pior e mais difícil de perceber.
 */
const FECHO = /\b(ao final|ao fim|no final|por fim|ao t[ée]rmino|por [úu]ltimo|ao concluir|depois disso|em seguida)\b/i;
const VERBO_ENTREGA = /\b(forne[çc]a|apresente|liste|entregue|inclua|devolva|acrescente|gere|monte|elabore|me d[êe]|responda com)\b/i;

/** As entregas que são da RESPOSTA, não do documento. Uma por frase, limitadas. */
export function entregaveisDoTurno(prompt: string): string[] {
  const texto = String(prompt || "").replace(/\s+/g, " ").trim();
  if (!texto) return [];
  const out: string[] = [];
  for (const frase of texto.split(/(?<=[.!?])\s+/)) {
    const bruta = frase.trim();
    if (bruta.length < 15) continue;
    if (LINHA_SECAO.test(bruta)) continue;          // "Seção 4: …" é documento, não resposta
    const m = bruta.match(FECHO);
    if (!m || typeof m.index !== "number") continue;
    // RECORTA A PARTIR DO FECHO em vez de descartar a frase por tamanho: o entregável costuma vir
    // no fim de um parágrafo longo ("…[INSERIR GRÁFICO 2]. Ao final, forneça uma lista…"), e um
    // filtro de comprimento sobre a frase inteira o perderia justamente no caso que importa.
    const f = bruta.slice(m.index).trim();
    if (f.length < 15 || !VERBO_ENTREGA.test(f)) continue;
    out.push(f.slice(0, 400));
    if (out.length >= 3) break;
  }
  return out;
}

/**
 * O bloco que vai pro `systemContext` do turno. Vazio quando não há entregável — nenhum pedido
 * simples ganha texto novo no prompt por causa disto.
 */
export function blocoDeEntregaveis(entregaveis: readonly string[]): string {
  if (!entregaveis.length) return "";
  return [
    "O PEDIDO TAMBÉM PEDE ALGO NA SUA RESPOSTA — isto NÃO é seção do documento:",
    ...entregaveis.map((e) => `- ${e}`),
    "Escreva isso no corpo desta mensagem, por extenso. O documento segue sendo escrito à parte;",
    "não o repita aqui, e não diga que vai fornecer depois — forneça agora.",
  ].join("\n");
}

export function lerBriefing(prompt: string): Briefing {
  const texto = String(prompt || "");
  const briefing = ehBriefing(texto);
  return {
    tema: briefing ? "" : temaSimples(texto),
    referencias: briefing ? referenciasDoPedido(texto) : [],
    secoes: briefing ? secoesDoPedido(texto) : [],
    marcadores: briefing ? marcadoresDoPedido(texto) : [],
    entregaveis: briefing ? entregaveisDoTurno(texto) : [],
    instrucoes: briefing ? texto.trim().slice(0, MAX_INSTRUCOES) : "",
    ehBriefing: briefing,
  };
}
