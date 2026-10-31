/** #663: a rota das conversas — só a conta logada, e o apagar leva as sub-conversas e as mensagens. */
import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({
  userId: "u1" as string | null,
  conv: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
  msg: { deleteMany: vi.fn() },
}));
vi.mock("next-auth", () => ({ getServerSession: async () => (m.userId ? { user: { email: "a@b.c" } } : null) }));
vi.mock("@/src/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/src/lib/prisma", () => ({ prisma: {
  user: { findUnique: async () => (m.userId ? { id: m.userId } : null) },
  conversation: m.conv, chatMessage: m.msg,
} }));
import { DELETE, GET, PUT } from "./route";

const del = (qs: string) => DELETE(new Request(`http://x/api/ai/conversas?${qs}`, { method: "DELETE" }));
const put = (b: unknown) => PUT(new Request("http://x", { method: "PUT", body: JSON.stringify(b) }));
beforeEach(() => {
  m.userId = "u1";
  for (const f of [...Object.values(m.conv), ...Object.values(m.msg)]) f.mockReset();
});

describe("/api/ai/conversas", () => {
  it("sem login: 401 em tudo, e o banco não é tocado", async () => {
    m.userId = null;
    expect((await GET(new Request("http://x?surface=estudos"))).status).toBe(401);
    expect((await put({ surface: "estudos", scopeId: "t1" })).status).toBe(401);
    expect((await del("surface=estudos&scopeId=t1")).status).toBe(401);
    expect(m.conv.findMany).not.toHaveBeenCalled();
    expect(m.conv.deleteMany).not.toHaveBeenCalled();
  });
  it("só aceita as salas do chat", async () => {
    expect((await GET(new Request("http://x?surface=whatsapp"))).status).toBe(400);
    expect((await del("surface=whatsapp&scopeId=t1")).status).toBe(400);
  });
  it("lista só a conta, só o que tem título e mensagens", async () => {
    m.conv.findMany.mockResolvedValue([{ scopeId: "t1", title: "java", parentScopeId: "m", contextoHerdado: "fio", createdAt: new Date(1), updatedAt: new Date(2) }]);
    const r = await GET(new Request("http://x?surface=estudos"));
    expect((await r.json()).conversas).toEqual([{ id: "t1", titulo: "java", parentId: "m", contexto: "fio", criadaEm: 1, tocadaEm: 2 }]);
    expect(m.conv.findMany.mock.calls[0]![0].where).toMatchObject({ userId: "u1", surface: "estudos", scopeId: { not: null }, title: { not: null }, messages: { some: {} } });
  });
  it("apagar leva a conversa, as sub-conversas e as mensagens, só da própria conta", async () => {
    m.conv.findMany.mockResolvedValue([{ id: "c1" }, { id: "c2" }]);
    expect((await del("surface=estudos&scopeId=t1")).status).toBe(200);
    expect(m.conv.findMany.mock.calls[0]![0].where).toEqual({ userId: "u1", surface: "estudos", OR: [{ scopeId: "t1" }, { parentScopeId: "t1" }] });
    expect(m.msg.deleteMany).toHaveBeenCalledWith({ where: { conversationId: { in: ["c1", "c2"] } } });
    expect(m.conv.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["c1", "c2"] }, userId: "u1" } });
  });
  it("conversa de outra conta: nada é apagado", async () => {
    m.conv.findMany.mockResolvedValue([]);
    expect((await del("surface=estudos&scopeId=t1")).status).toBe(200);
    expect(m.msg.deleteMany).not.toHaveBeenCalled();
    expect(m.conv.deleteMany).not.toHaveBeenCalled();
  });
  it("cortar apaga só as mensagens a partir do instante, e a conversa fica", async () => {
    m.conv.findFirst.mockResolvedValue({ id: "c1" });
    expect((await del("surface=estudos&scopeId=t1&desde=5000")).status).toBe(200);
    expect(m.msg.deleteMany).toHaveBeenCalledWith({ where: { conversationId: "c1", at: { gte: new Date(5000) } } });
    expect(m.conv.deleteMany).not.toHaveBeenCalled();
    m.msg.deleteMany.mockClear();
    expect((await del("surface=estudos&scopeId=t1&desde=abc")).status).toBe(400);
    expect(m.msg.deleteMany).not.toHaveBeenCalled();
  });
  it("guardar escreve o título e o elo da sub-conversa; id estranho é recusado", async () => {
    m.conv.findFirst.mockResolvedValue({ id: "c1" });
    expect((await put({ surface: "estudos", scopeId: "t1", titulo: " java ", parentId: "m", contexto: "fio" })).status).toBe(200);
    expect(m.conv.update).toHaveBeenCalledWith({ where: { id: "c1" }, data: { title: "java", parentScopeId: "m", contextoHerdado: "fio" } });
    expect((await put({ surface: "estudos", scopeId: { $ne: "" } })).status).toBe(400);
  });
});
