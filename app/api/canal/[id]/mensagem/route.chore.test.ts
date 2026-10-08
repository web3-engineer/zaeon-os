/** Fatia 7: "@aura resume <url>" vira CHORE (não turno) só com CHORES_QUEUE=1; em dúvida, turno. */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { A, CANAL, state } = vi.hoisted(() => ({ A: "a".repeat(24), CANAL: "d".repeat(24), state: { turnos: [] as any[], chores: [] as any[] } }));

vi.mock("@/lib/canal/server", async () => {
  const { fakeDb } = await import("@/lib/chore/fakeDb");
  const db: any = fakeDb();
  const canal = { id: CANAL, ownerId: A, titulo: "t", acesso: "privado", membros: [], agentes: ["aura"] };
  db.canal = { findUnique: async () => canal, update: async () => canal };
  db.canalMensagem = { create: async ({ data }: any) => ({ id: "f".repeat(24), createdAt: new Date(), ...data }) };
  return {
    isObjectId: (v: unknown) => typeof v === "string" && /^[a-f0-9]{24}$/i.test(v), prisma: db,
    sessaoUsuario: async () => ({ id: A, name: "A", image: null, email: "a@x", role: null }), exigirFlag: () => null,
    agentesDoCanal: async () => [{ agentKey: "aura", nome: "Aura", avatarUrl: null }],
  };
});
vi.mock("@/lib/canal/realtime", async () => ({ ...(await vi.importActual<any>("@/lib/canal/realtime")), publicarPusher: async () => {} }));
vi.mock("@/lib/canal/queue", () => ({ dispararTurnos: async (jobs: any[]) => { state.turnos.push(...jobs); return jobs.map(() => "inline"); }, depsReais: async () => ({}) }));
vi.mock("@/lib/queue/chores", () => ({ dispararChore: async (row: any) => { state.chores.push(row); return "inline"; } }));

import { POST } from "./route";
const req = (texto: string) => new Request("http://x", { method: "POST", body: JSON.stringify({ texto }), headers: { "content-type": "application/json" } });

describe("mensagem → chore (G5b)", () => {
  beforeEach(() => { state.turnos = []; state.chores = []; });

  it("CHORES_QUEUE=1 + '@aura resume <url>' → 1 chore na thread da mensagem, ZERO turno", async () => {
    process.env.CHORES_QUEUE = "1";
    const r = await POST(req("@aura resume https://www.saude.gov.br/boletim"), { params: { id: CANAL } });
    expect(r.status).toBe(201);
    expect(state.turnos).toHaveLength(0);
    expect(state.chores).toHaveLength(1);
    expect(state.chores[0]).toMatchObject({ tipo: "resumir_link", agentKey: "aura", requesterId: A, destino: { canalId: CANAL, parentId: "f".repeat(24), modo: "thread" }, alvo: { url: "https://www.saude.gov.br/boletim" } });
  });
  it("flag off → turno como hoje", async () => {
    delete process.env.CHORES_QUEUE;
    await POST(req("@aura resume https://www.saude.gov.br/boletim"), { params: { id: CANAL } });
    expect(state.chores).toHaveLength(0); expect(state.turnos).toHaveLength(1);
  });
  it("pedido de entregável com link → turno (não chore)", async () => {
    process.env.CHORES_QUEUE = "1";
    await POST(req("@aura faz um relatório sobre https://www.saude.gov.br/boletim"), { params: { id: CANAL } });
    expect(state.chores).toHaveLength(0); expect(state.turnos).toHaveLength(1);
  });
});
