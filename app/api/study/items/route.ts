/**
 * /api/study/items — itens do feed "Meus Estudos".
 *   GET    ?spaceId        → lista os itens do espaço
 *   POST   { spaceId, type, title, payload } → cria
 *   PATCH  { id, summary?, title? }          → atualiza (ex.: salvar resumo)
 *   DELETE ?id             → exclui
 *
 * Acesso por MEMBERSHIP do espaço (dono OU co-autor do Lounge) — não mais só pelo userId
 * do item. Assim a co-edição em grupo (Lounge) escreve no mesmo espaço.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

export const runtime = "nodejs";

const TYPES = new Set(["ref", "insight", "synthesis", "base", "suggestion", "pdf", "video", "note", "link", "image", "audio", "file", "studio"]);

async function uid(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const u = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  return u?.id ?? null;
}

// Dono OU membro do espaço pode ler/escrever.
async function canAccessSpace(userId: string, spaceId: string): Promise<boolean> {
  const sp = await prisma.studySpace.findFirst({ where: { id: spaceId, OR: [{ userId }, { members: { has: userId } }] }, select: { id: true } });
  return !!sp;
}

export async function GET(req: Request) {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const spaceId = new URL(req.url).searchParams.get("spaceId");
  if (!spaceId) return NextResponse.json({ error: "spaceId obrigatório" }, { status: 400 });
  if (!(await canAccessSpace(userId, spaceId))) return NextResponse.json({ error: "Sem acesso" }, { status: 403 });
  const items = await prisma.studyItem.findMany({ where: { spaceId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({} as any));
  if (!body.spaceId) return NextResponse.json({ error: "spaceId obrigatório" }, { status: 400 });
  if (!(await canAccessSpace(userId, String(body.spaceId)))) return NextResponse.json({ error: "Espaço não encontrado" }, { status: 404 });
  const type = TYPES.has(body.type) ? body.type : "note";
  const item = await prisma.studyItem.create({
    data: {
      userId, spaceId: String(body.spaceId), type,
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
  const it = await prisma.studyItem.findUnique({ where: { id: String(body.id) }, select: { id: true, spaceId: true } });
  if (!it || !(await canAccessSpace(userId, it.spaceId))) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const item = await prisma.studyItem.update({
    where: { id: it.id },
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
  const it = await prisma.studyItem.findUnique({ where: { id }, select: { id: true, spaceId: true } });
  if (!it || !(await canAccessSpace(userId, it.spaceId))) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  await prisma.studyItem.delete({ where: { id: it.id } });
  return NextResponse.json({ ok: true });
}
