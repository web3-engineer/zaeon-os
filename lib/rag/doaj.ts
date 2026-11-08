/**
 * lib/rag/doaj.ts — resumos da DOAJ (Directory of Open Access Journals) como base por área.
 *
 * LICENÇA, lida dos Termos da própria DOAJ: "Copyrights and related rights for article metadata
 * waived via **CC0 1.0** Universal Public Domain Dedication", e "Collecting, using and reusing part
 * or all of the article-level metadata must be done under the terms of the CC0 waiver". O RESUMO é
 * metadado de artigo, logo é CC0 — uso comercial livre, sem exigência de atribuição. Mesmo assim o
 * rodapé credita revista e DOI: não por obrigação, mas porque é o que torna a citação rastreável
 * pro aluno.
 *
 * AS TRÊS PAREDES DA API, medidas em 2026-11-08:
 *   1. `pageSize` é limitado a **50**, peça o que pedir;
 *   2. nenhuma consulta entrega além de **1.000 registros** ("You cannot access results beyond 1000
 *      records via this API") — então não existe varrer os 1,2 milhão por paginação;
 *   3. curinga é recusado ("Query contains disallowed Lucene feature"), então não dá pra filtrar
 *      por prefixo de código LCC.
 *
 * O QUE DECIDIU O DESENHO. Filtrar por `bibjson.journal.language:PT` dá 1.199.705 artigos, mas
 * `language` é da REVISTA, não do artigo: medi 50 registros dessa fatia e o resumo vinha em espanhol
 * e inglês, com só 10% classificando. Usar a BUSCA da DOAJ com o vocabulário em português da área
 * sobe a precisão muito: "concreto armado" devolveu 34 de 50 em eng-civil, "enfermagem" 18 de 50 em
 * enfermagem. Então a busca é a ALAVANCA de colheita, e quem decide a área continua sendo o
 * `classificarArea` — como na SciELO. A consulta nunca força a área do resultado.
 *
 * E as consultas não são lista nova: são os `AREAS[].wikipedia`, que já existem, já são frases em
 * português curadas por área e já são mantidas pela fonte `wiki`. Lista nova divergiria sozinha.
 */
import { AREAS } from "./areas";
import { limparHtml } from "./limpar";

export const DOAJ_API = "https://doaj.org/api/search/articles";

/** Teto real de página da API: pedir mais não traz mais. */
export const POR_PAGINA = 50;
/** Teto de registros por consulta imposto pela DOAJ. Passar disso devolve HTTP 400. */
export const TETO_POR_CONSULTA = 1000;
/**
 * Páginas por frase de busca. Deliberadamente baixo: é melhor tocar MUITAS frases de uma área do
 * que esgotar uma só, porque frase única traz o mesmo punhado de revistas e a base fica enviesada.
 */
export const PAGINAS_POR_FRASE = 4;
/** A DOAJ não publica limite numérico; um pedido por segundo é o que um cliente educado faz. */
export const ESPERA_MS = 1000;

/** Mínimo de resumo: igual ao da SciELO, porque o documento aqui também é título + resumo. */
export const MIN_RESUMO = 400;
export const MAX_RESUMO = 8000;

/** As frases de busca de uma área — os mesmos verbetes que a fonte `wiki` usa como semente. */
export const frasesDaArea = (slug: string): readonly string[] =>
  AREAS.find((a) => a.slug === slug)?.wikipedia ?? [];

export const urlDaBusca = (frase: string, pagina: number): string =>
  `${DOAJ_API}/${encodeURIComponent(frase)}?pageSize=${POR_PAGINA}&page=${pagina}`;

type Identificador = { type?: unknown; id?: unknown };

export type RegistroDoaj = {
  bibjson?: {
    title?: unknown;
    abstract?: unknown;
    year?: unknown;
    journal?: { title?: unknown } | null;
    identifier?: readonly Identificador[] | null;
  } | null;
  id?: unknown;
};

export type DocumentoDoaj = { chave: string; titulo: string; texto: string; pontos: number; area: string };
export type MotivoDescarte = "sem_titulo" | "sem_id" | "resumo_curto" | "sem_area";

export const ehDescarte = (
  r: DocumentoDoaj | { descarte: MotivoDescarte },
): r is { descarte: MotivoDescarte } => "descarte" in r;

const doi = (ids: readonly Identificador[] | null | undefined): string => {
  for (const i of ids ?? []) if (String(i?.type ?? "").toLowerCase() === "doi") return String(i?.id ?? "").trim();
  return "";
};

/**
 * Um registro → um documento, ou o motivo do descarte. `classificar` é injetado pra este módulo
 * continuar puro e testável sem a tabela de áreas inteira no caminho.
 */
export function documentoDoDoaj(
  r: RegistroDoaj,
  classificar: (titulo: string, resumo: string) => { slug: string; pontos: number } | null,
): DocumentoDoaj | { descarte: MotivoDescarte } {
  const b = r?.bibjson ?? {};
  const titulo = limparHtml(String(b.title ?? ""));
  if (!titulo) return { descarte: "sem_titulo" };

  // o id da DOAJ é a chave estável; sem ele o documento duplicaria a cada execução
  const id = String(r?.id ?? "").trim();
  if (!id) return { descarte: "sem_id" };

  const resumo = limparHtml(String(b.abstract ?? ""));
  if (resumo.length < MIN_RESUMO) return { descarte: "resumo_curto" };

  const c = classificar(titulo, resumo);
  if (!c) return { descarte: "sem_area" };

  const revista = String(b.journal?.title ?? "").trim();
  const ano = String(b.year ?? "").trim();
  const d = doi(b.identifier);
  const fonte = `Fonte: ${revista || "revista de acesso aberto"}${ano ? ` (${ano})` : ""}`
    + `${d ? `, DOI ${d}` : ""} — via DOAJ (https://doaj.org/article/${id}).`
    + " Metadado de artigo da DOAJ sob CC0 1.0; o texto completo tem a licença da revista.";

  return {
    chave: `doaj-${id}`,
    titulo,
    texto: `${titulo}\n\n${resumo.slice(0, MAX_RESUMO)}\n\n${fonte}`,
    pontos: c.pontos,
    area: c.slug,
  };
}
