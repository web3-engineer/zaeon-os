/**
 * lib/rag/zenodo.ts — resumos do Zenodo como base por área.
 *
 * O ZENODO É REPOSITÓRIO ABERTO: qualquer pessoa deposita qualquer coisa, e cada depósito declara a
 * sua própria licença. Isso muda a natureza do portão — nas outras fontes a licença é UMA, da fonte
 * inteira; aqui ela é POR REGISTRO, e um registro sem licença aceitável não pode entrar de jeito
 * nenhum. É o único lugar do nosso RAG onde a decisão de licença é por documento.
 *
 * MEDIDO em 200 registros reais em português (2026-11-08):
 *   184  cc-by-4.0          aceito
 *     7  cc-by-nc-nd-4.0    RECUSADO (não comercial, sem derivados)
 *     6  cc-by-sa-4.0       aceito
 *     3  (sem licença)      RECUSADO
 * Tipos: 110 artigos, 23 anais, 21 trabalhos de congresso, 11 periódicos, 10 capítulos.
 *
 * AS PAREDES DA API, medidas: `size` aceita no máximo **25** (50 devolve "A validation error
 * occurred"), e a paginação vai até a **página 400** — a 401 devolve "Invalid querystring
 * parameters". Logo o teto é 10.000 registros por consulta, dez vezes o da DOAJ.
 *
 * `language` é DECLARADO PELO DEPOSITANTE e não é confiável: numa fatia de `+language:por` a
 * descrição vinha em inglês, e o aproveitamento foi de 12%. Buscar pela FRASE em português da área
 * resolve: "Enfermagem" rendeu 23 de 25, todos em enfermagem. Então a busca é a alavanca e
 * `classificarArea` continua decidindo — e as frases são os `AREAS[].wikipedia`, que já existem.
 */
import { AREAS } from "./areas";
import { limparHtml } from "./limpar";

export const ZENODO_API = "https://zenodo.org/api/records";

/** `size` acima de 25 é erro de validação. Não é preferência: é o teto da API. */
export const TAMANHO_PAGINA = 25;
/** A página 401 devolve erro. 400 x 25 = 10.000 registros por consulta. */
export const PAGINA_MAXIMA = 400;
/** Páginas por frase: muitas frases rendem mais que esgotar uma, que traz sempre o mesmo depositante. */
export const PAGINAS_POR_FRASE = 4;
/**
 * Um pedido por segundo encostava no limite do Zenodo: na primeira execução completa o 429 apareceu
 * espalhado por 211 pedidos e derrubou a varredura na 9ª área de 17. 1,5 s dá folga, e o custo é
 * tempo de deploy — não é o turno do aluno que paga.
 */
export const ESPERA_MS = 1500;
/**
 * O 429 do Zenodo é TRANSITÓRIO: na mesma execução ele aparecia e a frase seguinte voltava a 200.
 * Então a página se repete em vez de ser abandonada — abandonar perdia 25 registros por recusa.
 */
export const TENTATIVAS_POR_PAGINA = 3;
/** Teto pra espera pedida pelo `Retry-After`: é cabeçalho de terceiro e pode vir absurdo. */
export const ESPERA_MAXIMA_MS = 30_000;

/** Quanto esperar depois de um 429, respeitando `Retry-After` quando ele vem. */
export function esperaDoRecuo(retryAfter: string | null, tentativa: number): number {
  const pedido = Number(retryAfter ?? 0);
  if (pedido > 0) return Math.min(pedido * 1000, ESPERA_MAXIMA_MS);
  return Math.min(ESPERA_MS * 2 ** tentativa, ESPERA_MAXIMA_MS);
}

export const MIN_RESUMO = 400;
export const MAX_RESUMO = 8000;

/**
 * Licenças que permitem uso comercial. ALLOWLIST por prefixo, nunca "tudo menos X": licença nova
 * aparecendo no Zenodo tem de ser RECUSADA por omissão até alguém olhar, não aceita por descuido.
 * A segunda trava recusa `-nc` e `-nd` mesmo que o prefixo casasse, porque `cc-by-nc-4.0` começa
 * com `cc-by-` — e sem essa segunda trava entraria.
 */
