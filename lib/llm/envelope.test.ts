import { describe, it, expect, vi } from "vitest";
import { gerar, gerarJson, ErroLlm, PoolEsgotadoError, type Deps, type GerarReq } from "./envelope";
import { USAGE_VAZIO } from "./usage";

const ctx = { agentKey: "aura", surface: "canal" as const };
const vertexOk: Deps["vertex"] = async (_req, modelo) => ({ texto: '{"ok":true}', usage: { promptTokens: 10, completionTokens: 5, cachedTokens: 0, totalTokens: 15, reportado: true }, finishReason: "STOP", modelo });
const resposta = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
const okGateway = { id: "x", model: "gemini-2.5-flash", choices: [{ message: { content: "{\"via\":\"gateway\"}" }, finish_reason: "stop" }], usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120, prompt_tokens_details: { cached_tokens: 40 } } };

function deps(over: Partial<Deps> = {}): Deps & { linhas: any[] } {
  const linhas: any[] = [];
  return { vertex: vertexOk, registrar: async (l: any) => { linhas.push(l); return true; }, env: {}, ...over, linhas } as any;
}

describe("gerar — rotas", () => {
  it("rota vertex por default; grava ledger com provedor vertex", async () => {
    const d = deps();
    const r = await gerar({ user: "oi", ctx }, d);
    expect(r.provedor).toBe("vertex"); expect(r.rota).toBe("vertex"); expect(r.usage.totalTokens).toBe(15);
    await new Promise((x) => setTimeout(x, 0));
    expect(d.linhas).toHaveLength(1); expect(d.linhas[0]).toMatchObject({ provedor: "vertex", rota: "vertex", ok: true, agentKey: "aura", surface: "canal" });
  });
  it("rota gateway SEM GATEWAY_URL → vertex (zero fetch)", async () => {
    const f = vi.fn(); const d = deps({ fetchImpl: f as any, env: {} });
    const r = await gerar({ user: "oi", rota: "gateway", ctx }, d);
    expect(r.provedor).toBe("vertex"); expect(f).not.toHaveBeenCalled();
  });
  it("rota gateway com URL e key → litellm, usage OpenAI normalizado (cached à parte), Authorization do agente", async () => {
    const f = vi.fn(async () => resposta(200, okGateway));
    const d = deps({ fetchImpl: f as any, env: { GATEWAY_URL: "http://litellm:4000/", GATEWAY_KEY_AURA: "sk-aura", GATEWAY_KEY_DEFAULT: "sk-def" } });
    const r = await gerar({ system: "s", user: "oi", json: true, rota: "gateway", ctx }, d);
    expect(r.provedor).toBe("litellm"); expect(r.rota).toBe("gateway"); expect(r.texto).toContain("gateway");
    expect(r.usage).toEqual({ promptTokens: 60, completionTokens: 20, cachedTokens: 40, totalTokens: 120, reportado: true });
    const [url, init] = (f.mock.calls[0] as any);
    expect(url).toBe("http://litellm:4000/v1/chat/completions");
    expect(init.headers.Authorization).toBe("Bearer sk-aura");
    const body = JSON.parse(init.body); expect(body.response_format).toEqual({ type: "json_object" }); expect(body.messages[0]).toEqual({ role: "system", content: "s" });
    await new Promise((x) => setTimeout(x, 0));
    expect(d.linhas[0]).toMatchObject({ provedor: "litellm", rota: "gateway", ok: true, model: "gemini-2.5-flash" });
  });
  it("sem key do agente usa GATEWAY_KEY_DEFAULT; sem nenhuma (nem master) → vertex com warn 1x", async () => {
    const f = vi.fn(async () => resposta(200, okGateway));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const d1 = deps({ fetchImpl: f as any, env: { GATEWAY_URL: "http://g", GATEWAY_KEY_DEFAULT: "sk-def" } });
    await gerar({ user: "oi", rota: "gateway", ctx: { agentKey: "medicina", surface: "canal" } }, d1);
    expect((f.mock.calls[0] as any)[1].headers.Authorization).toBe("Bearer sk-def");
    const d2 = deps({ fetchImpl: f as any, env: { GATEWAY_URL: "http://g" } });
    const r = await gerar({ user: "oi", rota: "gateway", ctx: { agentKey: "semkey", surface: "canal" } }, d2);
    await gerar({ user: "oi", rota: "gateway", ctx: { agentKey: "semkey", surface: "canal" } }, d2);
    expect(r.provedor).toBe("vertex"); expect(warn.mock.calls.filter((c) => String(c[0]).includes("semkey"))).toHaveLength(1);
    warn.mockRestore();
  });
  it("gateway 503 → cai para vertex NA MESMA chamada, grava ok:false (litellm) e ok:true (vertex)", async () => {
    const f = vi.fn(async () => resposta(503, { error: { message: "Service Unavailable" } }));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const d = deps({ fetchImpl: f as any, env: { GATEWAY_URL: "http://g", GATEWAY_KEY_DEFAULT: "k" } });
    const r = await gerar({ user: "oi", rota: "gateway", ctx }, d);
    expect(r.provedor).toBe("vertex");
    await new Promise((x) => setTimeout(x, 0));
    expect(d.linhas.map((l) => [l.provedor, l.ok, l.erro])).toEqual([["litellm", false, "provedor_fora"], ["vertex", true, null]]);
  });
  it("gateway devolve corpo não-JSON (proxy no caminho) → resposta_nao_json e cai para vertex", async () => {
    const f = vi.fn(async () => new Response("OK\r\n", { status: 200 }));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const d = deps({ fetchImpl: f as any, env: { GATEWAY_URL: "http://g", GATEWAY_KEY_DEFAULT: "k" } });
    const r = await gerar({ user: "oi", rota: "gateway", ctx }, d);
    expect(r.provedor).toBe("vertex");
    await new Promise((x) => setTimeout(x, 0));
    expect(d.linhas[0].erro).toBe("resposta_nao_json");
  });
  it("budget da virtual key → ErroLlm 'teto' relançado, NÃO cai para o vertex (lei 5)", async () => {
    const f = vi.fn(async () => resposta(400, { error: { message: "Budget has been exceeded! Current cost: 0.011, Max budget: 0.01", type: "budget_exceeded" } }));
    const vertex = vi.fn(vertexOk);
    const d = deps({ fetchImpl: f as any, vertex, env: { GATEWAY_URL: "http://g", GATEWAY_KEY_DEFAULT: "k" } });
    const e = await gerar({ user: "oi", rota: "gateway", ctx }, d).catch((x) => x);
    expect(e).toBeInstanceOf(ErroLlm); expect(e.classe).toBe("teto"); expect(e.provedor).toBe("litellm"); expect(vertex).not.toHaveBeenCalled();
  });
  it("gateway 429 → rate_limit relançado (fila decide), sem vertex", async () => {
    const f = vi.fn(async () => resposta(429, { error: { message: "Too Many Requests" } }));
    const d = deps({ fetchImpl: f as any, env: { GATEWAY_URL: "http://g", GATEWAY_KEY_DEFAULT: "k" } });
    const e = await gerar({ user: "oi", rota: "gateway", ctx }, d).catch((x) => x);
    expect(e.classe).toBe("rate_limit");
  });
  it("vertex falha → ErroLlm classificado + ledger ok:false", async () => {
    const d = deps({ vertex: async () => { throw Object.assign(new Error("429 RESOURCE_EXHAUSTED per minute"), { status: 429 }); } });
    const e = await gerar({ user: "oi", ctx }, d).catch((x) => x);
    expect(e).toBeInstanceOf(ErroLlm); expect(e.classe).toBe("rate_limit");
    await new Promise((x) => setTimeout(x, 0));
    expect(d.linhas[0]).toMatchObject({ ok: false, erro: "rate_limit", usage: USAGE_VAZIO });
  });
  it("ledger lançando NÃO derruba a chamada", async () => {
    const d = deps({ registrar: async () => { throw new Error("mongo caiu"); } });
    await expect(gerar({ user: "oi", ctx }, d)).resolves.toMatchObject({ provedor: "vertex" });
  });
  it("messages (histórico) viram contents/messages com roles certos", async () => {
    const f = vi.fn(async () => resposta(200, okGateway));
    const d = deps({ fetchImpl: f as any, env: { GATEWAY_URL: "http://g", GATEWAY_KEY_DEFAULT: "k" } });
    await gerar({ messages: [{ role: "user", text: "a" }, { role: "model", text: "b" }], rota: "gateway", ctx }, d);
    const body = JSON.parse((f.mock.calls[0] as any)[1].body);
    expect(body.messages.map((m: any) => m.role)).toEqual(["user", "assistant"]);
  });
});

