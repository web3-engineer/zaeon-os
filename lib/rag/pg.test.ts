import { afterAll, describe, expect, it } from "vitest";
import { aplicarSchema, bancoDeTeste } from "./pgTeste";
import { transacao } from "./pg";

// Sem RAG_PG_TEST_URL (dev sem Postgres) os testes de banco são pulados; no CI a env existe (service container).
const banco = await bancoDeTeste();
afterAll(async () => { await banco?.fechar(); });

describe("esquema RAG no Postgres", () => {
  it.skipIf(!banco)("aplicar o schema 2x é idempotente e cria tabelas, tsv gerada e índice HNSW", async () => {
    const { db } = banco!;
    // bancoDeTeste() já aplicou 1x; aplicar de novo no mesmo schema não pode lançar.
    await aplicarSchema(db);
    await aplicarSchema(db);

    const tabelas = await db.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = current_schema() AND tablename IN ('rag_documentos','rag_trechos') ORDER BY 1`,
    );
    expect(tabelas.rows.map((r) => r.tablename)).toEqual(["rag_documentos", "rag_trechos"]);

    const tsv = await db.query<{ is_generated: string; generation_expression: string }>(
      `SELECT is_generated, generation_expression FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = 'rag_trechos' AND column_name = 'tsv'`,
    );
    expect(tsv.rows[0].is_generated).toBe("ALWAYS");
    expect(tsv.rows[0].generation_expression).toContain("rag_pt");

    const idx = await db.query<{ indexdef: string }>(
      `SELECT indexdef FROM pg_indexes WHERE schemaname = current_schema() AND tablename = 'rag_trechos'`,
    );
    const defs = idx.rows.map((r) => r.indexdef).join("\n");
    expect(defs).toMatch(/USING hnsw \(embedding vector_cosine_ops\)/);
    expect(defs).toMatch(/USING gin \(tsv\)/);
    expect(defs).toMatch(/USING gin \(turma_ids\)/);
    expect(defs).toMatch(/USING gin \(dono_ids\)/);
    expect(defs).toMatch(/\(documento_id, ordem\)/);
  });

  it.skipIf(!banco)("rag_pt ignora acento nos dois sentidos", async () => {
    const { db } = banco!;
    const r = await db.query<{ a: boolean; b: boolean }>(
      `SELECT to_tsvector('rag_pt', 'células') @@ websearch_to_tsquery('rag_pt', 'celula') AS a,
              to_tsvector('rag_pt', 'celula')  @@ websearch_to_tsquery('rag_pt', 'células') AS b`,
    );
    expect(r.rows[0]).toEqual({ a: true, b: true });
  });

  it.skipIf(!banco)("tsv é preenchida a partir do texto (português, sem acento) e embedding pode ser nulo", async () => {
    const { db, limpar } = banco!;
    await limpar();
    const d = await db.query<{ id: string }>(
      `INSERT INTO rag_documentos (hash, status) VALUES ('h-tsv', 'pronto') RETURNING id`,
    );
    await db.query(
      `INSERT INTO rag_trechos (documento_id, ordem, texto) VALUES ($1, 0, 'As células estudadas')`,
      [d.rows[0].id],
    );
    const r = await db.query<{ ok: boolean; sem: boolean; semvetor: boolean }>(
      `SELECT tsv @@ websearch_to_tsquery('rag_pt', 'célula') AS ok,
              tsv @@ websearch_to_tsquery('rag_pt', 'celula') AS sem,
              embedding IS NULL AS semvetor FROM rag_trechos`,
    );
    expect(r.rows[0]).toEqual({ ok: true, sem: true, semvetor: true });
    await limpar();
  });

  it.skipIf(!banco)("transacao faz commit no sucesso e rollback no erro", async () => {
    const { db, limpar } = banco!;
    await limpar();
    await expect(
      transacao(db, async (tx) => {
        await tx.query(`INSERT INTO rag_documentos (hash, status) VALUES ('h-rb', 'pronto')`);
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect((await db.query(`SELECT 1 FROM rag_documentos WHERE hash = 'h-rb'`)).rowCount).toBe(0);

    await transacao(db, async (tx) => {
      await tx.query(`INSERT INTO rag_documentos (hash, status) VALUES ('h-ok', 'pronto')`);
    });
    expect((await db.query(`SELECT 1 FROM rag_documentos WHERE hash = 'h-ok'`)).rowCount).toBe(1);
    await limpar();
  });

  it("ragPg sem RAG_PG_URL lança erro legível (e importar o módulo não conecta)", async () => {
    const antes = process.env.RAG_PG_URL;
    delete process.env.RAG_PG_URL;
    try {
      const { ragPg } = await import("./pg");
      expect(() => ragPg()).toThrow("RAG_PG_URL ausente");
    } finally {
      if (antes !== undefined) process.env.RAG_PG_URL = antes;
    }
  });
});
