import { afterAll, beforeEach, describe, it, expect, vi } from "vitest";
import {
  baseParaTurno, relevantes, turmasDaPessoa, _zerarDisjuntor, CORTE_SIMILARIDADE_PADRAO, corteEfetivo, MAX_PERGUNTA,
  type PrismaTurmas, type TurnoRagDeps,
} from "./turno";
import type { BuscaDeps, TrechoAchado } from "./busca";
import { bancoDeTeste } from "./pgTeste";
import { criarDocumento, gravarTrechos, registrarVetores, contarBase } from "./store";
import type { RagDb } from "./pg";

// Postgres real (pgvector) + Prisma dublê em memória. Sem RAG_PG_TEST_URL os testes de banco são pulados.
const banco = await bancoDeTeste();
afterAll(async () => { await banco?.fechar(); });
beforeEach(async () => {
  _zerarDisjuntor();
  await banco?.limpar();
});

/** Vetor de 1024 dimensões, "one-hot": cosseno 1 com o mesmo `i`, 0 com os outros. */
const onehot = (i: number) => Array.from({ length: 1024 }, (_, j) => (j === i ? 1 : 0));

/** Prisma dublê: `membros` = aluno → turmas; `turmas` = turma → professor. */
function prismaDuble(membros: Record<string, string[]>, turmas: Record<string, string> = {}): PrismaTurmas & {
  membroMock: ReturnType<typeof vi.fn>; turmaMock: ReturnType<typeof vi.fn>;
} {
  const membroMock = vi.fn(async (a: { where: { studentId: string } }) =>
    (membros[a.where.studentId] ?? []).map((turmaId) => ({ turmaId })));
  const turmaMock = vi.fn(async (a: { where: { professorId: string } }) =>
    Object.entries(turmas).filter(([, prof]) => prof === a.where.professorId).map(([id]) => ({ id })));
  return { turmaMember: { findMany: membroMock }, turma: { findMany: turmaMock }, membroMock, turmaMock };
}

type DocBase = Parameters<typeof criarDocumento>[1];
const permTurma = (turmaId: string, hash: string): DocBase => ({
  hash, titulo: `Doc ${hash}`, nomeArquivo: "x.pdf", paginas: 9, markdown: "#", origem: "admin", criadoPor: "adm", permissao: { turmaId },
});
const permDono = (donoId: string, hash: string): DocBase => ({
  hash, titulo: `Pessoal ${hash}`, nomeArquivo: "x.pdf", paginas: 9, markdown: "#", origem: "chat", criadoPor: donoId, permissao: { donoId },
});

/** Cria documento + trechos (com vetor quando dado). */
async function semear(db: RagDb, doc: DocBase, trechos: { texto: string; vetor?: number[] }[]) {
  const d = await criarDocumento(db, doc);
  await gravarTrechos(
    db, d.id,
    trechos.map((t, i) => ({ ordem: i, texto: t.texto, caminho: "Cap", paginaIni: i + 1, paginaFim: i + 1 })),
    { turmaIds: d.turmaIds, donoIds: d.donoIds },
  );
  const r = await db.query<{ id: string }>("SELECT id FROM rag_trechos WHERE documento_id = $1 ORDER BY ordem", [d.id]);
  const itens = r.rows.flatMap((row, i) => (trechos[i].vetor ? [{ trechoId: row.id, embedding: trechos[i].vetor! }] : []));
  if (itens.length) await registrarVetores(db, d.id, itens);
  return d;
}

/** Deps da busca sobre um `db` (o `contar` real em cima do mesmo db). */
function buscaSobre(db: RagDb, vetor = onehot(0)): () => BuscaDeps {
  return () => ({ db, embed: async () => [vetor], contar: (e) => contarBase(db, e) });
}

function trecho(over: Partial<TrechoAchado>): TrechoAchado {
  return { trechoId: "t", documentoId: "d", titulo: "T", texto: "x", paginaIni: 1, paginaFim: 1, score: 0.1, similaridade: null, porTexto: false, ...over };
}

