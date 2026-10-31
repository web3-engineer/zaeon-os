import { describe, it, expect, vi } from "vitest";
import {
  permit,
  runTool,
  runToolByName,
  planAtLeast,
  type ToolDef,
  type ToolContext,
} from "./runtime";

// Gate do PR03: `runTool` NUNCA lança + `permit` nega por padrão quando o plano não cobre minPlan.
const ctx = (over: Partial<ToolContext> = {}): ToolContext => ({ plan: "free", execMode: "auto", ...over });
const def = (over: Partial<ToolDef> = {}): ToolDef => ({
  name: "t",
  runtime: "ts",
  risk: "read",
  minPlan: "free",
  schema: { name: "t", parameters: { type: "OBJECT" as any, properties: {} } } as any,
  async run() { return { ok: true, provenance: {} }; },
  ...over,
});

describe("runtime · planAtLeast", () => {
  it("ordena free<plus<pro<max (undefined = free)", () => {
    expect(planAtLeast("free", "free")).toBe(true);
    expect(planAtLeast("free", "pro")).toBe(false);
    expect(planAtLeast("max", "pro")).toBe(true);
    expect(planAtLeast(undefined, "plus")).toBe(false);
  });
});

describe("runtime · permit (deny-by-default)", () => {
  it("modo review/answer nega qualquer escrita, mesmo em auto e com aprovação", () => {
    expect(permit(def({ risk: "write" }), ctx({ taskMode: "review" }))).toBe("DENY");
    expect(permit(def({ risk: "destructive" }), ctx({ taskMode: "answer" }))).toBe("DENY");
    expect(permit(def({ risk: "read" }), ctx({ taskMode: "review" }))).toBe("ALLOW");
    expect(permit(def({ risk: "write" }), ctx({ taskMode: "change" }))).toBe("ALLOW");
  });
  it("nega quando o plano não cobre minPlan", () => {
    expect(permit(def({ minPlan: "pro" }), ctx({ plan: "free" }))).toBe("DENY");
    expect(permit(def({ minPlan: "pro" }), ctx({ plan: "max" }))).toBe("ALLOW");
  });
  it("destrutivo e GPU-por-demanda pedem aprovação", () => {
    expect(permit(def({ risk: "destructive" }), ctx())).toBe("REQUIRE_APPROVAL");
    expect(permit(def({ demandGpu: true }), ctx({ plan: "max" }))).toBe("REQUIRE_APPROVAL");
    expect(permit(def({ demandGpu: true }), ctx({ plan: "max", gpuAvailable: true }))).toBe("ALLOW");
  });
  it("guiado sobe write pra aprovação; auto libera leitura/geração", () => {
    expect(permit(def({ risk: "write" }), ctx({ execMode: "auto" }))).toBe("ALLOW");
    expect(permit(def({ risk: "write" }), ctx({ execMode: "guiado" }))).toBe("REQUIRE_APPROVAL");
    expect(permit(def({ risk: "read" }), ctx({ execMode: "guiado" }))).toBe("ALLOW");
  });
});

describe("runtime · runTool (nunca lança)", () => {
  const boom = def({ name: "boom", async run() { throw new Error("estourei"); } });
  it("libera o timer de prazo quando a ferramenta termina antes do timeout",async()=>{
    vi.useFakeTimers();
    try{
      const result=await runTool(def({timeoutMs:600_000}),{},ctx());
      expect(result.ok).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    }finally{vi.useRealTimers();}
  });

  it("tool que estoura → {ok:false,error} (não propaga a exceção)", async () => {
    const r = await runTool(boom, {}, ctx());
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/estourei/);
    expect(r.code).toBe("tool_error");
  });
  it("DENY por plano → {ok:false, code:tool_denied} sem chamar run()", async () => {
    const r = await runTool(def({ minPlan: "pro", async run() { throw new Error("não deveria rodar"); } }), {}, ctx({ plan: "free" }));
    expect(r.ok).toBe(false);
    expect(r.code).toBe("tool_denied");
  });
  it("REQUIRE_APPROVAL sem aprovador → needs_approval", async () => {
    const r = await runTool(def({ risk: "destructive" }), {}, ctx());
    expect(r.ok).toBe(false);
    expect(r.code).toBe("needs_approval");
  });
  it("REQUIRE_APPROVAL com aprovador true → roda", async () => {
    const r = await runTool(def({ risk: "destructive" }), {}, ctx(), { approve: async () => true });
    expect(r.ok).toBe(true);
  });
  it("resultado sem provenance é normalizado (contrato garantido)", async () => {
    const r = await runTool(def({ async run() { return { ok: true } as any; } }), {}, ctx());
    expect(r.ok).toBe(true);
    expect(r.provenance).toBeTruthy();
  });
});

