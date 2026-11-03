import { afterAll, beforeEach, describe, it, expect, vi } from "vitest";
import { buscar, executarSql, montarSql, normalizarK, K_PADRAO, PALAVRAS_DE_PERGUNTA, type BuscaDeps } from "./busca";
import { bancoDeTeste } from "./pgTeste";
import { criarDocumento, gravarTrechos, registrarVetores, contarBase } from "./store";
import type { RagDb } from "./pg";
import type { EscopoRag } from "./permissao";

// Postgres real (pgvector). Sem RAG_PG_TEST_URL os testes de banco são pulados; no CI a env existe.
const banco = await bancoDeTeste();
afterAll(async () => { await banco?.fechar(); });
beforeEach(async () => { await banco?.limpar(); });

const e: EscopoRag = { userId: "u1", turmaIds: ["tA"] };
/** Vetor de 1024 dimensões, "one-hot": cosseno 1 com o mesmo `i`, 0 com os outros. */
const onehot = (i: number) => Array.from({ length: 1024 }, (_, j) => (j === i ? 1 : 0));
/** Há base (força a ida ao SQL mesmo quando o escopo não enxerga nada — é o SQL que tem que barrar). */
const haBase = async () => ({ pessoais: 1, deTurma: 1 });

function depsDb(db: RagDb, over: Partial<BuscaDeps> = {}): BuscaDeps & { embedMock: ReturnType<typeof vi.fn> } {
  const embedMock = vi.fn(async () => [onehot(0)]);
  return { db, embed: embedMock, contar: haBase, ...over, embedMock } as BuscaDeps & { embedMock: ReturnType<typeof vi.fn> };
}

type DocBase = Parameters<typeof criarDocumento>[1];
const permTurma = (turmaId: string, hash: string): DocBase => ({
  hash, titulo: `Doc ${hash}`, nomeArquivo: "x.pdf", paginas: 9, markdown: "#", origem: "admin", criadoPor: "adm", permissao: { turmaId },
});
const permDono = (donoId: string, hash: string): DocBase => ({
  hash, titulo: `Pessoal ${hash}`, nomeArquivo: "x.pdf", paginas: 9, markdown: "#", origem: "chat", criadoPor: donoId, permissao: { donoId },
});

/** Cria documento + trechos; `vetores[i]` (ou undefined ⇒ sem vetor). Devolve ids dos trechos por ordem. */
async function semear(
  db: RagDb, doc: DocBase,
  trechos: { texto: string; vetor?: number[]; paginaIni?: number; paginaFim?: number }[],
) {
  const d = await criarDocumento(db, doc);
  await gravarTrechos(
    db, d.id,
    trechos.map((t, i) => ({ ordem: i, texto: t.texto, caminho: "Cap", paginaIni: t.paginaIni ?? i + 1, paginaFim: t.paginaFim ?? i + 1 })),
    { turmaIds: d.turmaIds, donoIds: d.donoIds },
  );
  const r = await db.query<{ id: string }>("SELECT id FROM rag_trechos WHERE documento_id = $1 ORDER BY ordem", [d.id]);
  const itens = r.rows.flatMap((row, i) => (trechos[i].vetor ? [{ trechoId: row.id, embedding: trechos[i].vetor! }] : []));
  if (itens.length) await registrarVetores(db, d.id, itens);
  return { doc: d, ids: r.rows.map((x) => x.id) };
}