describe("turmasDaPessoa", () => {
  it("aluno em tA + professor de tP ⇒ [tA, tP] (sem duplicata, sem vazio)", async () => {
    const prisma = prismaDuble({ u1: ["tA", "tA", ""] }, { tP: "u1", tA: "u1", tX: "outro" });
    const r = await turmasDaPessoa(prisma, "u1");
    expect([...r].sort()).toEqual(["tA", "tP"]);
    expect(prisma.membroMock).toHaveBeenCalledWith({ where: { studentId: "u1" }, select: { turmaId: true } });
    expect(prisma.turmaMock).toHaveBeenCalledWith({ where: { professorId: "u1" }, select: { id: true } });
  });

  it("ninguém ⇒ []", async () => {
    expect(await turmasDaPessoa(prismaDuble({}), "u9")).toEqual([]);
  });
});

describe("relevantes (puro)", () => {
  it("fica o que casou por texto ou tem similaridade ≥ corte", () => {
    const r = relevantes([
      trecho({ trechoId: "a", similaridade: 0.7 }),
      trecho({ trechoId: "b", similaridade: 0.5 }),
      trecho({ trechoId: "c", similaridade: 0.1, porTexto: true }),
      trecho({ trechoId: "d", similaridade: null }),
      trecho({ trechoId: "e", similaridade: CORTE_SIMILARIDADE_PADRAO }),
    ], CORTE_SIMILARIDADE_PADRAO);
    expect(r.map((t) => t.trechoId)).toEqual(["a", "c", "e"]);
  });

  it("corte padrão é 0.62", () => {
    expect(CORTE_SIMILARIDADE_PADRAO).toBe(0.62);
  });
});

describe("corteEfetivo (RAG_CORTE_SIMILARIDADE)", () => {
  const com = (v: string | undefined, corte?: number) => {
    try {
      vi.stubEnv("RAG_CORTE_SIMILARIDADE", v);
      return corteEfetivo(corte);
    } finally {
      vi.unstubAllEnvs();
    }
  };

  it("número finito em [0, 1] vale — inclusive \"0\"", () => {
    expect(com("0")).toBe(0);
    expect(com("0.7")).toBe(0.7);
    expect(com("1")).toBe(1);
  });

  it("fora de [0, 1], não numérico, vazio ou ausente ⇒ padrão 0.62", () => {
    for (const v of ["62", "-1", "abc", "", "  ", "Infinity", undefined]) expect(com(v)).toBe(CORTE_SIMILARIDADE_PADRAO);
  });

  it("deps.corte ganha da env", () => {
    expect(com("0.7", 0.3)).toBe(0.3);
    expect(com("abc", 0)).toBe(0);
  });
});

