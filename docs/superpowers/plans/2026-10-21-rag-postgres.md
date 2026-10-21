# RAG — troca do banco: Atlas → Postgres + pgvector da Contabo · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** os trechos, vetores e permissões do RAG passam a morar no Postgres 16 + pgvector 0.8.7 da Contabo, com a mesma API do store e a busca híbrida numa consulta SQL só, sem mudar ingestão, embedding, fila nem a aba do Admin.

**Architecture:** `lib/rag/store.ts` mantém **os mesmos nomes e assinaturas exportados**; só o tipo `RagDb` muda de "cliente Prisma" para um cliente SQL mínimo (`{ query(sql, params) }`, compatível com `pg.Pool`). `lib/rag/busca.ts` troca o pipeline Atlas por uma SQL com dois ramos (vetor HNSW cosine + `tsvector` português) fundidos por RRF, com a permissão no `WHERE` dos dois. Testes de store/busca rodam contra **Postgres real** (pgvector em container — local e no CI), não contra fake.

**Tech Stack:** Postgres 16 + pgvector 0.8.7, `pg` (node-postgres) + `@types/pg`, Vitest, GitHub Actions service container `pgvector/pgvector:pg16`.

**Spec:** `docs/superpowers/specs/2026-10-21-rag-turmas-design.md` (§10 — revisão do banco).

## Global Constraints

- Permissão: trecho visível sse `turma_ids && turmasDaPessoa` **ou** `dono_ids @> ARRAY[pessoa]::text[]` (mesmo sentido de `= ANY`, mas usa o GIN de `dono_ids`) — condição no `WHERE` **dos dois ramos** da busca (nunca filtrar depois); `podeVer` continua como 2ª checagem.
- Adicionar/remover turma ou dono é **atômico** no SQL (`array_append` sem duplicata / `array_remove`), documento e trechos **na mesma transação**; remoção da última permissão apaga documento + trechos na mesma transação.
- Embedding `vector(1024)`, cosine; trecho sem vetor = `embedding IS NULL` (buscável só por palavra-chave).
- Texto: coluna gerada `tsv tsvector GENERATED ALWAYS AS (to_tsvector('rag_pt', texto)) STORED`; consulta com `websearch_to_tsquery('rag_pt', $pergunta)`. `rag_pt` = config de busca própria (`COPY = portuguese` + `unaccent` antes do `portuguese_stem`), criada em `rag-schema.sql`: "celula" casa "células" e vice-versa.
- IDs: `uuid` (`gen_random_uuid()`), expostos como string. Validação de id na rota DELETE passa a ser UUID.
- Hash duplicado: violação `23505` na `rag_documentos.hash` (substitui o `P2002`).
- Conexão: `RAG_PG_URL` (env); papel `rag_app` com permissão **só** nas tabelas do RAG; Postgres só na tailnet.
- Nada de material de aluno no AI Studio grátis; embedder só `gemini-embedding-001` no Vertex (inalterado).
- Assinaturas públicas de `lib/rag/store.ts` e `buscar()` **não mudam** (exceto o tipo `RagDb` e `BuscaDeps`, descritos abaixo) — `ingerir.ts`, `lib/queue/rag.ts` e as rotas só trocam o `db` que injetam.

## Review Focus

1. **Aluno de outra turma / outro aluno** → a SQL de busca não devolve o trecho (teste na Task 3, contra Postgres real).
2. **Duas remoções/adições simultâneas na mesma linha** → nenhuma turma removida volta (teste concorrente na Task 2).
3. **Pergunta só com stopwords ou símbolos** (`websearch_to_tsquery` vazia) → ramo texto não lança; resultado vem do vetor ou vazio (Task 3).
4. **Trecho sem vetor** (`embedding IS NULL`) → entra só pelo ramo texto, nunca derruba o ramo vetor (Task 3).
5. **Postgres fora do ar** → ingestão devolve erro legível (não "PDF sem texto"); busca lança (a rota mostra erro). (Task 4)

---

### Task 1: Esquema SQL + cliente + Postgres de teste

**Files:** Create `infra/zaeon-models/rag-schema.sql`, `lib/rag/pg.ts`, `lib/rag/pgTeste.ts`; Modify `package.json` (`pg`, `@types/pg`), `.github/workflows/ci.yml` (service `pgvector/pgvector:pg16` + env `RAG_PG_TEST_URL`), `.env.example` (`RAG_PG_URL`)

