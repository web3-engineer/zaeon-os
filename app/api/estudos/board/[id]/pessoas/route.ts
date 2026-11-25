import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { boardDoUsuario } from "@/lib/estudos/board-server";
import { criarConviteBoard } from "@/lib/estudos/convites-board";
import { entrarNoBoard, falhaBoard } from "@/lib/estudos/rota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const a = await entrarNoBoard(req, "estudos-board-pessoas"); if ("response" in a) return a.response;
  const board = await boardDoUsuario(params.id, a.userId);
  if (!board) return falhaBoard("not_found");
  if (board.papel !== "dono") return falhaBoard("forbidden");
  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 80) ?? "";
  if (q.length < 2) return NextResponse.json({ pessoas: [] });
  const pessoas = await prisma.user.findMany({ where: { name: { contains: q, mode: "insensitive" }, id: { not: a.userId } }, select: { id: true, name: true, image: true, course: true }, take: 10 });
  return NextResponse.json({ pessoas });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const a = await entrarNoBoard(req, "estudos-board-convidar-pessoa"); if ("response" in a) return a.response;
  const body = await req.json().catch(() => ({}));
  if (typeof body.userId !== "string" || typeof body.papel !== "string") return falhaBoard("invalid");
  const r = await criarConviteBoard(params.id, a.userId, body.userId, body.papel);
  return r.ok ? NextResponse.json({ ok: true }) : falhaBoard(r.reason);
}
