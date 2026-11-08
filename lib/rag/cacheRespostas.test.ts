import { afterAll, beforeEach, describe, it, expect } from "vitest";
import { _zerarDisjuntor, chavesDaPergunta, consultarCache, escopoDoCache, guardarNoCache, perguntaCacheavel, respostaGuardavel, votarNoCache } from "./cacheRespostas";
import { embedPerguntaCompartilhado } from "./embed";
import { bancoDeTeste } from "./pgTeste";

describe("cache de respostas — as regras (puro)", () => {
  it("as chaves são as palavras de conteúdo: paráfrases batem, assuntos diferentes não", () => {
    expect(chavesDaPergunta("O que é mitose?")).toEqual(chavesDaPergunta("explique a mitose"));
    expect(chavesDaPergunta("o que é mitose?")).not.toEqual(chavesDaPergunta("o que é meiose?"));
    expect(chavesDaPergunta("qual a diferença entre vírus e bactéria?")).toEqual(chavesDaPergunta("diferença entre bactérias e vírus"));
  });
  it("'como funciona' e 'por que' não recebem a resposta de 'o que é'", () => {
    expect(chavesDaPergunta("como funciona a vacina?")).not.toEqual(chavesDaPergunta("o que é vacina?"));
    expect(chavesDaPergunta("por que o céu é azul?")).not.toEqual(chavesDaPergunta("o céu é azul?"));
  });
  it("só pergunta autocontida e impessoal entra", () => {
    expect(perguntaCacheavel("o que é mitose?")).toBe(true);
    expect(perguntaCacheavel("explica isso de novo")).toBe(false);     // depende da conversa
    expect(perguntaCacheavel("e o núcleo?")).toBe(false);
    expect(perguntaCacheavel("revisa meu trabalho de biologia")).toBe(false);   // é da pessoa
    expect(perguntaCacheavel("oi")).toBe(false);                       // sem assunto
    expect(perguntaCacheavel("x".repeat(260))).toBe(false);
  });
  it("só resposta de explicação, com corpo, sem trabalho e sem citar a conversa", () => {
    const ok = { nucleo: "A mitose é a divisão celular que gera duas células-filhas idênticas à mãe." };
    expect(respostaGuardavel(ok, "explicar_conceito")).toBe(true);
    expect(respostaGuardavel(ok, "criar_trabalho")).toBe(false);
    expect(respostaGuardavel(ok, "explicar_conceito", true)).toBe(false);    // degradada
    expect(respostaGuardavel({ nucleo: "curta" }, "explicar_conceito")).toBe(false);
    expect(respostaGuardavel({ ...ok, work: { kind: "artigo" } }, "explicar_conceito")).toBe(false);
    expect(respostaGuardavel({ nucleo: "Como conversamos ontem, a mitose divide a célula em duas idênticas." }, "explicar_conceito")).toBe(false);
  });
  it("o escopo separa sala e mentor", () => {
    expect(escopoDoCache("estudos", null)).toBe("estudos|aura");
    expect(escopoDoCache("pesquisa", "medicina")).toBe("pesquisa|medicina");
  });
});

describe("o vetor da pergunta é compartilhado (RAG + cache: uma chamada só)", () => {
  it("dois pedidos do mesmo texto usam a mesma chamada", async () => {
    let n = 0; const embed = async (t: string[]) => { n++; return t.map(() => [1, 2, 3]); };
    const [a, b] = await Promise.all([embedPerguntaCompartilhado("teste-memo-1", embed), embedPerguntaCompartilhado("teste-memo-1", embed)]);
    expect(a).toEqual([1, 2, 3]); expect(b).toBe(a); expect(n).toBe(1);
  });
  it("falha sai do memo (a próxima tenta de novo)", async () => {
    let n = 0; const embed = async () => { n++; if (n === 1) throw new Error("x"); return [[9]]; };
    await expect(embedPerguntaCompartilhado("teste-memo-2", embed)).rejects.toThrow();
    expect(await embedPerguntaCompartilhado("teste-memo-2", embed)).toEqual([9]);
  });
});

// Postgres real (pgvector). Sem RAG_PG_TEST_URL os testes são pulados; no CI a env existe (service container).
const banco = await bancoDeTeste();
afterAll(async () => { await banco?.fechar(); });
beforeEach(async () => { _zerarDisjuntor(); await banco?.db.query("DELETE FROM aura_cache_respostas").catch(() => undefined); });

