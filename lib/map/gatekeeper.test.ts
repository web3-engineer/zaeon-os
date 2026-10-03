import { describe, it, expect, vi, beforeEach } from "vitest";
import { heuristicaEstudavel, avaliarEstudavel, marcarConversa, gatekeeperDoTurno, tituloDe, ZONA_CINZENTA, type GatekeeperDb } from "@/lib/map/gatekeeper";

const h = (prompt: string, users = 0, answer: any = null) => heuristicaEstudavel({ prompt, history: [...Array(users)].map(() => ({ role: "user", text: "sobre o tema" })), answer });

describe("heuristicaEstudavel", () => {
  it("saudação / pergunta curta → não estudável", () => {
    expect(h("oi").estudavel).toBe(false);
    expect(h("que horas são?").estudavel).toBe(false);
  });
  it("intenção de aprender + conceitos gerados → estudável", () => {
    const s = h("quero entender fotossíntese", 0, { conceitos: ["luz", "clorofila"] });
    expect(s.estudavel).toBe(true); expect(s.motivos).toContain("intenção de aprender");
  });
  it("pedido explícito de estudo/TCC → estudável de cara", () => {
    expect(h("cria um estudo sobre energia solar").estudavel).toBe(true);
  });
  it("mesmo tema por ≥3 turnos com artefato → estudável; só 1 turno sem sinal → não", () => {
    expect(h("e a enzima?", 2, { artifacts: [{ studioKind: "mindmap" }] }).estudavel).toBe(true);
    expect(h("e a enzima?", 0).estudavel).toBe(false);
  });
  it("título sai do 1º prompt com intenção, limpo", () => {
    const s = heuristicaEstudavel({ prompt: "e depois?", history: [{ role: "user", text: "me explica a fotossíntese nas plantas C4." }, { role: "assistant", text: "…" }], answer: null });
    expect(s.tituloSugerido).toBe("Fotossíntese nas plantas C4");
    expect(tituloDe("")).toBe("Estudo");
    expect(tituloDe("quero aprender sobre a teoria da relatividade geral de Einstein e suas implicações").length).toBeLessThanOrEqual(50);
  });
});

describe("avaliarEstudavel (zona cinzenta → modelo)", () => {
  it("fora da zona cinzenta não chama o modelo; dentro chama e o modelo decide", async () => {
    const gen = vi.fn(async () => ({ estudavel: true, titulo: "Enzimas" }));
    await avaliarEstudavel({ prompt: "oi", history: [], answer: null }, gen as any);
    expect(gen).not.toHaveBeenCalled();
    const cinza = heuristicaEstudavel({ prompt: "e a enzima catalisa como?", history: [{ role: "user", text: "x" }], answer: { conceitos: ["enzima", "catálise"] } });
    expect(cinza.score).toBeGreaterThanOrEqual(ZONA_CINZENTA[0]); expect(cinza.score).toBeLessThan(ZONA_CINZENTA[1]);
    const r = await avaliarEstudavel({ prompt: "e a enzima catalisa como?", history: [{ role: "user", text: "x" }], answer: { conceitos: ["enzima", "catálise"] } }, gen as any);
    expect(gen).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ estudavel: true, tituloSugerido: "Enzimas" });
  });
  it("modelo falha ou ausente → fica com a heurística (conservador)", async () => {
    const i = { prompt: "e a enzima catalisa como?", history: [{ role: "user", text: "x" }], answer: { conceitos: ["enzima", "catálise"] } };
    expect((await avaliarEstudavel(i, vi.fn(async () => { throw new Error("404"); }) as any)).estudavel).toBe(false);
    expect((await avaliarEstudavel(i, null)).estudavel).toBe(false);
  });
});

describe("marcarConversa", () => {
  const db = () => { const f = { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() }; return { conversation: f } as unknown as GatekeeperDb & { conversation: typeof f }; };
  const sim = { estudavel: true, score: 0.9, tituloSugerido: "Solo", motivos: [] };
  const nao = { ...sim, estudavel: false };
  it("sem linha: cria só se estudável", async () => {
    const d = db(); d.conversation.findFirst.mockResolvedValue(null);
    await marcarConversa(d, "u", "t1", nao); expect(d.conversation.create).not.toHaveBeenCalled();
    await marcarConversa(d, "u", "t1", sim);
    expect(d.conversation.create.mock.calls[0][0].data).toMatchObject({ userId: "u", surface: "estudos", scopeId: "t1", estudavel: true, tituloSugerido: "Solo" });
  });
  it("liga uma vez; nunca desliga; não mexe em conversa que já tem mapa", async () => {
    const d = db(); d.conversation.findFirst.mockResolvedValue({ id: "c", estudavel: false, mapaId: null });
    await marcarConversa(d, "u", "t1", sim); expect(d.conversation.update).toHaveBeenCalledTimes(1);
    d.conversation.findFirst.mockResolvedValue({ id: "c", estudavel: true, mapaId: null });
    await marcarConversa(d, "u", "t1", nao); await marcarConversa(d, "u", "t1", sim);
    d.conversation.findFirst.mockResolvedValue({ id: "c", estudavel: false, mapaId: "m" });
    await marcarConversa(d, "u", "t1", sim);
    expect(d.conversation.update).toHaveBeenCalledTimes(1);
  });
});

describe("gatekeeperDoTurno", () => {
  beforeEach(() => { delete process.env.ESTUDO_GATEKEEPER; });
  it("flag off / sem usuário / sem scope → null sem tocar o banco", async () => {
    const d = { conversation: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() } } as any;
    expect(await gatekeeperDoTurno({ userId: "u", scopeId: "t1", prompt: "cria um estudo sobre X", history: [], answer: { nucleo: "" }, db: d, genJson: null })).toBeNull();
    process.env.ESTUDO_GATEKEEPER = "1";
    expect(await gatekeeperDoTurno({ userId: null, scopeId: "t1", prompt: "x", history: [], answer: { nucleo: "" }, db: d, genJson: null })).toBeNull();
    expect(d.conversation.findFirst).not.toHaveBeenCalled();
  });
  it("flag on: avalia e grava; erro no banco não lança", async () => {
    process.env.ESTUDO_GATEKEEPER = "1";
    const d = { conversation: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn(), update: vi.fn() } } as any;
    const r = await gatekeeperDoTurno({ userId: "u", scopeId: "t1", prompt: "cria um estudo sobre solo", history: [], answer: { nucleo: "" }, db: d, genJson: null });
    expect(r?.estudavel).toBe(true); expect(d.conversation.create).toHaveBeenCalledTimes(1);
    d.conversation.findFirst.mockRejectedValue(new Error("db"));
    await expect(gatekeeperDoTurno({ userId: "u", scopeId: "t1", prompt: "cria um estudo sobre solo", history: [], answer: { nucleo: "" }, db: d, genJson: null })).resolves.toBeNull();
  });
});
