/** /api/user/skin — a skin do laboratório na conta. */
import { describe, it, expect, vi, beforeEach } from "vitest";

const sessao = vi.hoisted(() => ({ atual: { user: { email: "A@b.c" } } as any }));
const banco = vi.hoisted(() => ({ settings: null as unknown, existe: true, upsert: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn(async () => sessao.atual) }));
vi.mock("@/src/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/src/lib/prisma", () => ({
  prisma: {
    user: { findFirst: vi.fn(async (a: any) => (a.where.email === "a@b.c" ? { id: "u1" } : null)) },
    userSpaceData: {
      findUnique: vi.fn(async () => (banco.existe ? { settings: banco.settings } : null)),
      upsert: vi.fn(async (a: any) => { banco.upsert(a); banco.settings = a.update.settings; banco.existe = true; return {}; }),
    },
  },
}));
import { GET, PUT } from "./route";

const put = (corpo: unknown) => PUT(new Request("http://x/api/user/skin", { method: "PUT", body: typeof corpo === "string" ? corpo : JSON.stringify(corpo) }));

beforeEach(() => { sessao.atual = { user: { email: "A@b.c" } }; banco.settings = null; banco.existe = true; banco.upsert.mockClear(); });

describe("/api/user/skin", () => {
  it("sem login: 401 e nada é gravado", async () => {
    sessao.atual = null;
    expect((await GET()).status).toBe(401);
    expect((await put({ skin: "med" })).status).toBe(401);
    expect(banco.upsert).not.toHaveBeenCalled();
  });

  it("GET: nunca escolheu (ou o banco tem lixo) → original, salva=false", async () => {
    expect(await (await GET()).json()).toEqual({ skin: "original", salva: false });
    banco.settings = { labSkin: "barbie" };
    expect(await (await GET()).json()).toEqual({ skin: "original", salva: false });
    banco.existe = false;
    expect(await (await GET()).json()).toEqual({ skin: "original", salva: false });
  });

  it("GET devolve a skin salva", async () => {
    banco.settings = { labSkin: "bio" };
    expect(await (await GET()).json()).toEqual({ skin: "bio", salva: true });
  });

  it("PUT recusa id desconhecido e corpo quebrado", async () => {
    expect((await put({ skin: "barbie" })).status).toBe(400);
    expect((await put({})).status).toBe(400);
    expect((await put("{nao é json")).status).toBe(400);
    expect(banco.upsert).not.toHaveBeenCalled();
  });

  it("PUT grava a skin SEM apagar as outras preferências", async () => {
    banco.settings = { tema: "dark", labSkin: "med" };
    expect(await (await put({ skin: "lounge" })).json()).toEqual({ skin: "lounge" });
    expect(banco.upsert).toHaveBeenCalledWith({
      where: { userId: "u1" },
      update: { settings: { tema: "dark", labSkin: "lounge" } },
      create: { userId: "u1", settings: { tema: "dark", labSkin: "lounge" } },
    });
  });

  it("PUT aceita voltar pro original e cria o registro se não existia", async () => {
    banco.existe = false;
    expect((await put({ skin: "original" })).status).toBe(200);
    expect(banco.upsert.mock.calls[0]![0].create).toEqual({ userId: "u1", settings: { labSkin: "original" } });
  });
});
