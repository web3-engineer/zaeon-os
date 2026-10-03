import { describe, it, expect, vi, beforeEach } from "vitest";

const st = vi.hoisted(() => ({
  findMapa: vi.fn(), createMapa: vi.fn(), patchMapa: vi.fn(),
  findBoard: vi.fn(), createBoard: vi.fn(), patchBoard: vi.fn(),
  bussolaAntiga: vi.fn(), fixarAntigo: vi.fn(),
}));
vi.mock("@/lib/map/store", () => ({ findOwnMapa: st.findMapa, createMapa: st.createMapa, patchMapa: st.patchMapa }));
vi.mock("@/lib/cartolina/store", () => ({
  cartolinaMemoriaOn: () => process.env.CARTOLINA_MEMORIA === "1",
  findOwnBoard: st.findBoard, createBoard: st.createBoard, patchBoard: st.patchBoard,
}));
vi.mock("@/lib/cartolina/memoria-turno", () => ({ bussolaParaTurno: st.bussolaAntiga, fixarTurno: st.fixarAntigo }));

import { bussolaParaTurno, fixarTurno } from "@/lib/map/memoria-turno";
import { nosFromStructured, projetarCards } from "@/lib/map/grafo";

const ans = (x: any = {}) => ({ nucleo: "n", ...x });
const mapaDe = (nos: any[], extra: any = {}) => ({ id: "m1", titulo: "Estudo", objetivo: "", nos, arestas: [], backbone: [], tipoTopico: "exploratorio", modoValidacao: "nenhuma", criterioCompletude: "", ...extra });

