import { describe, it, expect, vi, beforeEach } from "vitest";
import { rascunhosFromStructured, fundirNoBoard, cardsFromStructured, bussola, MAX_CARDS_POR_TURNO } from "@/lib/cartolina/fromStructured";

const ans = (x: any = {}) => ({ nucleo: "n", ...x });

describe("cardsFromStructured", () => {
  it("mapeia conceitos, evidência, próximos passos, work e artifacts", () => {
    const r = rascunhosFromStructured(ans({
      conceitos: ["Fotossíntese", "Clorofila"],
      evidencia: [{ claim: "A clorofila absorve luz azul e vermelha", source: { title: "Taiz 2017" } }],
      proximos_passos: ["Estudar o ciclo de Calvin"],
      work: { kind: "artigo", sections: [{ title: "Introdução", body: "texto" }] },
      artifacts: [{ studioKind: "mindmap", topic: "fotossíntese" }, { studioKind: "video", topic: "luz" }],
    }) as any, "m1");
    expect(r.map((c) => c.tipo)).toEqual(["nota", "nota", "nota", "pergunta", "nota", "prancha", "video"]);
    expect(r[2]).toMatchObject({ titulo: "Evidência", legenda: "Taiz 2017" });
    expect(r.every((c) => c.msgIds?.[0] === "m1")).toBe(true);
  });
  it("resposta só com núcleo não gera card (a cartolina não vira histórico)", () => {
    expect(rascunhosFromStructured(ans() as any)).toEqual([]);
  });
  it("ignora entradas vazias/nulas e artifact sem kind", () => {
    const r = rascunhosFromStructured(ans({ conceitos: ["", "  ", null], evidencia: [{ claim: "" }], artifacts: [{ topic: "x" }] }) as any);
    expect(r).toEqual([]);
  });
  it("ids estáveis pelo conteúdo: acento/caixa/espaço não criam card novo", () => {
    const a = rascunhosFromStructured(ans({ conceitos: ["Fotossíntese"] }) as any)[0].id;
    const b = rascunhosFromStructured(ans({ conceitos: ["  fotossintese "] }) as any)[0].id;
    expect(a).toBe(b);
  });
  it("dedupe no turno + teto por turno", () => {
    const r = rascunhosFromStructured(ans({ conceitos: [...Array(20)].map((_, i) => `c${i}`).concat(["c1"]) }) as any);
    expect(r).toHaveLength(MAX_CARDS_POR_TURNO);
    expect(new Set(r.map((c) => c.id)).size).toBe(r.length);
  });
  it("2º turno: conceito repetido acumula msgId e NÃO mexe na posição; novo nasce abaixo", () => {
    const t1 = cardsFromStructured(ans({ conceitos: ["A"] }) as any, [], "m1");
    t1[0].x = 777; // o aluno arrastou o card
    const t2 = cardsFromStructured(ans({ conceitos: ["A", "B"] }) as any, t1, "m2");
    expect(t2).toHaveLength(2);
    expect(t2[0]).toMatchObject({ x: 777, msgIds: ["m1", "m2"] });
    expect(t2[1].y).toBeGreaterThan(t1[0].y);
  });
  it("cards novos não se sobrepõem (grade de 3 colunas)", () => {
    const r = fundirNoBoard([], rascunhosFromStructured(ans({ conceitos: ["a", "b", "c", "d"] }) as any));
    const pos = r.map((c) => `${c.x},${c.y}`);
    expect(new Set(pos).size).toBe(4);
  });
});

describe("bussola", () => {
  it("vazia sem cards", () => expect(bussola([])).toBe(""));
  it("separa estudado / em aberto / material", () => {
    const t = bussola([
      { id: "1", tipo: "nota", titulo: "Clorofila", x: 0, y: 0, w: 1 },
      { id: "2", tipo: "pergunta", corpo: "E o ciclo de Calvin?", x: 0, y: 0, w: 1 },
      { id: "3", tipo: "prancha", titulo: "mapa", x: 0, y: 0, w: 1 },
    ] as any);
    expect(t).toMatch(/Já estudado.*Clorofila/);
    expect(t).toMatch(/Em aberto.*Calvin/);
    expect(t).toMatch(/Material criado.*mapa/);
  });
  it("respeita o teto de caracteres (vai pro prompt todo turno)", () => {
    const cards = [...Array(200)].map((_, i) => ({ id: `n${i}`, tipo: "nota", titulo: "conceito longo número " + i, x: 0, y: 0, w: 1 }));
    expect(bussola(cards as any, 500).length).toBeLessThanOrEqual(500);
  });
});

