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
    // connectionTimeoutMillis: tailnet caída falha em 5 s em vez de pendurar a requisição no timeout TCP do SO.
    const pool = new Pool({ connectionString: url, max: 10, connectionTimeoutMillis: 5000 });
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

const CODIGOS_REDE = new Set(["ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "ECONNRESET", "EHOSTUNREACH", "ENETUNREACH", "EPIPE", "EAI_AGAIN"]);
// SQLSTATE: classe 08 (connection exception), 57P01/57P02/57P03 (desligando / não aceita conexão), 53300 (conexões demais).
const SQLSTATE_INDISPONIVEL = /^(08|57P0[123]$|53300$)/;
const MSG_INDISPONIVEL = /RAG_PG_URL ausente|Connection terminated|timeout exceeded when trying to connect|not queryable/i;

/**
 * O banco da base RAG está fora do ar (tailnet caída, Postgres reiniciando, pool sem conexão, env ausente)?
 * Distingue "não consegui falar com o banco" de erro de SQL/dados (violação de unicidade, uuid inválido...),
 * para a ingestão não culpar o PDF e as rotas responderem 503 em vez de 500. Segue `cause` e `AggregateError`.
 */
export function ehBancoIndisponivel(e: unknown, fundo = 0): boolean {
  if (e == null || typeof e !== "object" || fundo > 5) return false;
  const x = e as { code?: unknown; message?: unknown; cause?: unknown; errors?: unknown };
  if (typeof x.code === "string" && (CODIGOS_REDE.has(x.code) || SQLSTATE_INDISPONIVEL.test(x.code))) return true;
  if (typeof x.message === "string" && MSG_INDISPONIVEL.test(x.message)) return true;
  if (Array.isArray(x.errors) && x.errors.some((i) => ehBancoIndisponivel(i, fundo + 1))) return true;
  return x.cause !== e && ehBancoIndisponivel(x.cause, fundo + 1);
}
