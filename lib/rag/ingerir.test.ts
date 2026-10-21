import { afterAll, beforeEach, describe, it, expect, vi } from "vitest";
import type { Block } from "@/lib/scholar/types";
import { bancoDeTeste } from "./pgTeste";
import type { RagDb } from "./pg";
import { ingerirPdf, MAX_BYTES, type IngerirDeps } from "./ingerir";
import { buscarPorHash, criarDocumento } from "./store";

// Postgres real (pgvector). Sem RAG_PG_TEST_URL os testes são pulados; no CI a env existe (service container).
const banco = await bancoDeTeste();
afterAll(async () => { await banco?.fechar(); });
beforeEach(async () => { await banco?.limpar(); });

type Doc = { id: string; hash: string; titulo: string; markdown: string; status: string; erro: string | null; turma_ids: string[]; dono_ids: string[] };
type Trecho = { turma_ids: string[]; dono_ids: string[] };
/** Lê o estado cru do banco (o que o teste antes espiava no fake em memória). */
async function estado(db: RagDb) {
  const documentos = (await db.query<Doc>("SELECT id, hash, titulo, markdown, status, erro, turma_ids, dono_ids FROM rag_documentos ORDER BY created_at")).rows;
  const trechos = (await db.query<Trecho>("SELECT turma_ids, dono_ids FROM rag_trechos")).rows;
  return { documentos, trechos };
}

const blocos: Block[] = [
  { type: "heading", level: 1, page: 1, text: "Cap 1" },
  { type: "paragraph", page: 1, text: "texto do capítulo um" },
  { type: "heading", level: 1, page: 3, text: "Cap 2" },
  { type: "paragraph", page: 3, text: "texto do capítulo dois" },
];
const pdf = (s = "pdf-a") => new TextEncoder().encode(s);

function setup(extrairRet: any = { paragraphs: [], blocks: blocos, markdown: "# Cap 1\n\ntexto" }) {
  const db = banco!.db;
  const extrair = vi.fn(async () => extrairRet);
  const enfileirar = vi.fn(async (_id: string) => "fila" as const);
  const deps: IngerirDeps = { db, extrair: extrair as any, enfileirar };
  return { db, extrair, enfileirar, deps };
}
const entrada = (turmaId: string, bytes = pdf(), extra: object = {}) => ({
  bytes, nomeArquivo: "Apostila.pdf", origem: "admin" as const, criadoPor: "u1", permissao: { turmaId }, ...extra,
});