// ── ponte do turno, com o store mockado ───────────────────────────────────────────────────
const st = vi.hoisted(() => ({ find: vi.fn(), create: vi.fn(), patch: vi.fn() }));
vi.mock("@/lib/cartolina/store", async (o) => ({ ...(await o<any>()), findOwnBoard: st.find, createBoard: st.create, patchBoard: st.patch }));
vi.mock("@/lib/agent/transcript", () => ({ resolveUserId: async () => null }));
vi.mock("@/src/lib/ratelimit", () => ({ guard: async () => ({ ok: true }) }));
import { bussolaParaTurno, fixarTurno } from "@/lib/cartolina/memoria-turno";

describe("memoria-turno", () => {
  beforeEach(() => { process.env.CARTOLINA_MEMORIA = "1"; Object.values(st).forEach((f) => f.mockReset()); });

  it("flag off / sem usuário / sem conversa: não toca o banco", async () => {
    delete process.env.CARTOLINA_MEMORIA;
    expect(await bussolaParaTurno("u", "t1")).toBe("");
    process.env.CARTOLINA_MEMORIA = "1";
    expect(await bussolaParaTurno(null, "t1")).toBe("");
    expect(await bussolaParaTurno("u", undefined)).toBe("");
    await fixarTurno({ userId: "u", scopeId: "a b", prompt: "p", answer: ans({ conceitos: ["x"] }) as any });
    expect(st.find).not.toHaveBeenCalled();
  });
  it("bússola lê o board do DONO da conversa", async () => {
    st.find.mockResolvedValue({ cards: [{ id: "1", tipo: "nota", titulo: "X", x: 0, y: 0, w: 1 }] });
    expect(await bussolaParaTurno("u", "t1")).toMatch(/X/);
    expect(st.find).toHaveBeenCalledWith("u", "estudos", "t1");
  });
  it("erro no banco: bússola vazia e fixar não lança (memória nunca derruba o turno)", async () => {
    st.find.mockRejectedValue(new Error("db fora"));
    expect(await bussolaParaTurno("u", "t1")).toBe("");
    await expect(fixarTurno({ userId: "u", scopeId: "t1", prompt: "p", answer: ans({ conceitos: ["x"] }) as any })).resolves.toBeUndefined();
  });
  it("1º turno com conteúdo cria o board; turno sem conteúdo não cria nada", async () => {
    st.find.mockResolvedValue(null);
    await fixarTurno({ userId: "u", scopeId: "t1", prompt: "p", answer: ans() as any });
    expect(st.create).not.toHaveBeenCalled();
    await fixarTurno({ userId: "u", scopeId: "t1", prompt: "fotossíntese", answer: ans({ conceitos: ["luz"] }) as any, msgId: "m1" });
    expect(st.create.mock.calls[0][0]).toMatchObject({ ownerId: "u", surface: "estudos", scopeId: "t1", titulo: "fotossíntese" });
  });
  it("board existente: manda só os cards que mudaram", async () => {
    const existente = cardsFromStructured(ans({ conceitos: ["luz"] }) as any, [], "m1");
    st.find.mockResolvedValue({ id: "b1", cards: existente });
    st.patch.mockResolvedValue({ ok: true });
    await fixarTurno({ userId: "u", scopeId: "t1", prompt: "p", answer: ans({ conceitos: ["luz", "água"] }) as any, msgId: "m2" });
    const ups = st.patch.mock.calls[0][2].upsert;
    expect(ups).toHaveLength(2); // "luz" ganhou msgId m2 + "água" é novo
    expect(st.patch.mock.calls[0][1]).toBe("u");
  });
});
