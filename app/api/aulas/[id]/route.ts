/**
 * /api/aulas/[id]
 *   GET    → uma aula + quiz (professor dono vê tudo; aluno de turma que recebeu vê
 *            SEM gabarito, só aulas enviadas). Inclui o progresso do aluno.
 *   PATCH  → professor dono edita (title/body/youtubeIds/turmaId) e ENVIA
 *            (action:"send" → status=sent, sentAt, turmaId).
 *   DELETE → professor dono apaga a aula (+ quiz, perguntas, submissões, progresso).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { isTeacherSession } from "@/lib/aulas/roles";
import { currentUser } from "@/lib/aulas/auth";

export const dynamic = "force-dynamic";

async function loadQuiz(aulaId: string) {
  const quiz = await prisma.aulaQuiz.findUnique({ where: { aulaId } });
  if (!quiz) return null;
  const questions = await prisma.aulaQuestion.findMany({ where: { quizId: quiz.id }, orderBy: { order: "asc" } });
  return { quiz, questions };
}

// remove gabarito p/ o aluno (não vaza respostas certas)
function stripAnswers(questions: any[]) {
  return questions.map((q) => ({
    id: q.id,
    text: q.text,
    type: q.type,
    marks: q.marks,
    order: q.order,
    options: Array.isArray(q.options)
      ? (q.options as any[]).map((o) => ({ text: o.text }))
      : undefined,
  }));
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const aula = await prisma.aula.findUnique({ where: { id: params.id } });
  if (!aula) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });

  const isOwner = aula.professorId === me.id;
  if (isOwner) {
    const q = await loadQuiz(aula.id);
    return NextResponse.json({ aula, quiz: q?.quiz ?? null, questions: q?.questions ?? [], role: "teacher" });
  }

  // Aluno: precisa estar na turma e a aula precisa estar enviada.
  if (aula.status !== "sent" || !aula.turmaId) return NextResponse.json({ error: "Indisponível" }, { status: 403 });
  const member = await prisma.turmaMember.findFirst({ where: { turmaId: aula.turmaId, studentId: me.id }, select: { id: true } });
  if (!member) return NextResponse.json({ error: "Indisponível" }, { status: 403 });

  const q = await loadQuiz(aula.id);
  const progress = await prisma.aulaProgress.findFirst({ where: { aulaId: aula.id, studentId: me.id } });
  return NextResponse.json({
    aula,
    quiz: q?.quiz ? { id: q.quiz.id, title: q.quiz.title, passingPct: q.quiz.passingPct } : null,
    questions: q ? stripAnswers(q.questions) : [],
    progress,
    role: "student",
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isTeacherSession(me.session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const aula = await prisma.aula.findUnique({ where: { id: params.id } });
  if (!aula || aula.professorId !== me.id) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const data: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim().slice(0, 200);
  if (typeof body.body === "string") data.body = body.body.slice(0, 12000);
  if (Array.isArray(body.youtubeIds)) data.youtubeIds = (body.youtubeIds as unknown[]).filter((x): x is string => typeof x === "string");
  if (typeof body.turmaId === "string") data.turmaId = body.turmaId;

  if (body.action === "send") {
    const turmaId = (typeof body.turmaId === "string" && body.turmaId) || aula.turmaId;
    if (!turmaId) return NextResponse.json({ error: "Escolha uma turma para enviar." }, { status: 400 });
    const turma = await prisma.turma.findFirst({ where: { id: turmaId, professorId: me.id }, select: { id: true } });
    if (!turma) return NextResponse.json({ error: "Turma inválida." }, { status: 400 });
    data.turmaId = turmaId;
    data.status = "sent";
    data.sentAt = new Date();
  }

  const updated = await prisma.aula.update({ where: { id: aula.id }, data });
  return NextResponse.json({ aula: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const aula = await prisma.aula.findUnique({ where: { id: params.id } });
  if (!aula || aula.professorId !== me.id) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });

  const quiz = await prisma.aulaQuiz.findUnique({ where: { aulaId: aula.id }, select: { id: true } });
  if (quiz) {
    await prisma.aulaQuestion.deleteMany({ where: { quizId: quiz.id } });
    await prisma.aulaQuizSubmission.deleteMany({ where: { quizId: quiz.id } });
    await prisma.aulaQuiz.delete({ where: { id: quiz.id } });
  }
  await prisma.aulaProgress.deleteMany({ where: { aulaId: aula.id } });
  await prisma.aula.delete({ where: { id: aula.id } });
  return NextResponse.json({ ok: true });
}
