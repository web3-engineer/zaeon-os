/**
 * lib/rag/wikilivros.ts — Wikilivros e Wikiversidade em português como base por área.
 *
 * POR QUE ESTA FONTE. É o único corpus aberto que resta alcançando enfermagem, farmácia,
 * veterinária e agronomia — as quatro que o arXiv não tem e que o Hugging Face não cobre. E é em
 * PORTUGUÊS, então o nosso `classificarArea` funciona nela (ao contrário do peS2o, onde medi 5,4%
 * de aproveitamento e zero em física por os termos serem em português e o corpus em inglês).
 *
 * DE ONDE VEM, e por que não do dump normal: o `pages-articles.xml.bz2` é **bz2**, e nem o `zlib` do
 * node nem o contêiner de produção (`node:20-bookworm-slim`, que instala só openssl, ca-certificates
 * e ffmpeg) sabem abrir bz2. O dump **Enterprise HTML** resolve: é `.json.tar.gz` — gzip, que o node
 * lê nativamente, com UM membro de tar (`ptwikibooks_namespace_0_0.ndjson`), cujo cabeçalho são 512
 * bytes fixos que se pulam. Medido: 70,7 MB no NS0 do Wikilivros.
 *
 * A LICENÇA VEM NO PRÓPRIO REGISTRO (`license[].name` = "Creative Commons Attribution Share Alike
 * 3.0 Unported"). Então o rodapé cita o que o DADO diz, não o que eu suponho — e se a Wikimedia
 * mudar o regime, o documento novo já sai com o texto certo.
 */
import { classificarArea } from "./areas";

export const RUN = "20250320";
const BASE = `https://dumps.wikimedia.org/other/enterprise_html/runs/${RUN}`;

/** Os dois wikis, e a área que NÃO se força: ambos passam pelo classificador. */
export const WIKIS = ["ptwikibooks", "ptwikiversity"] as const;
export type Wiki = (typeof WIKIS)[number];

export const urlDoWiki = (w: Wiki) => `${BASE}/${w}-NS0-${RUN}-ENTERPRISE-HTML.json.tar.gz`;

/** O cabeçalho de um membro de tar são 512 bytes. Pular isto é o que deixa o ndjson legível. */
export const BLOCO_TAR = 512;

/** Mínimo de texto LIMPO. Abaixo disto é esboço, índice ou verbete de uma linha. */
export const MIN_CHARS = 1200;
export const MAX_CHARS = 20_000;
export const CHARS_PARA_CLASSIFICAR = 4_000;

/**
 * Páginas que são estrutura do wiki, não conteúdo:
 *   · `/Imprimir`, `/Versão para impressão` — a MESMA obra concatenada, que entraria duplicada e
 *     ainda roubaria a vaga de um capítulo no teto por área;
 *   · `Wikilivros:`, `Predefinição:`, `Anexo:` — espaço administrativo que escapa no NS0;
 *   · `/Índice`, `/Sumário`, `/Capa` — sumário não ensina.
 */
const ESTRUTURA = /(^|\/)(imprimir|vers(ã|a)o para impress(ã|a)o|(í|i)ndice|sum(á|a)rio|capa|refer(ê|e)ncias)$/i;
const ADMIN = /^(wikilivros|wikiversidade|predefini(ç|c)(ã|a)o|anexo|ajuda|categoria|m(ó|o)dulo|usu(á|a)rio|discuss(ã|a)o)\s*:/i;

/**
 * Wikitexto → texto corrido. Não é um parser de MediaWiki e não precisa ser: o que o RAG precisa é
 * prosa pesquisável, e marcação deixada para trás virava ruído no trecho citado ao aluno.
 *
 * A ordem importa. Tabelas e predefinições saem ANTES dos links, porque contêm `[[...]]` dentro; se
 * os links saíssem primeiro, sobrariam `{|` e `{{` órfãos no meio do texto.
 */
