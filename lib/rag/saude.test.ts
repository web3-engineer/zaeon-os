/**
 * lib/rag/saude.test.ts — a sonda do SEGUNDO SERVIDOR (a Contabo).
 *
 * Dois destes testes existem por defeitos que eu cometi ao escrever o módulo, e os dois foram
 * achados relendo o código em vez de rodando: a promessa perdedora da corrida virando
 * unhandledRejection, e a sonda de modelos batendo no caminho de CHAT em vez da raiz do LiteLLM
 * (que daria 404 e "degraded" num gateway de pé — recibo mentindo na direção pessimista).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { estadoRag, estadoModelosLocais, estadoContabo, __resetContaboParaTeste } from "./saude";
import type { RagDb } from "./pg";

/** dublê do banco: `RagDb.query` é GENÉRICO, então o retorno precisa ser `any[]` — sem isto o
 *  vitest passa (esbuild não checa tipo) e o `tsc --noEmit` do CI falha. */
const db = (fn: () => Promise<unknown>): RagDb => ({ query: fn as RagDb["query"] });

const URL_PG = "postgres://rag_app:x@100.0.0.1:5432/zaeon_rag";
const bom = db(async () => ({ rows: [{ "?column?": 1 }], rowCount: 1 }));

beforeEach(() => __resetContaboParaTeste());

