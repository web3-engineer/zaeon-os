/**
 * lib/rag/busca.ts — busca híbrida (vetor + texto) na base RAG, com a PERMISSÃO dentro do filtro.
 *
 * Postgres + pgvector, uma query só: CTE `vet` (HNSW cosseno sobre `embedding`) e CTE `txt` (OR dos lexemas
 * `rag_pt` da pergunta, só trecho com a maioria dos de conteúdo, ordenado por `ts_rank_cd`), fundidas por RRF
 * (`sum(1/(60+rank))`).
 * A permissão (`turma_ids && turmas OR dono_ids @> ARRAY[usuário]`) vai no WHERE DOS DOIS ramos (nunca depois); em
 * cima disso o resultado ainda passa por `podeVer` (cinto + suspensório). Valores sempre por parâmetro.
 *
 * Falha do embedder (erro ou prazo) NUNCA derruba a busca: cai para só texto. Falha do SQL propaga.
 * Trecho sem vetor (`embedding IS NULL`) só entra pelo ramo texto. Pergunta que vira `tsquery` vazia (só
 * stopwords/símbolos) simplesmente não contribui no ramo texto (a query não lança).
 */
import { RAG_EMBED_DIM, type EmbedRag } from "./embed";
import { transacao, type RagDb } from "./pg";
import { podeVer, temBase, type EscopoRag } from "./permissao";

export const K_PADRAO = 8;
const PRAZO_EMBED_PADRAO_MS = 3000;
/** Candidatos por ramo antes da fusão: k × 4. */
const CANDIDATOS_POR_K = 4;
/** Constante do RRF. */
const RRF_K = 60;
/**
 * Palavras de quem PERGUNTA sobre o material (mais stopwords que o `unaccent` solta: "são" vira "sao", que a lista do
 * stemmer não tem). Não contam como conteúdo no ramo texto: "segundo a apostila, quem descobriu a penicilina?" não acha
 * trecho só porque ele diz "apostila". Passam por `to_tsvector('rag_pt', ...)` no SQL (mesmo stemming dos trechos).
 */
export const PALAVRAS_DE_PERGUNTA = [
  "apostila", "material", "materia", "texto", "livro", "documento", "arquivo", "pdf", "slide", "slides", "aula",
  "professor", "professora", "pagina", "conteudo", "assunto", "tema", "resumo", "resuma", "resumir", "explique",
  "explica", "explicar", "explicacao", "fala", "falar", "diz", "dizer", "diga", "trata", "tratar", "segundo",
  "conforme", "sobre", "quais", "mostre", "cite", "defina", "significa", "significado", "favor", "onde",
  "sao", "nao", "voce", "voces", "tambem", "entao", "ate", "ja", "la", "so",
].join(" ");

export type TrechoAchado = {
  trechoId: string;
  documentoId: string;
  titulo: string;
  texto: string;
  paginaIni: number;
  paginaFim: number;
  score: number;
  /** 1 − distância cosseno do vetor da pergunta; `null` quando o trecho não veio do ramo vetor. */
  similaridade: number | null;
  /** O trecho também (ou só) casou pelo ramo texto. */
  porTexto: boolean;
  /** Base pública por área (lib/rag/areas: só `area:*`, sem dono) — referência, não material da pessoa; sem página. */
  publico?: boolean;
};

export type BuscaDeps = {
  db: RagDb;
  embed: EmbedRag;
  contar: (e: EscopoRag) => Promise<{ pessoais: number; deTurma: number }>;
  /** Prazo do embed da pergunta; estourou/falhou ⇒ só texto. Padrão 3000 ms. */
  prazoEmbedMs?: number;
};

/** `k` válido: inteiro ≥ 1 (fração ⇒ floor; ≤ 0, NaN ou infinito ⇒ K_PADRAO). */
export function normalizarK(k: number): number {
  return Number.isFinite(k) && k >= 1 ? Math.floor(k) : K_PADRAO;
}

/** SQL da busca (PURO). Com `vetor`: vetor + texto fundidos por RRF; sem: só o ramo texto. */
/**
 * Teto de trechos POR DOCUMENTO na consulta. Opcional de propósito: sem ele o SQL é byte a byte o
 * de antes, porque o top-k plano é quem numera `[B1]..[Bn]` nas citações e não pode mudar de forma.
 *
 * Com ele, a cobertura deixa de ser sorte. `K_AMPLO = 40` sempre foi teto de RESULTADO, não
 * garantia: um documento longo e bem casado podia ocupar os 40 e empurrar os outros pra fora do
 * agrupamento (achado do Sourcery na #672). O `row_number()` particionado resolve no lugar certo —
 * o banco —, em vez de pedir mais linhas e torcer.
 */