**Interfaces — Produces:**
- `rag-schema.sql` (idempotente, `CREATE ... IF NOT EXISTS`): `CREATE EXTENSION vector` + `unaccent` + config `rag_pt`; `rag_documentos(id uuid pk default gen_random_uuid(), hash text unique not null, titulo, nome_arquivo, paginas int, markdown text, status text check in ('indexando','pronto','erro'), erro text, turma_ids text[] not null default '{}', dono_ids text[] not null default '{}', origem text, criado_por text, total_trechos int default 0, com_vetor int default 0, created_at, updated_at)`; `rag_trechos(id uuid pk, documento_id uuid references rag_documentos(id) on delete cascade, ordem int, texto text, caminho text, pagina_ini int, pagina_fim int, turma_ids text[], dono_ids text[], embedding vector(1024) null, tsv tsvector generated always as (to_tsvector('rag_pt', texto)) stored, created_at)`; índices: `hnsw (embedding vector_cosine_ops)`, `gin (tsv)`, `gin (turma_ids)`, `gin (dono_ids)`, `(documento_id, ordem)`. Papel `rag_app` (senha via `:'senha'` do psql) com `SELECT, INSERT, UPDATE, DELETE` nas duas tabelas.
- `lib/rag/pg.ts`: `type RagDb = { query<T = any>(sql: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number | null }> }` + `transacao<T>(db, fn: (tx: RagDb) => Promise<T>): Promise<T>` (BEGIN/COMMIT/ROLLBACK num client do pool quando `db` é `pg.Pool`); `ragPg(): RagDb` (Pool singleton a partir de `RAG_PG_URL`, `max: 10`; sem a env lança `Error("RAG_PG_URL ausente")`).
- `lib/rag/pgTeste.ts` (só testes): `bancoDeTeste(): Promise<{ db: RagDb; limpar(): Promise<void>; fechar(): Promise<void> } | null>` — com `RAG_PG_TEST_URL` aplica o `rag-schema.sql` e devolve o pool; sem a env devolve `null` e os testes de banco fazem `it.skipIf`. **No CI a env existe** (service container), então os testes de permissão rodam sempre lá.

- [ ] Step 1: teste `lib/rag/pg.test.ts`: com banco de teste, aplicar o schema 2× (idempotente) e conferir `\d`: tabelas, coluna `tsv` gerada, índice HNSW. `transacao` com erro faz rollback.
- [ ] Step 2: RED → implementar → GREEN (localmente: `docker run -d --name pg-rag-teste -e POSTGRES_PASSWORD=t -p 55432:5432 pgvector/pgvector:pg16`, `RAG_PG_TEST_URL=postgres://postgres:t@localhost:55432/postgres`).
- [ ] Step 3: Commit `feat(rag): esquema Postgres (pgvector + tsvector pt) + cliente pg + Postgres de teste no CI`

### Task 2: Store no Postgres (mesma API)

**Files:** Modify `lib/rag/store.ts`, `lib/rag/store.test.ts`; Delete `lib/rag/fakeDb.ts`

**Interfaces:** mesmos exports de hoje (`buscarPorHash`, `criarDocumento`, `gravarTrechos`, `acrescentarPermissao`, `removerPermissao`, `apagarDocumento`, `marcarErro`, `registrarVetores`, `trechosSemVetor`, `listarDocumentos`, `contarBase`, `Permissao`, `RagDocumentoRow`, `RagDocumentoLista`) com `db: RagDb` de `lib/rag/pg.ts`. `RagDocumentoRow` vira tipo próprio (camelCase: `id, hash, titulo, nomeArquivo, paginas, markdown, status, erro, turmaIds, donoIds, origem, criadoPor, totalTrechos, comVetor, createdAt, updatedAt`). Mantém: validação de id vazio, `gravarTrechos` com permissões **lidas do documento na mesma transação**, `registrarVetores` grava `embedding` como literal pgvector (`'[...]'::vector`) e recalcula `com_vetor`/status.

- [ ] Step 1: portar todos os testes atuais do store pro banco real (`it.skipIf(!banco)`), mais: **2 removerPermissao concorrentes (`Promise.all`) em turmas diferentes do mesmo doc ⇒ nenhuma das duas fica nos trechos** *(Review Focus 2)*; acrescentar + remover concorrentes ⇒ estado final coerente entre documento e trechos.
- [ ] Step 2: RED → implementar com SQL atômico (`UPDATE ... SET turma_ids = array_remove(turma_ids, $1)`; acrescentar com `CASE WHEN $1 = ANY(turma_ids) THEN turma_ids ELSE array_append(turma_ids, $1) END`) → GREEN.
- [ ] Step 3: Commit `feat(rag): store no Postgres — mesma API, permissões atômicas em transação`

