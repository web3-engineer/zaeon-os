import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  cartolina: { findUnique: vi.fn() },
  cartolinaMembro: { findUnique: vi.fn(), upsert: vi.fn() },
  conviteBoard: { upsert: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
  user: { findUnique: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("@/src/lib/prisma", () => ({ prisma: db }));
import { criarConviteBoard, responderConviteBoard } from "./convites-board";

const conviteId = "dddddddddddddddddddddddd";
const boardId = "aaaaaaaaaaaaaaaaaaaaaaaa", dono = "bbbbbbbbbbbbbbbbbbbbbbbb", alvo = "cccccccccccccccccccccccc";
beforeEach(() => { vi.resetAllMocks(); db.cartolina.findUnique.mockResolvedValue({ id: boardId, ownerId: dono, surface: "meus-estudos" }); db.user.findUnique.mockResolvedValue({ id: alvo }); db.cartolinaMembro.findUnique.mockResolvedValue(null); db.$transaction.mockImplementation(async (fn) => fn(db)); });

describe("convites do board", () => {
  it("only allows the board owner to invite an existing account", async () => {
    expect(await criarConviteBoard(boardId, alvo, dono, "editor")).toEqual({ ok: false, reason: "forbidden" });
    expect(db.conviteBoard.upsert).not.toHaveBeenCalled();
  });
  it("does not grant access until the recipient accepts", async () => {
    db.conviteBoard.upsert.mockResolvedValue({ id: "invite" });
    expect(await criarConviteBoard(boardId, dono, alvo, "editor")).toEqual({ ok: true });
    expect(db.cartolinaMembro.upsert).not.toHaveBeenCalled();
  });
  it("does not allow a different user to accept an invitation", async () => {
    db.conviteBoard.findUnique.mockResolvedValue({ id: conviteId, cartolinaId: boardId, paraId: alvo, deId: dono, papel: "editor", status: "pendente" });
    expect(await responderConviteBoard(conviteId, dono, true)).toEqual({ ok: false, reason: "not_found" });
    expect(db.cartolinaMembro.upsert).not.toHaveBeenCalled();
  });
  it("declines without granting membership", async () => {
    db.conviteBoard.findUnique.mockResolvedValue({ id: conviteId, cartolinaId: boardId, paraId: alvo, deId: dono, papel: "editor", status: "pendente" });
    db.conviteBoard.updateMany.mockResolvedValue({ count: 1 });
    expect(await responderConviteBoard(conviteId, alvo, false)).toEqual({ ok: true });
    expect(db.cartolinaMembro.upsert).not.toHaveBeenCalled();
  });
  it("does not grant access after a competing response wins", async () => {
    db.conviteBoard.findUnique.mockResolvedValue({ id: conviteId, cartolinaId: boardId, paraId: alvo, deId: dono, papel: "editor", status: "pendente" });
    db.conviteBoard.updateMany.mockResolvedValue({ count: 0 });
    expect(await responderConviteBoard(conviteId, alvo, true)).toEqual({ ok: false, reason: "conflict" });
    expect(db.cartolinaMembro.upsert).not.toHaveBeenCalled();
  });
  it("creates editor membership only when the intended recipient accepts", async () => {
    db.conviteBoard.findUnique.mockResolvedValue({ id: conviteId, cartolinaId: boardId, paraId: alvo, deId: dono, papel: "editor", status: "pendente" });
    db.conviteBoard.updateMany.mockResolvedValue({ count: 1 });
    db.$transaction.mockImplementation(async (fn) => fn(db));
    expect(await responderConviteBoard(conviteId, alvo, true)).toEqual({ ok: true });
    expect(db.cartolinaMembro.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: { cartolinaId: boardId, userId: alvo, papel: "editor" }, update: {} }));
  });
});