export function montarSql(
  e: EscopoRag,
  pergunta: string,
  vetor: number[] | null,
  kBruto: number,
  porDoc?: number,
): { sql: string; params: unknown[] } {
  const k = normalizarK(kBruto);
  const params: unknown[] = [];
  const p = (v: unknown) => { params.push(v); return `$${params.length}`; };

  const q = p(pergunta);
  const t = p(e.turmaIds);
  const u = p(e.userId);
  const cand = p(k * CANDIDATOS_POR_K);
  const lim = p(k);
  const perm = `(turma_ids && ${t}::text[] OR dono_ids @> ARRAY[${u}]::text[])`;

  const ctes: string[] = [];
  const uniao: string[] = [];

  if (vetor) {
    const v = p(`[${vetor.join(",")}]`);
    // O ORDER BY ... LIMIT fica numa subconsulta simples para o planner usar o HNSW (com iterative_scan + filtro).
    // SEM desempate `, id` aqui: o HNSW só serve ORDER BY <distância> puro (com `, id` o planner cai em seq scan + sort,
    // medido com 12 mil trechos). O desempate vem no row_number() de fora; só empate exato na borda do LIMIT é arbitrário.
    ctes.push(`vet AS (
      SELECT id, row_number() OVER (ORDER BY dist, id) AS rk, 1 - dist AS sim
        FROM (SELECT id, embedding <=> ${v}::vector AS dist
                FROM rag_trechos
               WHERE embedding IS NOT NULL AND ${perm}
               ORDER BY embedding <=> ${v}::vector
               LIMIT ${cand}::int) s
    )`);
    uniao.push("SELECT id, rk, sim, false AS txt FROM vet");
  }

  // Ramo texto: OR sobre os lexemas de conteúdo da pergunta (o AND do websearch_to_tsquery zerava pergunta em frase),
  // mas só entra o trecho que tem a MAIORIA deles (`minimo`) — `porTexto` fura o corte cosseno no turno, então um
  // "apostila" solto não vira fonte. Conteúdo = lexemas da pergunta menos os de PALAVRAS_DE_PERGUNTA; pergunta só com
  // essas ⇒ exige todas (o AND de antes). Casados = length(tsv) − length(ts_delete(tsv, base)). Lexema vai entre
  // aspas na tsquery (aspa e barra escapadas), sem passar de novo pelo dicionário.
  const mp = p(PALAVRAS_DE_PERGUNTA);
  ctes.push(`lex AS (
      SELECT todos, ARRAY(SELECT unnest(todos) EXCEPT SELECT unnest(meta)) AS cont
        FROM (SELECT tsvector_to_array(to_tsvector('rag_pt', ${q})) AS todos,
                     tsvector_to_array(to_tsvector('rag_pt', ${mp})) AS meta) x
    )`);
  ctes.push(`tq AS (
      SELECT b.base,
             CASE WHEN cardinality(lex.cont) > 0 THEN cardinality(b.base) / 2 + 1 ELSE cardinality(b.base) END AS minimo,
             NULLIF(array_to_string(ARRAY(
               SELECT '''' || replace(replace(l, '\\', '\\\\'), '''', '''''') || '''' FROM unnest(b.base) l
             ), ' | '), '')::tsquery AS q
        FROM lex, LATERAL (SELECT CASE WHEN cardinality(lex.cont) > 0 THEN lex.cont ELSE lex.todos END AS base) b
    )`);
  ctes.push(`txt AS (
      SELECT id, row_number() OVER (ORDER BY rnk DESC, id) AS rk
        FROM (SELECT id, ts_rank_cd(tsv, tq.q) AS rnk
                FROM rag_trechos, tq
               WHERE tsv @@ tq.q AND ${perm}
                 AND length(tsv) - length(ts_delete(tsv, tq.base)) >= tq.minimo
               ORDER BY rnk DESC, id
               LIMIT ${cand}::int) s
    )`);
  uniao.push("SELECT id, rk, NULL::float8 AS sim, true AS txt FROM txt");

  const colunas = "t.id, t.documento_id, d.titulo, t.texto, t.pagina_ini, t.pagina_fim, t.turma_ids, t.dono_ids, f.score::float8 AS score, f.sim::float8 AS similaridade, f.por_texto";
  const juncao = `FROM fus f
      JOIN rag_trechos t ON t.id = f.id
      JOIN rag_documentos d ON d.id = t.documento_id`;

  // COM teto por documento: numera dentro de cada `documento_id` e corta antes do LIMIT global.
  // A ordem final segue a mesma (score desc, id), então o topo da lista não muda — o que muda é
  // quem sobrevive mais abaixo: entra o melhor trecho de outro documento no lugar do 4º do mesmo.
  const porDocN = Number.isFinite(porDoc) && (porDoc as number) > 0 ? Math.floor(porDoc as number) : null;
  const corpo = porDocN === null
    ? `SELECT ${colunas}
      ${juncao}
     ORDER BY f.score DESC, t.id
     LIMIT ${lim}::int`
    : `SELECT * FROM (
       SELECT ${colunas},
              row_number() OVER (PARTITION BY t.documento_id ORDER BY f.score DESC, t.id) AS rn_doc
         ${juncao}
     ) z
     WHERE z.rn_doc <= ${p(porDocN)}::int
     ORDER BY z.score DESC, z.id
     LIMIT ${lim}::int`;

  const sql = `WITH ${ctes.join(",\n    ")},
    fus AS (
      SELECT id, sum(1.0 / (${RRF_K} + rk)) AS score, max(sim) AS sim, bool_or(txt) AS por_texto FROM (${uniao.join(" UNION ALL ")}) r GROUP BY id
    )
    ${corpo}`;
  return { sql, params };
}

