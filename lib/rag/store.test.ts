import { afterAll, beforeEach, describe, it, expect } from "vitest";
import {
  acrescentarPermissao, apagarDocumento, buscarPorHash, contarBase, criarDocumento, gravarTrechos,
  listarDocumentos, marcarErro, registrarVetores, removerPermissao, trechosSemVetor,
} from "./store";
import { bancoDeTeste } from "./pgTeste";
import type { RagDb } from "./pg";
import { podeVer } from "./permissao";
import type { TrechoCortado } from "./corte";

// Postgres real (pgvector). Sem RAG_PG_TEST_URL os testes são pulados; no CI a env existe (service container).
const banco = await bancoDeTeste();
afterAll(async () => { await banco?.fechar(); });
beforeEach(async () => { await banco?.limpar(); });

const USER = "64b000000000000000000001";
const trecho = (ordem: number): TrechoCortado => ({ ordem, texto: `texto ${ordem}`, caminho: "Livro › Cap 1", paginaIni: ordem, paginaFim: ordem });
const base = (hash: string, permissao: { turmaId?: string; donoId?: string }) => ({
  hash, titulo: "Livro", nomeArquivo: "livro.pdf", paginas: 10, markdown: "# Livro", origem: "admin", criadoPor: USER, permissao,
});
/** Vetor de 1024 dimensões (o tamanho da coluna). */
const vec = (x: number) => Array.from({ length: 1024 }, () => x);

type LinhaTrecho = { id: string; ordem: number; turma_ids: string[]; dono_ids: string[]; tem_vetor: boolean };
async function trechosDe(db: RagDb, documentoId: string): Promise<LinhaTrecho[]> {
  const r = await db.query<LinhaTrecho>(
    "SELECT id, ordem, turma_ids, dono_ids, embedding IS NOT NULL AS tem_vetor FROM rag_trechos WHERE documento_id = $1 ORDER BY ordem",
    [documentoId],
  );
  return r.rows;
}
const nomes = (xs: string[]) => [...xs].sort();

async function docComTrechos(db: RagDb, hash: string, permissao: { turmaId?: string; donoId?: string }, n = 3) {
  const doc = await criarDocumento(db, base(hash, permissao));
  await gravarTrechos(db, doc.id, Array.from({ length: n }, (_, i) => trecho(i)), { turmaIds: doc.turmaIds, donoIds: doc.donoIds });
  return doc;
}

describe("store — criar e buscar", () => {
  it.skipIf(!banco)("criarDocumento nasce 'indexando' com a permissão; buscarPorHash acha (ou null)", async () => {
    const db = banco!.db;
    const doc = await criarDocumento(db, base("h1", { turmaId: "t1" }));
    expect(doc.status).toBe("indexando");
    expect(doc.turmaIds).toEqual(["t1"]);
    expect(doc.donoIds).toEqual([]);
    expect(doc.nomeArquivo).toBe("livro.pdf");
    expect(doc.criadoPor).toBe(USER);
    expect(doc.totalTrechos).toBe(0);
    expect(doc.createdAt).toBeInstanceOf(Date);
    const achado = await buscarPorHash(db, "h1");
    expect(achado?.id).toBe(doc.id);
    expect(achado?.markdown).toBe("# Livro");
    expect(await buscarPorHash(db, "nao-existe")).toBeNull();
  });

  it.skipIf(!banco)("hash duplicado => violação 23505 (o ingerir trata como corrida)", async () => {
    const db = banco!.db;
    await criarDocumento(db, base("h1", { turmaId: "t1" }));
    await expect(criarDocumento(db, base("h1", { turmaId: "t2" }))).rejects.toMatchObject({ code: "23505" });
  });

  it.skipIf(!banco)("gravarTrechos copia a permissão do documento, devolve a contagem e grava totalTrechos", async () => {
    const db = banco!.db;
    const doc = await criarDocumento(db, base("h1", { donoId: "u1" }));
    const n = await gravarTrechos(db, doc.id, [trecho(0), trecho(1)], { turmaIds: [], donoIds: ["u1"] });
    expect(n).toBe(2);
    expect((await buscarPorHash(db, "h1"))?.totalTrechos).toBe(2);
    const ts = await trechosDe(db, doc.id);
    expect(ts).toHaveLength(2);
    expect(ts.every((t) => t.dono_ids[0] === "u1")).toBe(true);
    const campos = await db.query("SELECT texto, caminho, pagina_ini, pagina_fim FROM rag_trechos WHERE documento_id = $1 AND ordem = 1", [doc.id]);
    expect(campos.rows[0]).toEqual({ texto: "texto 1", caminho: "Livro › Cap 1", pagina_ini: 1, pagina_fim: 1 });
  });

  it.skipIf(!banco)("gravarTrechos sem trechos grava totalTrechos 0 e não lança; documento inexistente lança", async () => {
    const db = banco!.db;
    const doc = await criarDocumento(db, base("h1", { donoId: "u1" }));
    expect(await gravarTrechos(db, doc.id, [], { turmaIds: [], donoIds: ["u1"] })).toBe(0);
    await expect(gravarTrechos(db, "00000000-0000-4000-8000-000000000000", [trecho(0)], { turmaIds: [], donoIds: [] })).rejects.toThrow(/não existe/);
  });
});

