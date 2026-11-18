import { describe, it, expect, vi, beforeEach } from "vitest";
import { gerarLocal, gerarLocalJson, localLigado, grupoDe, GRUPOS, _emVoo } from "./local";
import type { Deps } from "./envelope";

const ctx = { agentKey: "aura", surface: "estudos" as const };
const ENV = { GATEWAY_URL: "http://litellm:4000", GATEWAY_KEY_LOCAL: "sk-local", GATEWAY_KEY_AURA: "sk-aura" };
const resposta = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
const okLocal = (content: string) =>
  resposta(200, { model: "qwen3-coder", choices: [{ message: { content }, finish_reason: "stop" }], usage: { prompt_tokens: 50, completion_tokens: 5, total_tokens: 55 } }, { "x-litellm-model-id": "contabo-coder" });

function deps(over: Partial<Deps> = {}): Deps & { linhas: any[]; vertexModelos: string[] } {
  const linhas: any[] = []; const vertexModelos: string[] = [];
  return {
    vertex: async (_req: unknown, modelo: string) => { vertexModelos.push(modelo); return { texto: '{"via":"google"}', usage: { promptTokens: 1, completionTokens: 1, cachedTokens: 0, totalTokens: 2, reportado: true }, modelo }; },
    registrar: async (l: any) => { linhas.push(l); return true; },
    env: ENV, ...over, linhas, vertexModelos,
  } as any;
}
const tick = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => { _emVoo["zaeon-local-lfm2"] = 0; _emVoo["zaeon-local-coder"] = 0; vi.spyOn(console, "warn").mockImplementation(() => {}); });

describe("localLigado / grupoDe", () => {
  it("ligado por default com gateway + key; LOCAL_DIRETO '0'/'off' desliga o gate inteiro", () => {
    expect(localLigado(ENV)).toBe(true);
    expect(localLigado({ ...ENV, LOCAL_DIRETO: "0" })).toBe(false);
    expect(localLigado({ ...ENV, LOCAL_DIRETO: "off" })).toBe(false);
  });
  it("sem GATEWAY_URL ou sem key que enxergue zaeon-local-* → desligado", () => {
    expect(localLigado({ GATEWAY_KEY_LOCAL: "k" })).toBe(false);
    expect(localLigado({ GATEWAY_URL: "http://g", GATEWAY_KEY_AURA: "k" })).toBe(false);
  });
  it("grupoDe mapeia os modelos e respeita o override de env", () => {
    expect(grupoDe("texto", ENV)).toBe("zaeon-local-lfm2");
    expect(grupoDe("codigo", ENV)).toBe("zaeon-local-coder");
    expect(grupoDe("codigo", { ...ENV, LOCAL_CODIGO_MODELO: "zaeon-local-outro" })).toBe("zaeon-local-outro");
    expect(GRUPOS.texto.grupo).toBe("zaeon-local-lfm2");
  });
});

describe("gerarLocal — local-first", () => {
  it('codigo → zaeon-local-coder no gateway, key local, SEM system só no user; ledger alvo contabo', async () => {
    const f = vi.fn(async () => okLocal("function soma(a,b){return a+b}"));
    const d = deps({ fetchImpl: f as any });
    const r = await gerarLocal({ modelo: "codigo", google: ["gemini-2.5-pro"] }, { system: "s", user: "escreve soma", ctx }, d);
    expect(r.local).toBe(true); expect(r.alvo).toBe("contabo"); expect(r.fallback).toBeUndefined();
    const [url, init] = (f.mock.calls[0] as any);
    expect(url).toBe("http://litellm:4000/v1/chat/completions");
    expect(init.headers.Authorization).toBe("Bearer sk-local");
    expect(JSON.parse(init.body).model).toBe("zaeon-local-coder");
    expect(d.vertexModelos).toEqual([]);
    await tick();
    expect(d.linhas).toHaveLength(1); expect(d.linhas[0]).toMatchObject({ alvo: "contabo", ok: true });
  });
  it('modelo "texto" bate no zaeon-local-lfm2 (a outra porta do gate)', async () => {
    const f = vi.fn(async () => okLocal("resposta curta"));
    const d = deps({ fetchImpl: f as any });
    const r = await gerarLocal({ modelo: "texto", google: ["g"] }, { user: "u", ctx }, d);
    expect(r.local).toBe(true);
    expect(JSON.parse((f.mock.calls[0] as any)[1].body).model).toBe("zaeon-local-lfm2");
  });
});

