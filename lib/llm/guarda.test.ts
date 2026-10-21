import { describe, it, expect, vi, beforeEach } from "vitest";
import { lerVeredito, moderar, auditarEntrada, GUARDA_SYSTEM } from "./guarda";
import { _emVoo } from "./papeis";
import type { Deps } from "./envelope";

const ENV = { GATEWAY_URL: "http://litellm:4000", GATEWAY_KEY_LOCAL: "sk-local" };
const local = (content: string) => vi.fn(async () => new Response(JSON.stringify({ model: "llama-guard", choices: [{ message: { content } }] }), { status: 200, headers: { "x-litellm-model-id": "contabo-guard" } }));
const deps = (over: Partial<Deps> = {}): Deps => ({ env: ENV, registrar: async () => true, vertex: async (_r, modelo) => ({ texto: "safe", usage: { promptTokens: 0, completionTokens: 0, cachedTokens: 0, totalTokens: 0, reportado: false }, modelo }), ...over });

beforeEach(() => { _emVoo.guarda = 0; });

describe("lerVeredito", () => {
  it("safe / unsafe + categorias; texto ilegível = null (não vira 'seguro')", () => {
    expect(lerVeredito("safe")).toEqual({ seguro: true, categorias: [] });
    expect(lerVeredito("\n\nunsafe\nS1,S10")).toEqual({ seguro: false, categorias: ["S1", "S10"] });
    expect(lerVeredito("unsafe\ns11")).toEqual({ seguro: false, categorias: ["S11"] });
    expect(lerVeredito("não sei")).toBeNull();
  });
});

describe("moderar", () => {
  it("llama-guard da Contabo responde → alvo contabo", async () => {
    const f = local("unsafe\nS9");
    const m = await moderar("como faço uma bomba", { surface: "estudos" }, deps({ fetchImpl: f as any }));
    expect(m).toMatchObject({ seguro: false, categorias: ["S9"], alvo: "contabo" });
    expect(JSON.parse((f.mock.calls[0] as any)[1].body).model).toBe("zaeon-local-guard");
  });
  it("Contabo fora → Google com o system da taxonomia, mesmo formato", async () => {
    const f = vi.fn(async () => new Response("{}", { status: 502 }));
    let sys: string | undefined;
    const m = await moderar("oi", { surface: "pesquisa" }, deps({ fetchImpl: f as any, vertex: async (req, modelo) => { sys = req.system; return { texto: "safe", usage: { promptTokens: 0, completionTokens: 0, cachedTokens: 0, totalTokens: 0, reportado: false }, modelo }; } }));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(m).toMatchObject({ seguro: true, alvo: "vertex", fallback: "erro" });
    expect(sys).toBe(GUARDA_SYSTEM);
  });
  it("saída local fora do formato → Google", async () => {
    const m = await moderar("oi", { surface: "estudos" }, deps({ fetchImpl: local("I cannot help") as any }));
    expect(m).toMatchObject({ alvo: "vertex", fallback: "vazio" });
  });
});

describe("auditarEntrada (fire-and-forget do runChatTurn)", () => {
  it("insegura → 1 warn com categorias, SEM o texto do aluno", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await auditarEntrada({ userId: "u1", surface: "estudos", prompt: "texto-secreto-do-aluno" }, deps({ fetchImpl: local("unsafe\nS10") as any }));
    const linha = warn.mock.calls.map((c) => String(c[0])).find((s) => s.startsWith("[guarda]"))!;
    expect(linha).toContain("cat=S10"); expect(linha).toContain("user=u1"); expect(linha).not.toContain("texto-secreto");
    warn.mockRestore();
  });
  it("nunca lança: tudo fora → null", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const r = await auditarEntrada({ userId: null, surface: "estudos", prompt: "oi" }, deps({ fetchImpl: vi.fn(async () => { throw new Error("rede"); }) as any, vertex: async () => { throw new Error("vertex"); } }));
    expect(r).toBeNull();
  });
  it("prompt vazio não chama ninguém", async () => {
    const f = vi.fn();
    expect(await auditarEntrada({ userId: null, surface: "estudos", prompt: "  " }, deps({ fetchImpl: f as any }))).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });
});
