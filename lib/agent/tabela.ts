/**
 * lib/agent/tabela.ts — QUANDO uma tabela pode aparecer, e o que fazer com a que apareceu sem ser
 * pedida. PURO: sem rede, sem modelo, sem DOM.
 *
 * ─────────────────────── Por que este arquivo existe ───────────────────────
 * Queixa do dono: "ele cria tabelas do nada, sem base, e sem contexto, em perguntas nada a ver".
 * O diagnóstico, medido e não suposto:
 *   1. `StructuredAnswer` NÃO tem campo de tabela — ela é markdown solto dentro de `nucleo`/
 *      `desenvolvimento`, texto livre;
 *   2. nada filtrava esse texto (`normalizeAnswer` só dava `trim`);
 *   3. o examiner não olha FORMATO, e está `critic: "off"` em `conversa` e `duvida_rapida` —
 *      justamente onde a tabela do nada mais incomoda. Crítico não resolveria;
 *   4. a única contenção era uma oração vaga em DIRETRIZ_ESTUDOS ("não force estrutura"), ao lado
 *      de 1.167 caracteres incondicionais ensinando o modelo a emitir blocos de artefato.
 *
 * ─────────────────────── Por que a regra é NOSSA ───────────────────────
 * Procuramos a regra rio acima e ela NÃO EXISTE. Nos cartões de cinco modelos abertos — OLMo 2,
 * Tülu 3, DeepSeek-R1, Qwen3 e Hermes 3 — não há uma linha sobre tabelas, markdown ou excesso de
 * formatação; OLMo 2 e Tülu 3 dizem, com todas as letras, "The model has not been trained with a
 * specific system prompt in mind". Não há convenção para herdar.
 *
 * E também NÃO é verdade, até onde a literatura primária mostra, que markdown seja premiado por
 * si. O style control do LMArena (lmsys.org/blog/2024-08-28-style-control) controla comprimento,
 * cabeçalhos, negrito e listas — NÃO mede tabela — e conclui que "length was the dominant style
 * factor. All other markdown effects are second order" (comprimento 0,249 × lista 0,031,
 * cabeçalho 0,024, negrito 0,019). O Length-Controlled AlpacaEval (arXiv 2404.04475) cita
 * "presence of lists" como correlação espúria e explicitamente NÃO a mede. Registro isto aqui
 * porque era a MINHA hipótese de partida e ela não se sustentou: a tabela sobrando não é um viés
 * documentado, é só falta de regra.
 *
 * O que o ecossistema aberto mostra é o PADRÃO, não a regra: quem chama padroniza o formato no
 * prompt. O cartão do Qwen3 tem uma seção "Standardize Output Format" ("We recommend using prompts
 * to standardize model outputs when benchmarking"); o do DeepSeek-R1 manda o CHAMADOR injetar a
 * diretiva do `\boxed{}` para matemática; o do Hermes 3 usa system prompt próprio para modo JSON.
 * Então a decisão é da aplicação — e a especificação é a do dono: tabela só quando o pedido for
 * por DADOS sobre algo.
 *
 * ─────────────────────── A definição, e por que ela é estreita ───────────────────────
 * Uma tabela só se justifica com DUAS dimensões: várias entidades × vários atributos. "Quais são
 * os tipos de célula" tem uma dimensão só — é lista, não tabela. Por isso enumerar NÃO basta aqui.
 * O portão abre em três casos e o padrão é NÃO: pedido explícito, comparação, ou dado quantitativo
 * junto de enumeração. Errar para o lado de abrir é reproduzir a queixa; errar para o lado de
 * fechar custa uma lista no lugar de uma grade, e a lista não perde um único valor (ver
 * `desmontarTabela`, que é SEM PERDA de propósito).
 */

const semAcento = (s: string) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * 1 · Pediu tabela com todas as letras. As formas do verbo estão LISTADAS em vez de `tabul\w*`
 * porque o curinga engole "tabuleiro" — e "monta um tabuleiro de xadrez" não é pedido de dados.
 * O corpus do teste guarda esse caso.
 */
