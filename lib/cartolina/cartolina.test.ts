import { describe, it, expect, vi, beforeEach } from "vitest";
import { papelDe, podeLer, podeEscrever, podeAdministrar } from "@/lib/cartolina/access";
import { sanitizeCard, readCards, applyOps, MAX_CARDS } from "@/lib/cartolina/cards";

const card = (id: string, extra: any = {}) => ({ id, tipo: "nota", titulo: id, x: 10, y: 20, w: 300, ...extra });

describe("access · papelDe / permissões", () => {
  it("dono é o ownerId, mesmo sem linha de membro", () => {
    expect(papelDe("u1", "u1")).toBe("dono");
  });
  it("membro herda o papel da linha", () => {
    expect(papelDe("u1", "u2", "editor")).toBe("editor");
    expect(papelDe("u1", "u2", "leitor")).toBe("leitor");
  });
  it("estranho (sem linha) e papel inválido no banco = sem acesso", () => {
    expect(papelDe("u1", "u3")).toBeNull();
    expect(papelDe("u1", "u3", null)).toBeNull();
    expect(papelDe("u1", "u3", "dono")).toBeNull(); // "dono" nunca vale vindo de membro
    expect(papelDe("u1", "u3", "admin")).toBeNull();
    expect(papelDe("u1", "")).toBeNull();
  });
  it("matriz de permissões", () => {
    expect([podeLer("dono"), podeLer("editor"), podeLer("leitor"), podeLer(null)]).toEqual([true, true, true, false]);
    expect([podeEscrever("dono"), podeEscrever("editor"), podeEscrever("leitor"), podeEscrever(null)]).toEqual([true, true, false, false]);
    expect([podeAdministrar("dono"), podeAdministrar("editor"), podeAdministrar("leitor")]).toEqual([true, false, false]);
  });
});

describe("cards · sanitizeCard", () => {
  it("aceita card válido e preserva os campos", () => {
    const c = sanitizeCard(card("c1", { corpo: "oi", rot: 2, msgIds: ["m1", "m2"] }))!;
    expect(c).toMatchObject({ id: "c1", tipo: "nota", corpo: "oi", rot: 2, msgIds: ["m1", "m2"] });
  });
  it("rejeita lixo: sem id, tipo desconhecido, coordenada não numérica, não-objeto", () => {
    expect(sanitizeCard(null)).toBeNull();
    expect(sanitizeCard("x")).toBeNull();
    expect(sanitizeCard({ ...card("c1"), id: undefined })).toBeNull();
    expect(sanitizeCard({ ...card("a b") })).toBeNull();          // espaço no id
    expect(sanitizeCard({ ...card("c1"), tipo: "script" })).toBeNull();
    expect(sanitizeCard({ ...card("c1"), x: "10" })).toBeNull();
    expect(sanitizeCard({ ...card("c1"), y: NaN })).toBeNull();
  });
  it("limita coordenadas, largura, rotação e tamanho de texto", () => {
    const c = sanitizeCard(card("c1", { x: 9e9, w: 99999, rot: 90, corpo: "a".repeat(9000) }))!;
    expect(c.x).toBe(20000);
    expect(c.w).toBe(1200);
    expect(c.rot).toBe(15);
    expect(c.corpo!.length).toBe(4000);
  });
  it("msgIds inválidos são descartados", () => {
    const c = sanitizeCard(card("c1", { msgIds: ["ok", "<b>", 3, "x".repeat(99)] }))!;
    expect(c.msgIds).toEqual(["ok"]);
  });
  it("readCards tolera Json corrompido sem lançar", () => {
    expect(readCards(null)).toEqual([]);
    expect(readCards({ a: 1 })).toEqual([]);
    expect(readCards([card("c1"), { lixo: true }, null]).map((c) => c.id)).toEqual(["c1"]);
  });
});

describe("cards · applyOps (merge concorrente)", () => {
  it("dois colaboradores em cards DIFERENTES não se apagam", () => {
    const base = [card("a"), card("b")] as any;
    // A e B partem do mesmo estado; cada um move um card. O servidor aplica em sequência.
    const aposA = applyOps(base, { upsert: [card("a", { x: 111 })] });
    const aposB = applyOps(aposA, { upsert: [card("b", { x: 222 })] });
    expect(aposB.find((c) => c.id === "a")!.x).toBe(111);
    expect(aposB.find((c) => c.id === "b")!.x).toBe(222);
  });
  it("mesmo card: vale o último a gravar, inteiro (nada de meio-card)", () => {
    const base = [card("a", { corpo: "velho" })] as any;
    const r = applyOps(applyOps(base, { upsert: [card("a", { corpo: "de A" })] }), { upsert: [card("a", { corpo: "de B" })] });
    expect(r).toHaveLength(1);
    expect(r[0].corpo).toBe("de B");
  });
  it("card novo vai pro fim; remove tira; remove+upsert do mesmo id remove", () => {
    const base = [card("a"), card("b")] as any;
    expect(applyOps(base, { upsert: [card("c")] }).map((c) => c.id)).toEqual(["a", "b", "c"]);
    expect(applyOps(base, { remove: ["a"] }).map((c) => c.id)).toEqual(["b"]);
    expect(applyOps(base, { remove: ["a"], upsert: [card("a")] }).map((c) => c.id)).toEqual(["b"]);
  });
  it("ignora upsert inválido e ids de remove que não são string", () => {
    const base = [card("a")] as any;
    expect(applyOps(base, { upsert: [{ lixo: 1 }], remove: [42 as any] })).toEqual(base);
  });
  it("nunca passa de MAX_CARDS", () => {
    const muitos = Array.from({ length: MAX_CARDS + 30 }, (_, i) => card(`n${i}`));
    expect(applyOps([], { upsert: muitos })).toHaveLength(MAX_CARDS);
  });
});

