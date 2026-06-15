/**
 * /api/study/spaces — espaços de estudo ("Meus Estudos") do usuário (mini-Notion).
 *   GET    → lista (cria um padrão se não houver)
 *   POST   { title }       → cria
 *   PATCH  { id, title }   → renomeia
 *   DELETE ?id            → exclui o espaço e seus itens
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

export const runtime = "nodejs";

async function uid(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const u = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  return u?.id ?? null;
}

export async function GET() {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let spaces = await prisma.studySpace.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  if (spaces.length === 0) {
    const s = await prisma.studySpace.create({ data: { userId, title: "Meus Estudos" } });
    spaces = [s];
  }
  return NextResponse.json(spaces);
}

export async function POST(req: Request) {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({} as any));
  const title = (typeof body.title === "string" && body.title.trim()) || "Novo espaço";
  const s = await prisma.studySpace.create({ data: { userId, title: title.slice(0, 80) } });
  return NextResponse.json(s);
}

export async function PATCH(req: Request) {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({} as any));
  if (!body.id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  const owned = await prisma.studySpace.findFirst({ where: { id: String(body.id), userId }, select: { id: true } });
  if (!owned) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const s = await prisma.studySpace.update({ where: { id: owned.id }, data: { title: String(body.title || "").slice(0, 80) || "Meus Estudos" } });
  return NextResponse.json(s);
}

export async function DELETE(req: Request) {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  const owned = await prisma.studySpace.findFirst({ where: { id, userId }, select: { id: true } });
  if (!owned) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  await prisma.studyItem.deleteMany({ where: { userId, spaceId: id } });
  await prisma.studySpace.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
