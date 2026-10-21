// Cliente Postgres do RAG (Postgres + pgvector da Contabo, só na tailnet). Substitui o Prisma/Atlas do RAG.
//
// O Pool é PREGUIÇOSO: importar este módulo não abre conexão (o `next build` sem RAG_PG_URL tem que passar).
import { Pool } from "pg";

/** O mínimo que o store/busca precisam do banco — `pg.Pool`, um client em transação ou um dublê de teste. */
export type RagDb = {
  query<T = any>(sql: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number | null }>;
};

const g = globalThis as unknown as { __ragPool?: Pool };

/** Pool singleton (sobrevive ao HMR do dev). Sem `RAG_PG_URL` lança — o chamador mostra erro legível. */
export function ragPg(): RagDb {
  if (!g.__ragPool) {
    const url = process.env.RAG_PG_URL;
    if (!url) throw new Error("RAG_PG_URL ausente");
    const pool = new Pool({ connectionString: url, max: 10 });
    // Erro num client ocioso (Postgres reiniciou) não pode derrubar o processo.
    pool.on("error", (e) => console.error("[rag/pg] client ocioso falhou:", e.message));
    g.__ragPool = pool;
  }
  return g.__ragPool;
}

/**
 * Roda `fn` numa transação (BEGIN/COMMIT; ROLLBACK se `fn` lançar). Com um `pg.Pool` pega um client dedicado
 * (as queries de `tx` ficam na mesma conexão); se `db` já é um client/`tx`, reaproveita a transação em curso.
 */
export async function transacao<T>(db: RagDb, fn: (tx: RagDb) => Promise<T>): Promise<T> {
  if (!(db instanceof Pool)) return fn(db);
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const r = await fn(client);
    await client.query("COMMIT");
    return r;
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch { /* conexão já caiu: o erro original é o que importa */ }
    throw e;
  } finally {
    client.release();
  }
}