const EXPLICITO =
  /\b(tabelas?|tabular|tabula|tabule|tabulando|tabulad[oa]s?|tabula[c][aã]?o|quadro comparativo|planilha|colunas?)\b/;

/** 2 · Comparação: duas ou mais entidades julgadas pelos mesmos critérios — a forma natural é grade. */
const COMPARACAO =
  /\b(compar\w+|diferen[c]as? entre|distin[c]ao entre|\bvs\b|\bversus\b|pros e contras|vantagens e desvantagens|semelhancas e diferencas|melhor (?:que|entre)|qual (?:e )?(?:a )?melhor)\b/;

/** 3a · Dado quantitativo — "dados sobre algo", na formulação do dono. */
const DADOS =
  /\b(dados|valores|estatisticas?|numeros|quantidades?|precos?|custos?|taxas?|indices?|percentuais?|medias?|populacao|produc[a]o|consumo|notas?|prazos?|datas?)\b/;

/** 3b · Enumeração — sozinha é LISTA; só vira tabela acompanhada de 3a. */
const ENUMERACAO =
  /\b(liste|listar|lista d[eo]|quais sao|quais os|tipos de|categorias de|classificacao|principais|cada um dos|por (?:ano|pais|estado|regiao|mes|categoria|tipo))\b/;

/**
 * O pedido justifica uma tabela? Padrão: NÃO.
 *
 * Recebe o OBJETIVO do turno (o que a pessoa escreveu), nunca a resposta: a decisão é sobre o que
 * foi pedido, e não sobre o que o modelo teve vontade de desenhar.
 */
export function pedeTabela(objetivo: string): boolean {
  const t = semAcento(objetivo);
  if (!t.trim()) return false;
  if (EXPLICITO.test(t)) return true;
  if (COMPARACAO.test(t)) return true;
  return DADOS.test(t) && ENUMERACAO.test(t);
}

/**
 * A diretriz que vai no prompt. DUAS versões, porque calar sobre o assunto é o que produzia o
 * problema: o modelo não tinha como saber que a tabela não era bem-vinda.
 *
 * A versão PERMITIDA não é um convite — ela põe condição: cabeçalho honesto e fonte quando o dado
 * não for do próprio pedido. É o mesmo princípio que `findings[].source` aplica à evidência.
 */
export const DIRETRIZ_SEM_TABELA =
  "FORMATO: NÃO use tabelas de markdown nesta resposta — o pedido não é por dados. " +
  "Nada de linhas com | nem de cabeçalho com ---. Se precisar enumerar, use frases corridas ou, " +
  "quando forem mesmo itens soltos, uma lista curta com hífen. Escreva como quem explica, não como quem preenche formulário.";

export const DIRETRIZ_TABELA_PERMITIDA =
  "FORMATO: aqui uma tabela de markdown PODE ajudar, porque o pedido é por dados. Use-a só se " +
  "houver mesmo mais de um item E mais de um atributo por item — com um item só, ou um atributo " +
  "só, escreva em texto. Cabeçalho com o nome real de cada coluna, nunca 'Item/Descrição'. " +
  "E todo número que não venha do próprio pedido tem de vir com fonte; sem fonte, não ponha o número.";

/** A diretriz certa para o turno. Uma linha, para o chamador não repetir a decisão. */
export const diretrizDeTabela = (objetivo: string): string =>
  pedeTabela(objetivo) ? DIRETRIZ_TABELA_PERMITIDA : DIRETRIZ_SEM_TABELA;

// ───────────────────────── o conserto determinístico ─────────────────────────

/**
 * Uma linha de tabela markdown: começa e termina (ou não) com `|` e tem pelo menos um `|` no meio.
 * O `|` escapado (`\|`) é conteúdo, não separador — e é por isso que a divisão não é um `split("|")`.
 */
