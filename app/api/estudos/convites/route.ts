import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { entrarNoBoard } from "@/lib/estudos/rota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const a = await entrarNoBoard(req, "estudos-convites-listar"); if ("response" in a) return a.response;
  const convites = await prisma.conviteBoard.findMany({ where: { paraId: a.userId, status: "pendente" }, orderBy: { updatedAt: "desc" }, take: 50 });
  const [boards, pessoas] = await Promise.all([
    prisma.cartolina.findMany({ where: { id: { in: convites.map((c) => c.cartolinaId) }, surface: "meus-estudos" }, select: { id: true, titulo: true, ownerId: true } }),
    prisma.user.findMany({ where: { id: { in: convites.map((c) => c.deId) } }, select: { id: true, name: true } }),
  ]);
  return NextResponse.json({ convites: convites.flatMap((c) => {
    const b = boards.find((v) => v.id === c.cartolinaId && v.ownerId === c.deId);
    return b ? [{ id: c.id, boardId: b.id, titulo: b.titulo, de: pessoas.find((p) => p.id === c.deId)?.name || "Alguém", papel: c.papel }] : [];
  }) });
}
