import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const w = vi.hoisted(() => ({ run: vi.fn(), save: vi.fn() }));
vi.mock("@/lib/agent/runChatTurn", () => ({ runChatTurn: w.run }));
vi.mock("@/lib/agent/chat-turn-store", () => ({ savePartial: w.save }));

import { createPartialWriter, processChatJob } from "@/lib/queue/chat-worker";

beforeEach(() => { w.run.mockReset(); w.save.mockReset(); w.save.mockResolvedValue(undefined); });
afterEach(() => vi.useRealTimers());

describe("createPartialWriter", () => {
  it("agrupa pushes num intervalo: um write com o acumulado", async () => {
    vi.useFakeTimers();
    const write = vi.fn().mockResolvedValue(undefined);
    const p = createPartialWriter(write, 300);
    p.push("a"); p.push("b"); p.push("c");
    expect(write).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(300);
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith("abc");
  });
  it("writes são encadeados: um lento nunca é ultrapassado por um mais novo", async () => {
    const ordem: string[] = [];
    let soltar!: () => void;
    const write = vi.fn((s: string) => (s === "a" ? new Promise<void>((r) => { soltar = () => { ordem.push(s); r(); }; }) : (ordem.push(s), Promise.resolve())));
    const p = createPartialWriter(write, 10_000);
    p.push("a"); const f1 = p.flush();
    p.push("b"); const f2 = p.flush();
    await vi.waitFor(() => expect(write).toHaveBeenCalledTimes(1)); // o 1º write já começou e está lento
    expect(write).toHaveBeenCalledTimes(1);                        // o 2º NÃO começou antes dele terminar
    soltar(); await f1; await f2;
    expect(ordem).toEqual(["a", "ab"]);
  });
  it("flush sem mudança não grava; write que falha não derruba", async () => {
    const write = vi.fn().mockRejectedValue(new Error("mongo fora"));
    const p = createPartialWriter(write, 10_000);
    await p.flush();
    expect(write).not.toHaveBeenCalled();
    p.push("x");
    await expect(p.flush()).resolves.toBeUndefined();
    expect(p.value).toBe("x");
  });
});

describe("processChatJob", () => {
  const data = { turnId: "T1", prompt: "oi", surface: "estudos", userId: "u1", history: [] } as any;
  it("roda o turno com o turnId e grava o parcial final (começando por 'Acordando')", async () => {
    w.run.mockImplementation(async (_id: string, _p: any, emit: (c: string) => void) => { emit("@@PROGRESS@@{\"fase\":\"plan\",\"rotulo\":\"Planejando\"}\n"); return {}; });
    await processChatJob(data, { partialIntervalMs: 5 });
    expect(w.run.mock.calls[0][0]).toBe("T1");
    expect(w.run.mock.calls[0][1]).not.toHaveProperty("turnId");
    const final = w.save.mock.calls.at(-1)!;
    expect(final[0]).toBe("T1");
    expect(final[1]).toMatch(/Acordando a Aura[\s\S]*Planejando/);
  });
  it("turno que falha NÃO relança (o ChatTurn já tem status=error)", async () => {
    w.run.mockRejectedValue(new Error("boom"));
    await expect(processChatJob(data, { partialIntervalMs: 5 })).resolves.toBeUndefined();
  });
});