// ── store com Prisma em memória ───────────────────────────────────────────────────────────
const db = vi.hoisted(() => ({ boards: new Map<string, any>(), membros: new Map<string, any>(), hookAntesUpdate: null as null | (() => void) }));
vi.mock("@/src/lib/prisma", () => ({
  prisma: {
    cartolina: {
      findUnique: async ({ where }: any) => (db.boards.has(where.id) ? structuredClone(db.boards.get(where.id)) : null),
      findFirst: async ({ where }: any) =>
        [...db.boards.values()].find((b) => b.ownerId === where.ownerId && b.surface === where.surface && b.scopeId === where.scopeId) ?? null,
      create: async ({ data }: any) => {
        const row = { id: String(db.boards.size + 1).padStart(24, "a"), rev: 0, updatedAt: new Date(), createdAt: new Date(), ...data };
        db.boards.set(row.id, row);
        return structuredClone(row);
      },
      updateMany: async ({ where, data }: any) => {
        db.hookAntesUpdate?.();
        const b = db.boards.get(where.id);
        if (!b || b.rev !== where.rev) return { count: 0 };
        Object.assign(b, data);
        return { count: 1 };
      },
    },
    cartolinaMembro: {
      findUnique: async ({ where }: any) => db.membros.get(`${where.cartolinaId_userId.cartolinaId}:${where.cartolinaId_userId.userId}`) ?? null,
    },
  },
}));

import { createBoard, getBoardForUser, patchBoard, findOwnBoard } from "@/lib/cartolina/store";

const A = "a".repeat(24), B = "b".repeat(24), C = "c".repeat(24), D = "d".repeat(24);

describe("store · autorização (IDOR A/B/C)", () => {
  let id: string;
  beforeEach(async () => {
    db.boards.clear(); db.membros.clear(); db.hookAntesUpdate = null;
    id = (await createBoard({ ownerId: A, surface: "estudos", scopeId: "t1", titulo: "X", cards: [card("a")] as any })).id;
    db.membros.set(`${id}:${B}`, { papel: "editor" });
    db.membros.set(`${id}:${C}`, { papel: "leitor" });
  });

  it("dono, editor e leitor leem; estranho recebe null (= 404)", async () => {
    expect((await getBoardForUser(id, A))!.papel).toBe("dono");
    expect((await getBoardForUser(id, B))!.papel).toBe("editor");
    expect((await getBoardForUser(id, C))!.papel).toBe("leitor");
    expect(await getBoardForUser(id, D)).toBeNull();
  });
  it("id malformado não lança: vira null", async () => {
    expect(await getBoardForUser("nao-e-objectid", A)).toBeNull();
  });
  it("editor escreve; leitor leva forbidden; estranho leva not_found (sem vazar existência)", async () => {
    expect((await patchBoard(id, B, { upsert: [card("novo")] })).ok).toBe(true);
    expect(await patchBoard(id, C, { upsert: [card("x")] })).toEqual({ ok: false, reason: "forbidden" });
    expect(await patchBoard(id, D, { upsert: [card("x")] })).toEqual({ ok: false, reason: "not_found" });
    expect(db.boards.get(id).cards.map((c: any) => c.id)).toEqual(["a", "novo"]); // leitor/estranho não alteraram nada
  });
  it("findOwnBoard só enxerga boards do próprio dono", async () => {
    expect(await findOwnBoard(A, "estudos", "t1")).not.toBeNull();
    expect(await findOwnBoard(B, "estudos", "t1")).toBeNull();
  });
  it("createBoard descarta cards inválidos antes de gravar", async () => {
    const b = await createBoard({ ownerId: A, surface: "lounge", scopeId: null, titulo: "Y", cards: [card("ok"), { lixo: 1 }] as any });
    expect(b.cards.map((c) => c.id)).toEqual(["ok"]);
  });
});

