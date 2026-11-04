import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Prisma em memória: só o que a ponte toca (work + cartolina + membro) ──────────────────
const db = vi.hoisted(() => ({ works: new Map<string, any>(), boards: [] as any[], membros: [] as any[], seq: 0 }));
const oid = () => (++db.seq).toString(16).padStart(24, "0");
const match = (row: any, where: any) => Object.entries(where ?? {}).every(([k, v]) => row[k] === v);

vi.mock("@/src/lib/prisma", () => ({
  prisma: {
    researchWork: { findUnique: async ({ where }: any) => db.works.get(where.id) ?? null },
    cartolina: {
      findFirst: async ({ where }: any) => db.boards.find((b) => match(b, where)) ?? null,
      create: async ({ data }: any) => { const b = { id: oid(), updatedAt: Date.now(), ...data }; db.boards.push(b); return b; },
    },
    cartolinaMembro: {
      findUnique: async ({ where }: any) => {
        const k = where.cartolinaId_userId;
        return db.membros.find((m) => m.cartolinaId === k.cartolinaId && m.userId === k.userId) ?? null;
      },
    },
  },
}));

// O trilho da cartolina já tem testes próprios — aqui só interessa que a ponte o chame CERTO.
const chamadas = vi.hoisted(() => ({ gerar: [] as any[], revogar: [] as any[], recusar: false }));
vi.mock("@/lib/cartolina/cowork-store", () => ({
  gerarLink: async (boardId: string, userId: string, papel: string) => {
    chamadas.gerar.push({ boardId, userId, papel });
    return chamadas.recusar ? { ok: false, reason: "forbidden" } : { ok: true, token: `tok-${boardId}-${papel}` };
  },
  revogarLinks: async (boardId: string, userId: string) => {
    chamadas.revogar.push({ boardId, userId });
    return { ok: true };
  },
}));

import { linkDoTrabalho, revogarDoTrabalho } from "@/lib/tcc/compartilhar";

const DONO = "a".repeat(24), OUTRO = "b".repeat(24);
const SECOES = [{ id: "s1", titulo: "INTRODUÇÃO", corpo: "texto" }];

function work(o: { userId?: string; scopeId?: string | null } = {}) {
  const id = oid();
  db.works.set(id, {
    id, userId: o.userId ?? DONO, scopeId: o.scopeId === undefined ? "conv-1" : o.scopeId,
    secoes: SECOES, title: "Trabalho", content: "", rev: 0, workType: null, tccStatus: "pronto", updatedAt: new Date(),
  });
  return id;
}

beforeEach(() => {
  db.works.clear(); db.boards.length = 0; db.membros.length = 0; db.seq = 0;
  chamadas.gerar.length = 0; chamadas.revogar.length = 0; chamadas.recusar = false;
  process.env.TCC_CROSS = "1";
});

describe("linkDoTrabalho · quem pode convidar", () => {
  it("o DONO gera o link, e o escopo volta do servidor (a UI não adivinha)", async () => {
    const id = work();
    const r = await linkDoTrabalho(id, DONO, "editor");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.escopo).toBe("conversa");     // o convite é da CONVERSA, não deste documento
    expect(r.papel).toBe("editor");
    expect(r.url).toBe(`/estudo/${r.boardId}?convite=${encodeURIComponent(r.token)}`);
  });

  it("EDITOR convidado NÃO convida — convidar sempre foi só do dono", async () => {
    const id = work();
    const board = { id: oid(), ownerId: DONO, surface: "estudos", scopeId: "conv-1" };
    db.boards.push(board);
    db.membros.push({ cartolinaId: board.id, userId: OUTRO, papel: "editor" });
    expect(await linkDoTrabalho(id, OUTRO, "editor")).toEqual({ ok: false, reason: "forbidden" });
    expect(chamadas.gerar).toHaveLength(0);   // nem chegou a pedir token
  });

  it("quem não tem papel nenhum recebe not_found — 'sem acesso' e 'não existe' são iguais de fora", async () => {
    const id = work();
    expect(await linkDoTrabalho(id, OUTRO, "editor")).toEqual({ ok: false, reason: "not_found" });
  });

  it("trabalho sem conversa não dá pra compartilhar POR AQUI — e o motivo é dito", async () => {
    // o trilho inteiro concede papel pela cartolina da conversa; sem conversa não há por onde
    const id = work({ scopeId: null });
    expect(await linkDoTrabalho(id, DONO, "editor")).toEqual({ ok: false, reason: "sem_conversa" });
  });
});

