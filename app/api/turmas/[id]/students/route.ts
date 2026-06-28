/**
 * GET /api/turmas/[id]/students — professor dono vê os alunos da turma com métricas:
 *   nota (média da melhor submissão por quiz), tempo de leitura (soma readingMs),
 *   nível de interesse (% das aulas enviadas em que o aluno engajou) e nº de concluídas.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { isTeacherSession } from "@/lib/aulas/roles";
import { currentUser } from "@/lib/aulas/auth";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isTeacherSession(me.session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const turma = await prisma.turma.findFirst({ where: { id: params.id, professorId: me.id } });
  if (!turma) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });

  const members = await prisma.turmaMember.findMany({ where: { turmaId: turma.id } });
  const studentIds = members.map((m) => m.studentId);
  if (studentIds.length === 0) return NextResponse.json({ turma: { id: turma.id, name: turma.name }, sentCount: 0, students: [] });

  const users = await prisma.user.findMany({ where: { id: { in: studentIds } }, select: { id: true, name: true, email: true, image: true } });
  const userById = new Map(users.map((u) => [u.id, u]));

  const aulas = await prisma.aula.findMany({ where: { turmaId: turma.id, status: "sent" }, select: { id: true } });
  const aulaIds = aulas.map((a) => a.id);
  const quizzes = aulaIds.length ? await prisma.aulaQuiz.findMany({ where: { aulaId: { in: aulaIds } }, select: { id: true, aulaId: true } }) : [];
  const aulaByQuiz = new Map(quizzes.map((q) => [q.id, q.aulaId]));
  const quizIds = quizzes.map((q) => q.id);

  const subs = quizIds.length ? await prisma.aulaQuizSubmission.findMany({ where: { quizId: { in: quizIds }, studentId: { in: studentIds } } }) : [];
  const progress = aulaIds.length ? await prisma.aulaProgress.findMany({ where: { aulaId: { in: aulaIds }, studentId: { in: studentIds } } }) : [];

  const students = studentIds.map((sid) => {
    const u = userById.get(sid);
    const mySubs = subs.filter((s) => s.studentId === sid);
    // melhor % por quiz, depois média
    const bestByQuiz = new Map<string, number>();
    for (const s of mySubs) bestByQuiz.set(s.quizId, Math.max(bestByQuiz.get(s.quizId) ?? 0, s.percentage));
    const grades = [...bestByQuiz.values()];
    const avgGrade = grades.length ? Math.round(grades.reduce((a, b) => a + b, 0) / grades.length) : null;

    const myProg = progress.filter((p) => p.studentId === sid);
    const readingMs = myProg.reduce((a, p) => a + (p.readingMs || 0), 0);
    const completed = myProg.filter((p) => p.status === "completed").length;

    const engaged = new Set<string>();
    for (const p of myProg) engaged.add(p.aulaId);
    for (const s of mySubs) { const aid = aulaByQuiz.get(s.quizId); if (aid) engaged.add(aid); }
    const interest = aulaIds.length ? Math.round((engaged.size / aulaIds.length) * 100) : 0;

    return {
      studentId: sid,
      name: u?.name || u?.email || "Aluno",
      email: u?.email || "",
      image: u?.image || null,
      avgGrade,
      readingMs,
      completed,
      interest,
    };
  });

  return NextResponse.json({ turma: { id: turma.id, name: turma.name }, sentCount: aulaIds.length, students });
}