describe("store — gravarTrechos × permissão concorrente", () => {
  it.skipIf(!banco)("acrescentarPermissao(t2) ANTES de gravarTrechos(perm com só t1) => todos os trechos ficam com t1 e t2", async () => {
    const db = banco!.db;
    const doc = await criarDocumento(db, base("h1", { turmaId: "t1" }));
    await acrescentarPermissao(db, doc.id, { turmaId: "t2" }); // ainda não há trechos
    await gravarTrechos(db, doc.id, [trecho(0), trecho(1)], { turmaIds: ["t1"], donoIds: [] }); // snapshot velho
    const ts = await trechosDe(db, doc.id);
    expect(ts).toHaveLength(2);
    for (const t of ts) {
      expect(nomes(t.turma_ids)).toEqual(["t1", "t2"]);
      expect(podeVer({ turmaIds: t.turma_ids, donoIds: t.dono_ids }, { userId: "x", turmaIds: ["t2"] })).toBe(true);
    }
  });

  it.skipIf(!banco)("trechos nascem sem vetor (embedding IS NULL)", async () => {
    const db = banco!.db;
    const doc = await docComTrechos(db, "h1", { donoId: "u1" }, 2);
    expect((await trechosDe(db, doc.id)).every((t) => !t.tem_vetor)).toBe(true);
  });
});