const LINHA_DE_TABELA = /^\s*\|?.*[^\\]\|.*\|?\s*$/;
/**
 * A linha separadora de uma tabela markdown.
 *
 * Eu primeiro exigi três hífens seguidos (`-{3,}`), que é como a maioria dos modelos escreve —
 * e estava ERRADO: o GFM aceita UM hífen por coluna, e `| - | - |` é tabela válida. O teste das
 * duas tabelas no mesmo texto pegou isso. A regra certa é sobre o ALFABETO da linha: só `-`, `:`,
 * `|` e espaço, e ela precisa ter ao menos um de cada um dos dois que importam.
 */
const ALFABETO_SEPARADOR = /^[\s:|-]+$/;
const SEPARADOR_RE = { test: (l: string) => {
  const t = (l ?? "").trim();
  return !!t && ALFABETO_SEPARADOR.test(t) && t.includes("-") && t.includes("|");
} };
const SEPARADOR = SEPARADOR_RE;

const celulas = (linha: string): string[] =>
  linha.trim().replace(/^\|/, "").replace(/\|$/, "")
    .split(/(?<!\\)\|/)
    .map((c) => c.replace(/\\\|/g, "|").trim());

/** Há uma tabela de markdown neste texto? (cabeçalho + separador + ao menos uma linha de dados) */
export function temTabelaMarkdown(texto: string): boolean {
  const linhas = String(texto || "").split("\n");
  for (let i = 0; i + 2 < linhas.length; i++) {
    if (LINHA_DE_TABELA.test(linhas[i] ?? "") && SEPARADOR.test(linhas[i + 1] ?? "") && LINHA_DE_TABELA.test(linhas[i + 2] ?? "")) {
      return true;
    }
  }
  return false;
}

/**
 * Desmonta toda tabela do texto numa lista rotulada. **SEM PERDA**: cada célula vira
 * `rótulo: valor`, e célula sem cabeçalho correspondente entra assim mesmo, sem rótulo.
 *
 * Converter e não APAGAR é a decisão central aqui. Apagar uma tabela que o modelo encheu de dados
 * jogaria fora a resposta junto com o formato — e o erro de julgamento seria invisível para quem
 * perguntou. Convertendo, o pior caso é uma lista onde caberia uma grade; nenhum valor some.
 */
export function desmontarTabela(texto: string): string {
  const linhas = String(texto || "").split("\n");
  const saida: string[] = [];
  let i = 0;
  while (i < linhas.length) {
    const ehTabela =
      LINHA_DE_TABELA.test(linhas[i] ?? "") && SEPARADOR.test(linhas[i + 1] ?? "") && LINHA_DE_TABELA.test(linhas[i + 2] ?? "");
    if (!ehTabela) { saida.push(linhas[i]); i++; continue; }

    const cabecalho = celulas(linhas[i]);
    i += 2;                                   // pula cabeçalho e separador
    while (i < linhas.length && LINHA_DE_TABELA.test(linhas[i]) && !SEPARADOR.test(linhas[i])) {
      const vs = celulas(linhas[i]);
      const partes = vs.map((v, k) => {
        const rotulo = (cabecalho[k] ?? "").trim();
        if (!v) return rotulo ? "" : "";      // célula vazia não vira "rótulo: "
        return rotulo ? `${rotulo}: ${v}` : v;
      }).filter(Boolean);
      if (partes.length) saida.push(`- ${partes.join(" · ")}`);
      i++;
    }
  }
  return saida.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * O que o harness chama: devolve o texto já sem tabela NÃO PEDIDA.
 *
 * Mesmo molde de `ofertaDePlataforma` em normalizeAnswer — o CÓDIGO remove o que o modelo não
 * devia ter produzido, em vez de confiar que a instrução pegou. A instrução sozinha não pega: ela
 * segura o começo da resposta e escorrega depois de alguns parágrafos.
 */
export function semTabelaNaoPedida(texto: string | undefined, objetivo: string): string | undefined {
  if (typeof texto !== "string" || !texto) return texto;
  if (pedeTabela(objetivo)) return texto;
  if (!temTabelaMarkdown(texto)) return texto;
  return desmontarTabela(texto);
}
