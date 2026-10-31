/** #663: a lista do servidor junto com a do navegador, o apagar que não ressuscita e a gravação na conversa certa. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apagarNoServidor, blocoDaMensagem, cortarNoServidor, gravarArtefato, gravarTurno, juntarConversas, sincronizarConversas, type ConversaServidor } from "./conversasServidor";
import { ESCOPO_COWORK, type Armazem, type Thread } from "./threads";

const local = (id: string, titulo: string, tocadaEm = 10): Thread => ({ id, titulo, criadaEm: 1, tocadaEm });
const srv = (id: string, titulo: string, tocadaEm = 10, extra: Partial<ConversaServidor> = {}): ConversaServidor => ({ id, titulo, criadaEm: 1, tocadaEm, ...extra });
const armazem = (): Armazem => { const d = new Map<string, string>(); return { getItem: (k) => d.get(k) ?? null, setItem: (k, v) => { d.set(k, v); }, removeItem: (k) => { d.delete(k); } }; };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status });
let fetchMock: ReturnType<typeof vi.fn>;
const corpo = (i = 0) => JSON.parse(fetchMock.mock.calls[i]![1].body);

beforeEach(() => { fetchMock = vi.fn(async () => json({ ok: true })); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => vi.unstubAllGlobals());

describe("juntarConversas", () => {
  it("nada do navegador some: quem só existe aqui fica (as antigas só sobem no PR 3)", () => {
    expect(juntarConversas([local("a", "só aqui")], [], []).map((t) => t.id)).toEqual(["a"]);
  });
  it("o que só o servidor tem entra no fim, com o elo da sub-conversa", () => {
    const j = juntarConversas([local("a", "A")], [srv("b", "B", 5, { parentId: "a", contexto: "fio" })], []);
    expect(j.map((t) => t.id)).toEqual(["a", "b"]);
    expect(j[1]).toMatchObject({ parentId: "a", contexto: "fio" });
  });
  it("não repete, e vale o título mais recente", () => {
    expect(juntarConversas([local("a", "velho", 1)], [srv("a", "novo", 9)], [])).toMatchObject([{ id: "a", titulo: "novo" }]);
    expect(juntarConversas([local("a", "meu", 9)], [srv("a", "antigo", 1)], [])).toMatchObject([{ id: "a", titulo: "meu" }]);
  });
  it("conversa com o apagar na fila não volta, nem do servidor nem do navegador", () => {
    expect(juntarConversas([local("a", "A")], [srv("a", "A"), srv("b", "B")], ["a", "b"])).toEqual([]);
  });
});

describe("gravação", () => {
  it("o turno vai para a conversa dele, com título, e a resposta depois da pergunta", () => {
    gravarTurno("estudos", { ...local("t1", "java"), parentId: "m", contexto: "fio" }, "oi", "olá");
    const b = corpo();
    expect(b.scopeId).toBe("t1");
    expect(b.conversa).toEqual({ titulo: "java", parentId: "m", contexto: "fio" });
    expect(b.messages[1].at).toBeGreaterThan(b.messages[0].at);
  });
  it("sem conversa, não grava (nunca volta para a 'geral')", () => {
    gravarTurno("estudos", undefined, "oi", "olá");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("diagrama guarda só o número, e volta dele", () => {
    gravarArtefato("estudos", local("t1", "java"), { studioKind: "diagram", artifactId: "d1", title: "Fluxo" });
    const m = corpo().messages[0];
    expect(m.meta.bloco).toEqual({ studioKind: "diagram", artifactId: "d1", title: "Fluxo" });
    expect(blocoDaMensagem({ id: "1", role: "assistant", text: "Fluxo", at: "", meta: m.meta })).toEqual({ studioKind: "diagram", artifactId: "d1", title: "Fluxo" });
    expect(blocoDaMensagem({ id: "2", role: "assistant", text: "x", at: "" })).toBeNull();
  });
  it("editar/regenerar corta a partir da pergunta; mensagem antiga sem horário não corta nada", () => {
    cortarNoServidor("estudos", "t1", 123);
    expect(String(fetchMock.mock.calls[0]![0])).toContain("desde=123");
    fetchMock.mockClear();
    cortarNoServidor("estudos", "t1", undefined);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("apagar e sincronizar", () => {
  it("sem conexão, o pedido fica na fila: a conversa não volta e é apagada na próxima vez", async () => {
    const a = armazem();
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await apagarNoServidor("estudos", "t1", a, ESCOPO_COWORK);
    fetchMock.mockImplementation(async (u: string, i?: RequestInit) => (i?.method === "DELETE" ? json({ ok: true }) : json({ conversas: [] })));
    fetchMock.mockImplementationOnce(async () => new Response("", { status: 500 }));
    fetchMock.mockImplementationOnce(async () => json({ conversas: [srv("t1", "voltou?")] }));
    expect(await sincronizarConversas("estudos", a, ESCOPO_COWORK, () => [])).toEqual([]);
    fetchMock.mockClear();
    await sincronizarConversas("estudos", a, ESCOPO_COWORK, () => []);
    const del = fetchMock.mock.calls.find((c) => c[1]?.method === "DELETE");
    expect(String(del![0])).toContain("scopeId=t1");
    fetchMock.mockClear();
    await sincronizarConversas("estudos", a, ESCOPO_COWORK, () => []);
    expect(fetchMock.mock.calls.some((c) => c[1]?.method === "DELETE")).toBe(false);
  });
  it("sem login ou sem conexão: fica a lista do navegador", async () => {
    fetchMock.mockImplementation(async () => new Response("no", { status: 401 }));
    expect(await sincronizarConversas("estudos", armazem(), ESCOPO_COWORK, () => [local("a", "A")])).toBeNull();
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    expect(await sincronizarConversas("estudos", armazem(), ESCOPO_COWORK, () => [])).toBeNull();
  });
  it("lê a lista atual só depois da resposta: a conversa criada no meio não se perde", async () => {
    let atuais = [local("a", "A")];
    fetchMock.mockImplementation(async () => { atuais = [...atuais, local("nova", "Nova")]; return json({ conversas: [srv("b", "B")] }); });
    const j = await sincronizarConversas("estudos", armazem(), ESCOPO_COWORK, () => atuais);
    expect(j!.map((t) => t.id)).toEqual(["a", "nova", "b"]);
  });
});
