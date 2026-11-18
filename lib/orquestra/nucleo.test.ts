import { describe, it, expect, vi } from "vitest";
import { criarPrazo, esperar, correrContraPrazo, PrazoEsgotado, ehPrazo } from "@/lib/orquestra/prazo";
import { atrasoDeRetry, criarChamarModelo, lerRetryAfter, rotasDisponiveis, type PedidoModelo } from "@/lib/orquestra/provedores";
import { criarCaixa, paraJsonSchema } from "@/lib/orquestra/ferramentas";
import type { ToolDef } from "@/lib/agent/runtime";

const LEDGER = { agentKey: "aura", surface: "estudos" as const, taskId: "a".repeat(24), phase: "orquestra" };

describe("prazo · cancelamento de verdade", () => {
  it("filho nunca vive além do pai e cai junto com ele", async () => {
    const pai = criarPrazo(50);
    const filho = pai.filho(10_000);
    expect(filho.ate).toBeLessThanOrEqual(pai.ate);
    await new Promise((r) => setTimeout(r, 80));
    expect(pai.signal.aborted).toBe(true);
    expect(filho.signal.aborted).toBe(true);
    expect(ehPrazo(filho.signal.reason)).toBe(true);
  });

  it("abortar o signal externo (aluno fechou a aba) derruba a árvore", () => {
    const ctrl = new AbortController();
    const p = criarPrazo(60_000, ctrl.signal);
    const neto = p.filho(60_000).filho(60_000);
    ctrl.abort(new Error("cliente saiu"));
    expect(neto.signal.aborted).toBe(true);
  });

  it("esperar acorda com erro quando o prazo cai (backoff nunca dorme além do prazo)", async () => {
    const p = criarPrazo(20);
    await expect(esperar(5_000, p)).rejects.toBeInstanceOf(PrazoEsgotado);
  });

  it("correrContraPrazo desiste da promessa que não aceita signal", async () => {
    const p = criarPrazo(20);
    const nunca = new Promise<number>(() => {});
    await expect(correrContraPrazo(nunca, p)).rejects.toBeInstanceOf(PrazoEsgotado);
    await expect(correrContraPrazo(Promise.resolve(7), criarPrazo(1_000))).resolves.toBe(7);
  });
});

