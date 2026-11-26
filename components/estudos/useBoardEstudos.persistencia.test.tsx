// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useBoardEstudos } from "./useBoardEstudos";
import type { CardEstudo } from "@/lib/estudos/board";

const card: CardEstudo = { id: "nota-1", tipo: "nota", x: 10, y: 20, w: 260, corpo: "Minha nota" };
const initial = () => ({ id: "board-1", titulo: "Estudos", cards: [{ ...card }], rev: 0, papel: "dono", donoId: "eu" });
afterEach(() => vi.unstubAllGlobals());

describe("salvamento de posições", () => {
  it("não troca de board enquanto uma posição não puder ser salva", async () => {
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) => init?.method === "PATCH"
      ? { ok: false, status: 500 }
      : { ok: true, json: async () => ({ board: initial(), compartilhados: [] }) });
    vi.stubGlobal("fetch", fetcher);
    const { result, unmount } = renderHook(() => useBoardEstudos({ euId: "eu" }));
    await waitFor(() => expect(result.current.board).not.toBeNull());
    act(() => result.current.mudar([{ ...card, x: 150 }]));
    await act(async () => { await result.current.abrir("board-2"); });
    expect(result.current.board?.id).toBe("board-1");
    expect(result.current.erroSalvar).toBeTruthy();
    expect(fetcher).not.toHaveBeenCalledWith("/api/estudos/board/board-2", expect.anything());
    unmount();
  });
  it("preserva a posição mais recente se uma gravação anterior falhar", async () => {
    let resolver!: (v: unknown) => void;
    let patches = 0;
    let salvo = initial();
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        patches++;
        if (patches === 1) return await new Promise((r) => { resolver = r; });
        const body = JSON.parse(init.body as string);
        salvo = { ...salvo, cards: body.upsert, rev: salvo.rev + 1 };
        return { ok: true, json: async () => ({ board: salvo }) };
      }
      return { ok: true, json: async () => ({ board: salvo, compartilhados: [] }) };
    });
    vi.stubGlobal("fetch", fetcher);
    const { result, unmount } = renderHook(() => useBoardEstudos({ euId: "eu" }));
    await waitFor(() => expect(result.current.board).not.toBeNull());
    act(() => result.current.mudar([{ ...card, x: 100 }]));
    await waitFor(() => expect(patches).toBe(1));
    act(() => result.current.mudar([{ ...card, x: 200 }]));
    await act(async () => resolver({ ok: false, status: 500 }));
    await act(async () => { await result.current.tentarSalvar(); });
    expect(salvo.cards[0]?.x).toBe(200);
    unmount();
  });
  it("avisa quando o servidor rejeita uma posição e permite tentar de novo", async () => {
    let stored = initial();
    let falhar = true;
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        if (falhar) return { ok: false, status: 500 };
        const body = JSON.parse(init.body as string);
        stored = { ...stored, cards: body.upsert, rev: stored.rev + 1 };
        return { ok: true, json: async () => ({ board: stored }) };
      }
      return { ok: true, json: async () => ({ board: stored, compartilhados: [] }) };
    });
    vi.stubGlobal("fetch", fetcher);
    const { result, unmount } = renderHook(() => useBoardEstudos({ euId: "eu" }));
    await waitFor(() => expect(result.current.board).not.toBeNull());
    act(() => result.current.mudar([{ ...card, x: 150, y: 240 }]));
    await waitFor(() => expect(result.current.erroSalvar).toBeTruthy(), { timeout: 2000 });
    expect(stored.cards[0]!.x).toBe(10);
    falhar = false;
    await act(async () => { await result.current.tentarSalvar(); });
    expect(result.current.erroSalvar).toBeNull();
    unmount();
    const reopened = renderHook(() => useBoardEstudos({ euId: "eu" }));
    await waitFor(() => expect(reopened.result.current.board?.cards[0]?.x).toBe(150));
    expect(reopened.result.current.board?.cards[0]?.y).toBe(240);
    reopened.unmount();
  });
});