describe("gerarJson", () => {
  it("parseia e limpa cercas ```json", async () => {
    const d = deps({ vertex: async (_r, modelo) => ({ texto: "```json\n{\"a\":1}\n```", usage: USAGE_VAZIO, modelo }) });
    expect(await gerarJson<{ a: number }>({ user: "x", ctx }, d)).toEqual({ a: 1 });
  });
  it("vazio → erro diagnóstico com finishReason; inválido → resposta_nao_json", async () => {
    const d1 = deps({ vertex: async (_r, modelo) => ({ texto: "", usage: USAGE_VAZIO, finishReason: "MAX_TOKENS", modelo }) });
    await expect(gerarJson({ user: "x", ctx }, d1)).rejects.toThrow(/resposta vazia \(finishReason=MAX_TOKENS\)/);
    const d2 = deps({ vertex: async (_r, modelo) => ({ texto: "não é json", usage: USAGE_VAZIO, modelo }) });
    const e: any = await gerarJson({ user: "x", ctx }, d2).catch((x) => x);
    expect(e.classe).toBe("resposta_nao_json"); expect(e.message).toMatch(/JSON inválido/);
  });
  it("sempre pede json ao transporte", async () => {
    const vertex = vi.fn(vertexOk); const d = deps({ vertex });
    await gerarJson({ user: "x", ctx } as GerarReq, d);
    expect((vertex.mock.calls[0] as any)[0].json).toBe(true);
  });
});

