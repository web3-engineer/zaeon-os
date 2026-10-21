// SÓ PARA TESTES. Postgres real (pgvector) pros testes de banco do RAG.
//
// Com `RAG_PG_TEST_URL` (CI: service container; local: `docker run -d --name pg-rag-teste -e POSTGRES_PASSWORD=t
// -p 55432:5432 pgvector/pgvector:pg16` → postgres://postgres:t@localhost:55432/postgres) cria um SCHEMA próprio
// por chamada (arquivos de teste rodam em paralelo e não podem se atropelar) e aplica `rag-schema.sql` nele.
// Sem a env devolve `null` e os testes de banco fazem `it.skipIf(!banco)`.
//
// Do schema SQL só vale a parte acima do marcador `@@PAPEL@@` (o papel `rag_app` exige `psql -v senha=...`).
import { readFileSync } from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import type { RagDb } from "./pg";

const MARCADOR_PAPEL = "-- @@PAPEL@@";
const SQL = readFileSync(path.join(process.cwd(), "infra/zaeon-models/rag-schema.sql"), "utf8");
const SQL_TABELAS = SQL.split(MARCADOR_PAPEL)[0];
const LOCK_EXTENSAO = 748_200_121; // advisory lock: CREATE EXTENSION concorrente entre arquivos de teste dá erro

export type BancoDeTeste = { db: RagDb; limpar(): Promise<void>; fechar(): Promise<void> };

/** Aplica o schema (sem o papel) no schema corrente de `db`. Idempotente — pode ser chamado de novo. */
export async function aplicarSchema(db: RagDb): Promise<void> {
  await db.query(SQL_TABELAS);
}

export async function bancoDeTeste(): Promise<BancoDeTeste | null> {
  const url = process.env.RAG_PG_TEST_URL;
  if (!url) return null;

  const nome = `rag_t_${process.pid}_${Math.random().toString(36).slice(2, 10)}`;
  const admin = new Pool({ connectionString: url, max: 1 });
  try {
    // A extensão é por banco (fica em public); cria uma vez, sem corrida entre arquivos de teste.
    const c = await admin.connect();
    try {
      await c.query("SELECT pg_advisory_lock($1)", [LOCK_EXTENSAO]);
      await c.query("CREATE EXTENSION IF NOT EXISTS vector SCHEMA public");
      await c.query("SELECT pg_advisory_unlock($1)", [LOCK_EXTENSAO]);
    } finally { c.release(); }
    await admin.query(`CREATE SCHEMA ${nome}`);
  } catch (e) {
    await admin.end();
    throw e;
  }

  // `public` no search_path mantém o tipo `vector` e o opclass visíveis.
  const pool = new Pool({ connectionString: url, max: 5, options: `-c search_path=${nome},public` });
  await aplicarSchema(pool);

  return {
    db: pool,
    limpar: async () => { await pool.query("TRUNCATE rag_trechos, rag_documentos"); },
    fechar: async () => {
      await pool.end();
      try { await admin.query(`DROP SCHEMA ${nome} CASCADE`); } finally { await admin.end(); }
    },
  };
}
