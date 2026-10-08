import { describe, it, expect, vi, beforeEach } from "vitest";

const { state } = vi.hoisted(() => ({ state: { admin: { ok: true, email: "f@x" } as any, ledger: [] as any[], chores: [] as any[] } }));
vi.mock("@/src/lib/prisma", () => ({ prisma: {
  tokenLedger: { findMany: async () => state.ledger, findFirst: async () => (state.ledger.length ? { at: state.ledger[state.ledger.length - 1].at } : null) },
  agentChore: { findMany: async () => state.chores },
} }));
vi.mock("@/lib/admin/assertAdmin", () => ({ assertAdmin: async () => state.admin }));

import { GET } from "./route";
const get = (q = "") => GET(new Request(`http://x/api/admin/agents/pool${q}`));

describe("GET /api/admin/agents/pool", () => {
  beforeEach(() => { process.env.NEXT_PUBLIC_AGENTS_ADMIN = "1"; state.admin = { ok: true, email: "f@x" }; state.ledger = []; state.chores = []; });
  it("404 sem flag; 401/403 sem admin; 400 range inválido", async () => {
    delete process.env.NEXT_PUBLIC_AGENTS_ADMIN;
    expect((await get()).status).toBe(404);
    process.env.NEXT_PUBLIC_AGENTS_ADMIN = "1";
    state.admin = { ok: false, status: 401 }; expect((await get()).status).toBe(401);
    state.admin = { ok: false, status: 403 }; expect((await get()).status).toBe(403);
    state.admin = { ok: true, email: "f@x" }; expect((await get("?range=1y")).status).toBe(400);
  });
  it("sem linhas → medindoDesde null e custo zero sem vazamento", async () => {
    const j = await (await get()).json();
    expect(j.medindoDesde).toBeNull(); expect(j.alvos).toEqual([]); expect(j.custoZero).toEqual({ zero: true, vazamentos: 0, custoPoolUsd: 0 });
    expect(j.tetos.groq.teto).toBe(8000);
  });
  it("com linhas → agrega por alvo", async () => {
    state.ledger = [{ at: new Date(), agentKey: "aura", surface: "chore", model: "m", alvo: "groq", ok: true, promptTokens: 1, completionTokens: 1, totalTokens: 2, estimatedCostUsd: 0, ms: 100 }];
    const j = await (await get("?range=7d")).json();
    expect(j.alvos[0]).toMatchObject({ alvo: "groq", chamadas: 1, ok: 1 });
    expect(j.medindoDesde).not.toBeNull();
  });
});