/** vetor unitário de 1024 dims na direção `i` (com um tiquinho em `j` pra controlar a similaridade) */
const dir = (i: number, j = -1, w = 0) => Array.from({ length: 1024 }, (_, k) => (k === i ? 1 : k === j ? w : 0));
const ESC = "estudos|aura";
const answer = { nucleo: "A mitose é a divisão celular que gera duas células-filhas idênticas." };

describe.skipIf(!banco)("cache de respostas — no banco", () => {
  it("guarda e serve a paráfrase (mesmas chaves, vetor parecido)", async () => {
    await guardarNoCache(banco!.db, { pergunta: "O que é mitose?", vetor: dir(0), escopo: ESC, answer, intent: "explicar_conceito" });
    const r = await consultarCache(banco!.db, { pergunta: "explique a mitose", vetor: dir(0, 1, 0.1), escopo: ESC });
    expect(r?.answer).toEqual(answer);
    expect(r!.similaridade).toBeGreaterThan(0.99);
  });
  it("NÃO serve outro assunto mesmo com o vetor perto (mitose × meiose)", async () => {
    await guardarNoCache(banco!.db, { pergunta: "O que é mitose?", vetor: dir(0), escopo: ESC, answer, intent: "explicar_conceito" });
    expect(await consultarCache(banco!.db, { pergunta: "o que é meiose?", vetor: dir(0), escopo: ESC })).toBeNull();
  });
  it("NÃO serve vetor distante, nem de outro escopo", async () => {
    await guardarNoCache(banco!.db, { pergunta: "O que é mitose?", vetor: dir(0), escopo: ESC, answer, intent: "explicar_conceito" });
    expect(await consultarCache(banco!.db, { pergunta: "o que é mitose?", vetor: dir(5), escopo: ESC })).toBeNull();
    expect(await consultarCache(banco!.db, { pergunta: "o que é mitose?", vetor: dir(0), escopo: "pesquisa|aura" })).toBeNull();
  });
  it("👎 bloqueia; 👍 aprova (e com CACHE_SO_APROVADAS só as aprovadas valem)", async () => {
    await guardarNoCache(banco!.db, { pergunta: "O que é mitose?", vetor: dir(0), escopo: ESC, answer, intent: "explicar_conceito" });
    expect(await consultarCache(banco!.db, { pergunta: "o que é mitose", vetor: dir(0), escopo: ESC, env: { CACHE_SO_APROVADAS: "1" } })).toBeNull();
    await votarNoCache(banco!.db, "o que é mitose?", "up");
    expect(await consultarCache(banco!.db, { pergunta: "o que é mitose", vetor: dir(0), escopo: ESC, env: { CACHE_SO_APROVADAS: "1" } })).not.toBeNull();
    await votarNoCache(banco!.db, "O que é mitose?", "down"); await votarNoCache(banco!.db, "O que é mitose?", "down");
    expect(await consultarCache(banco!.db, { pergunta: "o que é mitose", vetor: dir(0), escopo: ESC })).toBeNull();
  });
  it("a mesma pergunta guardada de novo substitui (a mais nova vale) — mas não ressuscita uma bloqueada", async () => {
    await guardarNoCache(banco!.db, { pergunta: "O que é mitose?", vetor: dir(0), escopo: ESC, answer, intent: "explicar_conceito" });
    await guardarNoCache(banco!.db, { pergunta: "o que é mitose", vetor: dir(0), escopo: ESC, answer: { nucleo: "versão nova da resposta sobre a mitose e as fases dela." }, intent: "explicar_conceito" });
    expect((await consultarCache(banco!.db, { pergunta: "mitose", vetor: dir(0), escopo: ESC }))?.answer).toMatchObject({ nucleo: expect.stringContaining("versão nova") });
    const { rows } = await banco!.db.query<{ n: number }>("SELECT count(*)::int AS n FROM aura_cache_respostas");
    expect(rows[0]!.n).toBe(1);
  });
});

describe("cache · mensagem de erro nunca vira resposta guardada", () => {
  it("rascunhoFalhou ou texto de erro da casa → não guarda, mesmo sem o degraded", () => {
    const erro = "Demorou demais pra responder — tenta de novo em instantes.";
    expect(erro.length).toBeGreaterThanOrEqual(40); // o defeito: passava no teto de 40 caracteres
    expect(respostaGuardavel({ nucleo: erro }, "duvida_rapida")).toBe(false);
    expect(respostaGuardavel({ nucleo: "uma resposta qualquer longa o bastante para o teto de quarenta", rascunhoFalhou: true }, "duvida_rapida")).toBe(false);
    expect(respostaGuardavel({ nucleo: "A mitose gera duas células idênticas; a meiose gera quatro gametas." }, "duvida_rapida")).toBe(true);
  });
});