describe("provedores · retry, rota e cancelamento", () => {
  const env = { DEEPSEEK_API_KEY: "sk-ds", OPENROUTER_API_KEY: "sk-or" };
  const ok = (corpo: unknown) => new Response(JSON.stringify(corpo), { status: 200, headers: { "content-type": "application/json" } });
  const resposta = (msg: Record<string, unknown>, usage = { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 }) =>
    ok({ model: "deepseek-v4-pro", choices: [{ message: msg, finish_reason: "stop" }], usage });
  const pedido = (extra: Partial<PedidoModelo> = {}): PedidoModelo => ({
    modelo: "deepseek-v4-pro", mensagens: [{ role: "user", content: "oi" }], prazo: criarPrazo(30_000), ledger: LEDGER, ...extra,
  });

  it("Retry-After em segundos e em data HTTP", () => {
    expect(lerRetryAfter("2")).toBe(2_000);
    expect(lerRetryAfter(new Date(Date.now() + 3_000).toUTCString())).toBeGreaterThan(1_000);
    expect(lerRetryAfter(null)).toBeNull();
    expect(atrasoDeRetry(0, 1_000, () => 0)).toBe(1_000);
    expect(atrasoDeRetry(3, null, () => 0.999)).toBeLessThanOrEqual(20_000);
  });

  it("429 tenta de novo NO MESMO modelo, respeitando Retry-After, e grava o ledger com o id da tarefa", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response("calma", { status: 429, headers: { "retry-after": "0" } }))
      .mockResolvedValueOnce(resposta({ content: "olá" }));
    const registrar = vi.fn();
    const chamar = criarChamarModelo({ env, fetchImpl, registrar, aleatorio: () => 0 });
    const r = await chamar(pedido());
    expect(r.conteudo).toBe("olá");
    expect(r.provedor).toBe("deepseek");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(String(fetchImpl.mock.calls[0][0])).toBe("https://api.deepseek.com/chat/completions");
    expect(registrar.mock.calls.map((c) => c[0].ok)).toEqual([false, true]);
    expect(registrar.mock.calls[1][0]).toMatchObject({ taskId: LEDGER.taskId, provedor: "deepseek", rota: "direta", phase: "orquestra" });
  });

  it("401 na rota direta → MESMO modelo pelo OpenRouter (nunca outra família)", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response("chave ruim", { status: 401 }))
      .mockResolvedValueOnce(resposta({ content: "via OR" }));
    const r = await criarChamarModelo({ env, fetchImpl })(pedido());
    expect(r.provedor).toBe("openrouter");
    const corpo = JSON.parse(fetchImpl.mock.calls[1][1].body);
    expect(corpo.model).toBe("deepseek/deepseek-v4-pro");
  });

  it("400 é erro do pedido: não insiste", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("bad", { status: 400 }));
    await expect(criarChamarModelo({ env, fetchImpl })(pedido())).rejects.toThrow(/requisicao/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("lê tool_calls, separa cache no uso e devolve reasoning_content", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(resposta(
      { content: null, reasoning_content: "pensei", tool_calls: [{ id: "c1", function: { name: "web_search", arguments: '{"query":"x"}' } }] },
      { prompt_tokens: 100, completion_tokens: 10, total_tokens: 110, prompt_cache_hit_tokens: 40 } as any,
    ));
    const r = await criarChamarModelo({ env, fetchImpl })(pedido());
    expect(r.chamadas).toEqual([{ id: "c1", nome: "web_search", bruto: '{"query":"x"}', args: { query: "x" } }]);
    expect(r.raciocinio).toBe("pensei");
    expect(r.uso).toMatchObject({ promptTokens: 60, cachedTokens: 40, completionTokens: 10 });
  });

  it("reasoning_content volta pro DeepSeek mas não vai pro OpenRouter", async () => {
    const msgs: PedidoModelo["mensagens"] = [{ role: "user", content: "oi" }, { role: "assistant", content: null, reasoning_content: "r", tool_calls: [] }];
    const f1 = vi.fn().mockResolvedValue(resposta({ content: "a" }));
    await criarChamarModelo({ env, fetchImpl: f1 })(pedido({ mensagens: msgs }));
    expect(JSON.parse(f1.mock.calls[0][1].body).messages[1].reasoning_content).toBe("r");
    const f2 = vi.fn().mockResolvedValue(resposta({ content: "a" }));
    await criarChamarModelo({ env: { OPENROUTER_API_KEY: "k" }, fetchImpl: f2 })(pedido({ mensagens: msgs, modelo: "tongyi-deepresearch" }));
    expect(JSON.parse(f2.mock.calls[0][1].body).messages[1].reasoning_content).toBeUndefined();
  });

  it("o fetch recebe o signal do prazo: prazo caído aborta a chamada em voo", async () => {
    let sinal: AbortSignal | undefined;
    const fetchImpl = vi.fn((_u: string, init: RequestInit) => {
      sinal = init.signal as AbortSignal;
      return new Promise<Response>((_, rej) => sinal!.addEventListener("abort", () => rej(sinal!.reason)));
    });
    await expect(criarChamarModelo({ env: { DEEPSEEK_API_KEY: "k" }, fetchImpl: fetchImpl as any })(pedido({ prazo: criarPrazo(30) }))).rejects.toBeInstanceOf(PrazoEsgotado);
    expect(sinal?.aborted).toBe(true);
  });

  it("sem chave nenhuma: sem rota", async () => {
    expect(rotasDisponiveis("kimi-k2.6", {})).toEqual([]);
    await expect(criarChamarModelo({ env: {} })(pedido({ modelo: "kimi-k2.6" }))).rejects.toThrow(/sem_rota/);
  });
});