describe("montarSql · teto POR DOCUMENTO (dívida do portão 3b, Sourcery #672)", () => {
  const escopo = { userId: "u1", turmaIds: ["t1"] };

  it("SEM porDoc o SQL é o de sempre — é ele que numera [B1]..[Bn] nas citações", () => {
    const { sql } = montarSql(escopo, "fotossíntese", null, 8);
    expect(sql).not.toContain("row_number() OVER (PARTITION BY");
    expect(sql).not.toContain("rn_doc");
  });

  it("COM porDoc, o corte é por documento e acontece ANTES do limite global", () => {
    const { sql, params } = montarSql(escopo, "fotossíntese", null, 40, 3);
    expect(sql).toContain("row_number() OVER (PARTITION BY t.documento_id ORDER BY f.score DESC, t.id)");
    expect(sql).toMatch(/WHERE z\.rn_doc <= \$\d+::int[\s\S]*LIMIT \$\d+::int/);
    expect(params).toContain(3);
  });

  it("a ordem final não muda (score desc, id) — o topo da lista é o mesmo", () => {
    expect(montarSql(escopo, "x", null, 40, 3).sql).toContain("ORDER BY z.score DESC, z.id");
  });

  it("porDoc inválido é ignorado em vez de virar SQL quebrado", () => {
    for (const v of [0, -1, NaN, Infinity]) {
      expect(montarSql(escopo, "x", null, 8, v).sql, String(v)).not.toContain("rn_doc");
    }
  });

  it("o teto é PARÂMETRO, não interpolação (nada do caller entra como texto no SQL)", () => {
    const { sql, params } = montarSql(escopo, "x", null, 40, 3);
    expect(sql).not.toContain("<= 3");
    expect(params).toContain(3);
  });
});

describe("montarSql (puro)", () => {
  it("com vetor: dois ramos, permissão nos dois, RRF, vetor e consulta como parâmetros", () => {
    const { sql, params } = montarSql(e, "limite de função", onehot(0), 8);
    expect(sql).toContain("embedding IS NOT NULL");
    expect(sql).toContain("<=>");
    expect(sql).toContain("to_tsvector('rag_pt'");
    expect(sql).toContain("1.0 / (60 +");
    expect(sql).toContain("JOIN rag_documentos");
    // permissão aparece nos DOIS ramos
    expect(sql.match(/turma_ids && \$\d+::text\[\] OR dono_ids @> ARRAY\[\$\d+\]::text\[\]/g)).toHaveLength(2);
    expect(params).toContain("limite de função");
    expect(params).toContain("u1");
    expect(params).toContainEqual(["tA"]);
    expect(params.some((p) => typeof p === "string" && p.startsWith("[1,0,0"))).toBe(true);
    // nada interpolado
    expect(sql).not.toContain("limite de função");
    expect(sql).not.toContain("u1");
  });

  it("com vetor: devolve a similaridade (1 - dist) e se casou por texto (bool_or)", () => {
    const { sql } = montarSql(e, "limite", onehot(0), 8);
    expect(sql).toContain("1 - dist");
    expect(sql).toContain("bool_or");
  });

  it("sem vetor: só o ramo texto (sem <=> nem CTE vet), permissão presente", () => {
    const { sql, params } = montarSql(e, "limite", null, 8);
    expect(sql).not.toContain("<=>");
    expect(sql).not.toContain("embedding");
    expect(sql).toContain("to_tsvector('rag_pt'");
    expect(sql.match(/turma_ids && \$\d+::text\[\] OR dono_ids @> ARRAY\[\$\d+\]::text\[\]/g)).toHaveLength(1);
    expect(params).toContain("limite");
  });

  it("ramo texto: OR dos lexemas com mínimo de casados (não o AND do websearch); palavras de pergunta por parâmetro", () => {
    const { sql, params } = montarSql(e, "limite", null, 8);
    expect(sql).not.toContain("websearch_to_tsquery");
    expect(sql).toContain("' | '");
    expect(sql).toContain("length(tsv) - length(ts_delete(tsv, tq.base)) >= tq.minimo");
    expect(params).toContain(PALAVRAS_DE_PERGUNTA);
    expect(sql).not.toContain("apostila");
  });

  it("k limita o resultado final e escala os candidatos por ramo (k*4)", () => {
    const { params } = montarSql(e, "x", null, 5);
    expect(params).toContain(20);
    expect(params).toContain(5);
  });
});

