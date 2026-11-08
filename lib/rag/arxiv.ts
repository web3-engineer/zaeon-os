/**
 * lib/rag/arxiv.ts — resumos do arXiv como base por área.
 *
 * POR QUE O arXiv E NÃO O peS2o. Os dois são enormes e de licença boa, mas medi o peS2o (84.967
 * registros reais, 40 MB do shard 0) e o classificador aproveitou 5,4% — com física, química,
 * eng-computação, eng-civil e dados-ia em ZERO. A razão não é o corpus: é que o peS2o é em INGLÊS e
 * os termos de `lib/rag/areas` são em PORTUGUÊS. Os 5,4% vieram de cognato ("medicin" casando com
 * "medicine"), não de classificação. Corpus em inglês só serve aqui com ÁREA FIXA — é o caso do MDN,
 * do Kubernetes e do CWE, que entram por área declarada e não pelo classificador.
 *
 * O arXiv resolve isso de graça: ele JÁ VEM ROTULADO pela própria taxonomia. `cat:math.*` é
 * matemática por construção, sem adivinhar. É a mesma ideia do mapa de matérias do MMLU.
 *
 * LICENÇA — conferida nos Termos de Uso das APIs do arXiv: o METADADO descritivo (título, resumo,
 * autores, termos de classificação) está sob **CC0 1.0**. O TEXTO COMPLETO não: cada artigo tem a
 * licença que o autor escolheu, e há opções NonCommercial entre elas. Por isso aqui entra **só o
 * resumo**, nunca o PDF nem o texto completo — e é essa fronteira que mantém o uso comercial limpo.
 */

export const ARXIV_API = "https://export.arxiv.org/api/query";

/** O arXiv pede 3 s entre chamadas nos Termos de Uso. Não é sugestão: é o que mantém o acesso. */
export const ESPERA_MS = 3000;
/** Teto por página. O arXiv recomenda fatias desta ordem; acima disso ele devolve erro ou trunca. */
export const POR_PAGINA = 200;

/**
 * Arquivo/categoria do arXiv → nossa área. Conservador: só entra o que é claramente da área.
 *
 * Note que física no arXiv NÃO é só `physics.*` — astro-ph, cond-mat, gr-qc, hep-*, nucl-* e
 * quant-ph são arquivos de primeiro nível, irmãos de `physics`. Mapear só `physics*` deixaria de
 * fora a maior parte da física do arXiv.
 *
 * O que NÃO está aqui, de propósito: enfermagem, farmácia, veterinária, agronomia, psicologia e
 * engenharia civil. O arXiv quase não tem esses campos, e forçar uma categoria vizinha encheria a
 * base do agente errado — que é o estrago que a área órfã já nos custou uma vez.
 */
export const CATEGORIAS: Readonly<Record<string, readonly string[]>> = {
  fisica: ["physics", "astro-ph", "cond-mat", "gr-qc", "hep-th", "hep-ph", "hep-ex", "nucl-th", "quant-ph"],
  matematica: ["math"],
  "dados-ia": ["cs.LG", "cs.AI", "cs.CL", "stat.ML"],
  software: ["cs.SE", "cs.PL"],
  seguranca: ["cs.CR"],
  infra: ["cs.DC", "cs.NI", "cs.OS"],
  "eng-computacao": ["cs.AR", "cs.DS", "cs.CC"],
  biologia: ["q-bio"],
  "eng-energias": ["eess.SY"],
  quimica: ["physics.chem-ph"],
  medicina: ["physics.med-ph"],
};

/** As áreas que esta fonte alimenta — derivado do mapa, nunca escrito à mão. */
export const AREAS_DO_ARXIV: readonly string[] = Object.keys(CATEGORIAS).sort();

/** A consulta de uma área: as categorias dela em OU. */
export const consultaDaArea = (area: string): string =>
  (CATEGORIAS[area] ?? []).map((c) => `cat:${c}*`).join("+OR+");

export const urlDaBusca = (area: string, inicio: number, porPagina = POR_PAGINA): string =>
  `${ARXIV_API}?search_query=${consultaDaArea(area)}`
  + `&start=${inicio}&max_results=${porPagina}`
  + "&sortBy=submittedDate&sortOrder=descending";

/** Mínimo de resumo: abaixo disto é anúncio de errata ou nota, e não ensina. */
export const MIN_RESUMO = 400;

export type ArtigoArxiv = { id: string; titulo: string; resumo: string; categorias: string[] };
export type DocumentoArxiv = { chave: string; titulo: string; texto: string; area: string };

const texto = (bloco: string, tag: string): string => {
  const m = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`).exec(bloco);
  if (!m) return "";
  return m[1]!
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ").trim();
};

/**
 * O Atom do arXiv → artigos. Tolerante de propósito: a resposta vem de terceiro, e uma entrada
 * torta no meio de 200 não pode derrubar a carga da área inteira.
 */
export function artigosDoAtom(xml: string): ArtigoArxiv[] {
  const fora: ArtigoArxiv[] = [];
  for (const m of String(xml ?? "").matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const bloco = m[1]!;
    const idBruto = texto(bloco, "id");
    // o id vem como URL: http://arxiv.org/abs/2501.01234v2 → 2501.01234
    const id = (/abs\/(.+?)(?:v\d+)?$/.exec(idBruto)?.[1] ?? "").trim();
    const titulo = texto(bloco, "title");
    const resumo = texto(bloco, "summary");
    if (!id || !titulo || !resumo) continue;
    const categorias = [...bloco.matchAll(/<category[^>]*term="([^"]+)"/g)].map((c) => c[1]!);
    fora.push({ id, titulo, resumo, categorias });
  }
  return fora;
}

/** Quantos artigos a consulta tem no total, segundo o próprio arXiv. */
export const totalDoAtom = (xml: string): number =>
  Number(/opensearch:totalResults[^>]*>(\d+)</.exec(String(xml ?? ""))?.[1] ?? 0);

/** Um artigo → um documento, ou null quando o resumo é curto demais pra ensinar. */
export function documentoDoArtigo(a: ArtigoArxiv, area: string): DocumentoArxiv | null {
  if (a.resumo.length < MIN_RESUMO) return null;
  const cats = a.categorias.slice(0, 6).join(", ");
  const fonte = `Fonte: arXiv:${a.id} (${cats || area}) — https://arxiv.org/abs/${a.id}. `
    + "Metadados do arXiv (título e resumo) sob CC0 1.0; o texto completo do artigo tem a licença "
    + "escolhida pelo autor e NÃO está incluído aqui.";
  return {
    chave: `arxiv-${a.id}`,
    titulo: a.titulo,
    texto: `${a.titulo}\n\n${a.resumo}\n\n${fonte}`,
    area,
  };
}