describe("store — permissões", () => {
  it.skipIf(!banco)("acrescentarPermissao 2× com a mesma turma: sem duplicata no documento e em todos os trechos", async () => {
    const db = banco!.db;
    const doc = await docComTrechos(db, "h1", { turmaId: "t1" });
    await acrescentarPermissao(db, doc.id, { turmaId: "t2" });
    await acrescentarPermissao(db, doc.id, { turmaId: "t2" });
    await acrescentarPermissao(db, doc.id, { donoId: "u9" });
    const d = await buscarPorHash(db, "h1");
    expect(d?.turmaIds).toEqual(["t1", "t2"]);
    expect(d?.donoIds).toEqual(["u9"]);
    const ts = await trechosDe(db, doc.id);
    expect(ts).toHaveLength(3);
    for (const t of ts) {
      expect(t.turma_ids).toEqual(["t1", "t2"]);
      expect(t.dono_ids).toEqual(["u9"]);
    }
  });

  it.skipIf(!banco)("acrescentarPermissao em documento inexistente lança 'documento <id> não existe'", async () => {
    const id = "00000000-0000-4000-8000-000000000000";
    await expect(acrescentarPermissao(banco!.db, id, { turmaId: "t1" })).rejects.toThrow(`documento ${id} não existe`);
    await expect(removerPermissao(banco!.db, id, { turmaId: "t1" })).rejects.toThrow(`documento ${id} não existe`);
  });

  it.skipIf(!banco)("doc em t1 e t2; removerPermissao(t1) => 'removida'; trechos seguem visíveis a t2 e não a quem só tem t1", async () => {
    const db = banco!.db;
    const doc = await docComTrechos(db, "h1", { turmaId: "t1" });
    await acrescentarPermissao(db, doc.id, { turmaId: "t2" });
    expect(await removerPermissao(db, doc.id, { turmaId: "t1" })).toBe("removida");
    const ts = await trechosDe(db, doc.id);
    expect(ts).toHaveLength(3);
    for (const t of ts) {
      const alvo = { turmaIds: t.turma_ids, donoIds: t.dono_ids };
      expect(podeVer(alvo, { userId: "x", turmaIds: ["t2"] })).toBe(true);
      expect(podeVer(alvo, { userId: "x", turmaIds: ["t1"] })).toBe(false);
    }
    expect((await buscarPorHash(db, "h1"))?.turmaIds).toEqual(["t2"]);
  });

  it.skipIf(!banco)("removendo a última permissão => 'documento_apagado' e os trechos somem", async () => {
    const db = banco!.db;
    const doc = await docComTrechos(db, "h1", { turmaId: "t1" });
    expect(await removerPermissao(db, doc.id, { turmaId: "t1" })).toBe("documento_apagado");
    expect(await trechosDe(db, doc.id)).toEqual([]);
    expect(await buscarPorHash(db, "h1")).toBeNull();
  });

  it.skipIf(!banco)("remover uma turma de um doc que também tem dono não apaga nada", async () => {
    const db = banco!.db;
    const doc = await docComTrechos(db, "h1", { turmaId: "t1" });
    await acrescentarPermissao(db, doc.id, { donoId: "u1" });
    expect(await removerPermissao(db, doc.id, { turmaId: "t1" })).toBe("removida");
    expect((await buscarPorHash(db, "h1"))?.donoIds).toEqual(["u1"]);
    expect((await trechosDe(db, doc.id)).every((t) => t.turma_ids.length === 0 && t.dono_ids[0] === "u1")).toBe(true);
  });

  it.skipIf(!banco)("id vazio em acrescentar/removerPermissao (e na criação) lança", async () => {
    const db = banco!.db;
    const doc = await docComTrechos(db, "h1", { turmaId: "t1" });
    await expect(acrescentarPermissao(db, doc.id, { turmaId: "" })).rejects.toThrow();
    await expect(acrescentarPermissao(db, doc.id, { donoId: "" })).rejects.toThrow();
    await expect(removerPermissao(db, doc.id, { turmaId: "" })).rejects.toThrow();
    await expect(removerPermissao(db, doc.id, { donoId: "" })).rejects.toThrow();
    await expect(criarDocumento(db, base("h2", { turmaId: "" }))).rejects.toThrow();
    expect((await buscarPorHash(db, "h1"))?.turmaIds).toEqual(["t1"]); // nada mudou
  });

  it.skipIf(!banco)("apagarDocumento apaga o documento e todos os trechos (e só os dele)", async () => {
    const db = banco!.db;
    const a = await docComTrechos(db, "ha", { turmaId: "t1" });
    const b = await docComTrechos(db, "hb", { turmaId: "t1" });
    await apagarDocumento(db, a.id);
    expect(await buscarPorHash(db, "ha")).toBeNull();
    expect(await trechosDe(db, a.id)).toEqual([]);
    expect(await trechosDe(db, b.id)).toHaveLength(3);
  });
});