describe("validação de k e desempate", () => {
  it("normalizarK: inteiro ≥ 1; fração ⇒ floor; ≤ 0, NaN, infinito ou < 1 ⇒ K_PADRAO", () => {
    expect(normalizarK(5)).toBe(5);
    expect(normalizarK(3.9)).toBe(3);
    for (const ruim of [0, -2, NaN, Infinity, 0.5]) expect(normalizarK(ruim)).toBe(K_PADRAO);
  });

  it("montarSql usa o k normalizado (candidatos e LIMIT)", () => {
    expect(montarSql(e, "x", null, 3.9).params).toEqual(expect.arrayContaining([3, 12]));
    const ruim = montarSql(e, "x", null, NaN).params;
    expect(ruim).toEqual(expect.arrayContaining([K_PADRAO, K_PADRAO * 4]));
    expect(ruim.some((v) => typeof v === "number" && Number.isNaN(v))).toBe(false);
  });

  it("desempate por id: no ramo texto (interno) e no row_number do vetor; ORDER BY interno do vetor fica puro (senão o HNSW não é usado)", () => {
    const { sql } = montarSql(e, "x", onehot(0), 8);
    expect(sql).toMatch(/ORDER BY rnk DESC, id\n/);
    expect(sql).toContain("row_number() OVER (ORDER BY dist, id)");
    expect(sql).toMatch(/ORDER BY embedding <=> \$\d+::vector\n\s+LIMIT/);
  });
});

describe("buscar — sem banco (curto-circuitos)", () => {
  const dbNunca: RagDb = { query: vi.fn(async () => { throw new Error("não deveria consultar"); }) };

  it("userId vazio/branco: [] sem contar, embed nem SQL", async () => {
    const contar = vi.fn(haBase);
    const d = depsDb(dbNunca, { contar });
    expect(await buscar(d, { userId: "", turmaIds: ["tA"] }, "x")).toEqual([]);
    expect(await buscar(d, { userId: "   ", turmaIds: [] }, "x")).toEqual([]);
    expect(contar).not.toHaveBeenCalled();
    expect(d.embedMock).not.toHaveBeenCalled();
    expect(dbNunca.query).not.toHaveBeenCalled();
  });

  it("pergunta em branco: []", async () => {
    const d = depsDb(dbNunca);
    expect(await buscar(d, e, "   ")).toEqual([]);
    expect(d.embedMock).not.toHaveBeenCalled();
  });

  it("sem base: [] e embed NÃO é chamado", async () => {
    const d = depsDb(dbNunca, { contar: async () => ({ pessoais: 0, deTurma: 0 }) });
    expect(await buscar(d, e, "limite")).toEqual([]);
    expect(d.embedMock).not.toHaveBeenCalled();
    expect(dbNunca.query).not.toHaveBeenCalled();
  });
});

describe.skipIf(!banco)("teto por documento — contra o Postgres de verdade (a garantia do portão 3b)", () => {
  // O teste de string acima prova que o SQL SAI certo. Este prova que ele FAZ o que promete —
  // e é o único que responde à dívida: `K_AMPLO` era teto de resultado, não garantia de cobertura.
  it("um documento dominante deixa de empurrar os outros pra fora", async () => {
    const db = banco!.db;
    // o dominante casa por vetor E por texto em 5 trechos; o outro, em 1 só
    const dom = await semear(db, permTurma("tA", "dom"), Array.from({ length: 5 }, () => ({ texto: "mitocôndria energia celular", vetor: onehot(0) })));
    const outro = await semear(db, permTurma("tA", "outro"), [{ texto: "mitocôndria na célula vegetal", vetor: onehot(0) }]);
    const d = depsDb(db);

    // SEM teto e com k=3, o dominante pode levar as três vagas
    const sem = await buscar(d, e, "mitocôndria energia", 3);
    expect(sem.every((x) => x.documentoId === dom.doc.id)).toBe(true);

    // COM teto de 2 por documento, o outro documento APARECE — é a garantia, não a sorte
    const com = await buscar(d, e, "mitocôndria energia", 3, 2);
    expect(new Set(com.map((x) => x.documentoId)).size).toBe(2);
    expect(com.filter((x) => x.documentoId === dom.doc.id)).toHaveLength(2);
    expect(com.some((x) => x.documentoId === outro.doc.id)).toBe(true);
  });

  it("o teto não inventa linha: documento único devolve o que existe, sem erro", async () => {
    const db = banco!.db;
    await semear(db, permTurma("tA", "so"), [{ texto: "mitocôndria energia", vetor: onehot(0) }]);
    const r = await buscar(depsDb(db), e, "mitocôndria energia", 8, 3);
    expect(r).toHaveLength(1);
  });

  it("a permissão continua valendo COM o teto (o corte é depois do WHERE, não no lugar dele)", async () => {
    const db = banco!.db;
    await semear(db, permDono("outro-dono", "alheio"), [{ texto: "mitocôndria energia", vetor: onehot(0) }]);
    expect(await buscar(depsDb(db), e, "mitocôndria energia", 8, 3)).toEqual([]);
  });
});