describe("baseParaTurno — sem banco", () => {
  it("sem usuário ⇒ sem_usuario e não consulta", async () => {
    const prisma = prismaDuble({ u1: ["tA"] });
    const busca = vi.fn(buscaSobre({ query: vi.fn(async () => { throw new Error("não deveria consultar"); }) }));
    for (const userId of [null, "", "   "]) {
      expect(await baseParaTurno({ userId, pergunta: "mitocôndria" }, { prisma, busca })).toEqual({ status: "sem_usuario", trechos: [] });
    }
    expect(prisma.membroMock).not.toHaveBeenCalled();
    expect(prisma.turmaMock).not.toHaveBeenCalled();
    expect(busca).not.toHaveBeenCalled();
  });

  it("pergunta enorme é cortada em MAX_PERGUNTA (2000) antes da busca", async () => {
    expect(MAX_PERGUNTA).toBe(2000);
    const embed = vi.fn(async () => [onehot(0)]);
    const query = vi.fn(async () => ({ rows: [] }));
    const busca = () => ({ db: { query } as unknown as RagDb, embed, contar: async () => ({ pessoais: 1, deTurma: 0 }) });
    const r = await baseParaTurno({ userId: "u1", pergunta: "  " + "mitocôndria ".repeat(1700) }, { prisma: prismaDuble({}), busca });
    expect(r).toEqual({ status: "sem_trecho", trechos: [] });
    expect(embed).toHaveBeenCalledTimes(1);
    const enviada = (embed.mock.calls[0] as unknown as [string[]])[0][0];
    expect(enviada.length).toBeLessThanOrEqual(MAX_PERGUNTA);
    expect(enviada.startsWith("mitocôndria")).toBe(true);
    const sql = query.mock.calls.find((c) => Array.isArray((c as unknown[])[1])) as unknown as [string, unknown[]];
    expect(String(sql[1][0]).length).toBeLessThanOrEqual(MAX_PERGUNTA);
  });

  it("cada indisponivel é um objeto novo (ninguém muta o do vizinho)", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const deps: Partial<TurnoRagDeps> = { prisma: prismaDuble({}), busca: () => { throw new Error("RAG_PG_URL ausente"); }, agora: () => 5 };
    const a = await baseParaTurno({ userId: "u1", pergunta: "x" }, deps);
    const b = await baseParaTurno({ userId: "u1", pergunta: "x" }, deps); // disjuntor armado: outro caminho
    expect(a).toEqual({ status: "indisponivel", trechos: [] });
    expect(b).toEqual({ status: "indisponivel", trechos: [] });
    expect(a).not.toBe(b);
    expect(a.trechos).not.toBe(b.trechos);
    erro.mockRestore();
  });

  it("banco indisponível ⇒ indisponivel, loga, não lança; disjuntor pula a próxima por 60 s", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const query = vi.fn(async () => { throw Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" }); });
    const db: RagDb = { query };
    let t = 1_000_000;
    const deps: Partial<TurnoRagDeps> = { prisma: prismaDuble({ u1: ["tA"] }), busca: buscaSobre(db), agora: () => t };

    expect(await baseParaTurno({ userId: "u1", pergunta: "mitocôndria" }, deps)).toEqual({ status: "indisponivel", trechos: [] });
    expect(erro).toHaveBeenCalledTimes(1);
    expect(String(erro.mock.calls[0][0])).toContain("[rag/chat]");
    const consultas = query.mock.calls.length;
    expect(consultas).toBeGreaterThan(0);

    t += 10_000; // disjuntor armado: nem consulta
    expect(await baseParaTurno({ userId: "u1", pergunta: "mitocôndria" }, deps)).toEqual({ status: "indisponivel", trechos: [] });
    expect(query.mock.calls.length).toBe(consultas);

    t += 51_000; // 61 s depois: tenta de novo
    expect(await baseParaTurno({ userId: "u1", pergunta: "mitocôndria" }, deps)).toEqual({ status: "indisponivel", trechos: [] });
    expect(query.mock.calls.length).toBeGreaterThan(consultas);
    erro.mockRestore();
  });

  it("RAG_PG_URL ausente (busca() lança) conta como indisponível e arma o disjuntor", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const busca = vi.fn(() => { throw new Error("RAG_PG_URL ausente"); });
    const deps: Partial<TurnoRagDeps> = { prisma: prismaDuble({}), busca, agora: () => 5 };
    expect(await baseParaTurno({ userId: "u1", pergunta: "x" }, deps)).toEqual({ status: "indisponivel", trechos: [] });
    expect(await baseParaTurno({ userId: "u1", pergunta: "x" }, deps)).toEqual({ status: "indisponivel", trechos: [] });
    expect(busca).toHaveBeenCalledTimes(1);
    expect(erro).toHaveBeenCalledTimes(1);
    erro.mockRestore();
  });

  it("prazo total estourado ⇒ indisponivel em ~prazoMs, timer limpo, rejeição tardia engolida", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    let rejeitar: (e: unknown) => void = () => {};
    const db: RagDb = { query: () => new Promise((_res, rej) => { rejeitar = rej; }) };
    const clear = vi.spyOn(globalThis, "clearTimeout");
    const inicio = Date.now();
    const r = await baseParaTurno({ userId: "u1", pergunta: "mitocôndria" }, { prisma: prismaDuble({ u1: ["tA"] }), busca: buscaSobre(db), prazoMs: 50 });
    const gasto = Date.now() - inicio;
    expect(r).toEqual({ status: "indisponivel", trechos: [] });
    expect(gasto).toBeGreaterThanOrEqual(40);
    expect(gasto).toBeLessThan(1000);
    expect(clear).toHaveBeenCalled();
    expect(erro).toHaveBeenCalledTimes(1);
    expect(String(erro.mock.calls[0][0])).toContain("[rag/chat]");
    // a query pendurada rejeita depois do prazo: não pode virar unhandledRejection nem logar de novo
    const naoTratada = vi.fn();
    process.on("unhandledRejection", naoTratada);
    rejeitar(new Error("tarde demais"));
    await new Promise((res) => setTimeout(res, 20));
    process.off("unhandledRejection", naoTratada);
    expect(naoTratada).not.toHaveBeenCalled();
    expect(erro).toHaveBeenCalledTimes(1);
    clear.mockRestore();
    erro.mockRestore();
  });

  it("estouro do prazo também arma o disjuntor", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const query = vi.fn(() => new Promise<never>(() => {}));
    const deps: Partial<TurnoRagDeps> = { prisma: prismaDuble({}), busca: buscaSobre({ query }), prazoMs: 20, agora: () => 7 };
    await baseParaTurno({ userId: "u1", pergunta: "x" }, deps);
    const n = query.mock.calls.length;
    expect(await baseParaTurno({ userId: "u1", pergunta: "x" }, deps)).toEqual({ status: "indisponivel", trechos: [] });
    expect(query.mock.calls.length).toBe(n);
    erro.mockRestore();
  });

  it("erro de SQL que não é queda ⇒ indisponivel, loga, sem disjuntor", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const query = vi.fn(async () => { throw Object.assign(new Error("syntax error at or near"), { code: "42601" }); });
    const deps: Partial<TurnoRagDeps> = { prisma: prismaDuble({ u1: ["tA"] }), busca: buscaSobre({ query }), agora: () => 1 };
    expect(await baseParaTurno({ userId: "u1", pergunta: "x" }, deps)).toEqual({ status: "indisponivel", trechos: [] });
    expect(erro).toHaveBeenCalledTimes(1);
    expect(String(erro.mock.calls[0][0])).toContain("[rag/chat]");
    const n = query.mock.calls.length;
    expect(await baseParaTurno({ userId: "u1", pergunta: "x" }, deps)).toEqual({ status: "indisponivel", trechos: [] });
    expect(query.mock.calls.length).toBeGreaterThan(n); // consultou de novo
    // a mensagem é diferente da de banco fora do ar
    const msgSql = String(erro.mock.calls[0][0]);
    erro.mockClear();
    await baseParaTurno({ userId: "u1", pergunta: "x" }, { ...deps, busca: buscaSobre({ query: async () => { throw Object.assign(new Error("x"), { code: "ECONNREFUSED" }); } }) });
    expect(String(erro.mock.calls[0][0])).not.toBe(msgSql);
    erro.mockRestore();
  });
});