describe("gerarLocal — fallback Google", () => {
  it("Contabo 500 → Google (rota vertex) na mesma chamada; ledger contabo ok:false + vertex ok:true", async () => {
    const f = vi.fn(async () => resposta(500, { error: { message: "ollama down" } }));
    const d = deps({ fetchImpl: f as any });
    const r = await gerarLocal({ modelo: "texto", google: ["gemini-flash"] }, { user: "u", ctx }, d);
    expect(r.local).toBe(false); expect(r.fallback).toBe("erro"); expect(r.alvo).toBe("vertex"); expect(r.texto).toBe('{"via":"google"}');
    expect(d.vertexModelos).toEqual(["gemini-flash"]);
    await tick();
    expect(d.linhas.map((l) => [l.alvo, l.ok])).toEqual([["contabo", false], ["vertex", true]]);
  });
  it("resposta vazia (só pensamento) → Google", async () => {
    const f = vi.fn(async () => okLocal("<think>pensando…</think>"));
    const r = await gerarLocal({ modelo: "texto", google: ["g"] }, { user: "u", ctx }, deps({ fetchImpl: f as any }));
    expect(r.fallback).toBe("vazio"); expect(r.local).toBe(false);
  });
  it("systemGoogle: o local vai só com o user; o Google recebe o system", async () => {
    const f = vi.fn(async () => resposta(500, { error: { message: "x" } }));
    const vistos: any[] = [];
    const d = deps({
      fetchImpl: f as any,
      vertex: async (req, modelo) => { vistos.push([modelo, req.system]); return { texto: "safe", usage: { promptTokens: 1, completionTokens: 1, cachedTokens: 0, totalTokens: 2, reportado: true }, modelo }; },
    });
    const r = await gerarLocal({ modelo: "texto", google: ["g1"], systemGoogle: "SYS" }, { user: "oi", ctx }, d);
    expect(r.texto).toBe("safe"); expect(vistos).toEqual([["g1", "SYS"]]);
    expect(JSON.parse((f.mock.calls[0] as any)[1].body).messages[0].role).toBe("user");
  });
  it("gate PURO (google:[]) → o local falhou e o erro sobe, SEM tocar no Google", async () => {
    const f = vi.fn(async () => resposta(500, { error: { message: "x" } }));
    const d = deps({ fetchImpl: f as any });
    await expect(gerarLocal({ modelo: "codigo", google: [] }, { user: "u", ctx }, d)).rejects.toThrow(/indispon[ií]vel \(erro\).*sem fallback/);
    expect(d.vertexModelos).toEqual([]);
  });
  it("flag LOCAL_DIRETO=0 → Google direto, ZERO fetch na Contabo", async () => {
    const f = vi.fn();
    const r = await gerarLocal({ modelo: "texto", google: ["g"] }, { user: "u", ctx }, deps({ fetchImpl: f as any, env: { ...ENV, LOCAL_DIRETO: "0" } }));
    expect(f).not.toHaveBeenCalled(); expect(r.fallback).toBe("desligado"); expect(r.local).toBe(false);
  });
  it("teto em voo por GRUPO: grupo ocupado vai direto pro Google (não enfileira na CPU)", async () => {
    _emVoo["zaeon-local-coder"] = 1;
    const f = vi.fn();
    const r = await gerarLocal({ modelo: "codigo", google: ["g"], maxEmVoo: 1 }, { user: "u", ctx }, deps({ fetchImpl: f as any }));
    expect(f).not.toHaveBeenCalled(); expect(r.fallback).toBe("ocupado");
    // o grupo "texto" segue livre — tetos independentes por grupo real
    const g = vi.fn(async () => okLocal("ok"));
    const r2 = await gerarLocal({ modelo: "texto", google: ["g"] }, { user: "u", ctx }, deps({ fetchImpl: g as any }));
    expect(r2.local).toBe(true);
  });
  it("o contador em voo volta a zero depois de erro", async () => {
    const f = vi.fn(async () => resposta(503, { error: { message: "x" } }));
    await gerarLocal({ modelo: "codigo", google: ["g"] }, { user: "u", ctx }, deps({ fetchImpl: f as any }));
    expect(_emVoo["zaeon-local-coder"]).toBe(0);
  });
  it("Contabo E Google fora → erro sobe pra quem chamou", async () => {
    const f = vi.fn(async () => resposta(500, { error: { message: "x" } }));
    const d = deps({ fetchImpl: f as any, vertex: async () => { throw new Error("vertex 503"); } });
    await expect(gerarLocal({ modelo: "texto", google: ["g"] }, { user: "u", ctx }, d)).rejects.toThrow(/vertex 503/);
  });
});

describe("gerarLocalJson", () => {
  it("JSON com conversa em volta é aproveitado (não gasta Google à toa)", async () => {
    const f = vi.fn(async () => okLocal('Pronto: {"score":0.8} ok'));
    const { valor, res } = await gerarLocalJson<{ score: number }>({ modelo: "codigo", google: ["g"] }, { user: "u", ctx }, deps({ fetchImpl: f as any }));
    expect(res.local).toBe(true); expect(valor.score).toBe(0.8);
  });
  it("resposta local sem JSON → Google", async () => {
    const f = vi.fn(async () => okLocal("claro! aqui vai sem json"));
    const { valor, res } = await gerarLocalJson<{ via: string }>({ modelo: "codigo", google: ["g"] }, { user: "u", ctx }, deps({ fetchImpl: f as any }));
    expect(res.fallback).toBe("vazio"); expect(valor).toEqual({ via: "google" });
  });
});
