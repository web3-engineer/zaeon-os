/**
 * Os padrões de produção (fetch global, setTimeout, Date.now) — os outros testes injetam
 * fakes, e é justamente o caminho padrão que roda no navegador/servidor de verdade.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { esperarTurno, POLL_TURNO_MS } from "@/lib/chat/turnoRetomavel";
import { acompanharTurno } from "@/lib/agent/chat-turn-tail";

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
const resp = (turn: any) => new Response(JSON.stringify({ turn }), { status: 200 });

describe("padrões de produção", () => {
  it("esperarTurno usa fetch global, setTimeout real e Date.now", async () => {
    vi.useFakeTimers();
    const f = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(resp({ status: "running", partial: "" }))
      .mockResolvedValueOnce(resp({ status: "done", partial: "", wire: "w" }));
    const p = esperarTurno("T1");
    await vi.advanceTimersByTimeAsync(POLL_TURNO_MS);
    expect(await p).toEqual({ tipo: "pronto", acumulado: "w" });
    expect(f).toHaveBeenCalledWith("/api/ai/chat/turns/T1");
  });
  it("acompanharTurno usa setTimeout real (400ms) e Date.now", async () => {
    vi.useFakeTimers();
    const load = vi.fn()
      .mockResolvedValueOnce({ status: "running", partial: "a", answer: null, error: null })
      .mockResolvedValueOnce({ status: "done", partial: "a", answer: { mode: "text", text: "ok" }, error: null });
    const out: string[] = [];
    const p = acompanharTurno({ load, emit: (c) => out.push(c), mensagemDeErro: String });
    await vi.advanceTimersByTimeAsync(400);
    expect(await p).toBe("done");
    expect(out).toEqual(["a", "ok"]);
  });
});
