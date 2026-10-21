-- Esquema do RAG de turmas no Postgres + pgvector da Contabo (substitui o Atlas/Prisma).
-- IDEMPOTENTE: pode rodar quantas vezes quiser (CREATE ... IF NOT EXISTS em tudo).
--
-- Produção (superusuário, uma vez e a cada mudança de esquema):
--   psql "$DATABASE_URL_ADMIN" -v ON_ERROR_STOP=1 -v senha='<senha do rag_app>' -f infra/zaeon-models/rag-schema.sql
--   (melhor: senha por stdin — `{ printf '\\set senha %s\n' "$P"; cat rag-schema.sql; } | psql ... -f -` — fora do argv).
--   A senha só é usada ao CRIAR o papel: reaplicar o esquema não troca a senha de produção.
--
-- Testes (lib/rag/pgTeste.ts): aplica SÓ a parte acima do marcador "@@PAPEL@@" (e cria extensões + config rag_pt, acima de "@@TABELAS@@", uma vez em public) (sem o papel, que exige a
-- variável psql :senha e privilégio de criar papéis). Não mexa nesse marcador.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Busca por palavra-chave sem acento e com stemming português: "celula" casa "células" (e vice-versa).
-- A config vive no schema corrente (public em produção); `to_tsvector('rag_pt', ...)` e
-- `websearch_to_tsquery('rag_pt', ...)` resolvem pelo search_path. Idempotente (guarda: pg_ts_config visível no search_path).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'rag_pt' AND pg_ts_config_is_visible(oid)) THEN
    CREATE TEXT SEARCH CONFIGURATION rag_pt (COPY = portuguese);
    ALTER TEXT SEARCH CONFIGURATION rag_pt
      ALTER MAPPING FOR hword, hword_part, word WITH unaccent, portuguese_stem;
  END IF;
END $$;

-- @@TABELAS@@ -------------------------------------------------------------------------------------------

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
  tsv          tsvector GENERATED ALWAYS AS (to_tsvector('rag_pt', texto)) STORED,
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

-- Queda da tailnet no meio de uma transação não pode deixar trava pendurada por horas (o `tailscale serve` mantém o lado
-- loopback aberto): o servidor mata a query lenta, a espera de trava e a transação ociosa.
ALTER ROLE rag_app SET statement_timeout = '15s';
ALTER ROLE rag_app SET lock_timeout = '5s';
ALTER ROLE rag_app SET idle_in_transaction_session_timeout = '30s';

-- O rag_app só entra no banco do RAG (o do LiteLLM e o `postgres` vivem no mesmo cluster).
SELECT format('REVOKE CONNECT ON DATABASE %I FROM PUBLIC', datname) FROM pg_database
 WHERE datname IN ('litellm', 'postgres') \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO rag_app', current_database()) \gexec

GRANT SELECT, INSERT, UPDATE, DELETE ON rag_documentos, rag_trechos TO rag_app;