describe("ingerirPdf", () => {
  it.skipIf(!banco)("PDF novo => novo, trechos > 0, enfileira 1x com o id", async () => {
    const { deps, enfileirar, db } = setup();
    const r = await ingerirPdf(deps, entrada("t1"));
    expect(r.status).toBe("novo");
    expect(r.trechos).toBeGreaterThan(0);
    expect(r.paginas).toBe(3);
    expect(enfileirar).toHaveBeenCalledTimes(1);
    expect(enfileirar).toHaveBeenCalledWith(r.documentoId);
    const { documentos, trechos } = await estado(db);
    expect(documentos[0].titulo).toBe("Apostila");
    expect(documentos[0].markdown).toBe("# Cap 1\n\ntexto");
    expect(trechos.length).toBe(r.trechos);
  });

  it.skipIf(!banco)("título explícito vence o nome do arquivo", async () => {
    const { deps, db } = setup();
    await ingerirPdf(deps, entrada("t1", pdf(), { titulo: "Meu título" }));
    const { documentos } = await estado(db);
    expect(documentos[0].titulo).toBe("Meu título");
  });

  it.skipIf(!banco)("mesmos bytes, outra turma => reaproveitado, sem reextrair/enfileirar, trechos com as duas turmas", async () => {
    const { deps, extrair, enfileirar, db } = setup();
    const a = await ingerirPdf(deps, entrada("t1"));
    const b = await ingerirPdf(deps, entrada("t2"));
    expect(b.status).toBe("reaproveitado");
    expect(b.documentoId).toBe(a.documentoId);
    expect(extrair).toHaveBeenCalledTimes(1);
    // documento ainda "indexando" (nada indexou ainda): reaproveitar re-agenda — idempotente, mesmo id
    expect(enfileirar).toHaveBeenCalledTimes(2);
    expect(enfileirar).toHaveBeenLastCalledWith(a.documentoId);
    const { documentos, trechos } = await estado(db);
    expect(documentos).toHaveLength(1);
    expect(documentos[0].turma_ids.sort()).toEqual(["t1", "t2"]);
    for (const t of trechos) expect([...t.turma_ids].sort()).toEqual(["t1", "t2"]);
    expect(b.trechos).toBe(a.trechos);
  });

  it.skipIf(!banco)("extrair devolve vazio => erro sem_texto, 0 trechos, não enfileira", async () => {
    const { deps, enfileirar, db } = setup({ paragraphs: [], blocks: [] });
    const r = await ingerirPdf(deps, entrada("t1"));
    expect(r.status).toBe("erro");
    expect(r.erro).toBe("sem_texto");
    expect(r.trechos).toBe(0);
    expect(enfileirar).not.toHaveBeenCalled();
    const { documentos, trechos } = await estado(db);
    expect(trechos).toHaveLength(0);
    expect(documentos[0].status).toBe("erro");
    expect(documentos[0].erro).toBe("sem_texto");
  });

  it.skipIf(!banco)("extrair devolve null (pdf-loader fora/timeout/sem URL) => leitura_falhou, não sem_texto", async () => {
    const { deps, db } = setup(null);
    const r = await ingerirPdf(deps, entrada("t1"));
    expect(r).toMatchObject({ status: "erro", erro: "leitura_falhou", trechos: 0 });
    const { documentos } = await estado(db);
    expect(documentos[0].erro).toBe("leitura_falhou");
  });

  it.skipIf(!banco)("extrair devolve resultado sem blocos => sem_texto (PDF escaneado)", async () => {
    const { deps, db } = setup({ paragraphs: [], blocks: [], markdown: "" });
    const r = await ingerirPdf(deps, entrada("t1"));
    expect(r).toMatchObject({ status: "erro", erro: "sem_texto", trechos: 0 });
    const { documentos } = await estado(db);
    expect(documentos[0].erro).toBe("sem_texto");
  });

  it.skipIf(!banco)("extrair lança => leitura_falhou (documento marcado erro, não enfileira)", async () => {
    const { deps, enfileirar, db } = setup();
    (deps as any).extrair = vi.fn(async () => { throw new Error("boom"); });
    const r = await ingerirPdf(deps, entrada("t1"));
    expect(r).toMatchObject({ status: "erro", erro: "leitura_falhou", trechos: 0 });
    expect(enfileirar).not.toHaveBeenCalled();
    const { documentos } = await estado(db);
    expect(documentos[0].status).toBe("erro");
  });

  it.skipIf(!banco)("26 MB => grande_demais, db intocado, não extrai", async () => {
    const { deps, extrair, enfileirar, db } = setup();
    const r = await ingerirPdf(deps, entrada("t1", new Uint8Array(MAX_BYTES + 1)));
    expect(r).toMatchObject({ status: "erro", erro: "grande_demais", trechos: 0 });
    expect(extrair).not.toHaveBeenCalled();
    expect(enfileirar).not.toHaveBeenCalled();
    const { documentos, trechos } = await estado(db);
    expect(documentos).toHaveLength(0);
    expect(trechos).toHaveLength(0);
  });

  it.skipIf(!banco)("documento existente em status erro com o mesmo hash => apaga e reprocessa como novo", async () => {
    const { deps, extrair, enfileirar, db } = setup();
    const ruim = await ingerirPdf({ ...deps, extrair: (async () => null) as any }, entrada("t1"));
    expect(ruim.status).toBe("erro");
    const r = await ingerirPdf(deps, entrada("t1"));
    expect(r.status).toBe("novo");
    expect(extrair).toHaveBeenCalledTimes(1);
    expect(enfileirar).toHaveBeenCalledTimes(1);
    const { documentos } = await estado(db);
    expect(documentos).toHaveLength(1);
    expect(documentos.find((d) => d.id === ruim.documentoId)).toBeUndefined();
    expect(documentos[0].status).toBe("indexando");
  });

  it.skipIf(!banco)("reaproveitar documento 'indexando' => reenfileira o id e acrescenta a permissão", async () => {
    const { deps, enfileirar, db } = setup();
    const a = await ingerirPdf(deps, entrada("t1"));
    enfileirar.mockClear();
    expect((await estado(db)).documentos[0].status).toBe("indexando");
    const b = await ingerirPdf(deps, entrada("t2"));
    expect(b.status).toBe("reaproveitado");
    expect(enfileirar).toHaveBeenCalledTimes(1);
    expect(enfileirar).toHaveBeenCalledWith(a.documentoId);
    expect((await estado(db)).documentos[0].turma_ids.sort()).toEqual(["t1", "t2"]);
  });

  it.skipIf(!banco)("reaproveitar documento 'pronto' => NÃO reenfileira", async () => {
    const { deps, enfileirar, db } = setup();
    await ingerirPdf(deps, entrada("t1"));
    await db.query("UPDATE rag_documentos SET status = 'pronto'");
    enfileirar.mockClear();
    const b = await ingerirPdf(deps, entrada("t2"));
    expect(b.status).toBe("reaproveitado");
    expect(enfileirar).not.toHaveBeenCalled();
  });

  it.skipIf(!banco)("re-upload sobre 'erro' herda turmas e donos do documento apagado, além do uploader", async () => {
    const { deps, db } = setup();
    const ruim = await ingerirPdf({ ...deps, extrair: (async () => null) as any }, entrada("t1"));
    // outra turma e um dono tinham o mesmo arquivo por dedupe
    const { acrescentarPermissao } = await import("./store");
    await acrescentarPermissao(db, ruim.documentoId, { turmaId: "t2" });
    await acrescentarPermissao(db, ruim.documentoId, { donoId: "u7" });
    const r = await ingerirPdf(deps, entrada("t3"));
    expect(r.status).toBe("novo");
    const { documentos, trechos } = await estado(db);
    expect(documentos).toHaveLength(1);
    expect([...documentos[0].turma_ids].sort()).toEqual(["t1", "t2", "t3"]);
    expect(documentos[0].dono_ids).toEqual(["u7"]);
    expect(trechos.length).toBeGreaterThan(0);
    for (const t of trechos) {
      expect([...t.turma_ids].sort()).toEqual(["t1", "t2", "t3"]);
      expect(t.dono_ids).toEqual(["u7"]);
    }
  });

  it.skipIf(!banco)("corrida: criar bate no hash único (23505) => reaproveita o documento do vencedor", async () => {
    const { deps, db, enfileirar } = setup();
    // Espião herdando do Pool (instanceof Pool => `transacao` segue abrindo transação de verdade); só a query de
    // busca por hash é interceptada: a 1ª não vê nada (o concorrente ainda não tinha gravado); depois ele grava.
    const espiao = Object.create(db) as RagDb;
    let primeira = true;
    espiao.query = (async (sql: string, params?: unknown[]) => {
      if (primeira && /FROM rag_documentos WHERE hash = \$1/.test(sql)) {
        primeira = false;
        const { createHash } = await import("node:crypto");
        const hash = createHash("sha256").update(pdf()).digest("hex");
        await criarDocumento(db, { hash, titulo: "x", nomeArquivo: "x.pdf", paginas: 1, markdown: "", origem: "admin", criadoPor: "u9", permissao: { turmaId: "t9" } });
        return { rows: [], rowCount: 0 };
      }
      return db.query(sql, params);
    }) as RagDb["query"];
    const r = await ingerirPdf({ ...deps, db: espiao }, entrada("t1"));
    expect(r.status).toBe("reaproveitado");
    const { documentos } = await estado(db);
    expect(documentos).toHaveLength(1);
    expect(documentos[0].turma_ids.sort()).toEqual(["t1", "t9"]);
    expect(enfileirar).not.toHaveBeenCalled();
    expect(await buscarPorHash(db, documentos[0].hash)).not.toBeNull();
  });

  it.skipIf(!banco)("enfileirar rejeita => erro indexacao_falhou, documento em erro; re-upload reprocessa como novo", async () => {
    const { deps, extrair, db } = setup();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const falha = { ...deps, enfileirar: vi.fn(async () => { throw new Error("fila fora"); }) };
    const r = await ingerirPdf(falha, entrada("t1"));
    expect(r).toMatchObject({ status: "erro", erro: "indexacao_falhou", trechos: 0 });
    const { documentos } = await estado(db);
    expect(documentos[0].status).toBe("erro");
    expect(documentos[0].erro).toBe("indexacao_falhou");

    const r2 = await ingerirPdf(deps, entrada("t1"));
    expect(r2.status).toBe("novo");
    expect(extrair).toHaveBeenCalledTimes(2);
    const depois = (await estado(db)).documentos;
    expect(depois).toHaveLength(1);
    expect(depois[0].status).toBe("indexando");
    expect(depois.find((d) => d.id === r.documentoId)).toBeUndefined();
  });
});
