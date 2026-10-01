import { describe, it, expect, vi, beforeEach } from "vitest";

const q = vi.hoisted(() => ({ enabled: false, bull: null as any, add: vi.fn(), ctor: vi.fn() }));
vi.mock("@/lib/queue/scholar", () => ({
  isQueueEnabled: () => q.enabled,
  getRedisConnection: () => ({ fake: true }),
  loadBullmq: async () => q.bull,
}));

beforeEach(() => {
  vi.resetModules();
  q.enabled = false; q.add.mockReset(); q.ctor.mockReset();
  q.bull = { Queue: class { constructor(...a: any[]) { q.ctor(...a); } add = q.add; } };
});
const job = { turnId: "t1", prompt: "oi", surface: "estudos", userId: "u1", history: [] } as any;

describe("lib/queue/chat", () => {
  it("sem REDIS_URL: no-op (false), nem tenta carregar o bullmq", async () => {
    const { enqueueChatJob } = await import("@/lib/queue/chat");
    expect(await enqueueChatJob(job)).toBe(false);
    expect(q.ctor).not.toHaveBeenCalled();
  });
  it("sem o pacote bullmq: false (o route cai no inline)", async () => {
    q.enabled = true; q.bull = null;
    const { enqueueChatJob } = await import("@/lib/queue/chat");
    expect(await enqueueChatJob(job)).toBe(false);
  });
  it("enfileira com jobId = turnId (idempotente) e reaproveita a mesma fila", async () => {
    q.enabled = true;
    const { enqueueChatJob, CHAT_QUEUE } = await import("@/lib/queue/chat");
    expect(await enqueueChatJob(job)).toBe(true);
    expect(await enqueueChatJob({ ...job, turnId: "t2" })).toBe(true);
    expect(q.ctor).toHaveBeenCalledTimes(1);
    expect(q.ctor.mock.calls[0][0]).toBe(CHAT_QUEUE);
    expect(q.add).toHaveBeenNthCalledWith(1, "turn", job, { jobId: "t1" });
    expect(q.add.mock.calls[1][2]).toEqual({ jobId: "t2" });
  });
  it("attempts: 1 — turno que falhou não é reaberto por baixo do aluno", async () => {
    q.enabled = true;
    const { enqueueChatJob, CHAT_JOB_OPTIONS } = await import("@/lib/queue/chat");
    await enqueueChatJob(job);
    expect(CHAT_JOB_OPTIONS.attempts).toBe(1);
    expect(q.ctor.mock.calls[0][1].defaultJobOptions).toBe(CHAT_JOB_OPTIONS);
  });
});
