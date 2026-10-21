import { afterAll, beforeEach, describe, it, expect, vi } from "vitest";
import { bancoDeTeste } from "@/lib/rag/pgTeste";
import type { RagDb } from "@/lib/rag/pg";
import { buscarPorId, criarDocumento, gravarTrechos } from "@/lib/rag/store";
import type { EmbedRag } from "@/lib/rag/embed";
import { deveMarcarFalhaFinal, enfileirarNaFila, filaRagLigada, indexarDocumento, indexarInline, RAG_QUEUE, type FilaRag } from "./rag";

// Postgres real (pgvector). Sem RAG_PG_TEST_URL os testes de banco são pulados; no CI a env existe (service container).
const banco = await bancoDeTeste();
afterAll(async () => { await banco?.fechar(); });
beforeEach(async () => { await banco?.limpar(); });

const USER = "64b000000000000000000001";

/** Quantos trechos do banco já têm vetor / quantos existem. */
async function contagem(db: RagDb) {
  const r = await db.query<{ total: number; com_vetor: number }>(
    "SELECT count(*)::int AS total, count(embedding)::int AS com_vetor FROM rag_trechos",
  );
  return r.rows[0];
}

async function docComTrechos(db: RagDb, n: number) {
  const doc = await criarDocumento(db, {
    hash: "h1", titulo: "Livro", nomeArquivo: "livro.pdf", paginas: 10, markdown: "# Livro", origem: "admin", criadoPor: USER, permissao: { turmaId: "t1" },
  });
  await gravarTrechos(
    db, doc.id,
    Array.from({ length: n }, (_, i) => ({ ordem: i, texto: `texto ${i}`, caminho: "Livro", paginaIni: 1, paginaFim: 1 })),
    { turmaIds: doc.turmaIds, donoIds: doc.donoIds },
  );
  return doc;
}

/** Vetor de 1024 dimensões (o tamanho da coluna `vector(1024)`). */
const vec = (x: number) => Array.from({ length: 1024 }, () => x);
const embedOk: EmbedRag = async (textos) => textos.map(() => vec(0.1));

describe("indexarDocumento", () => {
  it.skipIf(!banco)("100 trechos sem vetor, embed ok => 100 vetorizados e documento 'pronto'", async () => {
    const db = banco!.db;
    const doc = await docComTrechos(db, 100);
    const r = await indexarDocumento({ db, embed: embedOk }, doc.id);
    expect(r).toEqual({ vetorizados: 100, pronto: true });
    expect((await buscarPorId(db, doc.id))?.status).toBe("pronto");
  });

  it.skipIf(!banco)("embed_http_429 no 2º lote: rejeita, documento segue 'indexando', 1º lote guardado, trechos intactos", async () => {
    const db = banco!.db;
    const doc = await docComTrechos(db, 100);
    let chamadas = 0;
    const embed: EmbedRag = async (textos) => {
      if (++chamadas === 2) throw new Error("embed_http_429");
      return textos.map(() => vec(1));
    };
    await expect(indexarDocumento({ db, embed }, doc.id)).rejects.toThrow("embed_http_429");
    const d = await buscarPorId(db, doc.id);
    expect(d?.status).toBe("indexando");
    expect(d?.comVetor).toBe(64);
    expect(await contagem(db)).toEqual({ total: 100, com_vetor: 64 });
  });

  it.skipIf(!banco)("reexecutar depois da falha só manda os que faltam (36 textos)", async () => {
    const db = banco!.db;
    const doc = await docComTrechos(db, 100);
    let chamadas = 0;
    const falho: EmbedRag = async (textos) => {
      if (++chamadas === 2) throw new Error("embed_http_429");
      return textos.map(() => vec(1));
    };
    await expect(indexarDocumento({ db, embed: falho }, doc.id)).rejects.toThrow();
    const embed = vi.fn<EmbedRag>(async (textos) => textos.map(() => vec(1)));
    const r = await indexarDocumento({ db, embed }, doc.id);
    expect(embed).toHaveBeenCalledTimes(1);
    expect(embed.mock.calls[0][0]).toHaveLength(36);
    expect(embed.mock.calls[0][1]).toBe("documento");
    expect(r).toEqual({ vetorizados: 36, pronto: true });
  });

  it.skipIf(!banco)("embed devolvendo número errado de vetores falha (sem laço infinito)", async () => {
    const db = banco!.db;
    const doc = await docComTrechos(db, 3);
    await expect(indexarDocumento({ db, embed: async () => [] }, doc.id)).rejects.toThrow(/vetores/);
  });
});