describe("estadoRag (o pgvector da Contabo)", () => {
  it("sem RAG_PG_URL → off (desligado por configuração, não 'quebrado')", async () => {
    expect(await estadoRag({ env: {} })).toBe("off");
  });

  it("banco responde → on", async () => {
    expect(await estadoRag({ env: { RAG_PG_URL: URL_PG }, db: bom })).toBe("on");
  });

  it("banco rejeita (tailnet caída) → degraded", async () => {
    const ruim = db(async () => { throw Object.assign(new Error("connect ETIMEDOUT"), { code: "ETIMEDOUT" }); });
    expect(await estadoRag({ env: { RAG_PG_URL: URL_PG }, db: ruim })).toBe("degraded");
  });

  it("banco PENDURA → degrada no prazo, em vez de segurar o health-gate", async () => {
    const pendura = db(() => new Promise(() => {}));   // nunca resolve
    const t = Date.now();
    expect(await estadoRag({ env: { RAG_PG_URL: URL_PG }, db: pendura, timeoutMs: 30 })).toBe("degraded");
    expect(Date.now() - t).toBeLessThan(1000);
  });

  it("prazo estourado + query rejeitando DEPOIS: veredito estável e nada estoura", async () => {
    // ESTE TESTE NÃO É SOBRE unhandledRejection, e dizer que era foi erro meu: `Promise.race` anexa
    // handler a todos os seus argumentos, então a perdedora nunca fica órfã — removi o `.catch` do
    // módulo e o teste continuou passando, o que mostrou que a asserção não media o que prometia.
    // O que ele mede de verdade: a rejeição tardia não muda o "degraded" já decidido.
    const vistas: unknown[] = [];
    const ouvinte = (e: unknown) => vistas.push(e);
    process.on("unhandledRejection", ouvinte);
    try {
      const lenta = db(() => new Promise((_, rej) => setTimeout(() => rej(new Error("tarde")), 40)));
      expect(await estadoRag({ env: { RAG_PG_URL: URL_PG }, db: lenta, timeoutMs: 10 })).toBe("degraded");
      await new Promise((r) => setTimeout(r, 120));   // tempo de a rejeição atrasada chegar
      expect(vistas, "nada deve estourar no processo").toEqual([]);
    } finally {
      process.off("unhandledRejection", ouvinte);
    }
  });

  it("cacheia por 60 s: a segunda chamada NÃO sonda o banco de novo", async () => {
    const query = vi.fn(async () => ({ rows: [], rowCount: 0 })) as unknown as RagDb["query"];
    const env = { RAG_PG_URL: URL_PG };
    await estadoRag({ env, db: { query } });
    await estadoRag({ env, db: { query } });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("SONDA EM VOO COMPARTILHADA: N requisições concorrentes abrem UMA query, não N", async () => {
    // Os dois achados 🟡 do Sourcery na #716 tinham esta raiz: o cache só é escrito DEPOIS da sonda,
    // então tudo que chegasse durante uma sonda lenta abria o próprio `SELECT 1` no pool
    // compartilhado do RAG — e duas sondas sobrepostas gravavam em ordem de TÉRMINO, deixando a
    // mais velha enterrar um `on` recém-descoberto.
    let chamadas = 0;
    const lento = db(() => { chamadas++; return new Promise((r) => setTimeout(() => r({ rows: [], rowCount: 0 }), 30)); });
    const env = { RAG_PG_URL: URL_PG };
    const [a, b, c] = await Promise.all([
      estadoRag({ env, db: lento }),
      estadoRag({ env, db: lento }),
      estadoRag({ env, db: lento }),
    ]);
    expect(chamadas, "três requisições concorrentes abriram mais de uma query no pool").toBe(1);
    expect([a, b, c]).toEqual(["on", "on", "on"]);
  });

  it("depois que a sonda termina, a próxima pode sondar de novo (o voo não gruda)", async () => {
    let chamadas = 0;
    const d = db(async () => { chamadas++; return { rows: [], rowCount: 0 }; });
    const env = { RAG_PG_URL: URL_PG };
    await estadoRag({ env, db: d });
    __resetContaboParaTeste();                 // expira o cache, como o tempo faria
    await estadoRag({ env, db: d });
    expect(chamadas).toBe(2);
  });

  it("URL diferente invalida o cache (trocar de banco não pode herdar o veredito do antigo)", async () => {
    const query = vi.fn(async () => ({ rows: [], rowCount: 0 })) as unknown as RagDb["query"];
    await estadoRag({ env: { RAG_PG_URL: URL_PG }, db: { query } });
    await estadoRag({ env: { RAG_PG_URL: URL_PG + "2" }, db: { query } });
    expect(query).toHaveBeenCalledTimes(2);
  });
});

describe("estadoModelosLocais (o LiteLLM da Contabo)", () => {
  it("sem env → off", async () => {
    expect(await estadoModelosLocais({ env: {} })).toBe("off");
  });

  it("O DEFEITO: LOCAL_LLM_URL aponta pro CHAT, e a sonda tem que ir na RAIZ", async () => {
    // `LOCAL_LLM_URL=http://host:4000/v1/chat/completions` — sondar esse caminho daria 404 e
    // "degraded" num gateway de pé. A asserção é sobre a URL pedida, não só sobre o veredito.
    const pedidas: string[] = [];
    const f = (async (u: any) => { pedidas.push(String(u)); return { ok: true } as any; }) as unknown as typeof fetch;
    const e = await estadoModelosLocais({ env: { LOCAL_LLM_URL: "http://100.0.0.1:4000/v1/chat/completions" }, fetchImpl: f });
    expect(pedidas).toEqual(["http://100.0.0.1:4000/health/liveliness"]);
    expect(e).toBe("on");
  });

  it("CONTABO_LLM_URL (sem /v1) também vai na raiz, e tem precedência", async () => {
    const pedidas: string[] = [];
    const f = (async (u: any) => { pedidas.push(String(u)); return { ok: true } as any; }) as unknown as typeof fetch;
    await estadoModelosLocais({ env: { CONTABO_LLM_URL: "http://100.0.0.1:4000/", LOCAL_LLM_URL: "http://outro:4000/v1/chat/completions" }, fetchImpl: f });
    expect(pedidas).toEqual(["http://100.0.0.1:4000/health/liveliness"]);
  });

  it("gateway fora → degraded (configurado e não respondeu)", async () => {
    const f = (async () => { throw new Error("ECONNREFUSED"); }) as unknown as typeof fetch;
    expect(await estadoModelosLocais({ env: { CONTABO_LLM_URL: "http://100.0.0.1:4000" }, fetchImpl: f })).toBe("degraded");
  });

  it("HTTP não-2xx → degraded (de pé não é o mesmo que saudável)", async () => {
    const f = (async () => ({ ok: false, status: 503 }) as any) as unknown as typeof fetch;
    expect(await estadoModelosLocais({ env: { CONTABO_LLM_URL: "http://100.0.0.1:4000" }, fetchImpl: f })).toBe("degraded");
  });
});

describe("estadoContabo (as duas pontas)", () => {
  it("devolve as duas, e uma caída não contamina a outra", async () => {
    const f = (async () => { throw new Error("ECONNREFUSED"); }) as unknown as typeof fetch;
    expect(await estadoContabo({ env: { RAG_PG_URL: URL_PG, CONTABO_LLM_URL: "http://100.0.0.1:4000" }, db: bom, fetchImpl: f }))
      .toEqual({ rag: "on", modelos: "degraded" });
  });

  it("servidor todo desligado por configuração → off nas duas (nunca 'degraded' por omissão)", async () => {
    expect(await estadoContabo({ env: {} })).toEqual({ rag: "off", modelos: "off" });
  });
});
