// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCartolinaCowork, POLL_MS } from "@/components/lounge/useCartolinaCowork";

const resp = (body: any, ok = true) => Promise.resolve({ ok, json: () => Promise.resolve(body) } as any);
let board = { cards: [{ id: "a" }], rev: 1, papel: "editor", titulo: "T" };
let coments: any[] = [];
const fetchMock = vi.fn((url: string, init?: any) => {
  if (url.endsWith("/membros")) return resp({ membros: [{ userId: "u1", nome: "A", imagem: null, papel: "dono" }] });
  if (url.includes("/comentarios")) {
    if (init?.method === "POST") { coments.push({ id: "c" + coments.length, cardId: "a", createdAt: new Date(Date.now() + coments.length).toISOString(), texto: JSON.parse(init.body).texto }); return resp({ id: "x" }); }
    const desde = new URL("http://x" + url).searchParams.get("desde");
    return resp({ comentarios: coments.filter((c) => !desde || c.createdAt > desde) });
  }
  if (url.includes("/share")) return resp({ url: "/estudo/b1?convite=t" });
  return resp({ board });
});

beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); (globalThis as any).fetch = fetchMock; fetchMock.mockClear(); board = { cards: [{ id: "a" }], rev: 1, papel: "editor", titulo: "T" }; coments = []; });
afterEach(() => vi.useRealTimers());

describe("useCartolinaCowork", () => {
  it("inativo ou sem board: não faz request", () => {
    renderHook(() => useCartolinaCowork({ ativo: false, boardId: "b1", onBoard: vi.fn() }));
    renderHook(() => useCartolinaCowork({ ativo: true, boardId: null, onBoard: vi.fn() }));
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("puxa board/comentários/membros; só chama onBoard quando o rev muda", async () => {
    const onBoard = vi.fn();
    const { result } = renderHook(() => useCartolinaCowork({ ativo: true, boardId: "b1", onBoard }));
    await waitFor(() => expect(onBoard).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.membros).toHaveLength(1));
    await act(async () => { vi.advanceTimersByTime(POLL_MS); });
    expect(onBoard).toHaveBeenCalledTimes(1);          // rev igual → nada
    board = { ...board, rev: 2 };
    await act(async () => { vi.advanceTimersByTime(POLL_MS); });
    await waitFor(() => expect(onBoard).toHaveBeenCalledTimes(2)); // outro colaborador gravou
  });
  it("comentar envia e já aparece (sem esperar o tick); polling traz só os novos", async () => {
    const { result } = renderHook(() => useCartolinaCowork({ ativo: true, boardId: "b1", onBoard: vi.fn() }));
    await act(async () => { expect(await result.current.comentar("a", "oi")).toBe(true); });
    await waitFor(() => expect(result.current.comentarios.map((c) => c.texto)).toEqual(["oi"]));
    coments.push({ id: "z", cardId: "a", createdAt: new Date(Date.now() + 999).toISOString(), texto: "de B" });
    await act(async () => { vi.advanceTimersByTime(POLL_MS); });
    await waitFor(() => expect(result.current.comentarios.map((c) => c.texto)).toEqual(["oi", "de B"]));
    const ultimoGet = fetchMock.mock.calls.filter(([u, i]) => String(u).includes("/comentarios") && !i).at(-1)![0];
    expect(String(ultimoGet)).toContain("desde=");
  });
  it("aba escondida não faz polling", async () => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    renderHook(() => useCartolinaCowork({ ativo: true, boardId: "b1", onBoard: vi.fn() }));
    await act(async () => { vi.advanceTimersByTime(POLL_MS * 3); });
    expect(fetchMock.mock.calls.filter(([u]) => !String(u).endsWith("/membros"))).toHaveLength(0);
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
  });
  it("compartilhar devolve URL absoluta", async () => {
    const { result } = renderHook(() => useCartolinaCowork({ ativo: true, boardId: "b1", onBoard: vi.fn() }));
    let url: string | null = null;
    await act(async () => { url = await result.current.compartilhar("editor"); });
    expect(url).toBe(window.location.origin + "/estudo/b1?convite=t");
  });
});

describe("useCartolinaCowork · bordas", () => {
  it("voltar pra aba (visibilitychange) puxa na hora, sem esperar o tick", async () => {
    const onBoard = vi.fn();
    renderHook(() => useCartolinaCowork({ ativo: true, boardId: "b1", onBoard }));
    await waitFor(() => expect(onBoard).toHaveBeenCalledTimes(1));
    board = { ...board, rev: 7 };
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    await waitFor(() => expect(onBoard).toHaveBeenCalledTimes(2));
  });
  it("rede caída: comentar devolve false, compartilhar null, membros ficam vazios — nada lança", async () => {
    (globalThis as any).fetch = vi.fn().mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useCartolinaCowork({ ativo: true, boardId: "b1", onBoard: vi.fn() }));
    let ok: boolean | null = null, url: string | null = "x";
    await act(async () => { ok = await result.current.comentar("a", "oi"); url = await result.current.compartilhar("leitor"); });
    expect(ok).toBe(false);
    expect(url).toBeNull();
    expect(result.current.membros).toEqual([]);
  });
  it("sem board: ações são no-op", async () => {
    const { result } = renderHook(() => useCartolinaCowork({ ativo: true, boardId: null, onBoard: vi.fn() }));
    let ok: boolean | null = null, url: string | null = "x";
    await act(async () => { ok = await result.current.comentar("a", "x"); url = await result.current.compartilhar("editor"); });
    expect([ok, url]).toEqual([false, null]);
  });
});
