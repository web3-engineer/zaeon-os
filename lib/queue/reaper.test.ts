import { describe, it, expect, vi } from "vitest";
import { reapStuckJobs, STUCK_MS } from "@/lib/queue/reaper";

const db = () => ({
  chatTurn: { updateMany: vi.fn().mockResolvedValue({ count: 2 }) },
  scholarSession: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
});

describe("reaper", () => {
  it("marca como error só queued/running parados há mais de 15 min (ChatTurn E ScholarSession)", async () => {
    const d = db(); const agora = new Date("2026-10-01T12:00:00Z");
    expect(await reapStuckJobs(d, agora)).toEqual({ chatTurns: 2, scholarSessions: 1 });
    for (const m of [d.chatTurn.updateMany, d.scholarSession.updateMany]) {
      const { where, data } = m.mock.calls[0][0];
      expect(where.status).toEqual({ in: ["queued", "running"] });
      expect(where.updatedAt.lt.getTime()).toBe(agora.getTime() - STUCK_MS);
      expect(data.status).toBe("error");
    }
  });
  it("usa updatedAt, não createdAt: turno longo mas vivo (gravando parcial) não é morto", async () => {
    const d = db();
    await reapStuckJobs(d);
    expect(d.chatTurn.updateMany.mock.calls[0][0].where).not.toHaveProperty("createdAt");
  });
  it("idempotente: na 2ª rodada não há mais nada (count 0) e nada lança", async () => {
    const d = db();
    d.chatTurn.updateMany.mockResolvedValue({ count: 0 }); d.scholarSession.updateMany.mockResolvedValue({ count: 0 });
    expect(await reapStuckJobs(d)).toEqual({ chatTurns: 0, scholarSessions: 0 });
  });
});