describe("caixa de ferramentas · as nossas tools, com chave de evidência", () => {
  const def = (name: string, risk: ToolDef["risk"] = "read"): ToolDef => ({
    name, risk, runtime: "ts", minPlan: "free",
    schema: { name, description: `faz ${name}`, parameters: { type: "OBJECT" as any, properties: { query: { type: "STRING" as any } }, required: ["query"] } },
    run: async () => ({ ok: true, provenance: {} }),
  });
  const ctx: any = { plan: "free", execMode: "auto" };

  it("schema do Gemini vira JSON Schema minúsculo", () => {
    expect(paraJsonSchema({ type: "OBJECT", properties: { q: { type: "STRING" }, n: { type: "ARRAY", items: { type: "NUMBER" } } } }))
      .toEqual({ type: "object", properties: { q: { type: "string" }, n: { type: "array", items: { type: "number" } } } });
  });

  it("só leitura entra; studio/research nunca", () => {
    const caixa = criarCaixa(ctx, { ferramentasDoTurno: () => [def("web_search"), def("write_file", "write"), def("studio_generate")] });
    expect(caixa.visiveis().map((v) => v.name)).toEqual(["web_search"]);
  });

  it("achados ganham [E#] estáveis; fonte repetida reusa a chave; consulta repetida não roda de novo", async () => {
    const executarTool = vi.fn(async (_n: string, a: any) => ({
      ok: true, provenance: {},
      findings: [
        { claim: `paper sobre ${a.query}`, source: { title: "Paper A", url: "https://doi.org/1?utm=x" }, confidence: "alta" as const },
        { claim: "paper B", source: { title: "Paper B", url: "https://doi.org/2" }, confidence: "alta" as const },
      ],
    }));
    const caixa = criarCaixa(ctx, { ferramentasDoTurno: () => [def("literature_search")], executarTool });
    const p = criarPrazo(5_000);
    const o1 = await caixa.executar("literature_search", { query: "crispr" }, "a1", p);
    expect(o1).toContain("[E1]");
    expect(o1).toContain("[E2]");
    await caixa.executar("literature_search", { query: "crispr em milho" }, "a2", p);
    expect(caixa.evidencias().map((e) => e.chave)).toEqual(["E1", "E2"]); // mesmas URLs → mesmas chaves
    const o3 = await caixa.executar("literature_search", { query: "crispr" }, "a3", p);
    expect(o3).toMatch(/consulta repetida/);
    expect(executarTool).toHaveBeenCalledTimes(2);
  });

  it("falha de tool vira OBSERVAÇÃO (o laço segue); tool inexistente e teto também", async () => {
    const caixa = criarCaixa(ctx, {
      ferramentasDoTurno: () => [def("web_search")],
      executarTool: async () => ({ ok: false, error: "provedor fora", code: "web_unavailable", provenance: {} }),
      maxChamadas: 1,
    });
    const p = criarPrazo(5_000);
    expect(await caixa.executar("web_search", { query: "a" }, "x", p)).toMatch(/falhou \(web_unavailable\)/);
    expect(await caixa.executar("nao_existe", {}, "x", p)).toMatch(/não existe/);
    expect(await caixa.executar("web_search", { query: "b" }, "x", p)).toMatch(/Limite de 1/);
  });

  it("importar remapeia evidência de fora pra chave nossa", () => {
    const caixa = criarCaixa(ctx, { ferramentasDoTurno: () => [] });
    const mapa = caixa.importar([{ chave: "E9", claim: "c", source: { title: "T", url: "https://x" }, ferramenta: "http:x", agente: "py" }]);
    expect(mapa.get("E9")).toBe("E1");
    expect(caixa.existe("E1")).toBe(true);
  });
});
