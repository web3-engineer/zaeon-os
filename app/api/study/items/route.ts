/**
 * /api/study/items — itens do feed "Meus Estudos".
 *   GET    ?spaceId        → lista os itens do espaço
 *   POST   { spaceId, type, title, payload } → cria
 *   PATCH  { id, summary?, title? }          → atualiza (ex.: salvar resumo)
 *   DELETE ?id             → exclui
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

export const runtime = "nodejs";

const TYPES = new Set(["ref", "insight", "synthesis", "base", "suggestion", "pdf", "video", "note", "link"]);

async function uid(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const u = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  return u?.id ?? null;
}

export async function GET(req: Request) {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const spaceId = new URL(req.url).searchParams.get("spaceId");
  if (!spaceId) return NextResponse.json({ error: "spaceId obrigatório" }, { status: 400 });
  const items = await prisma.studyItem.findMany({ where: { userId, spaceId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({} as any));
  if (!body.spaceId) return NextResponse.json({ error: "spaceId obrigatório" }, { status: 400 });
  const space = await prisma.studySpace.findFirst({ where: { id: String(body.spaceId), userId }, select: { id: true } });
  if (!space) return NextResponse.json({ error: "Espaço não encontrado" }, { status: 404 });
  const type = TYPES.has(body.type) ? body.type : "note";
  const item = await prisma.studyItem.create({
    data: {
      userId, spaceId: space.id, type,
      title: String(body.title || "").slice(0, 240),
      payload: body.payload ?? null,
      summary: typeof body.summary === "string" ? body.summary : null,
      placement: body.placement === "feed" ? "feed" : "library",
      ...(typeof body.order === "number" ? { order: body.order } : {}),
    },
  });
  return NextResponse.json(item);
}

export async function PATCH(req: Request) {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({} as any));
  if (!body.id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  const owned = await prisma.studyItem.findFirst({ where: { id: String(body.id), userId }, select: { id: true } });
  if (!owned) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const item = await prisma.studyItem.update({
    where: { id: owned.id },
    data: {
      ...(typeof body.summary === "string" ? { summary: body.summary } : {}),
      ...(typeof body.title === "string" ? { title: body.title.slice(0, 240) } : {}),
      ...("payload" in body ? { payload: body.payload ?? null } : {}),
      ...(body.placement === "feed" || body.placement === "library" ? { placement: body.placement } : {}),
      ...(typeof body.order === "number" ? { order: body.order } : {}),
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(req: Request) {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  const owned = await prisma.studyItem.findFirst({ where: { id, userId }, select: { id: true } });
  if (!owned) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  await prisma.studyItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