describe("Fatia 7 — alvo, jsonValido e pool (G3)", () => {
  const envGw = { GATEWAY_URL: "http://g", GATEWAY_KEY_DEFAULT: "k" };
  it("gateway: header x-litellm-model-id + body → alvo no retorno e no ledger", async () => {
    const corpo = { ...okGateway, model: "gemini-2.5-flash-lite" };
    const f = vi.fn(async () => resposta(200, corpo, { "x-litellm-model-id": "gemini-free" }));
    const d = deps({ fetchImpl: f as any, env: envGw });
    const r = await gerar({ user: "oi", model: "zaeon-pool-lite", rota: "gateway", ctx: { agentKey: "aura", surface: "chore" } }, d);
    expect(r.alvo).toBe("gemini-free");
    expect((r as any).modelId).toBeUndefined();
    await new Promise((x) => setTimeout(x, 0));
    expect(d.linhas[0]).toMatchObject({ alvo: "gemini-free", surface: "chore", ok: true });
  });
  it("fallback do router: header cloudflare → alvo cloudflare", async () => {
    const f = vi.fn(async () => resposta(200, { ...okGateway, model: "@cf/meta/llama-3.1-8b-instruct" }, { "x-litellm-model-id": "cloudflare" }));
    const r = await gerar({ user: "oi", model: "zaeon-pool-lite", rota: "gateway", ctx }, deps({ fetchImpl: f as any, env: envGw }));
    expect(r.alvo).toBe("cloudflare");
  });
  it("rota vertex → alvo vertex; zaeon-flash pelo gateway (header hash) → vertex", async () => {
    expect((await gerar({ user: "oi", ctx }, deps())).alvo).toBe("vertex");
    const f = vi.fn(async () => resposta(200, okGateway, { "x-litellm-model-id": "vertex-flash" }));
    expect((await gerar({ user: "oi", model: "zaeon-flash", rota: "gateway", ctx }, deps({ fetchImpl: f as any, env: envGw }))).alvo).toBe("vertex");
  });
  it("jsonValido: true/false em json:true; ausente em json:false (sem lançar)", async () => {
    const d1 = deps();
    const r1 = await gerar({ user: "x", json: true, ctx }, d1);
    expect(r1.jsonValido).toBe(true);
    const quebrado = deps({ vertex: async (_r, modelo) => ({ texto: "{quebrado", usage: USAGE_VAZIO, modelo }) });
    const r2 = await gerar({ user: "x", json: true, ctx }, quebrado);
    expect(r2.jsonValido).toBe(false);
    await new Promise((x) => setTimeout(x, 0));
    expect(quebrado.linhas[0].jsonValido).toBe(false);
    const r3 = await gerar({ user: "x", ctx }, deps({ vertex: async (_r, modelo) => ({ texto: "{quebrado", usage: USAGE_VAZIO, modelo }) }));
    expect(r3.jsonValido).toBeUndefined();
  });
  it("pool NUNCA cai no Vertex: gateway 503 → ErroLlm relançado, vertex não chamado", async () => {
    const f = vi.fn(async () => resposta(503, { error: { message: "Service Unavailable" } }));
    const vertex = vi.fn(vertexOk);
    const d = deps({ fetchImpl: f as any, vertex, env: envGw });
    const e = await gerar({ user: "oi", model: "zaeon-pool-lite", rota: "gateway", ctx }, d).catch((x) => x);
    expect(e).toBeInstanceOf(ErroLlm); expect(e.classe).toBe("provedor_fora"); expect(vertex).not.toHaveBeenCalled();
    await new Promise((x) => setTimeout(x, 0));
    expect(d.linhas).toHaveLength(1); expect(d.linhas[0]).toMatchObject({ ok: false, alvo: "gemini-free" });
  });
  it("pool sem gateway (GATEWAY_URL vazio) → erro, zero fetch, zero vertex", async () => {
    const f = vi.fn(); const vertex = vi.fn(vertexOk);
    const e = await gerar({ user: "oi", model: "zaeon-pool-lite", rota: "gateway", ctx }, deps({ fetchImpl: f as any, vertex, env: {} })).catch((x) => x);
    expect(e).toBeInstanceOf(ErroLlm); expect(f).not.toHaveBeenCalled(); expect(vertex).not.toHaveBeenCalled();
  });
  it("pool pedido com rota vertex também não vira Vertex", async () => {
    const vertex = vi.fn(vertexOk);
    await expect(gerar({ user: "oi", model: "zaeon-pool-lite", ctx }, deps({ vertex }))).rejects.toBeInstanceOf(ErroLlm);
    expect(vertex).not.toHaveBeenCalled();
  });
  it("todos os alvos em cooldown → pool_esgotado (sem vertex)", async () => {
    const f = vi.fn(async () => resposta(429, { error: { message: "No deployments available for selected model, Try again in 60 seconds" } }));
    const vertex = vi.fn(vertexOk);
    const e = await gerar({ user: "oi", model: "zaeon-pool-lite", rota: "gateway", ctx }, deps({ fetchImpl: f as any, vertex, env: envGw })).catch((x) => x);
    expect(e.classe).toBe("pool_esgotado"); expect(vertex).not.toHaveBeenCalled();
  });
});

