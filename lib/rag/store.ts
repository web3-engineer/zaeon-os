/**
 * lib/rag/store.ts — persistência da base RAG (documentos + trechos) no Postgres + pgvector, com `db` injetável.
 *
 * Permissões são `turma_ids` / `dono_ids` (text[]), gravadas no documento E copiadas em cada trecho (a busca filtra
 * no WHERE do próprio trecho). Toda mudança de permissão é ATÔMICA: SQL de array (`array_append` sem duplicata /
 * `array_remove`) sobre o documento e os seus trechos, na MESMA transação, com o documento travado (`FOR UPDATE`)
 * — duas escritas simultâneas no mesmo documento se enfileiram em vez de sobrescrever uma à outra.
 * `rag_trechos.documento_id` tem `ON DELETE CASCADE`: apagar o documento leva os trechos junto.
 */
import { transacao, type RagDb } from "./pg";
import type { TrechoCortado } from "./corte";
import type { EscopoRag } from "./permissao";

export type { RagDb } from "./pg";

export type RagDocumentoRow = {
  id: string;
  hash: string;
  titulo: string;
  nomeArquivo: string;
  paginas: number;
  markdown: string;
  status: string; // "indexando" | "pronto" | "erro"
  erro: string | null;
  turmaIds: string[];
  donoIds: string[];
  origem: string; // "admin" | "chat" | "gerado"
  criadoPor: string;
  totalTrechos: number;
  comVetor: number;
  createdAt: Date;
  updatedAt: Date;
};
/** Linha de listagem: sem o `markdown` (pesado). */
export type RagDocumentoLista = Omit<RagDocumentoRow, "markdown">;

export type Permissao = { turmaId?: string; donoId?: string };

/** Ids de permissão são strings simples; vazio casaria com nada (ou tudo) — recusa. */
function validar(p: Permissao): void {
  if (p.turmaId === "" || p.donoId === "") throw new Error("permissão com id vazio");
  if (p.turmaId == null && p.donoId == null) throw new Error("permissão sem turmaId nem donoId");
}

// snake_case do banco → camelCase do tipo. `markdown` fica de fora de propósito (ver LISTA).
const COLUNAS_LISTA = `id, hash, titulo, nome_arquivo AS "nomeArquivo", paginas, status, erro, turma_ids AS "turmaIds",
  dono_ids AS "donoIds", origem, criado_por AS "criadoPor", total_trechos AS "totalTrechos", com_vetor AS "comVetor",
  created_at AS "createdAt", updated_at AS "updatedAt"`;
const COLUNAS = `${COLUNAS_LISTA}, markdown`;

const naoExiste = (id: string) => new Error(`documento ${id} não existe`);

export async function buscarPorHash(db: RagDb, hash: string): Promise<RagDocumentoRow | null> {
  const r = await db.query<RagDocumentoRow>(`SELECT ${COLUNAS} FROM rag_documentos WHERE hash = $1`, [hash]);
  return r.rows[0] ?? null;
}

export async function buscarPorId(db: RagDb, id: string): Promise<RagDocumentoRow | null> {
  const r = await db.query<RagDocumentoRow>(`SELECT ${COLUNAS} FROM rag_documentos WHERE id = $1`, [id]);
  return r.rows[0] ?? null;
}

export async function criarDocumento(
  db: RagDb,
  d: { hash: string; titulo: string; nomeArquivo: string; paginas: number; markdown: string; origem: string; criadoPor: string; permissao: Permissao },
): Promise<RagDocumentoRow> {
  validar(d.permissao);
  // Hash duplicado => violação 23505 (propaga; o ingerir trata como corrida de upload).
  const r = await db.query<RagDocumentoRow>(
    `INSERT INTO rag_documentos (hash, titulo, nome_arquivo, paginas, markdown, status, origem, criado_por, turma_ids, dono_ids)
     VALUES ($1, $2, $3, $4, $5, 'indexando', $6, $7, $8::text[], $9::text[])
     RETURNING ${COLUNAS}`,
    [
      d.hash, d.titulo, d.nomeArquivo, d.paginas, d.markdown, d.origem, d.criadoPor,
      d.permissao.turmaId ? [d.permissao.turmaId] : [],
      d.permissao.donoId ? [d.permissao.donoId] : [],
    ],
  );
  return r.rows[0];
}

/** Trava a linha do documento até o fim da transação (serializa escritas de permissão/trechos do MESMO documento). */
async function travar(tx: RagDb, documentoId: string): Promise<void> {
  const r = await tx.query("SELECT 1 FROM rag_documentos WHERE id = $1 FOR UPDATE", [documentoId]);
  if (r.rows.length === 0) throw naoExiste(documentoId);
}

/**
 * Grava os trechos (sem vetor ainda) e fixa `totalTrechos` no documento. A permissão copiada nos trechos é a do
 * DOCUMENTO no momento da escrita, lida na mesma transação (um `acrescentarPermissao` que rodou antes de existirem
 * trechos não os viu); o `perm` recebido só é mantido por compatibilidade de assinatura e é ignorado.
 */
