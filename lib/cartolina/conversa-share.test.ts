import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({ boards: [] as any[], seq: 0 }));
const oid = () => (++db.seq).toString(16).padStart(24, "0");
const match = (row: any, where: any) => Object.entries(where ?? {}).every(([k, v]) => row[k] === v);

vi.mock("@/src/lib/prisma", () => ({
  prisma: {
    cartolina: {
      findFirst: async ({ where }: any) => db.boards.find((b) => match(b, where)) ?? null,
      create: async ({ data }: any) => { const b = { id: oid(), updatedAt: Date.now(), ...data }; db.boards.push(b); return b; },
    },
  },
}));

const chamadas = vi.hoisted(() => ({ gerar: [] as any[], revogar: [] as any[] }));
vi.mock("@/lib/cartolina/cowork-store", () => ({
  gerarLink: async (boardId: string, userId: string, papel: string) => {
    chamadas.gerar.push({ boardId, userId, papel });
    return { ok: true, token: `tok-${boardId}` };
  },
  revogarLinks: async (boardId: string, userId: string) => {
    chamadas.revogar.push({ boardId, userId });
    return { ok: true };
  },
}));

import { linkDaConversa, revogarDaConversa, acharBoardDaConversa } from "@/lib/cartolina/conversa-share";

const EU = "a".repeat(24), OUTRO = "b".repeat(24);
const board = (ownerId: string, scopeId = "conv-1") => {
  const b = { id: oid(), ownerId, surface: "estudos", scopeId, updatedAt: Date.now() };
  db.boards.push(b);
  return b;
};

beforeEach(() => { db.boards.length = 0; db.seq = 0; chamadas.gerar.length = 0; chamadas.revogar.length = 0; });

describe("linkDaConversa · a porta da conversa", () => {
  it("o dono gera o link, e o escopo volta do servidor", async () => {
    const b = board(EU);
    const r = await linkDaConversa("conv-1", EU, "editor");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.escopo).toBe("conversa");
    expect(r.url).toBe(`/estudo/${b.id}?convite=${encodeURIComponent(r.token)}`);
    expect(chamadas.gerar).toEqual([{ boardId: b.id, userId: EU, papel: "editor" }]);
  });

  it("conversa SEM board ganha um, senão o convite nasceria morto", async () => {
    // `papelNoWork` resolve o papel do convidado ATRAVÉS do board: sem board, o link levaria a
    // pessoa a /estudo/<id> e ela leria "sem acesso".
    expect(db.boards).toHaveLength(0);
    const r = await linkDaConversa("conv-nova", EU, "editor");
    expect(r.ok).toBe(true);
    expect(db.boards).toHaveLength(1);
    expect(db.boards[0]).toMatchObject({ ownerId: EU, surface: "estudos", scopeId: "conv-nova" });
  });

  it("🔴 conversa de OUTRA pessoa é recusa — e NÃO cria um segundo board sob o meu id", async () => {
    // o buraco que este módulo precisa evitar: procurar por { ownerId: eu, scopeId } não acharia o
    // board alheio e criaria outro, me tornando "dono" de uma conversa que não é minha.
    board(OUTRO);
    expect(await linkDaConversa("conv-1", EU, "editor")).toEqual({ ok: false, reason: "forbidden" });
    expect(db.boards).toHaveLength(1);
    expect(chamadas.gerar).toHaveLength(0);
  });

  it("board existente é reaproveitado — um convite não cria board a cada clique", async () => {
    const b = board(EU);
    await linkDaConversa("conv-1", EU, "leitor");
    await linkDaConversa("conv-1", EU, "editor");
    expect(db.boards).toHaveLength(1);
    expect(chamadas.gerar.map((c) => c.papel)).toEqual(["leitor", "editor"]);
    expect(chamadas.gerar.every((c) => c.boardId === b.id)).toBe(true);
  });

  it("sem conversa não há o que compartilhar", async () => {
    expect(await linkDaConversa("", EU, "editor")).toEqual({ ok: false, reason: "sem_conversa" });
    expect(await linkDaConversa("conv-1", "", "editor")).toEqual({ ok: false, reason: "sem_conversa" });
  });

  it("a MESMA conversa dá o mesmo board pela porta do documento e pela da conversa", async () => {
    // as duas portas concedem o mesmo papel pelo mesmo trilho: não existem dois sistemas
    const b = board(EU);
    expect((await acharBoardDaConversa("conv-1"))?.id).toBe(b.id);
  });
});

describe("revogarDaConversa", () => {
  it("o dono revoga, no board certo", async () => {
    const b = board(EU);
    expect(await revogarDaConversa("conv-1", EU)).toEqual({ ok: true });
    expect(chamadas.revogar).toEqual([{ boardId: b.id, userId: EU }]);
  });

  it("sem board, revogar é no-op honesto e NÃO cria board", async () => {
    expect(await revogarDaConversa("conv-1", EU)).toEqual({ ok: true });
    expect(db.boards).toHaveLength(0);
    expect(chamadas.revogar).toHaveLength(0);
  });

  it("não revogo o link da conversa de outra pessoa", async () => {
    board(OUTRO);
    expect(await revogarDaConversa("conv-1", EU)).toEqual({ ok: false, reason: "forbidden" });
    expect(chamadas.revogar).toHaveLength(0);
  });
});