describe("PoolEsgotadoError (G4)", () => {
  const envGw = { GATEWAY_URL: "http://g", GATEWAY_KEY_DEFAULT: "k", GEMINI_FREE_API_KEY: "a", GROQ_API_KEY: "b" };
  const pedir = (f: any, tentativa?: number) =>
    gerar({ user: "oi", model: "zaeon-pool-lite", rota: "gateway", tentativa, ctx: { agentKey: "aura", surface: "chore" } }, deps({ fetchImpl: f, env: envGw })).catch((x) => x);

  it("429 'No deployments available' SEM Retry-After → backoff nosso (60s × 2^tentativa)", async () => {
    const f = vi.fn(async () => resposta(429, { error: { message: "No deployments available for selected model" } }));
    const e0 = await pedir(f, 0);
    expect(e0).toBeInstanceOf(PoolEsgotadoError); expect(e0).toBeInstanceOf(ErroLlm);
    expect(e0.retryAfterMs).toBe(60_000); expect(e0.alvosTentados).toEqual(["gemini-free", "groq"]);
    expect((await pedir(f, 3)).retryAfterMs).toBe(480_000);
    expect((await pedir(f, 20)).retryAfterMs).toBe(30 * 60_000);
  });
  it("com header retry-after → usa o header", async () => {
    const f = vi.fn(async () => resposta(429, { error: { message: "No deployments available for selected model" } }, { "retry-after": "42" }));
    expect((await pedir(f)).retryAfterMs).toBe(42_000);
  });
  it("429 com retry-after num grupo do pool (sem a frase) também é esgotado", async () => {
    const f = vi.fn(async () => resposta(429, { error: { message: "Too Many Requests" } }, { "retry-after": "10" }));
    const e = await pedir(f);
    expect(e).toBeInstanceOf(PoolEsgotadoError); expect(e.retryAfterMs).toBe(10_000);
  });
  it("429 simples em zaeon-flash continua rate_limit (não é pool)", async () => {
    const f = vi.fn(async () => resposta(429, { error: { message: "Too Many Requests" } }, { "retry-after": "10" }));
    const e = await gerar({ user: "oi", model: "zaeon-flash", rota: "gateway", ctx }, deps({ fetchImpl: f as any, env: envGw })).catch((x) => x);
    expect(e).not.toBeInstanceOf(PoolEsgotadoError); expect(e.classe).toBe("rate_limit");
  });
  it("ledger grava ok:false com a classe pool_esgotado", async () => {
    const f = vi.fn(async () => resposta(429, { error: { message: "No deployments available for selected model" } }));
    const d = deps({ fetchImpl: f as any, env: envGw });
    await gerar({ user: "oi", model: "zaeon-pool-lite", rota: "gateway", ctx }, d).catch(() => null);
    await new Promise((x) => setTimeout(x, 0));
    expect(d.linhas[0]).toMatchObject({ ok: false, erro: "pool_esgotado" });
  });
});
