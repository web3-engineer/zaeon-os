// @vitest-environment jsdom
/** #663, PR 3: as conversas antigas sobem sem perder nem repetir, a cópia sai ao sair da conta, e o que foi apagado em outro aparelho some. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { enviarConversasAntigas, limparCopiaDasConversas, mensagensParaEnviar, sincronizarConversas } from "./conversasServidor";
import { armazemDaConta, contaDaSessao } from "./contaNoNavegador";
import { ESCOPO_COWORK as E, ESCOPO_PESQUISA, chaveDaThread, carregarMensagens, listarThreads, salvarMensagens, salvarThreads, type Thread } from "./threads";

const EMAIL = "ana@zaeon.com";
const a = () => armazemDaConta(localStorage, contaDaSessao(EMAIL));
const t = (id: string, titulo = id): Thread => ({ id, titulo, criadaEm: 1, tocadaEm: 1 });
const guardar = (...ids: string[]) => {
  salvarThreads(a(), ids.map((id) => t(id)));
  for (const id of ids) salvarMensagens(a(), id, [{ role: "user", text: `pergunta ${id}`, at: 5 }, { role: "assistant", text: `resposta ${id}`, at: 6 }]);
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status });
const texto = (m: { text?: string }) => m.text ?? "";
let fetchMock: ReturnType<typeof vi.fn>;
const posts = () => fetchMock.mock.calls.filter((c) => c[1]?.method === "POST").map((c) => JSON.parse(c[1].body));

beforeEach(() => {
  localStorage.clear();
  fetchMock = vi.fn(async () => json({ ok: true, conversas: [] }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("enviar as conversas antigas", () => {
  it("cada conversa sobe na conversa certa, com título e mensagens; a vazia não sobe", async () => {
    guardar("a", "b");
    salvarThreads(a(), [t("a", "java"), t("b"), t("vazia")]);
    await enviarConversasAntigas("estudos", a(), E, texto);
    expect(posts().map((p) => p.scopeId)).toEqual(["a", "b"]);
    expect(posts()[0]).toMatchObject({ surface: "estudos", titulo: "java" });
    expect(posts()[0].mensagens.map((m: { text: string }) => m.text)).toEqual(["pergunta a", "resposta a"]);
  });
  it("depois de terminar, não sobe mais nada", async () => {
    guardar("a");
    await enviarConversasAntigas("estudos", a(), E, texto);
    await enviarConversasAntigas("estudos", a(), E, texto);
    expect(posts()).toHaveLength(1);
  });
  it("se falhar, para e tenta na próxima vez só o que faltou, sem perder a cópia", async () => {
    guardar("a", "b");
    fetchMock.mockImplementation(async (_u: string, o?: RequestInit) => (o?.body && JSON.parse(o.body as string).scopeId === "b" ? json({}, 500) : json({ ok: true })));
    await enviarConversasAntigas("estudos", a(), E, texto);
    expect(carregarMensagens(a(), "b")).toHaveLength(2);
    fetchMock.mockClear();
    fetchMock.mockImplementation(async () => json({ ok: true }));
    await enviarConversasAntigas("estudos", a(), E, texto);
    expect(posts().map((p) => p.scopeId)).toEqual(["b"]);
  });
  it("sem conexão também não conta como enviada", async () => {
    guardar("a");
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await enviarConversasAntigas("estudos", a(), E, texto);
    fetchMock.mockClear();
    await enviarConversasAntigas("estudos", a(), E, texto);
    expect(posts()).toHaveLength(1);
  });
  it("conversa na fila de apagar não sobe", async () => {
    guardar("a");
    a().setItem(`${E.prefixo}apagadas.v1`, JSON.stringify(["a"]));
    await enviarConversasAntigas("estudos", a(), E, texto);
    expect(posts()).toHaveLength(0);
  });
});

describe("mensagensParaEnviar", () => {
  it("mensagem sem horário fica em ordem; diagrama vai pelo número", () => {
    const s = mensagensParaEnviar([
      { role: "user", text: "p" },
      { role: "assistant", text: "r", studioBlock: { studioKind: "diagram", artifactId: "d1", title: "D" } },
      { role: "assistant", text: "", blocos: [{ studioKind: "aula", artifactId: "a1" }] },
      { role: "assistant", text: "   " },
    ], 100, texto);
    expect(s.map((m) => m.at)).toEqual([101, 102, 103]);
    expect(s[1].meta).toEqual({ bloco: { studioKind: "diagram", artifactId: "d1", title: "D" } });
    expect(s[2]).toMatchObject({ text: "aula", meta: { bloco: { artifactId: "a1" } } });
  });
});

describe("apagada em outro aparelho", () => {
  const sync = (lista: () => Thread[]) => sincronizarConversas("estudos", a(), E, lista, texto);
  const servidor = (...ids: string[]) => fetchMock.mockImplementation(async () => json({ ok: true, conversas: ids.map((id) => ({ id, titulo: id, criadaEm: 1, tocadaEm: 1 })) }));

  it("conversa que estava no servidor e sumiu sai daqui, com as mensagens", async () => {
    guardar("a", "b");
    servidor("a", "b");
    await sync(() => listarThreads(a()));
    servidor("b");
    const lista = await sync(() => listarThreads(a()));
    expect(lista!.map((x) => x.id)).toEqual(["b"]);
    expect(a().getItem(chaveDaThread("a"))).toBeNull();
  });
  it("conversa nova, que ainda não foi ao servidor, fica", async () => {
    guardar("a");
    servidor("a");
    await sync(() => listarThreads(a()));
    const lista = await sync(() => [...listarThreads(a()), t("nova")]);
    expect(lista!.map((x) => x.id)).toEqual(["a", "nova"]);
  });
  it("sem resposta do servidor, nada sai", async () => {
    guardar("a");
    servidor("a");
    await sync(() => listarThreads(a()));
    fetchMock.mockImplementation(async () => json({}, 500));
    expect(await sync(() => listarThreads(a()))).toBeNull();
    expect(carregarMensagens(a(), "a")).toHaveLength(2);
  });
  it("na lista cheia, faltar não quer dizer apagada", async () => {
    guardar("a");
    servidor("a");
    await sync(() => listarThreads(a()));
    servidor(...Array.from({ length: 200 }, (_, i) => `x${i}`));
    const lista = await sync(() => listarThreads(a()));
    expect(lista!.some((x) => x.id === "a")).toBe(true);
  });
  it("se a última sumiu, sobra uma conversa nova vazia", async () => {
    guardar("a");
    servidor("a");
    await sync(() => listarThreads(a()));
    servidor();
    const lista = await sync(() => listarThreads(a()));
    expect(lista).toHaveLength(1);
    expect(lista![0].id).not.toBe("a");
  });
});

describe("ao sair da conta", () => {
  it("com tudo enviado, a cópia sai, nas duas salas; o aviso de enviado e a fila de apagar ficam", async () => {
    guardar("a");
    salvarThreads(a(), [t("p")], ESCOPO_PESQUISA);
    salvarMensagens(a(), "p", [{ role: "user", text: "q" }], ESCOPO_PESQUISA);
    await enviarConversasAntigas("estudos", a(), E, texto);
    await enviarConversasAntigas("pesquisa", a(), ESCOPO_PESQUISA, texto);
    a().setItem(`${E.prefixo}apagadas.v1`, JSON.stringify(["z"]));
    limparCopiaDasConversas(EMAIL);
    expect(listarThreads(a())).toEqual([]);
    expect(carregarMensagens(a(), "a")).toEqual([]);
    expect(listarThreads(a(), ESCOPO_PESQUISA)).toEqual([]);
    expect(a().getItem(`${E.prefixo}antigas.v1`)).toBe("1");
    expect(a().getItem(`${E.prefixo}apagadas.v1`)).toContain("z");
  });
  it("com conversa ainda não enviada, a cópia fica", () => {
    guardar("a");
    limparCopiaDasConversas(EMAIL);
    expect(carregarMensagens(a(), "a")).toHaveLength(2);
  });
  it("não mexe em outra conta, nem no rascunho", async () => {
    guardar("a");
    await enviarConversasAntigas("estudos", a(), E, texto);
    const bia = armazemDaConta(localStorage, contaDaSessao("bia@zaeon.com"));
    salvarMensagens(bia, "b", [{ role: "user", text: "oi" }]);
    a().setItem("zaeon.research.draft.v1", "rascunho");
    limparCopiaDasConversas(EMAIL);
    expect(carregarMensagens(bia, "b")).toHaveLength(1);
    expect(a().getItem("zaeon.research.draft.v1")).toBe("rascunho");
  });
  it("conta apagada: não sobra nada, nem o que ainda subiria", () => {
    guardar("a");
    limparCopiaDasConversas(EMAIL, true);
    expect(carregarMensagens(a(), "a")).toEqual([]);
    expect(listarThreads(a())).toEqual([]);
  });
});
