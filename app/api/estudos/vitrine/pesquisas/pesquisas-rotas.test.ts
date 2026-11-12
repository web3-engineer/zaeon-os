import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({
  email: "a@b.c" as string | null,
  workFind: vi.fn(), pFindFirst: vi.fn(), pFindUnique: vi.fn(), pFindMany: vi.fn(), pCount: vi.fn(), pCreate: vi.fn(), pUpdate: vi.fn(),
  userFindUnique: vi.fn(), userFindMany: vi.fn(),
}));
vi.mock("next-auth", () => ({ getServerSession: async () => (m.email ? { user: { email: m.email, role: "user" } } : null) }));
vi.mock("@/src/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/src/lib/prisma", () => ({
  prisma: {
    user: { findUnique: m.userFindUnique, findMany: m.userFindMany },
    researchWork: { findFirst: m.workFind },
    pesquisaVitrine: { findFirst: m.pFindFirst, findUnique: m.pFindUnique, findMany: m.pFindMany, count: m.pCount, create: m.pCreate, update: m.pUpdate },
  },
}));

import { GET, POST } from "@/app/api/estudos/vitrine/pesquisas/route";
import { GET as GET_PAPEIS } from "@/app/api/estudos/vitrine/pesquisas/[slug]/route";
import { POST as POST_ADMIN } from "@/app/api/admin/vitrine/pesquisas/route";

const W = "a".repeat(24);
const post = (body: unknown) => POST(new Request("http://x/api/estudos/vitrine/pesquisas", { method: "POST", body: JSON.stringify(body) }));
const TEXTO = "Um parágrafo de pesquisa de verdade. ".repeat(10);

beforeEach(() => {
  Object.values(m).forEach((f: any) => f?.mockReset?.());
  m.email = "a@b.c";
  m.userFindUnique.mockResolvedValue({ id: "u1", name: "Ana" });
  m.userFindMany.mockResolvedValue([]);
  m.pFindUnique.mockResolvedValue(null);
  m.pCount.mockResolvedValue(0);
  m.pCreate.mockImplementation(async ({ data }: any) => ({ id: "p1", slug: data.slug, status: data.status }));
  m.pUpdate.mockImplementation(async ({ data }: any) => ({ id: "p1", slug: "x", status: data.status }));
  delete process.env.ORQUESTRA_CONSOLE_TOKEN;
});

describe("POST /api/estudos/vitrine/pesquisas — o usuário publica um trabalho", () => {
  it("sem login: 401", async () => {
    m.email = null;
    expect((await post({ workId: W })).status).toBe(401);
  });

  it("só o DONO publica: o trabalho é buscado pelo id E pelo userId (sem IDOR)", async () => {
    m.workFind.mockResolvedValue(null);
    const r = await post({ workId: W });
    expect(r.status).toBe(404);
    expect(m.workFind).toHaveBeenCalledWith(expect.objectContaining({ where: { id: W, userId: "u1" } }));
    expect(m.pCreate).not.toHaveBeenCalled();
  });

  it("entra PENDENTE, como cópia do texto, com origem usuario e ligada à conta", async () => {
    m.workFind.mockResolvedValue({ id: W, title: "Solo do sertão", content: TEXTO, workType: "artigo" });
    m.pFindFirst.mockResolvedValue(null);
    const r = await post({ workId: W, resumo: "r", nicho: "Bio" });
    expect(r.status).toBe(201);
    const data = m.pCreate.mock.calls[0][0].data;
    expect(data).toMatchObject({ titulo: "Solo do sertão", status: "pendente", origem: "usuario", contaId: "u1", workId: W, nicho: "Bio", resumo: "r" });
    expect(data.partes).toEqual([{ tipo: "artigo", titulo: "Artigo", conteudo: TEXTO.trim() }]);
  });

  it("mandar de novo o mesmo trabalho ATUALIZA a cópia e volta pra fila (não duplica)", async () => {
    m.workFind.mockResolvedValue({ id: W, title: "T", content: TEXTO, workType: null });
    m.pFindFirst.mockResolvedValue({ id: "p1" });
    const r = await post({ workId: W });
    expect(r.status).toBe(200);
    expect(m.pCreate).not.toHaveBeenCalled();
    expect(m.pUpdate.mock.calls[0][0].data).toMatchObject({ status: "pendente", motivo: null });
  });

  it("trabalho curto demais: 400; fila cheia: 429", async () => {
    m.workFind.mockResolvedValue({ id: W, title: "T", content: "curto", workType: null });
    expect((await post({ workId: W })).status).toBe(400);
    m.workFind.mockResolvedValue({ id: W, title: "T", content: TEXTO, workType: null });
    m.pFindFirst.mockResolvedValue(null);
    m.pCount.mockResolvedValue(10);
    expect((await post({ workId: W })).status).toBe(429);
  });
});

describe("GET — o público só vê PUBLICADAS; o texto dos papéis só sai de publicadas", () => {
  it("a lista pede status publicada e devolve cards-pasta sem o texto", async () => {
    m.pFindMany.mockResolvedValue([{ slug: "s", titulo: "T", resumo: "", nicho: "", tags: [], raridade: "comum", autor: "X", validadores: 0, contaId: null, partes: [{ tipo: "artigo", titulo: "A", conteudo: "segredo-longo" }] }]);
    const r = await GET(new Request("http://x/api/estudos/vitrine/pesquisas"));
    expect(m.pFindMany.mock.calls[0][0].where).toEqual({ status: "publicada" });
    const j = await r.json();
    expect(j.itens[0]).toMatchObject({ tipo: "pesquisa", pasta: { slug: "s" } });
    expect(JSON.stringify(j)).not.toContain("segredo-longo");
  });

  it("os papéis de uma pasta: busca só entre publicadas; slug estranho é 400", async () => {
    m.pFindFirst.mockResolvedValue(null);
    expect((await GET_PAPEIS(new Request("http://x"), { params: { slug: "s" } })).status).toBe(404);
    expect(m.pFindFirst.mock.calls[0][0].where).toEqual({ slug: "s", status: "publicada" });
    expect((await GET_PAPEIS(new Request("http://x"), { params: { slug: "../x" } })).status).toBe(400);
  });
});

describe("POST /api/admin/vitrine/pesquisas — admin ou console", () => {
  const corpo = { titulo: "Pesquisa", partes: [{ tipo: "artigo", conteudo: "texto" }] };
  const req = (auth?: string) => new Request("http://x/api/admin/vitrine/pesquisas", { method: "POST", body: JSON.stringify(corpo), headers: auth ? { authorization: auth } : {} });

  it("usuário comum (sem super-admin, sem token): 401 e nada é criado", async () => {
    expect((await POST_ADMIN(req())).status).toBe(401);
    expect(m.pCreate).not.toHaveBeenCalled();
  });

  it("com o token do console: entra publicada e com origem console", async () => {
    process.env.ORQUESTRA_CONSOLE_TOKEN = "t".repeat(40);
    const r = await POST_ADMIN(req(`Bearer ${"t".repeat(40)}`));
    expect(r.status).toBe(201);
    expect(m.pCreate.mock.calls[0][0].data).toMatchObject({ titulo: "Pesquisa", status: "publicada", origem: "console", contaId: null });
  });

  it("token errado: 401", async () => {
    process.env.ORQUESTRA_CONSOLE_TOKEN = "t".repeat(40);
    expect((await POST_ADMIN(req(`Bearer ${"x".repeat(40)}`))).status).toBe(401);
  });
});
