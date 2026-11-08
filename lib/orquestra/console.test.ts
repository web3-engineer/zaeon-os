import { describe, it, expect, vi, beforeEach } from "vitest";

const findMany = vi.fn();
const findUnique = vi.fn();
const ledgerFindMany = vi.fn();
vi.mock("@/src/lib/prisma", () => ({ prisma: { orquestraTarefa: { findMany, findUnique }, tokenLedger: { findMany: ledgerFindMany } } }));

import {
  autorizar, detalheDe, dispararArena, lerPedidoArena, linhaDoDataset, metricasDe, montarPainel, resumoDe, tokenValido,
  type LinhaTarefa,
} from "@/lib/orquestra/console";

const TOKEN = "t".repeat(40);
const linha = (extra: Partial<LinhaTarefa> = {}): LinhaTarefa => ({
  id: "a".repeat(24), criadaEm: new Date("2026-11-08T05:00:00Z"), atualizadaEm: new Date("2026-11-08T05:03:00Z"),
  status: "concluida", origem: "chat", motor: "kimi-enxame", nomeMotor: "Kimi K2.6 · enxame", formato: "enxame",
  intent: "criar_trabalho", plano: "max", objetivo: "Escreva um artigo sobre CRISPR",
  relatorio: { ms: 180_000, uso: { custoUsd: 0.4 }, subagentes: 6, evidencias: 30, citadas: 18, invalidas: 1, cobertura: 0.8, aprovado: true, degradado: false },
  ...extra,
});

describe("console · autenticação", () => {
  it("Bearer só vale com token de ≥ 32 caracteres no env, em tempo constante", () => {
    expect(tokenValido(`Bearer ${TOKEN}`, { ORQUESTRA_CONSOLE_TOKEN: TOKEN })).toBe(true);
    expect(tokenValido(`Bearer ${TOKEN}x`, { ORQUESTRA_CONSOLE_TOKEN: TOKEN })).toBe(false);
    expect(tokenValido(`Bearer curto`, { ORQUESTRA_CONSOLE_TOKEN: "curto" })).toBe(false); // token fraco = caminho desligado
    expect(tokenValido(`Bearer ${TOKEN}`, {})).toBe(false);
    expect(tokenValido(null, { ORQUESTRA_CONSOLE_TOKEN: TOKEN })).toBe(false);
  });
  it("sem token, só super-admin passa; sessão que falha = negado", async () => {
    const req = new Request("http://x/api/admin/orquestra/painel");
    expect(await autorizar(req, {}, async () => ({ email: "qualquer@x.com", role: "student" }))).toBe(false);
    expect(await autorizar(req, {}, async () => ({ email: "x@x.com", role: "super_admin" }))).toBe(true);
    expect(await autorizar(req, {}, async () => { throw new Error("next-auth fora"); })).toBe(false);
    expect(await autorizar(new Request("http://x", { headers: { authorization: `Bearer ${TOKEN}` } }), { ORQUESTRA_CONSOLE_TOKEN: TOKEN })).toBe(true);
  });
});

