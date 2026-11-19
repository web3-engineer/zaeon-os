/**
 * Rota da agenda do escritório (#396): author gate (privado/turma/aberto × dono/membro/fora),
 * validação, "redesenhar o próprio horário", dividir horário com outra pessoa, apagar só o seu.
 * Prisma/sessão/Pusher mockados (mesmo padrão do mensagem/route.test.ts).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const A = "a".repeat(24), B = "b".repeat(24), C = "c".repeat(24), CANAL = "d".repeat(24), OUTRO = "e".repeat(24);
type Linha = { id: string; canalId: string; userId: string; dia: number; inicio: number; fim: number; de?: number | null; ate?: number | null };
const state: { canal: any; user: any; blocos: Linha[]; publicados: any[]; seq: number } = { canal: null, user: null, blocos: [], publicados: [], seq: 0 };
const novoId = () => (++state.seq).toString(16).padStart(24, "0");

vi.mock("@/lib/canal/server", () => ({
  isObjectId: (v: unknown) => typeof v === "string" && /^[a-f0-9]{24}$/i.test(v),
  sessaoUsuario: async () => state.user,
  exigirFlag: () => null,
  pessoas: async (ids: string[]) => new Map([...new Set(ids)].map((id) => [id, { id, nome: id === A ? "Ana" : "Bia", avatar: null }])),
  prisma: {
    canal: { findUnique: async ({ where }: any) => (where.id === state.canal?.id ? state.canal : null) },
    agendaBloco: {
      findMany: async ({ where }: any) => state.blocos.filter((b) => b.canalId === where.canalId && (!where.userId || b.userId === where.userId)),
      findUnique: async ({ where }: any) => state.blocos.find((b) => b.id === where.id) ?? null,
      create: async ({ data }: any) => { const r = { id: novoId(), ...data }; state.blocos.push(r); return r; },
      deleteMany: async ({ where }: any) => { state.blocos = state.blocos.filter((b) => !(where.id.in.includes(b.id) && b.userId === where.userId)); return {}; },
      delete: async ({ where }: any) => { state.blocos = state.blocos.filter((b) => b.id !== where.id); return {}; },
    },
  },
}));
vi.mock("@/lib/canal/realtime", async () => {
  const real = await vi.importActual<typeof import("@/lib/canal/realtime")>("@/lib/canal/realtime");
  return { ...real, publicarPusher: async (c: string, ev: string, p: unknown) => { state.publicados.push([c, ev, p]); } };
});

import { GET, POST, DELETE, MAX_BLOCOS_POR_PESSOA } from "./route";

const ctx = { params: { id: CANAL } };
const post = (body: unknown) => new Request("http://x/api/canal/x/agenda", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
const del = (bloco: string) => new Request(`http://x/api/canal/x/agenda?bloco=${bloco}`, { method: "DELETE" });
const get = () => new Request("http://x/api/canal/x/agenda");
const canal = (acesso: string) => ({ id: CANAL, ownerId: A, titulo: "t", acesso, membros: [B], agentes: ["aura"] });
const user = (id: string) => ({ id, name: "N", image: null, email: "e@x", role: null });

beforeEach(() => { state.blocos = []; state.publicados = []; state.seq = 0; state.canal = canal("turma"); state.user = user(A); });

describe("agenda · author gate", () => {
  it.each([
    ["privado", A, 200], ["privado", B, 200], ["privado", C, 403],
    ["turma", A, 200], ["turma", B, 200], ["turma", C, 403],
    ["aberto", A, 200], ["aberto", B, 200], ["aberto", C, 200],
  ])("GET acesso=%s · user=%s → %i", async (acesso, uid, status) => {
    state.canal = canal(acesso); state.user = user(uid);
    expect((await GET(get(), ctx)).status).toBe(status);
  });

  it.each([
    ["privado", B, 201], ["turma", C, 403], ["turma", B, 201],
  ])("POST acesso=%s · user=%s → %i", async (acesso, uid, status) => {
    state.canal = canal(acesso); state.user = user(uid);
    expect((await POST(post({ dia: 2, inicio: 9, fim: 15 }), ctx)).status).toBe(status);
  });

  it("anônimo 401; canal inexistente 404; id inválido 404", async () => {
    state.user = null;
    expect((await GET(get(), ctx)).status).toBe(401);
    state.user = user(A);
    expect((await GET(get(), { params: { id: OUTRO } })).status).toBe(404);
    expect((await GET(get(), { params: { id: "nope" } })).status).toBe(404);
  });
});

describe("agenda · marcar horário", () => {
  it("o exemplo do card: terça 9 → 15 grava 9..15 e avisa o canal", async () => {
    const r = await POST(post({ dia: 2, inicio: 15, fim: 9 }), ctx);
    expect(r.status).toBe(201);
    const j = await r.json();
    expect(j.bloco).toMatchObject({ userId: A, dia: 2, inicio: 9, fim: 15 });
    expect(state.blocos).toHaveLength(1);
    expect(state.publicados).toEqual([[CANAL, "agenda", { canalId: CANAL }]]);
  });

  it("horário inválido → 400, nada gravado", async () => {
    for (const body of [{ dia: 9, inicio: 9, fim: 10 }, { dia: 2, inicio: 3, fim: 10 }, { dia: 2 }, {}]) {
      expect((await POST(post(body), ctx)).status).toBe(400);
    }
    expect(state.blocos).toHaveLength(0);
  });

  it("#850: o meu bloco novo JUNTA com o meu antigo que se sobrepõe; o da outra pessoa fica", async () => {
    await POST(post({ dia: 2, inicio: 9, fim: 12 }), ctx);
    state.user = user(B);
    await POST(post({ dia: 2, inicio: 10, fim: 11 }), ctx);
    state.user = user(A);
    const r = await POST(post({ dia: 2, inicio: 11, fim: 16 }), ctx);
    const j = await r.json();
    expect(j.removidos).toHaveLength(1);
    expect(state.blocos.map((b) => [b.userId, b.inicio, b.fim]).sort()).toEqual([[A, 9, 16], [B, 10, 11]].sort());
  });

  it("#850: marcar com minutos (7h30 às 10h) guarda os minutos e o quadrado", async () => {
    const r = await POST(post({ dia: 1, de: 450, ate: 600 }), ctx);
    expect(r.status).toBe(201);
    const b = state.blocos.find((x) => x.userId === A)!;
    expect([b.inicio, b.fim, b.de, b.ate]).toEqual([7, 9, 450, 600]);
  });

  it("#850: minutos fora do passo de 15 ou fora da grade são recusados", async () => {
    expect((await POST(post({ dia: 1, de: 455, ate: 600 }), ctx)).status).toBe(400);
    expect((await POST(post({ dia: 1, de: 360, ate: 600 }), ctx)).status).toBe(400);
    expect((await POST(post({ dia: 1, de: 600, ate: 600 }), ctx)).status).toBe(400);
  });

  it("#850: a janelinha do bloco (substitui) diminui o horário em vez de juntar", async () => {
    await POST(post({ dia: 3, inicio: 8, fim: 15 }), ctx);
    const antigo = state.blocos.find((x) => x.userId === A)!;
    await POST(post({ dia: 3, de: 570, ate: 660, substitui: [antigo.id] }), ctx);
    const meus = state.blocos.filter((x) => x.userId === A);
    expect(meus.map((b) => [b.de, b.ate])).toEqual([[570, 660]]);
  });

  it("GET devolve os blocos de todos e o nome de cada pessoa", async () => {
    await POST(post({ dia: 1, inicio: 8, fim: 9 }), ctx);
    state.user = user(B);
    await POST(post({ dia: 1, inicio: 8, fim: 10 }), ctx);
    const j = await (await GET(get(), ctx)).json();
    expect(j.eu).toBe(B);
    expect(j.blocos).toHaveLength(2);
    expect(j.pessoas.map((p: any) => p.nome).sort()).toEqual(["Ana", "Bia"]);
  });

  it(`teto de ${MAX_BLOCOS_POR_PESSOA} horários por pessoa`, async () => {
    state.blocos = Array.from({ length: MAX_BLOCOS_POR_PESSOA }, (_, i) => ({ id: novoId(), canalId: CANAL, userId: A, dia: i % 7, inicio: 7, fim: 7 }))
      .map((b, i) => ({ ...b, inicio: 7 + Math.floor(i / 7), fim: 7 + Math.floor(i / 7) }));
    const r = await POST(post({ dia: 3, inicio: 22, fim: 22 }), ctx);
    expect(r.status).toBe(400);
  });
});

describe("agenda · apagar", () => {
  it("apaga o próprio horário e avisa o canal", async () => {
    const { bloco } = await (await POST(post({ dia: 2, inicio: 9, fim: 10 }), ctx)).json();
    state.publicados = [];
    const r = await DELETE(del(bloco.id), ctx);
    expect(r.status).toBe(200);
    expect(state.blocos).toHaveLength(0);
    expect(state.publicados).toHaveLength(1);
  });

  it("não apaga o horário de outra pessoa (403)", async () => {
    const { bloco } = await (await POST(post({ dia: 2, inicio: 9, fim: 10 }), ctx)).json();
    state.user = user(B);
    expect((await DELETE(del(bloco.id), ctx)).status).toBe(403);
    expect(state.blocos).toHaveLength(1);
  });

  it("bloco de outro canal ou inexistente → 404", async () => {
    state.blocos.push({ id: OUTRO, canalId: "f".repeat(24), userId: A, dia: 1, inicio: 9, fim: 9 });
    expect((await DELETE(del(OUTRO), ctx)).status).toBe(404);
    expect((await DELETE(del("9".repeat(24)), ctx)).status).toBe(404);
    expect((await DELETE(del("nope"), ctx)).status).toBe(404);
  });
});