describe("runtime · registry + tools Fase 0", () => {
  it("studio_generate devolve StudioRef normalizado", async () => {
    const r = await runToolByName("studio_generate", { kind: "mapa mental", topic: "fotossíntese" }, ctx());
    expect(r.ok).toBe(true);
    expect(r.artifact?.studioKind).toBe("mindmap");
    expect(r.artifact?.title).toMatch(/fotossíntese/);
  });
  it("research_generate exige tema", async () => {
    const vazio = await runToolByName("research_generate", { kind: "artigo" }, ctx());
    expect(vazio.ok).toBe(false);
    expect(vazio.code).toBe("missing_topic");
    const ok = await runToolByName("research_generate", { kind: "tcc", topic: "IA na educação" }, ctx());
    expect(ok.ok).toBe(true);
    expect(ok.artifact?.title).toMatch(/^TCC:/);
  });
  it("memory_search é stub memory_unavailable — free, nunca DENY por plano", async () => {
    const r = await runToolByName("memory_search", { query: "x" }, ctx({ plan: "free" }));
    expect(r.ok).toBe(false);
    expect(r.code).toBe("memory_unavailable");
  });
  it("literature_search é REAL: chama retrievePapers e devolve findings com fonte; vazio → no_results; erro → skill_error", async () => {
    const mod = await import("@/lib/scholar/retrieve");
    const spy = vi.spyOn(mod, "retrievePapers").mockResolvedValue({
      papers: [
        { id: "1", title: "Privacy in high-performance blockchains", authors: ["A", "B", "C", "D", "E"], year: 2024, doi: "10.1/x", abstract: "We study…", openAccess: true, sources: ["openalex", "crossref"] },
        { id: "2", title: "Zero-knowledge rollups", authors: [], openAccess: false, sources: ["arxiv"], url: "https://arxiv.org/abs/2" },
      ] as any, perSource: [], reachedMin: false,
    });
    const r = await runToolByName("literature_search", { query: "privacidade em blockchain de alta performance", domain: "cs" }, ctx({ plan: "free" }));
    expect(r.ok).toBe(true);
    expect(spy).toHaveBeenCalledWith("privacidade em blockchain de alta performance", expect.objectContaining({ domain: "cs" }));
    expect(r.findings).toHaveLength(2);
    expect(r.findings![0]).toMatchObject({ confidence: "alta", source: { title: "Privacy in high-performance blockchains", url: "https://doi.org/10.1/x", year: 2024, authors: "A, B, C, D" } });
    expect(r.findings![0]!.claim).toMatch(/\(2024\) — We study/);
    expect(r.findings![1]).toMatchObject({ confidence: "média", source: { url: "https://arxiv.org/abs/2" } });
    expect((r.provenance as any).sources).toHaveLength(2);
    spy.mockResolvedValue({ papers: [], perSource: [], reachedMin: false });
    expect((await runToolByName("literature_search", { query: "zzz" }, ctx())).code).toBe("no_results");
    spy.mockRejectedValue(new Error("rede"));
    expect((await runToolByName("literature_search", { query: "zzz" }, ctx())).code).toBe("skill_error");
    expect((await runToolByName("literature_search", { query: "" }, ctx())).code).toBe("bad_args");
    spy.mockRestore();
  });
  it("tool desconhecida → unknown_tool (deny-by-default)", async () => {
    const r = await runToolByName("does_not_exist", {}, ctx());
    expect(r.ok).toBe(false);
    expect(r.code).toBe("unknown_tool");
  });
});

describe("runtime · web_search + fallback do literature_search", () => {
  it("web_search sem provedor → web_unavailable (contorna, nunca lança); consulta vazia → bad_args", async () => {
    const env = { ...process.env }; delete process.env.SEARXNG_URL; delete process.env.TAVILY_API_KEY; delete process.env.BRAVE_API_KEY;
    expect((await runToolByName("web_search", { query: "x" }, ctx())).code).toBe("web_unavailable");
    expect((await runToolByName("web_search", { query: "" }, ctx())).code).toBe("bad_args");
    Object.assign(process.env, env);
  });
  it("web_search devolve Findings com fonte web (confiança baixa)", async () => {
    const mod = await import("@/lib/search/web");
    const spy = vi.spyOn(mod, "webSearch").mockResolvedValue({ ok: true, provider: "searxng", results: [{ title: "Solo", url: "https://solo.org", snippet: "ph ácido" }] });
    const r = await runToolByName("web_search", { query: "ph do solo" }, ctx());
    expect(r.ok).toBe(true); expect(r.findings![0]).toMatchObject({ confidence: "baixa", source: { title: "Solo", url: "https://solo.org" } });
    spy.mockRestore();
  });
  it("literature_search com bases vazias cai na WEB (não vira beco); web também vazia → no_results", async () => {
    const lit = await import("@/lib/scholar/retrieve"); const web = await import("@/lib/search/web");
    const s1 = vi.spyOn(lit, "retrievePapers").mockResolvedValue({ papers: [], perSource: [], reachedMin: false });
    const s2 = vi.spyOn(web, "webSearch").mockResolvedValue({ ok: true, provider: "tavily", results: [{ title: "W", url: "https://w.io", snippet: "s" }] });
    const r = await runToolByName("literature_search", { query: "tema raro" }, ctx());
    expect(r.ok).toBe(true); expect(r.findings![0]!.source!.url).toBe("https://w.io"); expect((r.provenance as any).toolsUsed).toEqual(["web_search"]);
    s2.mockResolvedValue({ ok: false, code: "web_unavailable", error: "x" });
    expect((await runToolByName("literature_search", { query: "tema raro" }, ctx())).code).toBe("no_results");
    s1.mockRestore(); s2.mockRestore();
  });
});

describe("runtime · #562 memory_search lê só a memória do turno", () => {
  it("com memoriaDe (Escritório em grupo), busca na memória do escritório — nunca na de quem mandou", async () => {
    const { __setMemoryForTest } = await import("./memory-provider");
    const escopos: unknown[] = [];
    __setMemoryForTest({ wakeUp: async () => [], write: async () => {}, search: async (_q, scope) => { escopos.push(scope); return []; } });
    try {
      await runToolByName("memory_search", { query: "o que combinamos" }, ctx({ userId: "a".repeat(24), memoriaDe: "d".repeat(24) }));
      await runToolByName("memory_search", { query: "o que combinamos" }, ctx({ userId: "a".repeat(24) }));
    } finally { __setMemoryForTest(null); }
    expect(escopos).toEqual([{ userId: "d".repeat(24) }, { userId: "a".repeat(24) }]);
  });
});
