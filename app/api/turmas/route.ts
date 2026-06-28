// Turmas do professor: GET lista as minhas; POST cria uma.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { isTeacherSession } from "@/lib/aulas/roles";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isTeacherSession(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const me = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const turmas = await prisma.turma.findMany({
    where: { professorId: me.id },
    orderBy: { createdAt: "desc" },
  });
  // contagem de alunos por turma (relação por ObjectId cru → conta manual)
  const counts = await prisma.turmaMember.groupBy({
    by: ["turmaId"],
    where: { turmaId: { in: turmas.map((t) => t.id) } },
    _count: { _all: true },
  });
  const byId = new Map(counts.map((c) => [c.turmaId, c._count._all]));
  return NextResponse.json({
    turmas: turmas.map((t) => ({ ...t, memberCount: byId.get(t.id) ?? 0 })),
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isTeacherSession(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const me = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  if (!name) return NextResponse.json({ error: "Nome da turma é obrigatório." }, { status: 400 });

  const data = { professorId: me.id, name };
  const turma = await prisma.turma.create({ data });
  return NextResponse.json({ turma });
}