describe("memoria-turno unificada", () => {
  beforeEach(() => {
    process.env.MAP_HARNESS = "1"; process.env.CARTOLINA_MEMORIA = "1";
    Object.values(st).forEach((f) => f.mockReset());
    st.bussolaAntiga.mockResolvedValue(""); st.fixarAntigo.mockResolvedValue(undefined);
  });

  it("MAP_HARNESS off: delega à ponte antiga (nada muda até ligar)", async () => {
    delete process.env.MAP_HARNESS;
    st.bussolaAntiga.mockResolvedValue("antiga");
    expect(await bussolaParaTurno("u", "t1")).toBe("antiga");
    expect(await fixarTurno({ userId: "u", scopeId: "t1", prompt: "p", answer: ans({ conceitos: ["x"] }) as any })).toBeNull();
    expect(st.fixarAntigo).toHaveBeenCalledTimes(1);
    expect(st.findMapa).not.toHaveBeenCalled();
  });

  it("sem usuário / scope inválido: não toca o banco", async () => {
    expect(await bussolaParaTurno(null, "t1")).toBe("");
    expect(await fixarTurno({ userId: "u", scopeId: "a b", prompt: "p", answer: ans({ conceitos: ["x"] }) as any })).toBeNull();
    expect(st.findMapa).not.toHaveBeenCalled();
  });

  it("bússola lê o grafo do dono; sem mapa ainda, cai na cartolina antiga (conversa anterior à flag)", async () => {
    st.findMapa.mockResolvedValue(mapaDe(nosFromStructured(ans({ conceitos: ["Clorofila"] }) as any), { objetivo: "Fotossíntese" }));
    const t = await bussolaParaTurno("u", "t1");
    expect(t).toMatch(/CÉREBRO/); expect(t).toMatch(/Clorofila/); expect(t).toMatch(/Objetivo do estudo: Fotossíntese/);
    expect(t).not.toMatch(/Percurso:/); // sem backbone ainda
    const nos = nosFromStructured(ans({ conceitos: ["Clorofila"] }) as any);
    st.findMapa.mockResolvedValue(mapaDe(nos, { backbone: [nos[0]!.id], tipoTopico: "conceitual", modoValidacao: "quiz" }));
    expect(await bussolaParaTurno("u", "t1")).toMatch(/Percurso: Faltam 1 de 1 .*quiz/);
    st.findMapa.mockResolvedValue(null); st.bussolaAntiga.mockResolvedValue("cartolina");
    expect(await bussolaParaTurno("u", "t1")).toBe("cartolina");
  });

  it("erro no banco: bússola vazia e fixar devolve null sem lançar", async () => {
    st.findMapa.mockRejectedValue(new Error("db fora"));
    expect(await bussolaParaTurno("u", "t1")).toBe("");
    await expect(fixarTurno({ userId: "u", scopeId: "t1", prompt: "p", answer: ans({ conceitos: ["x"] }) as any })).resolves.toBeNull();
  });

  it("1º turno: cria o mapa (fonte) E projeta a cartolina com os mesmos ids; turno vazio não cria nada", async () => {
    st.findMapa.mockResolvedValue(null); st.findBoard.mockResolvedValue(null);
    expect(await fixarTurno({ userId: "u", scopeId: "t1", prompt: "p", answer: ans() as any })).toBeNull();
    expect(st.createMapa).not.toHaveBeenCalled();
    st.createMapa.mockImplementation(async (i: any) => mapaDe(i.nos, { titulo: i.titulo }));
    const r = await fixarTurno({ userId: "u", scopeId: "t1", prompt: "fotossíntese", answer: ans({ conceitos: ["luz"] }) as any, msgId: "m1" });
    expect(r).toMatchObject({ mapaId: "m1", novos: [expect.stringMatching(/^k_/)], tocados: [] });
    expect(st.createMapa.mock.calls[0][0]).toMatchObject({ ownerId: "u", surface: "estudos", scopeId: "t1", titulo: "fotossíntese" });
    const board = st.createBoard.mock.calls[0][0];
    expect(board.cards.map((c: any) => c.id)).toEqual(st.createMapa.mock.calls[0][0].nos.map((n: any) => n.id));
    expect(board.cards[0].msgIds).toEqual(["m1"]);
  });

  it("turno seguinte: patch do mapa com fusão sobre o estado RELIDO; cartolina recebe só o que mudou", async () => {
    const nos1 = nosFromStructured(ans({ conceitos: ["luz"] }) as any, "m1");
    const mapa = mapaDe(nos1);
    st.findMapa.mockResolvedValue(mapa);
    st.patchMapa.mockImplementation(async (_id: string, fn: any) => { const d = fn(mapa); return { ok: true, mapa: { ...mapa, ...d } }; });
    const cardsAtuais = projetarCards(nos1, []); cardsAtuais[0]!.x = 777;
    st.findBoard.mockResolvedValue({ id: "b1", cards: cardsAtuais });
    st.patchBoard.mockResolvedValue({ ok: true });
    const r = await fixarTurno({ userId: "u", scopeId: "t1", prompt: "p", answer: ans({ conceitos: ["luz", "água"] }) as any, msgId: "m2" });
    expect(r!.tocados).toEqual([nos1[0]!.id]); expect(r!.novos).toHaveLength(1);
    expect(st.patchMapa.mock.calls[0][1](mapa)).toMatchObject({ completudeAprendizado: 1, completudeConclusao: 0 });
    const ups = st.patchBoard.mock.calls[0][2].upsert;
    expect(ups).toHaveLength(2);
    expect(ups.find((c: any) => c.id === nos1[0]!.id)).toMatchObject({ x: 777, msgIds: ["m1", "m2"] });
  });

  it("CARTOLINA_MEMORIA off: o grafo grava, a projeção não roda", async () => {
    delete process.env.CARTOLINA_MEMORIA;
    st.findMapa.mockResolvedValue(null); st.createMapa.mockImplementation(async (i: any) => mapaDe(i.nos));
    await fixarTurno({ userId: "u", scopeId: "t1", prompt: "p", answer: ans({ conceitos: ["x"] }) as any });
    expect(st.createMapa).toHaveBeenCalledTimes(1);
    expect(st.findBoard).not.toHaveBeenCalled();
  });

  it("falha na projeção não desfaz o grafo nem lança", async () => {
    st.findMapa.mockResolvedValue(null); st.createMapa.mockImplementation(async (i: any) => mapaDe(i.nos));
    st.findBoard.mockRejectedValue(new Error("board fora"));
    const r = await fixarTurno({ userId: "u", scopeId: "t1", prompt: "p", answer: ans({ conceitos: ["x"] }) as any });
    expect(r?.mapaId).toBe("m1");
  });

  it("conflito persistente no patch do mapa → null (sem projeção)", async () => {
    st.findMapa.mockResolvedValue(mapaDe([])); st.patchMapa.mockResolvedValue({ ok: false, reason: "conflict" });
    expect(await fixarTurno({ userId: "u", scopeId: "t1", prompt: "p", answer: ans({ conceitos: ["x"] }) as any })).toBeNull();
    expect(st.findBoard).not.toHaveBeenCalled();
  });
});