describe("filaRagLigada", () => {
  it("exige RAG_QUEUE=1 e REDIS_URL", () => {
    expect(RAG_QUEUE).toBe("rag-index");
    expect(filaRagLigada({ RAG_QUEUE: "1" })).toBe(false);
    expect(filaRagLigada({ REDIS_URL: "redis://x" })).toBe(false);
    expect(filaRagLigada({ RAG_QUEUE: "1", REDIS_URL: "redis://x" })).toBe(true);
  });
});

describe("enfileirarNaFila", () => {
  const OPTS = { jobId: "rag_d1", attempts: 5, backoff: { type: "exponential", delay: 30_000 } };
  const fila = (estado: string | null) => {
    const remove = vi.fn(async () => undefined);
    const add = vi.fn(async () => undefined);
    const q: FilaRag = { getJob: vi.fn(async () => (estado ? { getState: async () => estado, remove } : null)), add };
    return { q, add, remove };
  };

  it("sem job existente => add com as opções do brief", async () => {
    const { q, add, remove } = fila(null);
    expect(await enfileirarNaFila(q, "d1")).toBe("fila");
    expect(remove).not.toHaveBeenCalled();
    expect(add).toHaveBeenCalledWith("indexar", { documentoId: "d1" }, OPTS);
  });

  it.each(["failed", "completed"])("job %s retido => removido e depois adicionado", async (estado) => {
    const { q, add, remove } = fila(estado);
    expect(await enfileirarNaFila(q, "d1")).toBe("fila");
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove.mock.invocationCallOrder[0]).toBeLessThan(add.mock.invocationCallOrder[0]);
    expect(add).toHaveBeenCalledWith("indexar", { documentoId: "d1" }, OPTS);
  });

  it.each(["waiting", "active", "delayed"])("job %s => não adiciona de novo", async (estado) => {
    const { q, add, remove } = fila(estado);
    expect(await enfileirarNaFila(q, "d1")).toBe("fila");
    expect(add).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });
});

describe("indexarInline (sem fila)", () => {
  it.skipIf(!banco)("embed falha => documento vira 'erro' com indexacao_falhou (não fica 'indexando')", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const db = banco!.db;
    const doc = await docComTrechos(db, 3);
    await indexarInline({ db, embed: async () => { throw new Error("embed_http_500"); } }, doc.id);
    const d = await buscarPorId(db, doc.id);
    expect(d?.status).toBe("erro");
    expect(d?.erro).toBe("indexacao_falhou");
  });

  it.skipIf(!banco)("embed ok => documento 'pronto'", async () => {
    const db = banco!.db;
    const doc = await docComTrechos(db, 3);
    await indexarInline({ db, embed: embedOk }, doc.id);
    expect((await buscarPorId(db, doc.id))?.status).toBe("pronto");
  });
});

describe("deveMarcarFalhaFinal", () => {
  it("só quando as tentativas esgotaram", () => {
    expect(deveMarcarFalhaFinal({ attemptsMade: 5, opts: { attempts: 5 } })).toBe(true);
    expect(deveMarcarFalhaFinal({ attemptsMade: 6, opts: { attempts: 5 } })).toBe(true);
    expect(deveMarcarFalhaFinal({ attemptsMade: 2, opts: { attempts: 5 } })).toBe(false);
  });
  it("sem opts.attempts vale 1; sem job => false", () => {
    expect(deveMarcarFalhaFinal({ attemptsMade: 1 })).toBe(true);
    expect(deveMarcarFalhaFinal({ attemptsMade: 0 })).toBe(false);
    expect(deveMarcarFalhaFinal(undefined)).toBe(false);
  });
});