const PREFIXOS_ACEITOS = [
  "cc0-", "cc-by-1.0", "cc-by-2.0", "cc-by-2.5", "cc-by-3.0", "cc-by-4.0",
  "cc-by-sa-1.0", "cc-by-sa-2.0", "cc-by-sa-2.5", "cc-by-sa-3.0", "cc-by-sa-4.0",
  "mit", "apache-2.0", "bsd-2-clause", "bsd-3-clause", "odc-by-1.0", "odbl-1.0", "unlicense",
] as const;

export function licencaPermiteUsoComercial(id: unknown): boolean {
  const lic = String(id ?? "").trim().toLowerCase();
  if (!lic) return false;
  // "não comercial" e "sem derivados" primeiro: `cc-by-nc-4.0` casaria com o prefixo `cc-by-`
  if (/(^|-)nc(-|$)/.test(lic) || /(^|-)nd(-|$)/.test(lic)) return false;
  return PREFIXOS_ACEITOS.some((p) => lic === p || lic.startsWith(p));
}

/** As frases de busca de uma área — os mesmos verbetes que `wiki` e `doaj` usam. */
export const frasesDaArea = (slug: string): readonly string[] =>
  AREAS.find((a) => a.slug === slug)?.wikipedia ?? [];

export const urlDaBusca = (frase: string, pagina: number): string =>
  `${ZENODO_API}?q=${encodeURIComponent(`+"${frase}" +language:por`)}`
  + `&type=publication&size=${TAMANHO_PAGINA}&page=${pagina}`;

export type RegistroZenodo = {
  id?: unknown;
  doi?: unknown;
  metadata?: {
    title?: unknown;
    description?: unknown;
    publication_date?: unknown;
    license?: { id?: unknown } | null;
    resource_type?: { title?: unknown } | null;
  } | null;
};

export type DocumentoZenodo = { chave: string; titulo: string; texto: string; pontos: number; area: string };
export type MotivoDescarte = "sem_id" | "sem_titulo" | "licenca_recusada" | "resumo_curto" | "sem_area";

export const ehDescarte = (
  r: DocumentoZenodo | { descarte: MotivoDescarte },
): r is { descarte: MotivoDescarte } => "descarte" in r;

/**
 * Um registro → um documento, ou o motivo. A licença é conferida ANTES de qualquer trabalho: não se
 * classifica nem se guarda texto de depósito que não pode entrar.
 */
export function documentoDoZenodo(
  r: RegistroZenodo,
  classificar: (titulo: string, resumo: string) => { slug: string; pontos: number } | null,
): DocumentoZenodo | { descarte: MotivoDescarte } {
  const m = r?.metadata ?? {};
  const id = String(r?.id ?? "").trim();
  if (!id) return { descarte: "sem_id" };

  // o portão, e ele vem primeiro de propósito
  if (!licencaPermiteUsoComercial(m.license?.id)) return { descarte: "licenca_recusada" };

  const titulo = limparHtml(String(m.title ?? ""));
  if (!titulo) return { descarte: "sem_titulo" };

  const resumo = limparHtml(String(m.description ?? ""));
  if (resumo.length < MIN_RESUMO) return { descarte: "resumo_curto" };

  const c = classificar(titulo, resumo);
  if (!c) return { descarte: "sem_area" };

  const lic = String(m.license?.id ?? "").trim();
  const data = String(m.publication_date ?? "").trim();
  const tipo = String(m.resource_type?.title ?? "").trim();
  const doi = String(r?.doi ?? "").trim();
  const fonte = `Fonte: ${tipo || "publicação"} no Zenodo${data ? ` (${data.slice(0, 4)})` : ""}`
    + `${doi ? `, DOI ${doi}` : ""} — https://zenodo.org/records/${id}.`
    + ` Depositado sob licença ${lic}.`;

  return {
    chave: `zenodo-${id}`,
    titulo,
    texto: `${titulo}\n\n${resumo.slice(0, MAX_RESUMO)}\n\n${fonte}`,
    pontos: c.pontos,
    area: c.slug,
  };
}
