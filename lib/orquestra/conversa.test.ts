import { describe, it, expect, vi, beforeEach } from "vitest";

const db = new Map<string, any>();
const consoleConversa = {
  findUnique: vi.fn(async ({ where }: any) => db.get(where.id) ?? null),
  update: vi.fn(async ({ where, data }: any) => { const c = { ...db.get(where.id), ...data, atualizadaEm: new Date() }; db.set(where.id, c); return c; }),
  findMany: vi.fn(async () => [...db.values()]),
  create: vi.fn(async ({ data }: any) => { const c = { id: "c".repeat(24), criadaEm: new Date(), atualizadaEm: new Date(), ...data }; db.set(c.id, c); return c; }),
  deleteMany: vi.fn(async ({ where }: any) => ({ count: db.delete(where.id) ? 1 : 0 })),
};
vi.mock("@/src/lib/prisma", () => ({ prisma: { consoleConversa } }));

import {
  enviarMensagem, eventosDoPedaco, historicoDe, interlocutores, lerTexto, rodandoDeVerdade, temTurnoRodando, tituloDe,
  conversaParaApp, TEXTO_TURNO_PERDIDO, type MensagemConversa,
} from "@/lib/orquestra/conversa";

const ID = "c".repeat(24);
const TOKEN = "t".repeat(40);
const m = (x: Partial<MensagemConversa>): MensagemConversa => ({ id: "m", papel: "voce", texto: "oi", em: new Date().toISOString(), ...x });

beforeEach(() => { db.clear(); vi.clearAllMocks(); });

describe("conversa · regras", () => {
  it("valida texto e monta título", () => {
    expect(lerTexto({ texto: "  olá  " })).toBe("olá");
    expect(lerTexto({ texto: "" })).toEqual({ erro: "mensagem vazia" });
    expect(lerTexto({ texto: "x".repeat(8_001) })).toMatchObject({ erro: expect.stringMatching(/longa/) });
    expect(tituloDe("Explique   mitose")).toBe("Explique mitose");
    expect(tituloDe("a".repeat(80))).toHaveLength(58);
  });
  it("histórico: só concluídas, no formato do harness", () => {
    const h = historicoDe([m({ texto: "pergunta" }), m({ papel: "agente", texto: "resposta", status: "concluida" }), m({ papel: "agente", texto: "erro", status: "falhou" })]);
    expect(h).toEqual([{ role: "user", text: "pergunta" }, { role: "model", text: "resposta" }]);
  });
  it("turno rodando há mais de 15 min sem registro ao vivo = perdido (reinício)", () => {
    const velho = m({ papel: "agente", status: "rodando", tarefaId: "a".repeat(24), em: new Date(Date.now() - 20 * 60_000).toISOString() });
    expect(rodandoDeVerdade(velho, Date.now(), () => false)).toBe(false);
    expect(rodandoDeVerdade(velho, Date.now(), () => true)).toBe(true);
    expect(temTurnoRodando([m({ papel: "agente", status: "rodando" })])).toBe(true);
    const app = conversaParaApp({ id: ID, criadaEm: new Date(), atualizadaEm: new Date(), titulo: "t", agente: "aura", mensagens: [velho] });
    expect(app.mensagens[0]).toMatchObject({ status: "falhou", texto: TEXTO_TURNO_PERDIDO });
  });
  it("lê os eventos de progresso do stream do harness", () => {
    expect(eventosDoPedaco('@@PROGRESS@@{"fase":"plan","rotulo":"Planejando"}\nxx@@PROGRESS@@{torto}\n')).toEqual([{ fase: "plan", rotulo: "Planejando" }]);
  });
  it("interlocutores: casa (sem silenciosos) + mentores + motores", async () => {
    const i = await interlocutores({ HF_TOKEN: "x" });
    const ids = i.map((x) => x.id);
    expect(ids).toEqual(expect.arrayContaining(["aura", "zenita", "medicina", "deepseek-v4-profundo", "kimi-enxame"]));
    expect(ids).not.toContain("abnt_structurer");
    expect(i.find((x) => x.id === "medicina")!.tipo).toBe("mentor");
    expect(i.find((x) => x.id === "tongyi-deepresearch")!.disponivel).toBe(false);
  });
});

describe("conversa · enviar", () => {
  it("grava a pergunta + o agente rodando, roda em 2º plano e fecha com a resposta", async () => {
    db.set(ID, { id: ID, titulo: "Nova conversa", agente: "aura", mensagens: [], criadaEm: new Date(), atualizadaEm: new Date() });
    let soltar!: (v: any) => void;
    const rodar = vi.fn(() => new Promise<any>((r) => { soltar = r; }));
    const r = await enviarMensagem(ID, "Explique mitose", { rodar });
    expect(r).toMatchObject({ ok: true });
    expect(db.get(ID).titulo).toBe("Explique mitose");
    expect(db.get(ID).mensagens.map((x: any) => x.status ?? x.papel)).toEqual(["voce", "rodando"]);
    expect(await enviarMensagem(ID, "outra", { rodar })).toMatchObject({ ok: false, status: 409 });
    soltar({ status: "concluida", texto: "Mitose é…", ms: 1200, modelo: "gemini" });
    await vi.waitFor(() => expect(db.get(ID).mensagens[1]).toMatchObject({ status: "concluida", texto: "Mitose é…", ms: 1200 }));
    expect((rodar.mock.calls as any[])[0][0]).toMatchObject({ agente: "aura", texto: "Explique mitose", historico: [] });
  });
  it("404 para conversa inexistente", async () => {
    expect(await enviarMensagem("d".repeat(24), "oi", { rodar: vi.fn() as any })).toMatchObject({ ok: false, status: 404 });
  });
});

describe("rotas /conversas", () => {
  it("401 sem chave; cria, lista, valida agente e mensagem", async () => {
    vi.stubEnv("ORQUESTRA_CONSOLE_TOKEN", TOKEN);
    const com = (u: string, init: RequestInit = {}) => new Request(u, { ...init, headers: { authorization: `Bearer ${TOKEN}` } });
    const lista = await import("@/app/api/admin/orquestra/conversas/route");
    const msgs = await import("@/app/api/admin/orquestra/conversas/[id]/mensagens/route");
    const uma = await import("@/app/api/admin/orquestra/conversas/[id]/route");
    expect((await lista.GET(new Request("http://x"))).status).toBe(401);
    expect((await lista.POST(com("http://x", { method: "POST", body: JSON.stringify({ agente: "ninguem" }) }))).status).toBe(400);
    const criada = await lista.POST(com("http://x", { method: "POST", body: JSON.stringify({ agente: "zenita" }) }));
    expect(criada.status).toBe(201);
    expect((await (await lista.GET(com("http://x"))).json()).conversas[0]).toMatchObject({ agente: "zenita", mensagens: 0 });
    expect((await msgs.POST(com("http://x", { method: "POST", body: JSON.stringify({ texto: "" }) }), { params: { id: ID } })).status).toBe(400);
    expect((await uma.GET(com("http://x"), { params: { id: "nao" } })).status).toBe(404);
    expect((await uma.DELETE(com("http://x", { method: "DELETE" }), { params: { id: ID } })).status).toBe(200);
    vi.unstubAllEnvs();
  });
});