describe("a cartolina da conversa · o convite não pode nascer morto", () => {
  it("conversa SEM cartolina ganha uma, senão o convidado nunca teria papel", async () => {
    // `papelNoWork` resolve o papel ATRAVÉS do board: sem board, o link levaria a pessoa a
    // /estudo/<id> e ela leria "sem acesso". Este é o teste que prova que isso não acontece.
    const id = work();
    expect(db.boards).toHaveLength(0);
    const r = await linkDoTrabalho(id, DONO, "editor");
    expect(r.ok).toBe(true);
    expect(db.boards).toHaveLength(1);
    expect(db.boards[0]).toMatchObject({ ownerId: DONO, surface: "estudos", scopeId: "conv-1" });
    if (r.ok) expect(r.boardId).toBe(db.boards[0].id);
  });

  it("conversa COM cartolina reaproveita — não cria board a cada convite", async () => {
    const id = work();
    const board = { id: oid(), ownerId: DONO, surface: "estudos", scopeId: "conv-1", updatedAt: Date.now() };
    db.boards.push(board);
    const r = await linkDoTrabalho(id, DONO, "leitor");
    expect(db.boards).toHaveLength(1);
    if (r.ok) expect(r.boardId).toBe(board.id);
    expect(chamadas.gerar).toEqual([{ boardId: board.id, userId: DONO, papel: "leitor" }]);
  });

  it("DOIS trabalhos da MESMA conversa apontam pro mesmo board (o papel é da conversa)", async () => {
    const a = work(), b = work();
    const r1 = await linkDoTrabalho(a, DONO, "editor");
    const r2 = await linkDoTrabalho(b, DONO, "editor");
    expect(r1.ok && r2.ok).toBe(true);
    if (r1.ok && r2.ok) expect(r1.boardId).toBe(r2.boardId);
    expect(db.boards).toHaveLength(1);
  });

  it("recusa do trilho da cartolina é repassada, não engolida", async () => {
    chamadas.recusar = true;
    const id = work();
    expect(await linkDoTrabalho(id, DONO, "editor")).toEqual({ ok: false, reason: "forbidden" });
  });
});

describe("revogarDoTrabalho", () => {
  it("o dono revoga, e o board certo é alvo", async () => {
    const id = work();
    const board = { id: oid(), ownerId: DONO, surface: "estudos", scopeId: "conv-1" };
    db.boards.push(board);
    expect(await revogarDoTrabalho(id, DONO)).toEqual({ ok: true });
    expect(chamadas.revogar).toEqual([{ boardId: board.id, userId: DONO }]);
  });

  it("sem board não há link emitido: revogar é no-op HONESTO, não erro", async () => {
    const id = work();
    expect(await revogarDoTrabalho(id, DONO)).toEqual({ ok: true });
    expect(chamadas.revogar).toHaveLength(0);
    expect(db.boards).toHaveLength(0);   // e revogar NÃO cria board (só o convite cria)
  });

  it("editor convidado não revoga o link de ninguém", async () => {
    const id = work();
    const board = { id: oid(), ownerId: DONO, surface: "estudos", scopeId: "conv-1" };
    db.boards.push(board);
    db.membros.push({ cartolinaId: board.id, userId: OUTRO, papel: "editor" });
    expect(await revogarDoTrabalho(id, OUTRO)).toEqual({ ok: false, reason: "forbidden" });
    expect(chamadas.revogar).toHaveLength(0);
  });
});
