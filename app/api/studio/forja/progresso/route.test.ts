import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  uid: "u1" as string | null,
  findMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn(),
}));
vi.mock("@/lib/studio/auth", () => ({ studioUid: async () => m.uid }));
vi.mock("@/src/lib/ratelimit", () => ({ guard: async () => ({ ok: true }) }));
vi.mock("@/src/lib/prisma", () => ({ prisma: { skillProgress: { findMany: m.findMany, upsert: m.upsert, deleteMany: m.deleteMany } } }));
vi.mock("@/lib/forja/esqueletoResolver", () => ({ resolverEsqueleto: (id: string) => (id === "pomodoro" ? { id: "pomodoro" } : null) }));

import { GET, POST } from "./route";

const get = (q: string) => GET(new Request("http://x/api/studio/forja/progresso" + q));
const post = (b: unknown) => POST(new Request("http://x/api/studio/forja/progresso", { method: "POST", body: JSON.stringify(b) }));

beforeEach(() => {
  m.uid = "u1";
  m.findMany.mockReset().mockResolvedValue([{ nodeId: "n1" }]);
  m.upsert.mockReset().mockResolvedValue({});
  m.deleteMany.mockReset().mockResolvedValue({});
});

describe("/api/studio/forja/progresso", () => {
  it("sem login: 401 nos dois métodos", async () => {
    m.uid = null;
    expect((await get("?cursoId=pomodoro")).status).toBe(401);
    expect((await post({ cursoId: "pomodoro", op: "reiniciar" })).status).toBe(401);
  });
  it("curso fora do catálogo: 404", async () => {
    expect((await get("?cursoId=hack")).status).toBe(404);
    expect((await post({ cursoId: "hack", op: "concluir", nos: ["a"] })).status).toBe(404);
  });
  it("GET lê SÓ do usuário da sessão, no namespace do curso", async () => {
    const r = await get("?cursoId=pomodoro&userId=OUTRO");
    expect(await r.json()).toEqual({ userId: "u1", cursoId: "pomodoro", concluidas: ["n1"] });
    expect(m.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "u1", topicSlug: "curso:pomodoro", status: "concluida" } }));
  });
  it("sem IDOR: userId no corpo é ignorado — grava sempre no da sessão", async () => {
    await post({ cursoId: "pomodoro", op: "concluir", nos: ["n2"], userId: "VITIMA" });
    const arg = m.upsert.mock.calls[0]![0];
    expect(arg.where.userId_topicSlug_nodeId.userId).toBe("u1");
    expect(arg.create.userId).toBe("u1");
    expect(JSON.stringify(m.upsert.mock.calls)).not.toContain("VITIMA");
  });
  it("reiniciar apaga só o curso do usuário da sessão", async () => {
    await post({ cursoId: "pomodoro", op: "reiniciar", userId: "VITIMA" });
    expect(m.deleteMany).toHaveBeenCalledWith({ where: { userId: "u1", topicSlug: "curso:pomodoro" } });
  });
  it("op inválida / sem nós: 400", async () => {
    expect((await post({ cursoId: "pomodoro", op: "apagarTudo" })).status).toBe(400);
    expect((await post({ cursoId: "pomodoro", op: "concluir", nos: [] })).status).toBe(400);
  });
  it("definir com lista vazia = zera sem erro", async () => {
    expect((await post({ cursoId: "pomodoro", op: "definir", nos: [] })).status).toBe(200);
    expect(m.deleteMany).toHaveBeenCalledWith({ where: { userId: "u1", topicSlug: "curso:pomodoro", nodeId: { notIn: [] } } });
  });
});