describe.skipIf(!banco)("buscar — Postgres real", () => {
  it("caminho feliz: embed com tipo pergunta; resultado com titulo, páginas e ids string; ordenado por score", async () => {
    const db = banco!.db;
    const { doc, ids } = await semear(db, permTurma("tA", "h1"), [
      { texto: "mitocôndria produz energia", vetor: onehot(0), paginaIni: 3, paginaFim: 4 },
      { texto: "outro assunto qualquer", vetor: onehot(5) },
      { texto: "mais um assunto", vetor: onehot(7) },
    ]);
    const d = depsDb(db);
    const r = await buscar(d, e, "mitocôndria energia");
    expect(d.embedMock).toHaveBeenCalledWith(["mitocôndria energia"], "pergunta");
    expect(r[0]).toMatchObject({ trechoId: ids[0], documentoId: doc.id, titulo: "Doc h1", paginaIni: 3, paginaFim: 4 });
    expect(typeof r[0].trechoId).toBe("string");
    expect(typeof r[0].score).toBe("number");
    expect(r[0].score).toBeGreaterThan(0);
    for (let i = 1; i < r.length; i++) expect(r[i - 1].score).toBeGreaterThanOrEqual(r[i].score);
    // o que casa por vetor E texto vence o que só aparece por vetor
    expect(r.map((x) => x.trechoId)[0]).toBe(ids[0]);
  });

  it("similaridade e porTexto: trecho idêntico ao vetor tem similaridade ≈ 1; casou por palavra ⇒ porTexto true", async () => {
    const db = banco!.db;
    const { ids } = await semear(db, permTurma("tA", "h1"), [
      { texto: "mitocôndria produz energia", vetor: onehot(0) },
      { texto: "outro assunto qualquer", vetor: onehot(5) },
    ]);
    const r = await buscar(depsDb(db), e, "mitocôndria");
    const casou = r.find((x) => x.trechoId === ids[0])!;
    expect(casou.similaridade).toBeCloseTo(1, 5);
    expect(casou.porTexto).toBe(true);
    const so = r.find((x) => x.trechoId === ids[1])!;
    expect(so.similaridade).toBeCloseTo(0, 5);
    expect(so.porTexto).toBe(false);
  });

  it("sem vetor (embed falhou): similaridade null em tudo", async () => {
    const db = banco!.db;
    await semear(db, permTurma("tA", "h1"), [{ texto: "mitocôndria produz energia", vetor: onehot(0) }]);
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    const r = await buscar(depsDb(db, { embed: async () => { throw new Error("x"); } }), e, "mitocôndria");
    aviso.mockRestore();
    expect(r).toHaveLength(1);
    expect(r.every((x) => x.similaridade === null && x.porTexto === true)).toBe(true);
  });

  it("RF1: aluno de outra turma e outro aluno NUNCA recebem o trecho (nos dois ramos)", async () => {
    const db = banco!.db;
    await semear(db, permTurma("tA", "hA"), [{ texto: "mitocôndria produz energia celular", vetor: onehot(0) }]);
    await semear(db, permDono("X", "hX"), [{ texto: "mitocôndria segredo do aluno X", vetor: onehot(0) }]);

    // aluno da turma B (nenhuma relação com A) — vetor idêntico e palavra idêntica: só a permissão barra
    const deB = await buscar(depsDb(db), { userId: "estudanteB", turmaIds: ["tB"] }, "mitocôndria");
    expect(deB).toEqual([]);
    // outro aluno (Y) sem turma
    const deY = await buscar(depsDb(db), { userId: "Y", turmaIds: [] }, "mitocôndria");
    expect(deY).toEqual([]);
    // Y na turma A vê o da turma, não o pessoal de X
    const deYA = await buscar(depsDb(db), { userId: "Y", turmaIds: ["tA"] }, "mitocôndria");
    expect(deYA.map((t) => t.titulo)).toEqual(["Doc hA"]);
    // X vê os dois (o dele e, estando na turma A, o da turma)
    const deX = await buscar(depsDb(db), { userId: "X", turmaIds: ["tA"] }, "mitocôndria");
    expect(deX.map((t) => t.titulo).sort()).toEqual(["Doc hA", "Pessoal hX"]);
    // só por palavra (embed falhando) também não vaza
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    const semVetor = await buscar(depsDb(db, { embed: async () => { throw new Error("x"); } }), { userId: "estudanteB", turmaIds: ["tB"] }, "mitocôndria");
    aviso.mockRestore();
    expect(semVetor).toEqual([]);
  });

  it.each([
    ["dimensão errada", [1, 0, 0]],
    ["NaN", [NaN, ...onehot(0).slice(1)]],
  ])("vetor da pergunta inválido (%s) ⇒ segue só por palavra-chave, sem erro de SQL", async (_n, v) => {
    const db = banco!.db;
    await semear(db, permTurma("tA", "hA"), [{ texto: "mitocôndria produz energia celular", vetor: onehot(0) }]);
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    const r = await buscar(depsDb(db, { embed: async () => [v as number[]] }), { userId: "Y", turmaIds: ["tA"] }, "mitocôndria");
    aviso.mockRestore();
    expect(r.map((t) => t.titulo)).toEqual(["Doc hA"]);
  });

  it("RF1 (SQL cru, SEM podeVer): a permissão está no WHERE de CADA ramo — vetor e texto", async () => {
    const db = banco!.db;
    await semear(db, permTurma("tA", "hA"), [{ texto: "mitocôndria produz energia celular", vetor: onehot(0) }]);
    await semear(db, permDono("X", "hX"), [{ texto: "mitocôndria segredo do aluno X", vetor: onehot(0) }]);
    const titulos = async (esc: EscopoRag, vetor: number[] | null) =>
      (await executarSql(db, esc, "mitocôndria", vetor, 8)).map((r) => r.titulo as string).sort();

    // Ramo vetor isolado: a pergunta não tem palavra em comum, então só o vetor poderia trazer algo.
    const soVetor = (esc: EscopoRag) => executarSql(db, esc, "zzzinexistente", onehot(0), 8);
    expect(await soVetor({ userId: "estudanteB", turmaIds: ["tB"] })).toEqual([]);
    expect(await soVetor({ userId: "Y", turmaIds: [] })).toEqual([]);
    expect((await soVetor({ userId: "Y", turmaIds: ["tA"] })).map((r) => r.titulo)).toEqual(["Doc hA"]);
    expect((await soVetor({ userId: "X", turmaIds: [] })).map((r) => r.titulo)).toEqual(["Pessoal hX"]);

    // Ramo texto isolado (vetor null) e os dois juntos (vetor casando tudo).
    for (const vetor of [null, onehot(0)]) {
      expect(await titulos({ userId: "estudanteB", turmaIds: ["tB"] }, vetor)).toEqual([]);
      expect(await titulos({ userId: "Y", turmaIds: [] }, vetor)).toEqual([]);
      expect(await titulos({ userId: "Y", turmaIds: ["tA"] }, vetor)).toEqual(["Doc hA"]);
      expect(await titulos({ userId: "X", turmaIds: ["tA"] }, vetor)).toEqual(["Doc hA", "Pessoal hX"]);
    }
  });

  it("RF3: pergunta só com stopwords ou símbolos não lança (ramo texto vazio; vem do vetor)", async () => {
    const db = banco!.db;
    const { ids } = await semear(db, permTurma("tA", "h1"), [{ texto: "mitocôndria produz energia", vetor: onehot(0) }]);
    const r1 = await buscar(depsDb(db), e, "de a o");
    expect(r1.map((t) => t.trechoId)).toEqual([ids[0]]); // só o vetor contribui
    const r2 = await buscar(depsDb(db), e, "???");
    expect(r2.map((t) => t.trechoId)).toEqual([ids[0]]);
    // sem vetor também: nada a contribuir, mas sem exceção
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    const r3 = await buscar(depsDb(db, { embed: async () => { throw new Error("x"); } }), e, "de a o");
    aviso.mockRestore();
    expect(r3).toEqual([]);
  });

  it("RF4: trecho sem vetor (embedding NULL) aparece só por palavra e não derruba o ramo vetor", async () => {
    const db = banco!.db;
    const { ids } = await semear(db, permTurma("tA", "h1"), [
      { texto: "ribossomo sintetiza proteína" }, // sem vetor
      { texto: "assunto sem relação", vetor: onehot(0) },
    ]);
    // pergunta com vetor casando o segundo; palavra casando o primeiro
    const r = await buscar(depsDb(db), e, "ribossomo");
    expect(r.map((t) => t.trechoId).sort()).toEqual([...ids].sort());
    // pergunta sem palavra em comum: sem vetor o primeiro nunca aparece; com vetor aparece só o vetorizado
    const r2 = await buscar(depsDb(db), e, "zzzinexistente");
    expect(r2.map((t) => t.trechoId)).toEqual([ids[1]]);
  });

  it("sem acento: 'celula' acha 'células'", async () => {
    const db = banco!.db;
    const { ids } = await semear(db, permTurma("tA", "h1"), [{ texto: "as células se dividem", vetor: onehot(3) }]);
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    const r = await buscar(depsDb(db, { embed: async () => { throw new Error("x"); } }), e, "celula");
    aviso.mockRestore();
    expect(r.map((t) => t.trechoId)).toEqual([ids[0]]);
  });

  describe("pergunta em frase, só por palavra (trecho ainda sem vetor, embed fora)", () => {
    // Trecho real (apostila de biologia indexada pelo #489), sem vetor — como logo depois do upload (F3).
    const APOSTILA = [
      "Apostila Celula › Apostila de Biologia Celular", "Sumario",
      "- Capitulo 1 - Introducao Esta apostila apresenta a celula e suas organelas.",
      "- Capitulo 2 - Membrana plasmatica e transporte entre os meios.",
      "- Capitulo 3 - Mitocondria e a respiracao celular aerobica.",
      "A celula e a unidade basica da vida. Todos os seres vivos sao formados por celulas, que podem ser procariontes ou " +
        "eucariontes. As mitocondrias produzem energia na forma de ATP. O nucleo guarda o material genetico e coordena as " +
        "atividades celulares.",
    ].join("\n\n");
    const semEmbed = (db: RagDb) => depsDb(db, { embed: async () => { throw new Error("embed fora"); } });
    const soPalavra = async (db: RagDb, pergunta: string) => {
      const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
      try { return await buscar(semEmbed(db), e, pergunta); } finally { aviso.mockRestore(); }
    };

    it.each([
      "Segundo a minha apostila, do que trata o Capitulo 2?",
      "Me explique a respiração celular aeróbica",
      "como funciona o transporte entre os meios na membrana plasmática?",
      "o que o texto fala sobre o núcleo?",
    ])("acha: %s", async (pergunta) => {
      const db = banco!.db;
      const { ids } = await semear(db, permTurma("tA", "h1"), [{ texto: APOSTILA }, { texto: "Historia do Brasil colonial" }]);
      const r = await soPalavra(db, pergunta);
      expect(r.map((t) => t.trechoId)).toEqual([ids[0]]);
      expect(r[0]).toMatchObject({ porTexto: true, similaridade: null });
    });

    it.each([
      "quem descobriu a penicilina?",
      // só "apostila"/"segundo" em comum — palavras de pergunta não contam como conteúdo
      "Segundo a apostila, quem descobriu a penicilina?",
      "qual a capital da França segundo a apostila?",
      // minoria dos termos de conteúdo (só "mitocôndria" de 3) não basta
      "quem descobriu a mitocôndria e a penicilina?",
      // só palavras de pergunta ⇒ exige todas (como o AND de antes): "resuma" não está no trecho
      "resuma a apostila",
    ])("não acha: %s", async (pergunta) => {
      const db = banco!.db;
      await semear(db, permTurma("tA", "h1"), [{ texto: APOSTILA }]);
      expect(await soPalavra(db, pergunta)).toEqual([]);
    });

    it("lexema com aspa/barra na pergunta não quebra a tsquery", async () => {
      const db = banco!.db;
      const { ids } = await semear(db, permTurma("tA", "h1"), [{ texto: "it's o arquivo c:\\temp\\x" }]);
      expect((await soPalavra(db, "it's c:\\temp\\x 'a' \\")).map((t) => t.trechoId)).toEqual([ids[0]]);
    });
  });

  it("embed falha: só texto + um console.warn", async () => {
    const db = banco!.db;
    const { ids } = await semear(db, permTurma("tA", "h1"), [{ texto: "limite de uma função", vetor: onehot(0) }]);
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    const r = await buscar(depsDb(db, { embed: vi.fn(async () => { throw new Error("embed_http_503"); }) }), e, "limite");
    expect(aviso).toHaveBeenCalledTimes(1);
    expect(aviso.mock.calls[0][0]).toContain("[rag/busca] embed falhou");
    expect(String(aviso.mock.calls[0][1])).toContain("embed_http_503");
    aviso.mockRestore();
    expect(r.map((t) => t.trechoId)).toEqual([ids[0]]);
  });

  it("embed estoura o prazo: só texto, um warn, timer limpo", async () => {
    const db = banco!.db;
    const { ids } = await semear(db, permTurma("tA", "h1"), [{ texto: "limite de uma função", vetor: onehot(0) }]);
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    const r = await buscar(depsDb(db, { embed: () => new Promise<number[][]>(() => {}), prazoEmbedMs: 10 }), e, "limite");
    expect(aviso).toHaveBeenCalledTimes(1);
    aviso.mockRestore();
    expect(r.map((t) => t.trechoId)).toEqual([ids[0]]);
  });

  it("não deixa timer pendente quando o embed responde", async () => {
    const db = banco!.db;
    await semear(db, permTurma("tA", "h1"), [{ texto: "limite", vetor: onehot(0) }]);
    const clear = vi.spyOn(globalThis, "clearTimeout");
    await buscar(depsDb(db), e, "limite");
    expect(clear).toHaveBeenCalled();
    clear.mockRestore();
  });

  it("respeita k (padrão 8) e ordena por relevância", async () => {
    const db = banco!.db;
    await semear(db, permTurma("tA", "h1"), Array.from({ length: 12 }, (_, i) => ({ texto: `limite numero ${i}`, vetor: onehot(i) })));
    expect((await buscar(depsDb(db), e, "limite")).length).toBe(K_PADRAO);
    expect((await buscar(depsDb(db), e, "limite", 3)).length).toBe(3);
  });

  it("2ª checagem podeVer: descarta o que a coleção devolver fora do escopo", async () => {
    const db = banco!.db;
    await semear(db, permTurma("tA", "h1"), [{ texto: "limite", vetor: onehot(0) }]);
    // db adulterado: devolve linha com permissão alheia, simulando um SQL que vazou
    const vaza: RagDb = {
      query: async () => ({
        rowCount: 1,
        rows: [{ id: "i", documento_id: "d", titulo: "T", texto: "t", pagina_ini: 1, pagina_fim: 1, score: 0.1, turma_ids: ["tZ"], dono_ids: ["outro"] }] as any[],
      }),
    };
    expect(await buscar(depsDb(vaza), e, "limite")).toEqual([]);
  });

  it("contarBase real + sem base ⇒ [] sem embed", async () => {
    const d = depsDb(banco!.db, { contar: (esc) => contarBase(banco!.db, esc) });
    expect(await buscar(d, e, "limite")).toEqual([]);
    expect(d.embedMock).not.toHaveBeenCalled();
  });

  it("falha do SQL propaga", async () => {
    const quebrado: RagDb = { query: async () => { throw new Error("boom"); } };
    await expect(buscar(depsDb(quebrado), e, "limite")).rejects.toThrow("boom");
  });
});