export async function gravarTrechos(
  db: RagDb,
  documentoId: string,
  trechos: TrechoCortado[],
  _perm: { turmaIds: string[]; donoIds: string[] },
): Promise<number> {
  await transacao(db, async (tx) => {
    await travar(tx, documentoId);
    if (trechos.length > 0) {
      await tx.query(
        `INSERT INTO rag_trechos (documento_id, ordem, texto, caminho, pagina_ini, pagina_fim, turma_ids, dono_ids)
         SELECT d.id, t.ordem, t.texto, t.caminho, t.pagina_ini, t.pagina_fim, d.turma_ids, d.dono_ids
           FROM rag_documentos d,
                unnest($2::int[], $3::text[], $4::text[], $5::int[], $6::int[]) AS t(ordem, texto, caminho, pagina_ini, pagina_fim)
          WHERE d.id = $1`,
        [
          documentoId,
          trechos.map((t) => t.ordem), trechos.map((t) => t.texto), trechos.map((t) => t.caminho),
          trechos.map((t) => t.paginaIni), trechos.map((t) => t.paginaFim),
        ],
      );
    }
    // Trechos que já existiam (re-gravação) também ficam com as permissões atuais do documento.
    await tx.query(
      `UPDATE rag_trechos t SET turma_ids = d.turma_ids, dono_ids = d.dono_ids
         FROM rag_documentos d WHERE d.id = $1 AND t.documento_id = d.id`,
      [documentoId],
    );
    await tx.query("UPDATE rag_documentos SET total_trechos = $2, updated_at = now() WHERE id = $1", [documentoId, trechos.length]);
  });
  return trechos.length;
}

/** `SET <col> = CASE ... array_append sem duplicata` — idempotente. `$n` é o parâmetro com o id. */
const comId = (col: string, n: number) => `${col} = CASE WHEN $${n} = ANY(${col}) THEN ${col} ELSE array_append(${col}, $${n}) END`;
const semId = (col: string, n: number) => `${col} = array_remove(${col}, $${n})`;

/** Monta o SET de permissão (`turma_ids` e/ou `dono_ids`) e os parâmetros (a partir de $2; $1 é o documento). */
function montarSet(p: Permissao, f: (col: string, n: number) => string): { set: string; params: string[] } {
  const partes: string[] = [];
  const params: string[] = [];
  if (p.turmaId != null) { params.push(p.turmaId); partes.push(f("turma_ids", params.length + 1)); }
  if (p.donoId != null) { params.push(p.donoId); partes.push(f("dono_ids", params.length + 1)); }
  return { set: partes.join(", "), params };
}

/** Documento E todos os trechos, numa transação. Idempotente (sem duplicata). */
export async function acrescentarPermissao(db: RagDb, documentoId: string, p: Permissao): Promise<void> {
  validar(p);
  const { set, params } = montarSet(p, comId);
  await transacao(db, async (tx) => {
    await travar(tx, documentoId);
    // Documento primeiro (se algo falhar no meio, o retry idempotente completa; ninguém ganha acesso a mais do que o documento declara).
    await tx.query(`UPDATE rag_documentos SET ${set}, updated_at = now() WHERE id = $1`, [documentoId, ...params]);
    await tx.query(`UPDATE rag_trechos SET ${set} WHERE documento_id = $1`, [documentoId, ...params]);
  });
}

/** Remove uma permissão; se era a última, apaga o documento e os trechos — tudo na mesma transação. */
export async function removerPermissao(db: RagDb, documentoId: string, p: Permissao): Promise<"removida" | "documento_apagado"> {
  validar(p);
  const { set, params } = montarSet(p, semId);
  return transacao(db, async (tx) => {
    await travar(tx, documentoId);
    // Trechos primeiro (é neles que o filtro da busca olha), depois o documento.
    await tx.query(`UPDATE rag_trechos SET ${set} WHERE documento_id = $1`, [documentoId, ...params]);
    const r = await tx.query<{ turma_ids: string[]; dono_ids: string[] }>(
      `UPDATE rag_documentos SET ${set}, updated_at = now() WHERE id = $1 RETURNING turma_ids, dono_ids`,
      [documentoId, ...params],
    );
    const { turma_ids, dono_ids } = r.rows[0];
    if (turma_ids.length === 0 && dono_ids.length === 0) {
      await tx.query("DELETE FROM rag_trechos WHERE documento_id = $1", [documentoId]);
      await tx.query("DELETE FROM rag_documentos WHERE id = $1", [documentoId]);
      return "documento_apagado" as const;
    }
    return "removida" as const;
  });
}

/**
 * Apaga o documento e todos os seus trechos, numa transação. Documento que já não existe não é erro (idempotente).
 * Trava o documento ANTES de tocar nos trechos (mesma ordem de lock das demais escritas: sem deadlock).
 */
