import { prisma } from "@/src/lib/prisma";
import { SURFACE_ESTUDOS } from "@/lib/estudos/board";

const oid = (s: string) => /^[a-f0-9]{24}$/i.test(s);
type Resultado = { ok: true } | { ok: false; reason: "not_found" | "forbidden" | "invalid" | "conflict" };

/** A board invitation is pending until its named recipient accepts. */
export async function criarConviteBoard(boardId: string, userId: string, alvo: string, papel: string): Promise<Resultado> {
  if (!oid(boardId) || !oid(alvo) || alvo === userId || (papel !== "editor" && papel !== "leitor")) return { ok: false, reason: "invalid" };
  const board = await prisma.cartolina.findUnique({ where: { id: boardId }, select: { id: true, ownerId: true, surface: true } });
  if (!board || board.surface !== SURFACE_ESTUDOS) return { ok: false, reason: "not_found" };
  if (board.ownerId !== userId) return { ok: false, reason: "forbidden" };
  const [user, membro] = await Promise.all([
    prisma.user.findUnique({ where: { id: alvo }, select: { id: true } }),
    prisma.cartolinaMembro.findUnique({ where: { cartolinaId_userId: { cartolinaId: boardId, userId: alvo } } }),
  ]);
  if (!user) return { ok: false, reason: "not_found" };
  if (membro) return { ok: false, reason: "conflict" };
  await prisma.conviteBoard.upsert({ where: { cartolinaId_paraId: { cartolinaId: boardId, paraId: alvo } }, create: { cartolinaId: boardId, deId: userId, paraId: alvo, papel }, update: { deId: userId, papel, status: "pendente" } });
  return { ok: true };
}

/** Atomically resolve the invitation and add membership, without downgrading a member. */
export async function responderConviteBoard(id: string, userId: string, aceitar: boolean): Promise<Resultado> {
  return prisma.$transaction(async (tx) => {
    const convite = await tx.conviteBoard.findUnique({ where: { id } });
    if (!convite || convite.paraId !== userId) return { ok: false, reason: "not_found" } as const;
    if (convite.status !== "pendente") return { ok: false, reason: "conflict" } as const;
    const atualizado = await tx.conviteBoard.updateMany({ where: { id, paraId: userId, status: "pendente" }, data: { status: aceitar ? "aceito" : "recusado" } });
    if (!atualizado.count) return { ok: false, reason: "conflict" } as const;
    if (aceitar) {
      const board = await tx.cartolina.findUnique({ where: { id: convite.cartolinaId }, select: { ownerId: true, surface: true } });
      if (!board || board.ownerId !== convite.deId || board.surface !== SURFACE_ESTUDOS) throw new Error("Board indisponível");
      await tx.cartolinaMembro.upsert({ where: { cartolinaId_userId: { cartolinaId: convite.cartolinaId, userId } }, create: { cartolinaId: convite.cartolinaId, userId, papel: convite.papel }, update: {} });
    }
    return { ok: true } as const;
  });
}