describe("store · controle otimista (rev)", () => {
  beforeEach(() => { db.boards.clear(); db.membros.clear(); db.hookAntesUpdate = null; });

  it("perdeu a corrida → relê e reaplica, sem perder a edição do outro", async () => {
    const b = await createBoard({ ownerId: A, surface: "estudos", scopeId: null, titulo: "X", cards: [card("a"), card("b")] as any });
    db.membros.set(`${b.id}:${B}`, { papel: "editor" });
    let injetou = false;
    // Na 1ª tentativa de B, A grava no meio (rev muda) → o updateMany de B tem que falhar e repetir.
    db.hookAntesUpdate = () => {
      if (injetou) return;
      injetou = true;
      const row = db.boards.get(b.id);
      row.cards = row.cards.map((c: any) => (c.id === "a" ? { ...c, x: 999 } : c));
      row.rev += 1;
    };
    const r = await patchBoard(b.id, B, { upsert: [card("b", { x: 555 })] });
    expect(r.ok).toBe(true);
    const final = db.boards.get(b.id).cards;
    expect(final.find((c: any) => c.id === "a").x).toBe(999); // edição de A sobreviveu
    expect(final.find((c: any) => c.id === "b").x).toBe(555); // edição de B também
  });
  it("conflito persistente esgota as tentativas e devolve conflict (não trava)", async () => {
    const b = await createBoard({ ownerId: A, surface: "estudos", scopeId: null, titulo: "X", cards: [card("a")] as any });
    db.hookAntesUpdate = () => { db.boards.get(b.id).rev += 1; }; // sempre perde
    expect(await patchBoard(b.id, A, { upsert: [card("a", { x: 1 })] })).toEqual({ ok: false, reason: "conflict" });
  });
  it("rev incrementa a cada gravação", async () => {
    const b = await createBoard({ ownerId: A, surface: "estudos", scopeId: null, titulo: "X", cards: [] });
    const r = await patchBoard(b.id, A, { upsert: [card("a")] });
    expect(r.ok && r.board.rev).toBe(1);
  });
  it("titulo opcional atualiza; vazio mantém", async () => {
    const b = await createBoard({ ownerId: A, surface: "estudos", scopeId: null, titulo: "Velho", cards: [] });
    await patchBoard(b.id, A, { titulo: "Novo" });
    expect(db.boards.get(b.id).titulo).toBe("Novo");
    await patchBoard(b.id, A, { titulo: "   " });
    expect(db.boards.get(b.id).titulo).toBe("Novo");
  });
});

import { mesclarRemoto } from "@/lib/cartolina/cards";
describe("cards · mesclarRemoto (polling)", () => {
  const L = [card("a", { x: 1 }), card("b", { x: 1 }), card("novo")] as any;
  const R = [card("a", { x: 9 }), card("b", { x: 9 }), card("deB")] as any;
  it("sem pendência, vale o servidor inteiro (inclusive cards que o outro criou/apagou)", () => {
    expect(mesclarRemoto(L, R, new Set())).toBe(R);
  });
  it("card que eu estou arrastando não pula de volta", () => {
    const r = mesclarRemoto(L, R, new Set(["a"]));
    expect(r.find((c) => c.id === "a")!.x).toBe(1);
    expect(r.find((c) => c.id === "b")!.x).toBe(9);
    expect(r.map((c) => c.id)).toContain("deB");
  });
  it("card recém-criado aqui (ainda não gravado) não some no poll", () => {
    expect(mesclarRemoto(L, R, new Set(["novo"])).map((c) => c.id)).toEqual(["a", "b", "deB", "novo"]);
  });
});

describe("cards · desenho/imagemId", () => {
  const prims = [{ t: "circulo", c: [5, 5], r: 3 }, { t: "linha", de: [0, 0], ate: [9, 9] }, { t: "seta", de: [1, 1], ate: [5, 5] }];
  it("desenho do cliente é RE-validado: primitiva forjada some", () => {
    const c = sanitizeCard(card("p", { tipo: "prancha", desenho: { primitivas: [...prims, { t: "script", src: "x" }] } }))!;
    expect(c.desenho!.primitivas).toHaveLength(3);
  });
  it("desenho imprestável é descartado; só pranchas têm desenho", () => {
    expect(sanitizeCard(card("p", { tipo: "prancha", desenho: { primitivas: [] } }))!.desenho).toBeUndefined();
    expect(sanitizeCard(card("n", { desenho: { primitivas: prims } }))!.desenho).toBeUndefined();
  });
  it("imagemId só se for ObjectId", () => {
    expect(sanitizeCard(card("p", { imagemId: "a".repeat(24) }))!.imagemId).toBe("a".repeat(24));
    expect(sanitizeCard(card("p", { imagemId: "../../etc" }))!.imagemId).toBeUndefined();
  });
});
