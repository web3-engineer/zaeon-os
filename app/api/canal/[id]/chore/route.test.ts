import { describe, it, expect, vi, beforeEach } from "vitest";

const A = "a".repeat(24), C = "c".repeat(24), CANAL = "d".repeat(24);
const state: { canal: any; user: any; disparos: any[] } = { canal: null, user: null, disparos: [] };

vi.mock("@/lib/canal/server", async () => {
  const { fakeDb } = await import("@/lib/chore/fakeDb");
  const db: any = fakeDb();
  db.canal = { findUnique: async ({ where }: any) => (where.id === state.canal?.id ? state.canal : null) };
  return { isObjectId: (v: unknown) => typeof v === "string" && /^[a-f0-9]{24}$/i.test(v), prisma: db, sessaoUsuario: async () => state.user, exigirFlag: () => null };
});
vi.mock("@/lib/queue/chores", () => ({ dispararChore: async (row: any) => { state.disparos.push(row); return "inline"; } }));

import { POST } from "./route";
const req = (body: unknown) => new Request("http://x", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
const canal = (acesso: string) => ({ id: CANAL, ownerId: A, titulo: "t", acesso, membros: [], agentes: ["aura"] });

describe("POST /api/canal/[id]/chore", () => {
  beforeEach(() => { state.disparos = []; process.env.CHORES_QUEUE = "1"; state.canal = canal("privado"); state.user = { id: A, name: "A", image: null, email: "a@x", role: null }; });

  it("flag CHORES_QUEUE off → 404", async () => {
    delete process.env.CHORES_QUEUE;
    expect((await POST(req({ tipo: "resumir_link", alvo: { url: "https://a.gov.br" } }), { params: { id: CANAL } })).status).toBe(404);
  });
  it("não-membro → 403; anônimo → 401", async () => {
    state.user = { id: C, name: "C", image: null, email: "c@x", role: null };
    expect((await POST(req({ tipo: "resumir_link", alvo: { url: "https://a.gov.br" } }), { params: { id: CANAL } })).status).toBe(403);
    state.user = null;
    expect((await POST(req({}), { params: { id: CANAL } })).status).toBe(401);
  });
  it("membro cria resumir_link: destino = este canal + thread, requester = sessão, dispara", async () => {
    const r = await POST(req({ tipo: "resumir_link", alvo: { url: "https://a.gov.br/x" }, parentId: "e".repeat(24), destino: { canalId: "f".repeat(24) } }), { params: { id: CANAL } });
    expect(r.status).toBe(201);
    expect(state.disparos[0]).toMatchObject({ canalId: CANAL, requesterId: A, destino: { canalId: CANAL, parentId: "e".repeat(24), modo: "thread" }, origemConteudo: "web" });
  });
  it("tipo de admin (checar_pagina) não pode pelo canal → 400; alvo inválido → 400", async () => {
    expect((await POST(req({ tipo: "checar_pagina", alvo: { url: "https://a.gov.br" } }), { params: { id: CANAL } })).status).toBe(400);
    expect((await POST(req({ tipo: "resumir_link", alvo: { url: "ftp://a" } }), { params: { id: CANAL } })).status).toBe(400);
  });
});
