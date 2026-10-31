// @vitest-environment jsdom
/** #666: biblioteca, citações, trabalhos e lixeira são da conta logada. Sem login, nada aparece nem abre. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup, waitFor } from "@testing-library/react";

const sessao = vi.hoisted(() => ({ atual: { data: null as any, status: "loading" } }));
vi.mock("next-auth/react", () => ({ useSession: () => sessao.atual }));

import { useLibraryFiles } from "./useLibraryFiles";
import { useSavedCitations } from "./useSavedCitations";
import { useResearchWorks } from "./useResearchWorks";
import { useTrash } from "./useTrash";
import { chaveDaConta, contaDaSessao, migrarConversasAntigas } from "./chat/contaNoNavegador";

const entrar = (email: string | null) => { sessao.atual = email ? { data: { user: { email } }, status: "authenticated" } : { data: null, status: "unauthenticated" }; };
const ANA = contaDaSessao("ana@zaeon.com");
const arquivo = { id: "p1", title: "Currículo", pdfUrl: "https://x/a.pdf", savedAt: 1 };

beforeEach(() => { localStorage.clear(); entrar("ana@zaeon.com"); });
afterEach(cleanup);

describe("useLibraryFiles por conta", () => {
  it("sem login e em outra conta, o arquivo não aparece; ao entrar de novo, volta", async () => {
    const ana = renderHook(() => useLibraryFiles());
    await act(async () => { await ana.result.current.save(arquivo); });
    await waitFor(() => expect(ana.result.current.files.map((f) => f.id)).toEqual(["p1"]));
    ana.unmount();

    entrar(null);
    const anonimo = renderHook(() => useLibraryFiles());
    await act(async () => {});
    expect(anonimo.result.current.files).toEqual([]);
    anonimo.unmount();

    entrar("bia@zaeon.com");
    const bia = renderHook(() => useLibraryFiles());
    await act(async () => {});
    expect(bia.result.current.files).toEqual([]);
    bia.unmount();

    entrar("ana@zaeon.com");
    const volta = renderHook(() => useLibraryFiles());
    await waitFor(() => expect(volta.result.current.files.map((f) => f.id)).toEqual(["p1"]));
  });
  it("a tela troca junto quando a sessão acaba, sem recarregar", async () => {
    const h = renderHook(() => useLibraryFiles());
    await act(async () => { await h.result.current.save(arquivo); });
    await waitFor(() => expect(h.result.current.files).toHaveLength(1));
    entrar(null);
    h.rerender();
    await waitFor(() => expect(h.result.current.files).toEqual([]));
  });
  it("enquanto a sessão carrega, não mostra nada e não grava", async () => {
    localStorage.setItem(chaveDaConta(ANA, "zaeon.libraryFiles"), JSON.stringify([arquivo]));
    sessao.atual = { data: null, status: "loading" };
    const h = renderHook(() => useLibraryFiles());
    await act(async () => {});
    expect(h.result.current.files).toEqual([]);
    await act(async () => { await h.result.current.save({ ...arquivo, id: "p2" }); });
    expect(JSON.parse(localStorage.getItem(chaveDaConta(ANA, "zaeon.libraryFiles"))!)).toHaveLength(1);
  });
  it("remover numa conta não mexe na outra", async () => {
    localStorage.setItem(chaveDaConta(ANA, "zaeon.libraryFiles"), JSON.stringify([arquivo]));
    entrar("bia@zaeon.com");
    const h = renderHook(() => useLibraryFiles());
    await act(async () => { h.result.current.clear(); });
    expect(JSON.parse(localStorage.getItem(chaveDaConta(ANA, "zaeon.libraryFiles"))!)).toHaveLength(1);
  });
});

describe("outras listas por conta", () => {
  it("citações, trabalhos e lixeira não aparecem sem login", async () => {
    const c = renderHook(() => useSavedCitations());
    const w = renderHook(() => useResearchWorks());
    const t = renderHook(() => useTrash());
    act(() => {
      c.result.current.save({ id: "c1", title: "Citação" } as any);
      w.result.current.save({ id: "w1", title: "TCC", updatedAt: 1 } as any);
      t.result.current.trash(arquivo);
    });
    await waitFor(() => expect(t.result.current.items).toHaveLength(1));
    expect(c.result.current.citations).toHaveLength(1);
    expect(w.result.current.works).toHaveLength(1);
    cleanup();
    entrar(null);
    const c2 = renderHook(() => useSavedCitations());
    const w2 = renderHook(() => useResearchWorks());
    const t2 = renderHook(() => useTrash());
    await act(async () => {});
    expect(c2.result.current.citations).toEqual([]);
    expect(w2.result.current.works).toEqual([]);
    expect(t2.result.current.items).toEqual([]);
  });
});

describe("dados já guardados no navegador", () => {
  const CHAVES = ["zaeon.libraryFiles", "zaeon.savedCitations", "zaeon.researchWorks", "zaeon.trash", "zaeon_research_docs", "zaeon_liquid_chat", "zaeon_stored_pdfs", "zaeon_schedule_data"];
  it("a primeira conta recebe tudo; sem login nada se move", () => {
    for (const k of CHAVES) localStorage.setItem(k, "[1]");
    migrarConversasAntigas(localStorage, "anon");
    for (const k of CHAVES) expect(localStorage.getItem(k)).toBe("[1]");
    migrarConversasAntigas(localStorage, ANA);
    for (const k of CHAVES) {
      expect(localStorage.getItem(chaveDaConta(ANA, k))).toBe("[1]");
      expect(localStorage.getItem(k)).toBeNull();
    }
  });
  it("preferências do aparelho ficam", () => {
    localStorage.setItem("zaeon.lab.agente", "octa");
    localStorage.setItem("zaeon.chat.modelo.v1", "x");
    migrarConversasAntigas(localStorage, ANA);
    expect(localStorage.getItem("zaeon.lab.agente")).toBe("octa");
    expect(localStorage.getItem("zaeon.chat.modelo.v1")).toBe("x");
  });
});