describe.skipIf(!banco)("baseParaTurno — Postgres real", () => {
  it("RF1 no turno: aluno da turma recebe o trecho; aluno de fora não", async () => {
    const db = banco!.db;
    await semear(db, permTurma("tA", "hA"), [{ texto: "mitocôndria produz energia", vetor: onehot(0) }]);
    const prisma = prismaDuble({ u1: ["tA"], u2: ["tB"] }, { tA: "prof1", tB: "prof2" });
    const deps = { prisma, busca: buscaSobre(db) };

    const de1 = await baseParaTurno({ userId: "u1", pergunta: "mitocôndria energia" }, deps);
    expect(de1.status).toBe("ok");
    expect(de1.trechos).toHaveLength(1);
    expect(de1.trechos[0].titulo).toBe("Doc hA");

    const de2 = await baseParaTurno({ userId: "u2", pergunta: "mitocôndria energia" }, deps);
    expect(de2).toEqual({ status: "sem_base", trechos: [] });

    // professor dono de tA também recebe; o de tB, não
    const prof = await baseParaTurno({ userId: "prof1", pergunta: "mitocôndria energia" }, deps);
    expect(prof.status).toBe("ok");
    expect(prof.trechos.map((t) => t.titulo)).toEqual(["Doc hA"]);
    expect((await baseParaTurno({ userId: "prof2", pergunta: "mitocôndria energia" }, deps)).status).toBe("sem_base");
  });

  it("pergunta sem relação: vizinhos abaixo do corte ⇒ sem_trecho", async () => {
    const db = banco!.db;
    await semear(db, permTurma("tA", "hA"), [{ texto: "mitocôndria produz energia", vetor: onehot(0) }]);
    const r = await baseParaTurno(
      { userId: "u1", pergunta: "campeonato futebol" },
      { prisma: prismaDuble({ u1: ["tA"] }), busca: buscaSobre(db, onehot(9)) },
    );
    expect(r).toEqual({ status: "sem_trecho", trechos: [] });
  });

  it("corte via deps.corte e via RAG_CORTE_SIMILARIDADE", async () => {
    const db = banco!.db;
    await semear(db, permTurma("tA", "hA"), [{ texto: "mitocôndria produz energia", vetor: onehot(0) }]);
    const base = { prisma: prismaDuble({ u1: ["tA"] }), busca: buscaSobre(db, onehot(9)) };
    // similaridade 0 passa com corte 0
    expect((await baseParaTurno({ userId: "u1", pergunta: "campeonato futebol" }, { ...base, corte: 0 })).status).toBe("ok");
    try {
      vi.stubEnv("RAG_CORTE_SIMILARIDADE", "0.0001");
      expect((await baseParaTurno({ userId: "u1", pergunta: "campeonato futebol" }, base)).status).toBe("sem_trecho");
      vi.stubEnv("RAG_CORTE_SIMILARIDADE", "0");
      expect((await baseParaTurno({ userId: "u1", pergunta: "campeonato futebol" }, base)).status).toBe("ok");
      vi.stubEnv("RAG_CORTE_SIMILARIDADE", "-1"); // fora de [0, 1] ⇒ padrão 0.62
      expect((await baseParaTurno({ userId: "u1", pergunta: "campeonato futebol" }, base)).status).toBe("sem_trecho");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("Prisma falha ⇒ segue só com a base pessoal", async () => {
    const db = banco!.db;
    await semear(db, permTurma("tA", "hA"), [{ texto: "mitocôndria da turma", vetor: onehot(0) }]);
    await semear(db, permDono("u1", "hP"), [{ texto: "mitocôndria anotação minha", vetor: onehot(0) }]);
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const prisma: PrismaTurmas = {
      turmaMember: { findMany: async () => { throw new Error("mongo fora"); } },
      turma: { findMany: async () => [{ id: "tA" }] },
    };
    const r = await baseParaTurno({ userId: "u1", pergunta: "mitocôndria" }, { prisma, busca: buscaSobre(db) });
    expect(r.status).toBe("ok");
    expect(r.trechos.map((t) => t.titulo)).toEqual(["Pessoal hP"]);
    expect(erro).toHaveBeenCalledTimes(1);
    expect(String(erro.mock.calls[0][0])).toContain("[rag/chat]");
    erro.mockRestore();
  });
});
