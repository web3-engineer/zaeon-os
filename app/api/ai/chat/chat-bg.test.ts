import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({
  userId: "u1" as string | null, create: vi.fn(), get: vi.fn(), saveError: vi.fn(), enqueue: vi.fn(), runInline: vi.fn(),
}));
vi.mock("@google-cloud/vertexai", () => ({ VertexAI: class { getGenerativeModel() { return {}; } } }));
vi.mock("@/lib/ai/vertex-credentials", () => ({ vertexCredentials: () => ({ project: "p", client_email: "e", private_key: "k", location: "l" }) }));
vi.mock("@/src/lib/ratelimit", () => ({ guard: async () => ({ ok: true }) }));
vi.mock("@/lib/agent/transcript", () => ({ resolveUserId: async () => m.userId }));
vi.mock("@/lib/agent/chat-turn-store", async (o) => ({ ...(await o<any>()), createTurn: m.create, getTurnForUser: m.get, saveError: m.saveError }));
vi.mock("@/lib/queue/chat", () => ({ enqueueChatJob: m.enqueue }));
vi.mock("@/lib/agent/runChatTurn", () => ({ runChatTurn: m.runInline }));

import { POST } from "@/app/api/ai/chat/route";

const corpo = (x: any = {}) => ({ prompt: "o que é luz?", agent: "aura", stream: true, history: [], agentContext: { cartolinaScopeId: "aba1" }, ...x });
const post = (b: any) => POST(new Request("http://x/", { method: "POST", body: JSON.stringify(b) }));
const ler = async (r: Response) => await r.text();

beforeEach(() => {
  process.env.CHAT_BG = "1"; m.userId = "u1";
  Object.values(m).forEach((f: any) => f?.mockReset?.());
  m.create.mockResolvedValue({ id: "T1" });
  m.enqueue.mockResolvedValue(true);
  m.saveError.mockResolvedValue(undefined);
  m.get.mockResolvedValue({ status: "done", partial: "", answer: { mode: "text", text: "resposta do worker" }, error: null });
  m.runInline.mockResolvedValue({ mode: "text", text: "resposta inline" });
});

describe("POST /api/ai/chat — Fase 3", () => {
  it("CHAT_BG=1 com sessão: cria ChatTurn, enfileira, devolve turnId no header e acompanha até o fim", async () => {
    const r = await post(corpo());
    expect(r.headers.get("X-Chat-Turn-Id")).toBe("T1");
    expect(await ler(r)).toContain("resposta do worker");
    expect(m.create).toHaveBeenCalledWith({ userId: "u1", surface: "estudos", scopeId: "aba1", prompt: "o que é luz?" });
    expect(m.enqueue.mock.calls[0][0]).toMatchObject({ turnId: "T1", userId: "u1", prompt: "o que é luz?" });
    expect(m.runInline).not.toHaveBeenCalled();
  });
  it("o dono do turno vem da SESSÃO, nunca do corpo", async () => {
    await (await post(corpo({ userId: "atacante", agentContext: { userId: "atacante" } }))).text();
    expect(m.create.mock.calls[0][0].userId).toBe("u1");
    expect(m.enqueue.mock.calls[0][0].userId).toBe("u1");
  });
  it("superfície pesquisa vira surface pesquisa no turno", async () => {
    await (await post(corpo({ surface: "pesquisa" }))).text();
    expect(m.create.mock.calls[0][0].surface).toBe("pesquisa");
  });
  it("CHAT_BG off: inline idêntico a hoje (sem ChatTurn, sem header)", async () => {
    delete process.env.CHAT_BG;
    const r = await post(corpo());
    expect(r.headers.get("X-Chat-Turn-Id")).toBeNull();
    expect(await ler(r)).toContain("resposta inline");
    expect(m.create).not.toHaveBeenCalled();
    expect(m.runInline.mock.calls[0][0]).toBeNull(); // turnId null = nada persiste
  });
  it("sem sessão: anônimo segue inline (a flag não quebra quem não loga)", async () => {
    m.userId = null;
    const r = await post(corpo());
    expect(await ler(r)).toContain("resposta inline");
    expect(m.create).not.toHaveBeenCalled();
  });
  it("fila indisponível: marca o turno criado e atende inline", async () => {
    m.enqueue.mockResolvedValue(false);
    const r = await post(corpo());
    expect(r.headers.get("X-Chat-Turn-Id")).toBeNull();
    expect(await ler(r)).toContain("resposta inline");
    expect(m.saveError.mock.calls[0][0]).toBe("T1");
  });
  it("erro no worker chega como mensagem amigável no stream", async () => {
    m.get.mockResolvedValue({ status: "error", partial: "", answer: null, error: "vertex quota interno" });
    const txt = await ler(await post(corpo()));
    expect(txt).not.toContain("vertex quota interno");
    expect(txt.length).toBeGreaterThan(0);
  });
});