describe("store — permissões concorrentes (atômicas)", () => {
  it.skipIf(!banco)("2 removerPermissao concorrentes em turmas diferentes do mesmo doc => nenhuma das duas fica nos trechos", async () => {
    const db = banco!.db;
    // Repete: a corrida precisa acontecer de verdade pelo menos algumas vezes.
    for (let rodada = 0; rodada < 15; rodada++) {
      await db.query("TRUNCATE rag_trechos, rag_documentos");
      const doc = await docComTrechos(db, `h-${rodada}`, { turmaId: "t1" }, 5);
      await acrescentarPermissao(db, doc.id, { turmaId: "t2" });
      await acrescentarPermissao(db, doc.id, { turmaId: "t3" });

      const rs = await Promise.all([
        removerPermissao(db, doc.id, { turmaId: "t1" }),
        removerPermissao(db, doc.id, { turmaId: "t2" }),
      ]);
      expect(rs).toEqual(["removida", "removida"]);
      expect((await buscarPorHash(db, `h-${rodada}`))?.turmaIds).toEqual(["t3"]);
      for (const t of await trechosDe(db, doc.id)) expect(t.turma_ids).toEqual(["t3"]);
    }
  });

  it.skipIf(!banco)("2 removerPermissao concorrentes das ÚLTIMAS turmas => exatamente uma apaga o documento e nada sobra", async () => {
    const db = banco!.db;
    const doc = await docComTrechos(db, "h1", { turmaId: "t1" });
    await acrescentarPermissao(db, doc.id, { turmaId: "t2" });
    const rs = await Promise.all([
      removerPermissao(db, doc.id, { turmaId: "t1" }),
      removerPermissao(db, doc.id, { turmaId: "t2" }),
    ]);
    expect(rs.sort()).toEqual(["documento_apagado", "removida"]);
    expect(await buscarPorHash(db, "h1")).toBeNull();
    expect(await trechosDe(db, doc.id)).toEqual([]);
  });

  it.skipIf(!banco)("acrescentar + remover concorrentes => estado final coerente entre documento e trechos", async () => {
    const db = banco!.db;
    for (let rodada = 0; rodada < 15; rodada++) {
      await db.query("TRUNCATE rag_trechos, rag_documentos");
      const doc = await docComTrechos(db, `h-${rodada}`, { turmaId: "t1" }, 5);
      await acrescentarPermissao(db, doc.id, { turmaId: "t2" });

      await Promise.all([
        acrescentarPermissao(db, doc.id, { turmaId: "t3" }),
        removerPermissao(db, doc.id, { turmaId: "t1" }),
        acrescentarPermissao(db, doc.id, { donoId: "u1" }),
      ]);
      const d = await buscarPorHash(db, `h-${rodada}`);
      expect(nomes(d!.turmaIds)).toEqual(["t2", "t3"]);
      expect(d!.donoIds).toEqual(["u1"]);
      for (const t of await trechosDe(db, doc.id)) {
        expect(nomes(t.turma_ids)).toEqual(["t2", "t3"]);
        expect(t.dono_ids).toEqual(["u1"]);
      }
    }
  });

  it.skipIf(!banco)("acrescentar a MESMA turma 2× em paralelo => sem duplicata", async () => {
    const db = banco!.db;
    const doc = await docComTrechos(db, "h1", { turmaId: "t1" });
    await Promise.all([acrescentarPermissao(db, doc.id, { turmaId: "t2" }), acrescentarPermissao(db, doc.id, { turmaId: "t2" })]);
    expect((await buscarPorHash(db, "h1"))?.turmaIds).toEqual(["t1", "t2"]);
    for (const t of await trechosDe(db, doc.id)) expect(t.turma_ids).toEqual(["t1", "t2"]);
  });
});

