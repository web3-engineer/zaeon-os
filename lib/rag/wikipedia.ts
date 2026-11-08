/**
 * lib/rag/wikipedia.ts — a Wikipédia em português como DOCUMENTO de base por área.
 *
 * Por que isto existe separado do script: a leitura do parquet é I/O e mora em
 * `scripts/ingerir-bases-area.ts`; a DECISÃO (entra ou não entra, e com que forma) é pura e mora
 * aqui, onde dá pra testar sem rede. Mesma divisão de `tituloEResumo`: quem decide não baixa.
 *
 * A FONTE é o dataset `wikimedia/wikipedia` do Hugging Face, config `20231101.pt` — um instantâneo
 * datado, não a Wikipédia de hoje. Isso é deliberado: um instantâneo é reproduzível (o builder
 * refaz o mesmo corpus amanhã), e a data entra no rodapé do texto pro aluno saber de quando é.
 *
 * LICENÇA (conferida no cardData do dataset, 2026-11-08): `cc-by-sa-3.0` e `gfdl`. CC BY-SA pede
 * atribuição e compartilhamento igual — então a atribuição vai DENTRO do texto de cada documento,
 * que é o único lugar que sobrevive à busca: o trecho citado no chat carrega a origem com ele.
 *
 * ATENÇÃO à diferença de licença com a fonte `wiki` (API ao vivo, CC BY-SA 4.0): a Wikipédia migrou
 * de 3.0 pra 4.0, e o instantâneo de 2023 é do regime anterior. Citar 4.0 aqui seria errado.
 */
import { classificarArea } from "./areas";

/** O instantâneo que usamos. Trocar isto é trocar o corpus: a chave do documento leva a data. */
export const WIKI_SNAPSHOT = "20231101";
export const WIKI_DATASET = "wikimedia/wikipedia";
export const WIKI_CONFIG = `${WIKI_SNAPSHOT}.pt`;
export const WIKI_SHARDS = 6;

/**
 * Abaixo disto o verbete é esboço e não ensina ninguém — e o pior: um esboço de três linhas
 * classificado numa área ocupa a vaga de um verbete inteiro no teto por área.
 * O número saiu de medição: numa amostra de 3.000 verbetes, 772 (26%) ficam abaixo de 1.200.
 */
export const MIN_CHARS = 1200;

/** Teto por documento, igual ao da fonte `wiki` — o RAG corta em trechos depois. */
export const MAX_CHARS = 20_000;

/** Só o começo vai pro classificador: termo de área aparece na abertura, e 4 KB já bastam. */
export const CHARS_PARA_CLASSIFICAR = 4_000;

export const urlDoShard = (i: number) =>
  `https://huggingface.co/datasets/${WIKI_DATASET}/resolve/main/${WIKI_CONFIG}/`
  + `train-${String(i).padStart(5, "0")}-of-${String(WIKI_SHARDS).padStart(5, "0")}.parquet`;

export type LinhaWikipedia = { title?: unknown; text?: unknown; url?: unknown };

export type DocumentoWikipedia = {
  chave: string;
  titulo: string;
  texto: string;
  area: string;
  /** pontos do classificador — é por isto que o teto por área ordena */
  pontos: number;
};

/** Por que o verbete não entrou. Contar o motivo é o que deixa a ingestão auditável. */
export type MotivoDescarte = "sem_titulo" | "curto" | "sem_area" | "desambiguacao";

/**
 * Páginas que a Wikipédia usa como índice, não como conteúdo. "(desambiguação)" é a mais comum e
 * chega a passar de 1.200 chars quando lista muita coisa — e aí entra como se fosse um verbete.
 */
const ehDesambiguacao = (titulo: string) => /\((desambigua|desambiguação|desambiguacao)/i.test(titulo);

/**
 * Um verbete → um documento, ou o motivo do descarte. Nunca lança: a ingestão varre um milhão de
 * linhas e uma linha torta não pode derrubar a carga.
 */
export function documentoDaWikipedia(linha: LinhaWikipedia): DocumentoWikipedia | { descarte: MotivoDescarte } {
  const titulo = String(linha?.title ?? "").trim();
  if (!titulo) return { descarte: "sem_titulo" };
  if (ehDesambiguacao(titulo)) return { descarte: "desambiguacao" };

  const texto = String(linha?.text ?? "").trim();
  if (texto.length < MIN_CHARS) return { descarte: "curto" };

  const c = classificarArea(titulo, texto.slice(0, CHARS_PARA_CLASSIFICAR));
  if (!c) return { descarte: "sem_area" };

  const creditoUrl = String(linha?.url ?? "").trim();
  const fonte = `Fonte: Wikipédia em português, verbete "${titulo}"`
    + `${creditoUrl ? ` (${creditoUrl})` : ""}`
    + ` — instantâneo de ${WIKI_SNAPSHOT.slice(0, 4)}-${WIKI_SNAPSHOT.slice(4, 6)}-${WIKI_SNAPSHOT.slice(6, 8)}`
    + ` via ${WIKI_DATASET} (Hugging Face), por colaboradores da Wikipédia — licença CC BY-SA 3.0.`;

  return {
    // A data entra na chave: assim o instantâneo não colide com a fonte `wiki` (API ao vivo, que
    // usa `wiki-pt-<título>`) e trocar de instantâneo gera documento novo em vez de sobrescrever.
    chave: `wiki-pt-${WIKI_SNAPSHOT}-${titulo}`,
    titulo: `${titulo} (Wikipédia)`,
    texto: `${texto.slice(0, MAX_CHARS)}\n\n${fonte}`,
    area: c.slug,
    pontos: c.pontos,
  };
}

/** `true` quando o retorno de `documentoDaWikipedia` é um descarte. */
export const ehDescarte = (
  r: DocumentoWikipedia | { descarte: MotivoDescarte },
): r is { descarte: MotivoDescarte } => "descarte" in r;