export async function apagarDocumento(db: RagDb, documentoId: string): Promise<void> {
  await transacao(db, async (tx) => {
    await tx.query("SELECT 1 FROM rag_documentos WHERE id = $1 FOR UPDATE", [documentoId]);
    await tx.query("DELETE FROM rag_trechos WHERE documento_id = $1", [documentoId]);
    await tx.query("DELETE FROM rag_documentos WHERE id = $1", [documentoId]);
  });
}

export async function marcarErro(db: RagDb, documentoId: string, erro: string): Promise<void> {
  const r = await db.query(
    "UPDATE rag_documentos SET status = 'erro', erro = left($2, 500), updated_at = now() WHERE id = $1",
    [documentoId, String(erro)],
  );
  if (r.rowCount === 0) throw naoExiste(documentoId);
}

/** Literal pgvector: `[0.1,0.2,...]` (parâmetro de texto, convertido com `::vector` no SQL). */
function literalVetor(v: number[]): string {
  if (!Array.isArray(v) || v.length === 0 || v.some((x) => typeof x !== "number" || !Number.isFinite(x))) {
    throw new Error("embedding inválido (vazio ou com valor não numérico)");
  }
  return `[${v.join(",")}]`;
}

/** Grava os vetores, recalcula `com_vetor` e, quando todos os trechos têm vetor, vira "pronto". */
export async function registrarVetores(db: RagDb, documentoId: string, itens: { trechoId: string; embedding: number[] }[]): Promise<void> {
  const literais = itens.map((it) => literalVetor(it.embedding));
  await transacao(db, async (tx) => {
    // Documento travado PRIMEIRO (mesma ordem das permissões ⇒ sem deadlock) e checa existência. Com a trava, o
    // count abaixo roda DEPOIS de qualquer registrarVetores concorrente ter commitado (sem com_vetor velho).
    await travar(tx, documentoId);
    if (itens.length > 0) {
      await tx.query(
        `UPDATE rag_trechos t SET embedding = v.e::vector
           FROM unnest($1::uuid[], $2::text[]) AS v(id, e)
          WHERE t.id = v.id AND t.documento_id = $3`,
        [itens.map((it) => it.trechoId), literais, documentoId],
      );
    }
    await tx.query(
      `WITH c AS (SELECT count(*)::int AS n FROM rag_trechos WHERE documento_id = $1 AND embedding IS NOT NULL)
       UPDATE rag_documentos d
          SET com_vetor = c.n,
              status = CASE WHEN d.status = 'indexando' AND d.total_trechos > 0 AND c.n = d.total_trechos THEN 'pronto' ELSE d.status END,
              updated_at = now()
         FROM c WHERE d.id = $1`,
      [documentoId],
    );
  });
}

export async function trechosSemVetor(db: RagDb, documentoId: string, limite: number): Promise<{ id: string; texto: string }[]> {
  const r = await db.query<{ id: string; texto: string }>(
    "SELECT id, texto FROM rag_trechos WHERE documento_id = $1 AND embedding IS NULL ORDER BY ordem ASC LIMIT $2",
    [documentoId, limite],
  );
  return r.rows.map((x) => ({ id: String(x.id), texto: x.texto }));
}

/** Sem `markdown`. Turma e dono juntos => união (OU). Sem filtro => todos. */
export async function listarDocumentos(db: RagDb, f: { turmaId?: string; donoId?: string }): Promise<RagDocumentoLista[]> {
  const ou: string[] = [];
  const params: string[] = [];
  if (f.turmaId) { params.push(f.turmaId); ou.push(`$${params.length} = ANY(turma_ids)`); }
  if (f.donoId) { params.push(f.donoId); ou.push(`$${params.length} = ANY(dono_ids)`); }
  const where = ou.length === 0 ? "" : `WHERE ${ou.join(" OR ")}`;
  const r = await db.query<RagDocumentoLista>(`SELECT ${COLUNAS_LISTA} FROM rag_documentos ${where} ORDER BY created_at DESC, id`, params);
  return r.rows;
}

/** Quantos documentos (não-erro) o escopo enxerga, separando pessoais de turma. */
export async function contarBase(db: RagDb, e: EscopoRag): Promise<{ pessoais: number; deTurma: number }> {
  const r = await db.query<{ pessoais: string | number; de_turma: string | number }>(
    `SELECT count(*) FILTER (WHERE $1::text = ANY(dono_ids)) AS pessoais,
            count(*) FILTER (WHERE turma_ids && $2::text[]) AS de_turma
       FROM rag_documentos WHERE status <> 'erro'`,
    [e.userId, e.turmaIds],
  );
  return { pessoais: Number(r.rows[0].pessoais), deTurma: e.turmaIds.length === 0 ? 0 : Number(r.rows[0].de_turma) };
}
