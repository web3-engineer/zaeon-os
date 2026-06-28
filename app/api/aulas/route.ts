// Aulas: GET → professor vê as suas (todas); aluno vê as ENVIADAS das turmas
// em que está. POST (professor) cria um rascunho.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { isTeacherSession } from "@/lib/aulas/roles";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (isTeacherSession(session)) {
    const aulas = await prisma.aula.findMany({
      where: { professorId: me.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ aulas, role: "teacher" });
  }

  // Aluno: aulas ENVIADAS das turmas em que ele é membro.
  const memberships = await prisma.turmaMember.findMany({
    where: { studentId: me.id },
    select: { turmaId: true },
  });
  const turmaIds = memberships.map((m) => m.turmaId);
  if (turmaIds.length === 0) return NextResponse.json({ aulas: [], role: "student" });

  const aulas = await prisma.aula.findMany({
    where: { turmaId: { in: turmaIds }, status: "sent" },
    orderBy: { sentAt: "desc" },
  });
  // Anexa o status de progresso do aluno (new | in_progress | completed) por aula.
  const progs = await prisma.aulaProgress.findMany({ where: { studentId: me.id, aulaId: { in: aulas.map((a) => a.id) } }, select: { aulaId: true, status: true } });
  const pById = new Map(progs.map((p) => [p.aulaId, p.status]));
  const withProgress = aulas.map((a) => ({ ...a, progressStatus: pById.get(a.id) || "new" }));
  return NextResponse.json({ aulas: withProgress, role: "student" });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isTeacherSession(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const me = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
  if (!title) return NextResponse.json({ error: "Título da aula é obrigatório." }, { status: 400 });

  const data = {
    professorId: me.id,
    title,
    body: typeof body.body === "string" ? body.body : null,
    turmaId: typeof body.turmaId === "string" ? body.turmaId : null,
    youtubeIds: Array.isArray(body.youtubeIds)
      ? (body.youtubeIds as unknown[]).filter((x): x is string => typeof x === "string")
      : [],
    status: "draft",
  };
  const aula = await prisma.aula.create({ data });
  return NextResponse.json({ aula });
}