/** Embed da pergunta com prazo; qualquer falha/estouro ⇒ null. O timer é sempre limpo. */
async function vetorDaPergunta(embed: EmbedRag, pergunta: string, prazoMs: number): Promise<number[] | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const prazo = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      console.warn("[rag/busca] embed falhou, seguindo só por palavra-chave:", `prazo de ${prazoMs} ms estourado`);
      resolve(null);
    }, prazoMs);
  });
  const chamada = (async () => {
    const [v] = await embed([pergunta], "pergunta");
    // Dimensão errada ou NaN viraria erro de SQL (500); trata como embed falho → só palavra-chave.
    if (!Array.isArray(v) || v.length !== RAG_EMBED_DIM || !v.every(Number.isFinite)) {
      console.warn("[rag/busca] embed falhou, seguindo só por palavra-chave:", "vetor inválido");
      return null;
    }
    return v;
  })().catch((e) => {
    console.warn("[rag/busca] embed falhou, seguindo só por palavra-chave:", (e as Error)?.message ?? e);
    return null;
  }); // rejeição tardia (depois do prazo) não vira unhandledRejection
  try {
    return await Promise.race([chamada, prazo]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Roda a query da busca (linhas cruas, SEM `podeVer`) na transação com o `SET LOCAL` do HNSW. */
export async function executarSql(db: RagDb, e: EscopoRag, pergunta: string, vetor: number[] | null, k: number, porDoc?: number): Promise<any[]> {
  const { sql, params } = montarSql(e, pergunta, vetor, k, porDoc);
  return transacao(db, async (tx) => {
    // Busca vetorial filtrada: sem isso o HNSW pode devolver menos de `k` linhas quando o filtro é seletivo.
    if (vetor) await tx.query("SET LOCAL hnsw.iterative_scan = relaxed_order");
    return (await tx.query(sql, params)).rows;
  });
}

export async function buscar(deps: BuscaDeps, e: EscopoRag, pergunta: string, k: number = K_PADRAO, porDoc?: number): Promise<TrechoAchado[]> {
  // userId vazio casaria com entradas "" em dono_ids: sem identidade não há escopo.
  if (!e.userId || e.userId.trim() === "") return [];
  const consulta = pergunta.trim();
  if (!consulta) return [];
  if (!temBase(e, await deps.contar(e))) return [];

  const vetor = await vetorDaPergunta(deps.embed, consulta, deps.prazoEmbedMs ?? PRAZO_EMBED_PADRAO_MS);
  const linhas = await executarSql(deps.db, e, consulta, vetor, k, porDoc);

  return linhas
    .filter((t) => podeVer({ turmaIds: t.turma_ids ?? [], donoIds: t.dono_ids ?? [] }, e))
    .map((t) => ({
      trechoId: String(t.id ?? ""),
      documentoId: String(t.documento_id ?? ""),
      titulo: String(t.titulo ?? ""),
      texto: String(t.texto ?? ""),
      paginaIni: Number(t.pagina_ini ?? 0) || 0,
      paginaFim: Number(t.pagina_fim ?? 0) || 0,
      score: Number(t.score ?? 0) || 0,
      similaridade: t.similaridade == null ? null : Number(t.similaridade),
      porTexto: t.por_texto === true,
      publico: !(t.dono_ids ?? []).length && (t.turma_ids ?? []).length > 0 && (t.turma_ids ?? []).every((id: string) => id.startsWith("area:")),
    }));
}