### Task 3: Busca híbrida em SQL

**Files:** Modify `lib/rag/busca.ts`, `lib/rag/busca.test.ts`; Delete `scripts/atlas-rag-indexes.mongo.js`

**Interfaces:** `buscar(deps, e, pergunta, k?)` igual; `BuscaDeps = { db: RagDb; embed: EmbedRag; contar: (e) => Promise<{pessoais; deTurma}>; prazoEmbedMs? }` (sai `colecao`). Remove `montarPipeline`/`colecaoRagPrisma`; adiciona `montarSql(e, pergunta, vetor: number[] | null, k): { sql: string; params: unknown[] }` (puro, testável). SQL: CTE `vet` (só com vetor: `WHERE embedding IS NOT NULL AND <perm>` `ORDER BY embedding <=> $v LIMIT k*4`, `row_number()` como rank), CTE `txt` (`WHERE tsv @@ websearch_to_tsquery('rag_pt',$q) AND <perm>` `ORDER BY ts_rank_cd(tsv, q) DESC LIMIT k*4`), fusão RRF `sum(1.0/(60+rank))`, `JOIN rag_documentos` pro título, `LIMIT k`. `SET LOCAL hnsw.iterative_scan = relaxed_order` na mesma transação (filtro + HNSW no pgvector 0.8). `<perm>` = `(turma_ids && $t::text[] OR dono_ids @> ARRAY[$u]::text[])`.

- [ ] Step 1: testes contra banco real: aluno de outra turma e outro aluno **não** recebem o trecho *(RF 1)*; pergunta só com stopwords não lança *(RF 3)*; trecho sem vetor aparece só por palavra; embed falha ⇒ só texto + `console.warn`; sem base ⇒ `[]` sem embed; userId vazio ⇒ `[]`; resultado ordenado e com `titulo`, `paginaIni/Fim`. Teste puro de `montarSql` (com e sem vetor; a permissão aparece nos dois ramos).
- [ ] Step 2: RED → implementar → GREEN.
- [ ] Step 3: Commit `feat(rag): busca híbrida em SQL (HNSW + tsvector pt, RRF) com permissão nos dois ramos`

### Task 4: Ligação no app + limpeza do Mongo

**Files:** Modify `lib/rag/ingerir.ts` (+test), `lib/queue/rag.ts` (+test), `app/api/admin/rag/route.ts` (+test), `app/api/admin/rag/busca/route.ts`, `prisma/schema.prisma` (remove `RagDocumento`/`RagTrecho`), `lib/rag/permissao.ts` (remove `filtroVetorial`/`filtroTextual` se ninguém mais usar)

- `ingerir.ts`: `23505` no lugar de `P2002`; erro de conexão do Postgres ⇒ resultado `erro: "banco_indisponivel"` (nunca `sem_texto`) *(RF 5)*; testes contra banco real.
- `lib/queue/rag.ts` e rotas: `db = ragPg()` no lugar do prisma; DELETE valida UUID (`/^[0-9a-f-]{36}$/i`); a UI mostra `banco_indisponivel` como "banco da base fora do ar — tente de novo".
- [ ] Step 1: testes → RED → GREEN; `npx tsc --noEmit -p .` limpo fora de `server/colyseus`; suíte inteira.
- [ ] Step 2: Commit `feat(rag): app usa o Postgres da Contabo; sai o RAG do Mongo`

### Task 5: Produção

- [ ] Contabo: `docker-compose.zaeon-models.yaml` publica o pgvector **só em 127.0.0.1:5432**; aplicar `rag-schema.sql` com a senha do `rag_app` gerada na box (sem imprimir); o dono roda (root) `tailscale serve --bg --tcp 5432 tcp://127.0.0.1:5432`.
- [ ] VPS: `RAG_PG_URL=postgres://rag_app:<senha>@100.113.137.74:5432/zaeon_rag` gravado no `.env` por pipe (sem passar pela tela); recriar `web`.
- [ ] Merge → deploy; repetir a prova com o PDF de teste **incluindo a busca** (pergunta da tabela e do ciclo de Calvin, turma fictícia, aluno de fora não vê) e limpar.
- [ ] Dropar as coleções Mongo `rag_documentos`/`rag_trechos` (vazias) depois da prova.
- [ ] Backup diário pro kvm4000 — quando o dono passar o acesso SSH (fora deste plano).
