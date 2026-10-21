-- Esquema do RAG de turmas no Postgres + pgvector da Contabo (substitui o Atlas/Prisma).
-- IDEMPOTENTE: pode rodar quantas vezes quiser (CREATE ... IF NOT EXISTS em tudo).
--
-- Produção (superusuário, uma vez e a cada mudança de esquema):
--   psql "$DATABASE_URL_ADMIN" -v senha='<senha do rag_app>' -f infra/zaeon-models/rag-schema.sql
--
-- Testes (lib/rag/pgTeste.ts): aplica SÓ a parte acima do marcador "@@PAPEL@@" (sem o papel, que exige a
-- variável psql :senha e privilégio de criar papéis). Não mexa nesse marcador.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS rag_documentos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hash          text NOT NULL UNIQUE,
  titulo        text,
  nome_arquivo  text,
  paginas       int,
  markdown      text,
  status        text NOT NULL DEFAULT 'indexando' CHECK (status IN ('indexando', 'pronto', 'erro')),
  erro          text,
  turma_ids     text[] NOT NULL DEFAULT '{}',
  dono_ids      text[] NOT NULL DEFAULT '{}',
  origem        text,
  criado_por    text,
  total_trechos int NOT NULL DEFAULT 0,
  com_vetor     int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rag_trechos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id uuid NOT NULL REFERENCES rag_documentos(id) ON DELETE CASCADE,
  ordem        int NOT NULL,
  texto        text NOT NULL DEFAULT '',
  caminho      text,
  pagina_ini   int,
  pagina_fim   int,
  -- Cópia das permissões do documento: a busca filtra no WHERE do próprio trecho (nunca depois).
  turma_ids    text[] NOT NULL DEFAULT '{}',
  dono_ids     text[] NOT NULL DEFAULT '{}',
  -- NULL = trecho ainda sem vetor (buscável só por palavra-chave).
  embedding    vector(1024),
  tsv          tsvector GENERATED ALWAYS AS (to_tsvector('portuguese', texto)) STORED,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rag_trechos_embedding_hnsw ON rag_trechos USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS rag_trechos_tsv_gin        ON rag_trechos USING gin (tsv);
CREATE INDEX IF NOT EXISTS rag_trechos_turma_ids_gin  ON rag_trechos USING gin (turma_ids);
CREATE INDEX IF NOT EXISTS rag_trechos_dono_ids_gin   ON rag_trechos USING gin (dono_ids);
CREATE INDEX IF NOT EXISTS rag_trechos_doc_ordem      ON rag_trechos (documento_id, ordem);

-- @@PAPEL@@ ---------------------------------------------------------------------------------------------
-- Papel da aplicação: permissão SÓ nas duas tabelas do RAG. Exige `psql -v senha=...` (ver topo).
SELECT format('CREATE ROLE rag_app LOGIN PASSWORD %L', :'senha')
 WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rag_app') \gexec
SELECT format('ALTER ROLE rag_app PASSWORD %L', :'senha') \gexec

GRANT SELECT, INSERT, UPDATE, DELETE ON rag_documentos, rag_trechos TO rag_app;
