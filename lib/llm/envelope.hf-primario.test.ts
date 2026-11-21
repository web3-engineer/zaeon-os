/**
 * LLM_PRIMARIO=hf (2026-11-21): o Hugging Face na frente, o Google como queda. Sem a flag, nada muda
 * (os testes de envelope.test.ts e envelope.reserva-rapida.test.ts seguem valendo byte a byte).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { gerar, gerarJsonStreamRes, apelidoNoGateway, ErroLlm, _zerarDisjuntorVertex, type Deps, type RespostaBruta } from "./envelope";
import { alvoDe } from "./pool";
import { USAGE_VAZIO } from "./usage";

beforeEach(() => _zerarDisjuntorVertex());

const ctx = { agentKey: "aura", surface: "estudos" as const };
const HFP = { HF_TOKEN: "hf_teste", LLM_PRIMARIO: "hf" } as Record<string, string | undefined>;
const bruta = (texto: string, modelo = "gemini-3.5-flash"): RespostaBruta => ({ texto, usage: USAGE_VAZIO, modelo });
const okHf = (content: string) => new Response(JSON.stringify({ model: "openai/gpt-oss-120b", choices: [{ message: { content }, finish_reason: "stop" }], usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 } }), { status: 200 });
const erroHf = (status: number) => new Response(JSON.stringify({ error: { message: `HTTP ${status}` } }), { status });
const corpo = (f: any, i = 0) => JSON.parse(f.mock.calls[i][1].body);

function deps(over: Partial<Deps> = {}): Deps & { linhas: any[] } {
  const linhas: any[] = [];
  return { registrar: async (l: any) => { linhas.push(l); return true; }, env: HFP, esperar: async () => {}, ...over, linhas } as any;
}

describe("LLM_PRIMARIO=hf — o HF serve primeiro", () => {
  it("serve SEM chamar o Vertex: gpt-oss-120b na Cerebras, reasoning low, JSON mode, ledger huggingface", async () => {
    const vertex = vi.fn(async () => bruta('{"via":"vertex"}'));
    const f = vi.fn(async () => okHf('{"via":"hf"}'));
    const d = deps({ vertex, fetchImpl: f as any });
    const r = await gerar({ system: "s", user: "oi", json: true, ctx }, d);
    expect(vertex).not.toHaveBeenCalled();
    expect(r.provedor).toBe("huggingface"); expect(r.alvo).toBe("huggingface"); expect(r.texto).toBe('{"via":"hf"}'); expect(r.jsonValido).toBe(true);
    expect((f.mock.calls as any[])[0][0]).toBe("https://router.huggingface.co/v1/chat/completions");
    const b = corpo(f);
    expect(b.model).toBe("openai/gpt-oss-120b:cerebras");
    expect(b.reasoning_effort).toBe("low");
    expect(b.response_format).toEqual({ type: "json_object" });
    expect((f.mock.calls as any[])[0][1].headers.Authorization).toBe("Bearer hf_teste");
    expect(d.linhas).toHaveLength(1);
    expect(d.linhas[0]).toMatchObject({ provedor: "huggingface", ok: true, alvo: "huggingface", model: "openai/gpt-oss-120b" });
  });

  it("aceita huggingface/HF em qualquer caixa; google/vertex/vazio = desligado", async () => {
    for (const v of ["HF", "huggingface", "Hugging-Face"]) {
      const vertex = vi.fn(async () => bruta("v"));
      await gerar({ user: "oi", ctx }, deps({ vertex, fetchImpl: vi.fn(async () => okHf("hf")) as any, env: { ...HFP, LLM_PRIMARIO: v } }));
      expect(vertex, v).not.toHaveBeenCalled();
    }
    for (const v of ["google", "vertex", "", undefined]) {
      const f = vi.fn(async () => okHf("hf"));
      const r = await gerar({ user: "oi", ctx }, deps({ vertex: async () => bruta("v"), fetchImpl: f as any, env: { ...HFP, LLM_PRIMARIO: v } }));
      expect(r.provedor, String(v)).toBe("vertex"); expect(f).not.toHaveBeenCalled();
    }
  });

  it("tier forte (GEMINI_MODEL_PRO) usa HF_PRIMARIO_MODELOS_PRO e pensa mais (medium)", async () => {
    const f = vi.fn(async () => okHf("forte"));
    await gerar({ user: "oi", model: "gemini-2.5-pro", ctx }, deps({ vertex: vi.fn(), fetchImpl: f as any, env: { ...HFP, HF_PRIMARIO_MODELOS_PRO: "zai-org/GLM-5.3:nebius" } }));
    expect(corpo(f).model).toBe("zai-org/GLM-5.3:nebius");
    expect(corpo(f).reasoning_effort).toBe("medium");
  });

  it("HF_PRIMARIO_MODELOS troca o tier rápido; o `pensar` da fase vira reasoning_effort (high fica high)", async () => {
    const f = vi.fn(async () => okHf("ok"));
    await gerar({ user: "oi", pensar: "high", ctx }, deps({ vertex: vi.fn(), fetchImpl: f as any, env: { ...HFP, HF_PRIMARIO_MODELOS: "Qwen/Qwen3.8-27B:cerebras" } }));
    expect(corpo(f).model).toBe("Qwen/Qwen3.8-27B:cerebras"); expect(corpo(f).reasoning_effort).toBe("high");
  });

  it("Cerebras falha → Groq, ainda sem Vertex", async () => {
    const vertex = vi.fn(async () => bruta("v"));
    const f = vi.fn().mockResolvedValueOnce(erroHf(503)).mockResolvedValueOnce(okHf("pela groq"));
    const r = await gerar({ user: "oi", ctx }, deps({ vertex, fetchImpl: f as any }));
    expect(r.texto).toBe("pela groq"); expect(vertex).not.toHaveBeenCalled();
    expect(corpo(f, 1).model).toBe("openai/gpt-oss-120b:groq");
  });

  it("HF inteiro fora (400 provedor desligado, 429) → o Google serve, e o ledger mostra as duas tentativas", async () => {
    const vertex = vi.fn(async () => bruta("pelo google"));
    const f = vi.fn().mockResolvedValueOnce(erroHf(400)).mockResolvedValueOnce(erroHf(429));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const d = deps({ vertex, fetchImpl: f as any });
    const r = await gerar({ user: "oi", ctx }, d);
    expect(r.provedor).toBe("vertex"); expect(r.texto).toBe("pelo google");
    expect(d.linhas.map((l) => `${l.provedor}:${l.ok}`)).toEqual(["huggingface:false", "huggingface:false", "vertex:true"]);
    expect(warn.mock.calls.flat().join(" ")).toMatch(/HF primário falhou em 2 modelo\(s\) — caindo para o Google/);
    warn.mockRestore();
  });

  it("HF vazio (reasoning comeu os tokens) conta como falha e passa pro próximo", async () => {
    const f = vi.fn().mockResolvedValueOnce(okHf("")).mockResolvedValueOnce(okHf("cheio"));
    const r = await gerar({ user: "oi", ctx }, deps({ vertex: vi.fn(), fetchImpl: f as any }));
    expect(r.texto).toBe("cheio");
  });

  it("HF e Google fora → o erro do GOOGLE (classificado), sem uma 2ª volta no HF", async () => {
    const f = vi.fn(async () => erroHf(503));
    const vertex = vi.fn(async (): Promise<RespostaBruta> => { throw Object.assign(new Error("429 Resource exhausted"), { status: 429 }); });
    const e = await gerar({ user: "oi", ctx }, deps({ vertex, fetchImpl: f as any })).catch((x) => x);
    expect(e).toBeInstanceOf(ErroLlm); expect(e.provedor).toBe("vertex"); expect(e.classe).toBe("rate_limit");
    expect(f).toHaveBeenCalledTimes(2);   // Cerebras + Groq, UMA vez cada
  });

  it("o servir normal do primário não loga (seria uma linha por pedido)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await gerar({ user: "oi", ctx }, deps({ vertex: vi.fn(), fetchImpl: vi.fn(async () => okHf("ok")) as any }));
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("HF_RESERVA=0 é o kill switch: com LLM_PRIMARIO=hf o Vertex serve e o HF nem é chamado", async () => {
    const f = vi.fn();
    const r = await gerar({ user: "oi", ctx }, deps({ vertex: async () => bruta("v"), fetchImpl: f as any, env: { ...HFP, HF_RESERVA: "0" } }));
    expect(r.provedor).toBe("vertex"); expect(f).not.toHaveBeenCalled();
  });

  it("sem HF_TOKEN a flag não liga nada", async () => {
    const f = vi.fn();
    const r = await gerar({ user: "oi", ctx }, deps({ vertex: async () => bruta("v"), fetchImpl: f as any, env: { LLM_PRIMARIO: "hf" } }));
    expect(r.provedor).toBe("vertex"); expect(f).not.toHaveBeenCalled();
  });

  it("pool grátis e Contabo continuam fora do HF (relançam como antes)", async () => {
    const f = vi.fn(async () => erroHf(503));
    const env = { ...HFP, GATEWAY_URL: "http://g", GATEWAY_KEY_DEFAULT: "k" };
    await expect(gerar({ user: "oi", model: "zaeon-pool-lite", rota: "gateway", ctx }, deps({ fetchImpl: f as any, env }))).rejects.toBeInstanceOf(ErroLlm);
    await expect(gerar({ user: "oi", model: "zaeon-local-lfm2", rota: "gateway", ctx }, deps({ fetchImpl: f as any, env }))).rejects.toBeInstanceOf(ErroLlm);
    for (const c of f.mock.calls as any[]) expect(String(c[0])).not.toContain("huggingface");
  });
});

describe("LLM_PRIMARIO=hf — stream do chat", () => {
  it("gerarJsonStreamRes não abre o stream do Vertex: o HF responde pela chamada normal", async () => {
    const vertexStream = vi.fn();
    const vertex = vi.fn();
    const { valor, res } = await gerarJsonStreamRes<{ nucleo: string }>({ system: "s", user: "u", ctx }, () => {}, deps({ vertex, vertexStream, fetchImpl: vi.fn(async () => okHf('{"nucleo":"hf"}')) as any }));
    expect(vertexStream).not.toHaveBeenCalled(); expect(vertex).not.toHaveBeenCalled();
    expect(valor.nucleo).toBe("hf"); expect(res.provedor).toBe("huggingface");
  });
  it("sem a flag o stream do Vertex segue sendo o caminho", async () => {
    const vertexStream = vi.fn(async (_r: any, m: string, on: (a: string) => void) => { on('{"nucleo":"v'); return bruta('{"nucleo":"vertex"}', m); });
    const { valor } = await gerarJsonStreamRes<{ nucleo: string }>({ system: "s", user: "u", ctx }, () => {}, deps({ vertexStream, env: { HF_TOKEN: "hf_teste" } }));
    expect(vertexStream).toHaveBeenCalledTimes(1); expect(valor.nucleo).toBe("vertex");
  });
});

describe("LLM_PRIMARIO=hf — gateway (camada autônoma)", () => {
  it("apelido: zaeon-flash/zaeon-pro viram zaeon-hf-flash/zaeon-hf-pro só com a flag", () => {
    expect(apelidoNoGateway("gemini-3.5-flash")).toBe("zaeon-flash");
    expect(apelidoNoGateway("gemini-3.5-flash", HFP)).toBe("zaeon-hf-flash");
    expect(apelidoNoGateway("gemini-2.5-pro", HFP)).toBe("zaeon-hf-pro");
    expect(apelidoNoGateway("zaeon-flash", HFP)).toBe("zaeon-hf-flash");
    expect(apelidoNoGateway("zaeon-pool-lite", HFP)).toBe("zaeon-pool-lite");
    expect(apelidoNoGateway("zaeon-local-coder", HFP)).toBe("zaeon-local-coder");
    expect(apelidoNoGateway("vertex_ai/gemini-3.5-flash", HFP)).toBe("vertex_ai/gemini-3.5-flash");   // Octa pede o modelo real
  });

  it("pede zaeon-hf-flash ao gateway; header hf-* → alvo huggingface", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ model: "openai/gpt-oss-120b", choices: [{ message: { content: "ok" } }], usage: {} }), { status: 200, headers: { "x-litellm-model-id": "hf-flash-cerebras" } }));
    const r = await gerar({ user: "oi", model: "gemini-3.5-flash", rota: "gateway", ctx }, deps({ fetchImpl: f as any, env: { ...HFP, GATEWAY_URL: "http://g", GATEWAY_KEY_DEFAULT: "k" } }));
    expect(corpo(f).model).toBe("zaeon-hf-flash");
    expect(r.provedor).toBe("litellm"); expect(r.alvo).toBe("huggingface");
  });

  it("a cadeia do gateway caiu no Google (header vertex-flash) → alvo vertex", () => {
    expect(alvoDe("gemini-3.5-flash", "vertex-flash")).toBe("vertex");
    expect(alvoDe("openai/gpt-oss-120b", "hf-pro-cerebras")).toBe("huggingface");
    expect(alvoDe("zaeon-hf-flash", null)).toBe("huggingface");
  });

  it("key do agente sem os grupos zaeon-hf-* (403) → HF direto, depois Google", async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "key_model_access_denied" } }), { status: 403 }))
      .mockResolvedValueOnce(okHf("hf direto"));
    const vertex = vi.fn();
    const r = await gerar({ user: "oi", rota: "gateway", ctx }, deps({ vertex, fetchImpl: f as any, env: { ...HFP, GATEWAY_URL: "http://g", GATEWAY_KEY_DEFAULT: "k" } }));
    expect(r.provedor).toBe("huggingface"); expect(vertex).not.toHaveBeenCalled();
    expect(String(f.mock.calls[1][0])).toBe("https://router.huggingface.co/v1/chat/completions");
  });
});
