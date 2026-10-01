// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { respostaStream } from "@/lib/chat/test-utils";
import { useScholar } from "@/lib/chat/useScholar";

const j = (b: any, status = 200) => new Response(JSON.stringify(b), { status, headers: { "content-type": "application/json" } });
beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true, advanceTimeDelta: 50 }));
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

const rota = (map: (url: string, init?: any) => Response | Promise<Response>) => vi.spyOn(globalThis, "fetch").mockImplementation((u: any, i: any) => Promise.resolve(map(String(u), i)) as any);

describe("useScholar", () => {
  it("modo BG: running → fases → done com a sessão", async () => {
    let polls = 0;
    rota((u) => {
      if (u === "/api/ai/scholar") return j({ sessionId: "S1" }, 202);
      if (u === "/api/ai/scholar/sessions") return j({ sessions: [] });
      polls++;
      return polls < 2
        ? j({ session: { status: "running", thread: { events: [{ type: "phase", phase: "searching", message: "Buscando" }] } } })
        : j({ session: { status: "done", query: "luz", thread: { answer: "A resposta" } } });
    });
    const { result } = renderHook(() => useScholar());
    await act(async () => { void result.current.pesquisar("luz"); });
    await waitFor(() => expect(result.current.phases[0]?.message).toBe("Buscando"), { timeout: 5000 });
    await waitFor(() => expect(result.current.status).toBe("done"), { timeout: 5000 });
    expect(result.current.answer).toBe("A resposta");
  });
  it("modo inline (NDJSON) e 401", async () => {
    rota((u) => (u === "/api/ai/scholar/sessions" ? j({ sessions: [] }) : respostaStream(['{"type":"phase","phase":"p","message":"M"}\n{"type":"answer","text":"T"}\n{"type":"done","session":{"id":"x"}}\n'], { headers: { "content-type": "application/x-ndjson" } })));
    const { result } = renderHook(() => useScholar());
    await act(async () => { await result.current.pesquisar("q"); });
    expect(result.current).toMatchObject({ status: "done", answer: "T", phases: [{ phase: "p", message: "M" }] });
    vi.restoreAllMocks();
    rota((u) => (u === "/api/ai/scholar/sessions" ? j({ sessions: [] }) : new Response("no", { status: 401 })));
    await act(async () => { await result.current.pesquisar("q"); });
    expect(result.current.status).toBe("unauthorized");
  });
  it("retoma pesquisa em curso ao montar", async () => {
    let polls = 0;
    rota((u) => {
      if (u === "/api/ai/scholar/sessions") return j({ sessions: [{ id: "S2", status: "running", query: "antiga", createdAt: new Date().toISOString() }] });
      polls++;
      return j({ session: { status: polls > 1 ? "done" : "running", query: "antiga", thread: { answer: "pronta" } } });
    });
    const { result } = renderHook(() => useScholar());
    await waitFor(() => expect(result.current.query).toBe("antiga"));
    // 1º atraso 2s + intervalo 3s (o mesmo ritmo do desktop): avança o relógio em vez de esperar
    await act(async () => { await vi.advanceTimersByTimeAsync(6000); });
    await waitFor(() => expect(result.current.status).toBe("done"));
  });
  it("retomar:false não consulta o histórico; parar volta a idle", async () => {
    const f = rota(() => j({ sessionId: "S" }, 202));
    const { result } = renderHook(() => useScholar({ retomar: false }));
    expect(f).not.toHaveBeenCalled();
    act(() => { void result.current.pesquisar("q"); });
    await waitFor(() => expect(result.current.status).toBe("running"));
    act(() => result.current.parar());
    expect(result.current.status).toBe("idle");
  });
});