export function textoDoWikitexto(bruto: string): string {
  let t = String(bruto ?? "");
  t = t.replace(/<!--[\s\S]*?-->/g, " ");
  t = t.replace(/<ref[^>]*\/>/gi, " ").replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, " ");
  t = t.replace(/<(math|syntaxhighlight|source|pre|code|gallery|timeline)[^>]*>[\s\S]*?<\/\1>/gi, " ");
  // tabelas e predefinições, de dentro pra fora (podem estar aninhadas)
  for (let i = 0; i < 6; i++) t = t.replace(/\{\|[^{]*?\|\}/gs, " ").replace(/\{\{[^{}]*\}\}/g, " ");
  t = t.replace(/\{\{|\}\}|\{\||\|\}/g, " ");
  // [[Arquivo:...]] e [[Imagem:...]] saem inteiros; os outros links viram o rótulo
  t = t.replace(/\[\[(?:arquivo|imagem|file|image|ficheiro):[^\]]*\]\]/gi, " ");
  t = t.replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, "$1").replace(/\[\[([^\]]*)\]\]/g, "$1");
  t = t.replace(/\[(?:https?|\/\/)[^\s\]]*\s+([^\]]*)\]/g, "$1").replace(/\[(?:https?|\/\/)[^\s\]]*\]/g, " ");
  t = t.replace(/<\/?[a-z][^>]*>/gi, " ");                 // html solto
  t = t.replace(/^[ \t]*[*#:;]+[ \t]*/gm, "");             // marcadores de lista
  t = t.replace(/'''''|'''|''/g, "");                      // negrito e itálico
  t = t.replace(/^=+\s*(.*?)\s*=+\s*$/gm, "$1.");          // seção vira frase, pra não perder o tema
  t = t.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
  t = t.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

export type LinhaWikilivros = {
  name?: unknown;
  url?: unknown;
  article_body?: { wikitext?: unknown } | null;
  license?: readonly { name?: unknown }[] | null;
};

export type DocumentoWikilivros = { chave: string; titulo: string; texto: string; area: string; pontos: number };
export type MotivoDescarte = "sem_titulo" | "estrutura" | "administrativo" | "curto" | "sem_area";

export const ehDescarte = (
  r: DocumentoWikilivros | { descarte: MotivoDescarte },
): r is { descarte: MotivoDescarte } => "descarte" in r;

/** Uma página → um documento, ou o motivo. Nunca lança: são 14 mil páginas. */
export function documentoDoWikilivro(
  wiki: Wiki,
  linha: LinhaWikilivros,
): DocumentoWikilivros | { descarte: MotivoDescarte } {
  const nome = String(linha?.name ?? "").trim();
  if (!nome) return { descarte: "sem_titulo" };
  if (ADMIN.test(nome)) return { descarte: "administrativo" };
  if (ESTRUTURA.test(nome)) return { descarte: "estrutura" };

  const texto = textoDoWikitexto(String(linha?.article_body?.wikitext ?? ""));
  if (texto.length < MIN_CHARS) return { descarte: "curto" };

  const c = classificarArea(nome.replace(/\//g, " "), texto.slice(0, CHARS_PARA_CLASSIFICAR));
  if (!c) return { descarte: "sem_area" };

  // a licença é a que o REGISTRO declara; sem ela, não se inventa uma
  const lic = String(linha?.license?.[0]?.name ?? "").trim();
  const url = String(linha?.url ?? "").trim();
  const obra = wiki === "ptwikibooks" ? "Wikilivros" : "Wikiversidade";
  const fonte = `Fonte: ${obra} em português, "${nome}"${url ? ` (${url})` : ""}`
    + ` — instantâneo de ${RUN.slice(0, 4)}-${RUN.slice(4, 6)}-${RUN.slice(6, 8)},`
    + ` por colaboradores do ${obra}${lic ? ` — licença ${lic}` : ""}.`;

  return {
    chave: `${wiki}-${RUN}-${nome}`,
    titulo: `${nome} (${obra})`,
    texto: `${texto.slice(0, MAX_CHARS)}\n\n${fonte}`,
    area: c.slug,
    pontos: c.pontos,
  };
}
