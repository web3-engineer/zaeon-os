import { describe, it, expect, vi, beforeEach } from "vitest";
const m = vi.hoisted(() => ({ userId: "u1" as string | null, get: vi.fn(), list: vi.fn() }));
vi.mock("@/src/lib/ratelimit", () => ({ guard: async () => ({ ok: true }) }));
vi.mock("@/lib/agent/transcript", () => ({ resolveUserId: async () => m.userId }));
vi.mock("@/lib/agent/chat-turn-store", async (o) => ({ ...(await o<any>()), getTurnForUser: m.get, listTurnsForUser: m.list }));
import { GET as LIST } from "@/app/api/ai/chat/turns/route";
import { GET as ONE } from "@/app/api/ai/chat/turns/[id]/route";

const one = (id = "t1") => ONE(new Request("http://x/"), { params: { id } });
beforeEach(() => { m.userId = "u1"; m.get.mockReset(); m.list.mockReset(); });

describe("/api/ai/chat/turns", () => {
  it("sem sessão = 401 (lista e item)", async () => {
    m.userId = null;
    expect((await LIST(new Request("http://x/"))).status).toBe(401);
    expect((await one()).status).toBe(401);
  });
  it("IDOR: turno de OUTRA pessoa = 404, consultado sempre com o usuário da sessão", async () => {
    m.get.mockResolvedValue(null);
    expect((await one("t-de-B")).status).toBe(404);
    expect(m.get).toHaveBeenCalledWith("t-de-B", "u1");
  });
  it("done → wire pronto pro parser do cliente; sem erro", async () => {
    m.get.mockResolvedValue({ id: "t1", status: "done", partial: "P", answer: { mode: "text", text: "oi" }, error: null, createdAt: new Date() });
    const { turn } = await (await one()).json();
    expect(turn).toMatchObject({ status: "done", partial: "P", wire: "oi", erro: null });
  });
  it("error → mensagem AMIGÁVEL; o erro cru nunca sai", async () => {
    m.get.mockResolvedValue({ id: "t1", status: "error", partial: "", answer: null, error: "PrismaClientKnownRequestError: conn string mongodb://user:senha@...", createdAt: new Date() });
    const { turn } = await (await one()).json();
    expect(turn.status).toBe("error");
    expect(turn.erro).not.toMatch(/mongodb|senha|Prisma/);
    expect(turn.wire).toBeNull();
  });
  it("done com answer corrompido vira error (nunca 'pronto vazio')", async () => {
    m.get.mockResolvedValue({ id: "t1", status: "done", partial: "", answer: { lixo: 1 }, error: null, createdAt: new Date() });
    const { turn } = await (await one()).json();
    expect(turn).toMatchObject({ status: "error", wire: null });
    expect(turn.erro).toBeTruthy();
  });
  it("running → sem wire, com parcial", async () => {
    m.get.mockResolvedValue({ id: "t1", status: "running", partial: "fase", answer: null, error: null, createdAt: new Date() });
    expect((await (await one()).json()).turn).toMatchObject({ status: "running", partial: "fase", wire: null, erro: null });
  });
  it("lista: surface inválida 400; válida consulta o dono com scopeId saneado", async () => {
    expect((await LIST(new Request("http://x/?surface=admin"))).status).toBe(400);
    m.list.mockResolvedValue([]);
    await LIST(new Request("http://x/?surface=pesquisa&scopeId=" + encodeURIComponent("a b")));
    expect(m.list).toHaveBeenCalledWith("u1", "pesquisa", null);
  });
});