describe("store — vetores e status", () => {
  it.skipIf(!banco)("registrarVetores cobrindo todos => 'pronto'; cobrindo metade => continua 'indexando'", async () => {
    const db = banco!.db;
    const doc = await docComTrechos(db, "h1", { turmaId: "t1" }, 4);
    const ts = await trechosDe(db, doc.id);

    await registrarVetores(db, doc.id, ts.slice(0, 2).map((t) => ({ trechoId: t.id, embedding: vec(0.1) })));
    let d = await buscarPorHash(db, "h1");
    expect(d?.comVetor).toBe(2);
    expect(d?.status).toBe("indexando");

    await registrarVetores(db, doc.id, ts.slice(2).map((t) => ({ trechoId: t.id, embedding: vec(0.3) })));
    d = await buscarPorHash(db, "h1");
    expect(d?.comVetor).toBe(4);
    expect(d?.status).toBe("pronto");
    expect((await trechosDe(db, doc.id)).every((t) => t.tem_vetor)).toBe(true);
  });

  it.skipIf(!banco)("registrarVetores grava o vetor de verdade (pgvector, cosine)", async () => {
    const db = banco!.db;
    const doc = await docComTrechos(db, "h1", { turmaId: "t1" }, 1);
    const [t] = await trechosDe(db, doc.id);
    await registrarVetores(db, doc.id, [{ trechoId: t.id, embedding: vec(0.5) }]);
    const r = await db.query<{ dist: number }>("SELECT embedding <=> $1::vector AS dist FROM rag_trechos WHERE id = $2", [`[${vec(0.5).join(",")}]`, t.id]);
    expect(Number(r.rows[0].dist)).toBeCloseTo(0, 5);
  });

  it.skipIf(!banco)("documento sem trechos nunca vira 'pronto'", async () => {
    const db = banco!.db;
    const doc = await criarDocumento(db, base("h1", { turmaId: "t1" }));
    await registrarVetores(db, doc.id, []);
    expect((await buscarPorHash(db, "h1"))?.status).toBe("indexando");
  });

  it.skipIf(!banco)("registrarVetores não ressuscita documento em 'erro'", async () => {
    const db = banco!.db;
    const doc = await docComTrechos(db, "h1", { turmaId: "t1" }, 1);
    await marcarErro(db, doc.id, "x");
    const [t] = await trechosDe(db, doc.id);
    await registrarVetores(db, doc.id, [{ trechoId: t.id, embedding: vec(1) }]);
    expect((await buscarPorHash(db, "h1"))?.status).toBe("erro");
  });

  it.skipIf(!banco)("trechosSemVetor devolve só os pendentes, em ordem, respeitando o limite", async () => {
    const db = banco!.db;
    const doc = await docComTrechos(db, "h1", { turmaId: "t1" }, 4);
    const ts = await trechosDe(db, doc.id);
    await registrarVetores(db, doc.id, [{ trechoId: ts[0].id, embedding: vec(1) }]);
    const pend = await trechosSemVetor(db, doc.id, 2);
    expect(pend.map((p) => p.texto)).toEqual(["texto 1", "texto 2"]);
    expect(Object.keys(pend[0]).sort()).toEqual(["id", "texto"]);
  });

  it.skipIf(!banco)("marcarErro grava status 'erro' e a mensagem (cortada em 500)", async () => {
    const db = banco!.db;
    const doc = await docComTrechos(db, "h1", { turmaId: "t1" });
    await marcarErro(db, doc.id, "embedder caiu");
    const d = await buscarPorHash(db, "h1");
    expect(d?.status).toBe("erro");
    expect(d?.erro).toBe("embedder caiu");
    await marcarErro(db, doc.id, "x".repeat(900));
    expect((await buscarPorHash(db, "h1"))?.erro).toHaveLength(500);
  });
});

describe("store — listar e contar", () => {
  it.skipIf(!banco)("listarDocumentos filtra por turma/dono e não devolve o markdown", async () => {
    const db = banco!.db;
    await docComTrechos(db, "h1", { turmaId: "t1" });
    await docComTrechos(db, "h2", { turmaId: "t2" });
    await docComTrechos(db, "h3", { donoId: "u1" });
    const t1 = await listarDocumentos(db, { turmaId: "t1" });
    expect(t1.map((d) => d.hash)).toEqual(["h1"]);
    expect("markdown" in t1[0]).toBe(false);
    expect(t1[0].nomeArquivo).toBe("livro.pdf");
    expect((await listarDocumentos(db, { donoId: "u1" })).map((d) => d.hash)).toEqual(["h3"]);
    expect(nomes((await listarDocumentos(db, { turmaId: "t2", donoId: "u1" })).map((d) => d.hash))).toEqual(["h2", "h3"]); // união
    expect(await listarDocumentos(db, {})).toHaveLength(3);
  });

  it.skipIf(!banco)("contarBase conta separado pessoais e de turma (e ignora documentos em erro)", async () => {
    const db = banco!.db;
    await docComTrechos(db, "h1", { turmaId: "t1" });
    await docComTrechos(db, "h2", { turmaId: "t1" });
    await docComTrechos(db, "h3", { turmaId: "t9" });
    await docComTrechos(db, "h4", { donoId: "u1" });
    await docComTrechos(db, "h5", { donoId: "u2" });
    expect(await contarBase(db, { userId: "u1", turmaIds: ["t1"] })).toEqual({ pessoais: 1, deTurma: 2 });
    expect(await contarBase(db, { userId: "u1", turmaIds: [] })).toEqual({ pessoais: 1, deTurma: 0 });
    const ruim = await buscarPorHash(db, "h2");
    await marcarErro(db, ruim!.id, "x");
    expect(await contarBase(db, { userId: "u1", turmaIds: ["t1"] })).toEqual({ pessoais: 1, deTurma: 1 });
  });
});