describe("console · tarefas e métricas", () => {
  it("resumo segue o contrato; rodando tem métricas nulas", () => {
    expect(resumoDe(linha())).toMatchObject({ id: "a".repeat(24), status: "concluida", ms: 180_000, custoUsd: 0.4, invalidas: 1, aprovado: true, criadaEm: "2026-11-08T05:00:00.000Z" });
    expect(resumoDe(linha({ status: "rodando", relatorio: null }))).toMatchObject({ ms: null, custoUsd: null, aprovado: null });
  });
  it("métricas por motor: p50/p90, custo, fallbacks, citações inventadas", () => {
    const ts = [linha(), linha({ relatorio: { ms: 60_000, uso: { custoUsd: 0.2 }, invalidas: 0, cobertura: 1, subagentes: 2, degradado: true } }), linha({ status: "fallback", relatorio: { ms: 5_000 } })].map(resumoDe);
    const m = metricasDe(ts);
    expect(m).toMatchObject({ tarefas: 3, concluidas: 2, fallbacks: 1, degradadas: 1, citacoesInventadas: 1, msP50: 180_000 });
    expect(m.custoTotalUsd).toBeCloseTo(0.6);
    expect(m.coberturaMedia).toBeCloseTo(0.9);
  });
  it("detalhe junta a trilha e o ledger da tarefa", () => {
    const d = detalheDe(linha({ eventos: [{ t: 10, fase: "enxame", rotulo: "criou 3" }], evidencias: [{ chave: "E1" }], texto: "x [E1]" }), [
      { at: new Date("2026-11-08T05:00:01Z"), model: "kimi-k2.6", provedor: "moonshot", phase: "orquestra", promptTokens: 10, completionTokens: 5, ms: 900, ok: true, erro: null, estimatedCostUsd: 0.001 },
    ]);
    expect(d.tarefa.eventos).toHaveLength(1);
    expect(d.tarefa.ledger[0]).toMatchObject({ model: "kimi-k2.6", custoUsd: 0.001, at: "2026-11-08T05:00:01.000Z" });
    expect(d.tarefa.texto).toBe("x [E1]");
  });
  it("linha do dataset NUNCA leva userId", () => {
    const l = linhaDoDataset({ ...linha(), userId: "b".repeat(24) } as any);
    expect(JSON.stringify(l)).not.toContain("b".repeat(24));
    expect(l).toMatchObject({ motor: "kimi-enxame", pedido: "Escreva um artigo sobre CRISPR" });
  });
});

describe("console · painel", () => {
  it("lista a Aura + motores com modelos, rotas configuradas, preço, ferramentas, datasets, prompt e métricas", async () => {
    const env = { MOONSHOT_API_KEY: "k", DEEPSEEK_API_KEY: "d", RAG_PG_URL: "postgres://x", ORQUESTRA: "sombra" };
    const p = await montarPainel({ env, tarefas: async () => [linha()], contagem: async () => new Map([["area:medicina", { documentos: 3, trechos: 90 }]]) });
    expect(p.modo).toBe("sombra");
    const ids = p.motores.map((m) => m.id);
    expect(ids.slice(0, 5)).toEqual(["aura", "deepseek-v4-profundo", "tongyi-deepresearch", "kimi-enxame", "enxame-misto"]);
    const kimi = p.motores.find((m) => m.id === "kimi-enxame")!;
    expect(kimi.disponivel).toBe(true);
    expect(kimi.modelos[0].rotas).toEqual([{ provedor: "moonshot", modelo: "kimi-k2.6", configurado: true }, { provedor: "openrouter", modelo: "moonshotai/kimi-k2.6", configurado: false }]);
    expect(kimi.modelos[0].preco).toMatchObject({ prompt: 0.95 });
    expect(kimi.ferramentas).toEqual(expect.arrayContaining(["literature_search", "base_conhecimento", "delegar"]));
    expect(kimi.datasets).toContain("rag:area:medicina");
    expect(kimi.prompt).toContain("ORQUESTRADOR");
    expect(kimi.metricas.tarefas).toBe(1);
    expect(p.motores.find((m) => m.id === "tongyi-deepresearch")!.disponivel).toBe(false);
    expect(p.datasets.find((d) => d.id === "rag:area:medicina")).toMatchObject({ trechos: 90, conectado: true });
    expect(p.tarefas[0].id).toBe("a".repeat(24));
  });
  it("sem RAG, nenhum motor de fora promete a base da casa", async () => {
    const p = await montarPainel({ env: { MOONSHOT_API_KEY: "k" }, tarefas: async () => [], contagem: async () => null });
    expect(p.motores.find((m) => m.id === "kimi-enxame")!.ferramentas).not.toContain("base_conhecimento");
    expect(p.ferramentas.map((f) => f.nome)).not.toContain("base_conhecimento");
  });
});

