import { describe, it, expect, vi, beforeEach } from "vitest";

const state: { admin: any; disparos: any[] } = { admin: { ok: true, email: "f@x" }, disparos: [] };
vi.mock("@/src/lib/prisma", async () => {
  const { fakeDb } = await import("@/lib/chore/fakeDb");
  const db: any = fakeDb();
  db.user = { findUnique: async () => ({ id: "9".repeat(24) }) };
  return { prisma: db };
});
vi.mock("@/lib/admin/assertAdmin", () => ({ assertAdmin: async () => state.admin }));
vi.mock("@/lib/queue/chores", () => ({ dispararChore: async (row: any) => { state.disparos.push(row); return "fila"; } }));

import { POST, GET } from "./route";
const req = (body: unknown) => new Request("http://x/api/admin/chores", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });

describe("/api/admin/chores", () => {
  beforeEach(() => { state.disparos = []; state.admin = { ok: true, email: "f@x" }; process.env.CHORES_QUEUE = "1"; process.env.NEXT_PUBLIC_AGENTS_ADMIN = "1"; });

  it("flags off → 404; não-admin → 401/403", async () => {
    delete process.env.CHORES_QUEUE;
    expect((await POST(req({}))).status).toBe(404);
    process.env.CHORES_QUEUE = "1";
    state.admin = { ok: false, status: 403 };
    expect((await POST(req({}))).status).toBe(403);
    state.admin = { ok: false, status: 401 };
    expect((await GET(new Request("http://x/api/admin/chores"))).status).toBe(401);
  });
  it("admin cria QUALQUER tipo (checar_pagina, digest); sem canal = silencioso; requester = o admin", async () => {
    expect((await POST(req({ tipo: "checar_pagina", alvo: { url: "https://a.gov.br" } }))).status).toBe(201);
    expect(state.disparos[0]).toMatchObject({ tipo: "checar_pagina", destino: { canalId: null, modo: "silencioso" }, requesterId: "9".repeat(24) });
    expect((await POST(req({ tipo: "digest", alvo: {}, canalId: "d".repeat(24) }))).status).toBe(201);
    expect(state.disparos[1].origemConteudo).toBe("canal");
  });
  it("rodada permite re-checar a mesma fonte no mesmo dia", async () => {
    await POST(req({ tipo: "checar_pagina", alvo: { url: "https://b.gov.br" } }));
    await POST(req({ tipo: "checar_pagina", alvo: { url: "https://b.gov.br" } }));
    await POST(req({ tipo: "checar_pagina", alvo: { url: "https://b.gov.br" }, rodada: 2 }));
    // a 2ª é a MESMA linha (idempotente por jobId; re-disparar a mesma queued é inofensivo: a fila deduplica), a 3ª é nova
    expect(new Set(state.disparos.map((c) => c.id)).size).toBe(2);
    expect(state.disparos[2].jobId).toMatch(/\.2$/);
  });
  it("GET valida range/tipo/status e lista", async () => {
    expect((await GET(new Request("http://x/api/admin/chores?range=1y"))).status).toBe(400);
    expect((await GET(new Request("http://x/api/admin/chores?tipo=hack"))).status).toBe(400);
    const r = await GET(new Request("http://x/api/admin/chores?range=7d"));
    expect(r.status).toBe(200);
    expect(Array.isArray((await r.json()).chores)).toBe(true);
  });
});
