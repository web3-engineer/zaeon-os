// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { respostaStream } from "@/lib/chat/test-utils";

vi.mock("@/lib/chat/turnoRetomavel", async (o) => ({ ...(await o<any>()), esperarTurno: vi.fn() }));
import { esperarTurno } from "@/lib/chat/turnoRetomavel";
import { useAuraChat, chaveL0 } from "@/lib/chat/useAuraChat";

const S = '@@STRUCTURED@@{"nucleo":"Luz é onda e partícula"}';
beforeEach(() => { localStorage.clear(); (esperarTurno as any).mockReset(); });
afterEach(() => vi.restoreAllMocks());

describe("useAuraChat", () => {
  it("enviar: bolha do usuário + resposta estruturada; manda o escopo da conversa e o id da mensagem", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(respostaStream([S]) as any);
    const { result } = renderHook(() => useAuraChat({ scopeId: "aba1" }));
    await act(async () => { await result.current.enviar("o que é luz?"); });
    const [u, a] = result.current.mensagens;
    expect(u).toMatchObject({ role: "user", text: "o que é luz?" });
    expect(a).toMatchObject({ role: "assistant", text: "Luz é onda e partícula", answer: { nucleo: "Luz é onda e partícula" }, chegando: false });
    const body = JSON.parse((f.mock.calls[0][1] as any).body);
    expect(body.agentContext).toMatchObject({ activeTab: "sala-de-estudos", cartolinaScopeId: "aba1", cartolinaMsgId: a.id });
    expect(result.current.enviando).toBe(false);
  });
  it("histórico vai junto no 2º turno (sem mensagens de erro)", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockImplementation(async () => respostaStream([S]) as any);
    const { result } = renderHook(() => useAuraChat({ scopeId: "aba1" }));
    await act(async () => { await result.current.enviar("1"); });
    await act(async () => { await result.current.enviar("2"); });
    const hist = JSON.parse((f.mock.calls[1][1] as any).body).history;
    expect(hist.map((h: any) => h.role)).toEqual(["user", "model"]);
  });
  it("superfície pesquisa vai pro harness como pesquisa", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(respostaStream(["ok"]) as any);
    const { result } = renderHook(() => useAuraChat({ scopeId: "p", surface: "pesquisa" }));
    await act(async () => { await result.current.enviar("x"); });
    expect(JSON.parse((f.mock.calls[0][1] as any).body)).toMatchObject({ surface: "pesquisa", agentContext: { activeTab: "pesquisa" } });
  });
  it("ação do Studio chama onAcao com o tópico", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(respostaStream(['@@STUDIO_ACTION@@{"kind":"flashcards","topic":"luz","text":"Já faço"}']) as any);
    const onAcao = vi.fn();
    const { result } = renderHook(() => useAuraChat({ scopeId: "a", onAcao }));
    await act(async () => { await result.current.enviar("faz flashcards"); });
    expect(onAcao).toHaveBeenCalledWith(expect.objectContaining({ kind: "flashcards", topic: "luz" }));
    expect(result.current.mensagens[1].text).toBe("Já faço");
  });
  it("falha de rede vira bolha de erro (e não entra no histórico seguinte)", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useAuraChat({ scopeId: "a" }));
    await act(async () => { await result.current.enviar("x"); });
    expect(result.current.mensagens[1]).toMatchObject({ erro: true, text: "Sem conexão com a Aura agora." });
  });
  it("REENGATE: turno pendente no L0 (pessoa saiu) → polla e renderiza a resposta ao concluir", async () => {
    localStorage.setItem(chaveL0("estudos", "aba1"), JSON.stringify([
      { id: "u1", role: "user", text: "explica luz", at: 1 },
      { id: "a1", role: "assistant", text: "", turnId: "T9", pendente: true, at: 2 },
    ]));
    (esperarTurno as any).mockImplementation(async (_id: string, o: any) => {
      o.onParcial('@@PROGRESS@@{"fase":"draft","rotulo":"Escrevendo"}\n');
      return { tipo: "pronto", acumulado: S };
    });
    const { result } = renderHook(() => useAuraChat({ scopeId: "aba1" }));
    await waitFor(() => expect(result.current.mensagens[1]?.answer?.nucleo).toBe("Luz é onda e partícula"));
    expect((esperarTurno as any).mock.calls[0][0]).toBe("T9");
    expect(result.current.mensagens[1].pendente).toBe(false);
    expect(JSON.parse(localStorage.getItem(chaveL0("estudos", "aba1"))!)[1].pendente).toBe(false); // persistiu concluído
  });
  it("reengate que falhou vira mensagem amigável", async () => {
    localStorage.setItem(chaveL0("estudos", "a"), JSON.stringify([{ id: "a1", role: "assistant", text: "", turnId: "T", pendente: true, at: 1 }]));
    (esperarTurno as any).mockResolvedValue({ tipo: "sumiu" });
    const { result } = renderHook(() => useAuraChat({ scopeId: "a" }));
    await waitFor(() => expect(result.current.mensagens[0]?.erro).toBe(true));
  });
  it("L0 por conversa + limpar", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(respostaStream(["oi"]) as any);
    const { result, rerender } = renderHook(({ s }) => useAuraChat({ scopeId: s }), { initialProps: { s: "A" } });
    await act(async () => { await result.current.enviar("x"); });
    rerender({ s: "B" });
    await waitFor(() => expect(result.current.mensagens).toEqual([]));
    rerender({ s: "A" });
    await waitFor(() => expect(result.current.mensagens).toHaveLength(2));
    act(() => result.current.limpar());
    expect(localStorage.getItem(chaveL0("estudos", "A"))).toBe("[]");
  });
});
