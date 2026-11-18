// @vitest-environment jsdom
/** #663: as conversas guardadas no navegador são de uma conta só. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";

const sessao = vi.hoisted(() => ({ atual: { data: null as any, status: "loading" } }));
vi.mock("next-auth/react", () => ({ useSession: () => sessao.atual }));
vi.mock("@/lib/chat/conversasNav", () => ({ pedirConversa: vi.fn() }));

import { armazemDaConta, chaveDaConta, contaDaSessao, CONTA_ANONIMA, migrarConversasAntigas } from "./contaNoNavegador";
import { CHAVE_INDICE, carregarMensagens, carregarThreads, listarThreads, salvarMensagens, salvarThreads, ESCOPO_PESQUISA, type Thread } from "./threads";
import ConversasDaSala from "@/components/chat/ConversasDaSala";

const thread = (id: string, titulo: string): Thread => ({ id, titulo, criadaEm: 1, tocadaEm: 1 });
const logar = (email: string | null) => { sessao.atual = email ? { data: { user: { email } }, status: "authenticated" } : { data: null, status: "unauthenticated" }; };
const A = contaDaSessao("ana@zaeon.com"), B = contaDaSessao("bia@zaeon.com");

// a lista usa os rótulos traduzidos (labSidebar.*, #830) — em pt, como na tela
beforeEach(async () => {
  const { default: i18n } = await import("i18next");
  const { default: pt } = await import("@/public/locales/pt/common.json");
  const { initReactI18next } = await import("react-i18next");
  await i18n.use(initReactI18next).init({ lng: "pt", resources: { pt: { translation: pt } } });
});
beforeEach(() => { localStorage.clear(); sessao.atual = { data: null, status: "loading" }; });
afterEach(cleanup);

describe("contaDaSessao", () => {
  it("cada e-mail tem a sua área, sem o e-mail escrito; sem login é a área anônima", () => {
    expect(A).not.toBe(B);
    expect(A).not.toContain("ana");
    expect(contaDaSessao(" ANA@zaeon.com ")).toBe(A);
    expect(contaDaSessao(null)).toBe(CONTA_ANONIMA);
    expect(contaDaSessao("")).toBe(CONTA_ANONIMA);
  });
});

describe("armazemDaConta", () => {
  it("uma conta não lê nem apaga o que é da outra", () => {
    const a = armazemDaConta(localStorage, A), b = armazemDaConta(localStorage, B), anon = armazemDaConta(localStorage, CONTA_ANONIMA);
    salvarThreads(a, [thread("t1", "java")]);
    salvarMensagens(a, "t1", [{ text: "segredo" }]);
    expect(listarThreads(b)).toEqual([]);
    expect(listarThreads(anon)).toEqual([]);
    expect(carregarMensagens(b, "t1")).toEqual([]);
    b.removeItem(CHAVE_INDICE);
    expect(listarThreads(a).map((t) => t.titulo)).toEqual(["java"]);
    expect(carregarThreads(armazemDaConta(localStorage, A))[0]!.titulo).toBe("java");
  });
  it("para uma conta nova, a lista não existe: o chat busca o histórico dela no servidor", () => {
    salvarThreads(armazemDaConta(localStorage, A), [thread("t1", "java")]);
    expect(armazemDaConta(localStorage, B).getItem(CHAVE_INDICE)).toBeNull();
  });
});

describe("migrarConversasAntigas", () => {
  const antigas = () => {
    localStorage.setItem(CHAVE_INDICE, JSON.stringify([thread("t1", "java")]));
    localStorage.setItem("zaeon.cowork.threadAtiva.v1", "t1");
    localStorage.setItem("zaeon.cowork.thread.t1", JSON.stringify([{ text: "oi" }]));
    localStorage.setItem(ESCOPO_PESQUISA.indice, JSON.stringify([thread("p1", "solo")]));
    localStorage.setItem("zaeon.research.draft.v1", "rascunho");
    localStorage.setItem("zaeon.chat.fontScale.v1", "2");
  };
  it("a primeira conta recebe tudo, nada se perde e a outra conta fica sem nada", () => {
    antigas();
    migrarConversasAntigas(localStorage, A);
    const a = armazemDaConta(localStorage, A);
    expect(listarThreads(a).map((t) => t.titulo)).toEqual(["java"]);
    expect(carregarMensagens(a, "t1")).toEqual([{ text: "oi" }]);
    expect(listarThreads(a, ESCOPO_PESQUISA).map((t) => t.titulo)).toEqual(["solo"]);
    expect(a.getItem("zaeon.research.draft.v1")).toBe("rascunho");
    expect(localStorage.getItem(CHAVE_INDICE)).toBeNull();
    migrarConversasAntigas(localStorage, B);
    expect(listarThreads(armazemDaConta(localStorage, B))).toEqual([]);
  });
  it("sem login nada é movido nem mostrado, e fica para quando a conta entrar", () => {
    antigas();
    migrarConversasAntigas(localStorage, CONTA_ANONIMA);
    expect(listarThreads(armazemDaConta(localStorage, CONTA_ANONIMA))).toEqual([]);
    expect(localStorage.getItem(CHAVE_INDICE)).not.toBeNull();
  });
  it("as conversas do celular também vão para a conta", () => {
    localStorage.setItem("zaeon.m.conversas", "[1]");
    localStorage.setItem("zaeon.m.conversa", '"m1"');
    localStorage.setItem("zaeon.m.chat.estudos.m1", "[2]");
    localStorage.setItem("zaeon.m.aba", '"estudos"');
    migrarConversasAntigas(localStorage, A);
    const a = armazemDaConta(localStorage, A);
    expect(a.getItem("zaeon.m.conversas")).toBe("[1]");
    expect(a.getItem("zaeon.m.conversa")).toBe('"m1"');
    expect(a.getItem("zaeon.m.chat.estudos.m1")).toBe("[2]");
    expect(localStorage.getItem("zaeon.m.conversas")).toBeNull();
    expect(localStorage.getItem("zaeon.m.aba")).toBe('"estudos"');
  });
  it("preferências do aparelho ficam onde estão", () => {
    antigas();
    migrarConversasAntigas(localStorage, A);
    expect(localStorage.getItem("zaeon.chat.fontScale.v1")).toBe("2");
  });
  it("não pisa no que a conta já tem", () => {
    antigas();
    localStorage.setItem(chaveDaConta(A, CHAVE_INDICE), JSON.stringify([thread("t9", "minha")]));
    migrarConversasAntigas(localStorage, A);
    expect(listarThreads(armazemDaConta(localStorage, A)).map((t) => t.titulo)).toEqual(["minha"]);
  });
  it("se o navegador recusar, a conversa volta para a chave antiga", () => {
    const dados = new Map([[CHAVE_INDICE, "[]"]]);
    const cheio: any = {
      get length() { return dados.size; },
      key: (i: number) => [...dados.keys()][i] ?? null,
      getItem: (k: string) => dados.get(k) ?? null,
      removeItem: (k: string) => { dados.delete(k); },
      setItem: (k: string, v: string) => { if (k.startsWith("zaeon.conta.")) throw new Error("cota"); dados.set(k, v); },
    };
    migrarConversasAntigas(cheio, A);
    expect(dados.get(CHAVE_INDICE)).toBe("[]");
  });
});

describe("ConversasDaSala", () => {
  it("só mostra as conversas de quem está logado; sem login, nenhuma", async () => {
    salvarThreads(armazemDaConta(localStorage, A), [thread("t1", "java da ana")]);
    logar(null);
    const { rerender } = render(<ConversasDaSala sala="estudos" onEntrar={() => {}} />);
    await waitFor(() => expect(screen.getByRole("button", { name: /Nova/ })).toBeTruthy());
    expect(screen.queryByText("java da ana")).toBeNull();
    logar("bia@zaeon.com");
    rerender(<ConversasDaSala sala="estudos" onEntrar={() => {}} />);
    expect(screen.queryByText("java da ana")).toBeNull();
    logar("ana@zaeon.com");
    rerender(<ConversasDaSala sala="estudos" onEntrar={() => {}} />);
    expect(await screen.findByText("java da ana")).toBeTruthy();
    logar(null);
    rerender(<ConversasDaSala sala="estudos" onEntrar={() => {}} />);
    await waitFor(() => expect(screen.queryByText("java da ana")).toBeNull());
  });
  it("enquanto a sessão carrega, não mostra conversa nenhuma e não cria a lista", () => {
    localStorage.setItem(CHAVE_INDICE, JSON.stringify([thread("t1", "antiga")]));
    render(<ConversasDaSala sala="estudos" onEntrar={() => {}} />);
    expect(screen.queryByText("antiga")).toBeNull();
    expect(localStorage.getItem(CHAVE_INDICE)).not.toBeNull();
  });
});