describe("console · arena", () => {
  it("valida o pedido", () => {
    const ok = lerPedidoArena({ objetivo: "Escreva um artigo sobre CRISPR", intent: "criar_trabalho", kind: "artigo", motores: ["aura", "kimi-enxame", "kimi-enxame"] }, ["kimi-enxame"]);
    expect(ok).toEqual({ objetivo: "Escreva um artigo sobre CRISPR", intent: "criar_trabalho", kind: "artigo", motores: ["aura", "kimi-enxame"] });
    expect(lerPedidoArena({ objetivo: "curto", intent: "criar_trabalho", motores: ["aura"] }, [])).toMatch(/curto/);
    expect(lerPedidoArena({ objetivo: "x".repeat(20), intent: "conversa", motores: ["aura"] }, [])).toMatch(/intent/);
    expect(lerPedidoArena({ objetivo: "x".repeat(20), intent: "revisar", motores: ["tongyi-deepresearch"] }, [])).toMatch(/desconhecido/);
    expect(lerPedidoArena({ objetivo: "x".repeat(20), intent: "revisar", motores: ["a", "b", "c", "d", "e"] }, ["a", "b", "c", "d", "e"])).toMatch(/no máximo 4/);
  });
  it("reserva um id por motor e roda em segundo plano", async () => {
    const rodar = vi.fn(async () => {});
    const ids = dispararArena({ objetivo: "x".repeat(20), intent: "revisar", motores: ["aura", "kimi-enxame"] }, { rodar });
    expect(ids).toHaveLength(2);
    ids.forEach((id) => expect(id).toMatch(/^[a-f0-9]{24}$/));
    await Promise.resolve();
    expect(rodar.mock.calls.map((c: any[]) => c[1])).toEqual(["aura", "kimi-enxame"]);
  });
});

describe("rotas /api/admin/orquestra", () => {
  beforeEach(() => { findMany.mockReset().mockResolvedValue([linha()]); findUnique.mockReset(); ledgerFindMany.mockReset().mockResolvedValue([]); });
  const comToken = (url: string, init: RequestInit = {}) => new Request(url, { ...init, headers: { ...(init.headers ?? {}), authorization: `Bearer ${TOKEN}` } });

  it("painel: 401 sem credencial, 200 com o token", async () => {
    vi.stubEnv("ORQUESTRA_CONSOLE_TOKEN", TOKEN);
    const { GET } = await import("@/app/api/admin/orquestra/painel/route");
    expect((await GET(new Request("http://x/api/admin/orquestra/painel"))).status).toBe(401);
    const r = await GET(comToken("http://x/api/admin/orquestra/painel"));
    expect(r.status).toBe(200);
    const corpo = await r.json();
    expect(corpo.motores[0].id).toBe("aura");
    expect(corpo.tarefas[0].motor).toBe("kimi-enxame");
    vi.unstubAllEnvs();
  });

  it("detalhe: 404 pra id inválido ou inexistente; 200 com o ledger", async () => {
    vi.stubEnv("ORQUESTRA_CONSOLE_TOKEN", TOKEN);
    const { GET } = await import("@/app/api/admin/orquestra/tarefas/[id]/route");
    expect((await GET(comToken("http://x"), { params: { id: "nao-e-id" } })).status).toBe(404);
    findUnique.mockResolvedValueOnce(null);
    expect((await GET(comToken("http://x"), { params: { id: "a".repeat(24) } })).status).toBe(404);
    findUnique.mockResolvedValueOnce(linha({ eventos: [], evidencias: [], texto: "ok" }));
    const r = await GET(comToken("http://x"), { params: { id: "a".repeat(24) } });
    expect(r.status).toBe(200);
    expect(ledgerFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { taskId: "a".repeat(24) } }));
    vi.unstubAllEnvs();
  });

  it("arena: 400 pra corpo inválido; exportar: 503 sem datasets do HF", async () => {
    vi.stubEnv("ORQUESTRA_CONSOLE_TOKEN", TOKEN);
    const arena = await import("@/app/api/admin/orquestra/arena/route");
    expect((await arena.POST(comToken("http://x", { method: "POST", body: JSON.stringify({ objetivo: "x" }) }))).status).toBe(400);
    vi.stubEnv("HF_DATASETS_TOKEN", "");
    const exp = await import("@/app/api/admin/orquestra/exportar/route");
    const r = await exp.POST(comToken("http://x", { method: "POST", body: "{}" }));
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ erro: "datasets_desligados" });
    vi.unstubAllEnvs();
  });
});
