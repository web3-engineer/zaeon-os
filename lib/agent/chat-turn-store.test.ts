import { describe, it, expect, vi, beforeEach } from "vitest";
const p = vi.hoisted(() => ({ findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() }));
vi.mock("@/src/lib/prisma", () => ({ prisma: { chatTurn: p } }));
import * as st from "@/lib/agent/chat-turn-store";

beforeEach(() => Object.values(p).forEach((f) => f.mockReset()));

describe("chat-turn-store", () => {
  it("getTurnForUser filtra por id E dono; id malformado nem consulta", async () => {
    p.findFirst.mockResolvedValue(null);
    expect(await st.getTurnForUser("nao-objectid", "u")).toBeNull();
    expect(p.findFirst).not.toHaveBeenCalled();
    await st.getTurnForUser("a".repeat(24), "u1");
    expect(p.findFirst.mock.calls[0][0].where).toEqual({ id: "a".repeat(24), userId: "u1" });
  });
  it("listTurnsForUser: só do dono, mais novos primeiro, sem payload pesado", async () => {
    p.findMany.mockResolvedValue([]);
    await st.listTurnsForUser("u1", "estudos", "t1");
    const q = p.findMany.mock.calls[0][0];
    expect(q.where).toEqual({ userId: "u1", surface: "estudos", scopeId: "t1" });
    expect(q.orderBy).toEqual({ createdAt: "desc" });
    expect(q.select).not.toHaveProperty("answer");
  });
  it("transições: create queued · running zera parcial e erro · done · error cortado", async () => {
    p.create.mockResolvedValue({ id: "x" }); p.update.mockResolvedValue({});
    await st.createTurn({ userId: "u", surface: "estudos", scopeId: null, prompt: "p" });
    expect(p.create.mock.calls[0][0].data).toMatchObject({ status: "queued", partial: "" });
    await st.markRunning("x");
    expect(p.update.mock.calls[0][0].data).toEqual({ status: "running", partial: "", error: null });
    await st.saveDone("x", { mode: "text", text: "a" }, "P");
    expect(p.update.mock.calls[1][0].data).toMatchObject({ status: "done", partial: "P", error: null });
    await st.saveError("x", "e".repeat(5000));
    expect(p.update.mock.calls[2][0].data.error).toHaveLength(2000);
    await st.savePartial("x", "pp");
    expect(p.update.mock.calls[3][0].data).toEqual({ partial: "pp" });
  });
  it("validadores de entrada do cliente", () => {
    expect(st.isChatSurface("estudos")).toBe(true);
    expect(st.isChatSurface("admin")).toBe(false);
    expect(st.toChatSurface("pesquisa")).toBe("pesquisa");
    expect(st.toChatSurface("sala-de-estudos")).toBe("estudos");
    expect(st.toChatSurface(undefined)).toBe("estudos");
    expect(st.sanitizeScopeId(" t-1:x ")).toBe("t-1:x");
    for (const v of [null, 3, "", "a b", "x".repeat(200), "<s>"]) expect(st.sanitizeScopeId(v)).toBeNull();
  });
});
