// @vitest-environment jsdom
/** #631 · trocar de blueprint: marca na hora, o já visto volta instantâneo e leitura igual não redesenha. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useBlueprint, mudouBlueprint, type BlueprintCliente } from "./useBlueprint";

const bp = (id: string, rev = 1): BlueprintCliente => ({ id, scopeId: null, rev, papel: "dono", updatedAt: `2026-10-27T00:00:0${rev}Z`, compartilhado: 0, doc: { titulo: id } as any });
const resumo = (id: string) => ({ id, titulo: id, area: "ciencia", fase: 1, aguardandoMentor: false, criticosAbertos: 0, fasesAprovadas: 0, updatedAt: "x" });

let pendentes: Record<string, (v: Response) => void> = {};
let rev: Record<string, number> = {};
beforeEach(() => {
  pendentes = {}; rev = { a: 1, b: 1 };
  vi.stubGlobal("fetch", vi.fn((url: string) => {
    if (url === "/api/blueprint") return Promise.resolve(new Response(JSON.stringify({ blueprints: [resumo("a"), resumo("b")] })));
    const id = url.split("/").pop()!;
    // a resposta de cada blueprint fica PENDENTE até o teste soltar (simula o servidor lento)
    return new Promise<Response>((res) => { pendentes[id] = res; });
  }));
});
afterEach(() => { vi.unstubAllGlobals(); });
const soltar = async (id: string) => { await act(async () => { pendentes[id]!(new Response(JSON.stringify({ blueprint: bp(id, rev[id]) }))); await Promise.resolve(); }); };

describe("#631 · useBlueprint", () => {
  it("o clique marca NA HORA (carregando até o servidor responder)", async () => {
    const { result } = renderHook(() => useBlueprint());
    await waitFor(() => expect(pendentes.a).toBeTruthy());
    await soltar("a");
    await waitFor(() => expect(result.current.atual?.id).toBe("a"));
    act(() => { void result.current.abrir("b"); });
    expect(result.current.selecionado).toBe("b");          // marcado já
    expect(result.current.carregando).toBe(true);
    expect(result.current.atual?.id).toBe("a");            // a prancha de antes fica até a nova chegar
    await soltar("b");
    await waitFor(() => expect(result.current.atual?.id).toBe("b"));
    expect(result.current.carregando).toBe(false);
  });
  it("voltar num blueprint já visto é instantâneo (não espera o servidor)", async () => {
    const { result } = renderHook(() => useBlueprint());
    await waitFor(() => expect(pendentes.a).toBeTruthy());
    await soltar("a");
    act(() => { void result.current.abrir("b"); });
    await soltar("b");
    await waitFor(() => expect(result.current.atual?.id).toBe("b"));
    act(() => { void result.current.abrir("a"); });        // o servidor de "a" ainda nem respondeu de novo
    expect(result.current.atual?.id).toBe("a");
    expect(result.current.carregando).toBe(false);
  });
  it("leitura que não mudou nada (mesmo rev) não troca o objeto — a prancha não redesenha à toa", async () => {
    const { result } = renderHook(() => useBlueprint());
    await waitFor(() => expect(pendentes.a).toBeTruthy());
    await soltar("a");
    await waitFor(() => expect(result.current.atual?.id).toBe("a"));
    const antes = result.current.atual;
    act(() => { void result.current.abrir("a"); });
    await soltar("a");
    expect(result.current.atual).toBe(antes);               // mesmo objeto
    rev.a = 2;
    act(() => { void result.current.abrir("a"); });
    await soltar("a");
    await waitFor(() => expect(result.current.atual?.rev).toBe(2));   // mudou de verdade: troca
  });
  it("revisão: arrastar na prancha de ANTES enquanto o novo carrega não grava no blueprint errado", async () => {
    const { result } = renderHook(() => useBlueprint());
    await waitFor(() => expect(pendentes.a).toBeTruthy());
    await soltar("a");
    await waitFor(() => expect(result.current.atual?.id).toBe("a"));
    act(() => { void result.current.abrir("b"); });     // "b" ainda carregando; "a" na tela
    act(() => { void result.current.fixar("passo:p1", 10, 20); });
    const patches = (fetch as any).mock.calls.filter((c: any[]) => c[1]?.method === "PATCH");
    expect(patches).toHaveLength(0);                       // nem no "b" (errado), nem no "a" (já não é a seleção)
    await soltar("b");
    await waitFor(() => expect(result.current.atual?.id).toBe("b"));
    act(() => { void result.current.fixar("passo:p1", 10, 20); });
    const depois = (fetch as any).mock.calls.filter((c: any[]) => c[1]?.method === "PATCH");
    expect(depois.map((c: any[]) => c[0])).toEqual(["/api/blueprint/b"]);   // com o "b" na tela, vai pro "b"
  });
  it("mudouBlueprint", () => {
    expect(mudouBlueprint(null, bp("a"))).toBe(true);
    expect(mudouBlueprint(bp("a"), bp("a"))).toBe(false);
    expect(mudouBlueprint(bp("a"), bp("a", 2))).toBe(true);
    expect(mudouBlueprint(bp("a"), bp("b"))).toBe(true);
  });
});

describe("#681 · excluir e erro ao carregar", () => {
  it("excluir o aberto: some da lista e abre o próximo", async () => {
    const f = fetch as unknown as ReturnType<typeof vi.fn>;
    const antes = f.getMockImplementation()!;
    f.mockImplementation((url: string, o?: RequestInit) => (o?.method === "DELETE" ? Promise.resolve(new Response(JSON.stringify({ ok: true }))) : antes(url, o)));
    const { result } = renderHook(() => useBlueprint());
    await waitFor(() => expect(pendentes.a).toBeTruthy());
    await soltar("a");
    let ok = false;
    await act(async () => { ok = await result.current.excluir("a"); });
    expect(ok).toBe(true);
    expect(result.current.lista!.map((b) => b.id)).toEqual(["b"]);
    expect(result.current.selecionado).toBe("b");
  });
  it("excluir que falha não tira da lista", async () => {
    const f = fetch as unknown as ReturnType<typeof vi.fn>;
    const antes = f.getMockImplementation()!;
    f.mockImplementation((url: string, o?: RequestInit) => (o?.method === "DELETE" ? Promise.resolve(new Response("{}", { status: 500 })) : antes(url, o)));
    const { result } = renderHook(() => useBlueprint());
    await waitFor(() => expect(result.current.lista).toHaveLength(2));
    let ok = true;
    await act(async () => { ok = await result.current.excluir("a"); });
    expect(ok).toBe(false);
    expect(result.current.lista).toHaveLength(2);
  });
  it("a lista que não carregou é erro, não lista vazia", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline"))));
    const { result } = renderHook(() => useBlueprint());
    await waitFor(() => expect(result.current.erro).toBe(true));
    expect(result.current.lista).toBeNull();
  });
});
