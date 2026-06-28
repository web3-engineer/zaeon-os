/**
 * POST /api/aulas/[id]/submit — aluno envia as respostas do quiz.
 * Corrige (lib/aulas/grade), grava AulaQuizSubmission e atualiza AulaProgress
 * (completed se passou, senão in_progress). Retorna nota + correção por questão.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { currentUser } from "@/lib/aulas/auth";
import { gradeSubmission, type GradeQuestion, type SubmittedAnswer } from "@/lib/aulas/grade";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const aula = await prisma.aula.findUnique({ where: { id: params.id } });
  if (!aula || aula.status !== "sent" || !aula.turmaId) return NextResponse.json({ error: "Indisponível" }, { status: 403 });
  const member = await prisma.turmaMember.findFirst({ where: { turmaId: aula.turmaId, studentId: me.id }, select: { id: true } });
  if (!member) return NextResponse.json({ error: "Indisponível" }, { status: 403 });

  const quiz = await prisma.aulaQuiz.findUnique({ where: { aulaId: aula.id } });
  if (!quiz) return NextResponse.json({ error: "Aula sem quiz." }, { status: 400 });
  const questions = await prisma.aulaQuestion.findMany({ where: { quizId: quiz.id }, orderBy: { order: "asc" } });

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const answers: SubmittedAnswer[] = Array.isArray(body.answers)
    ? (body.answers as any[]).map((a) => ({
        questionId: String(a?.questionId ?? ""),
        ...(a?.answer != null ? { answer: String(a.answer) } : {}),
        ...(typeof a?.choiceIndex === "number" ? { choiceIndex: a.choiceIndex } : {}),
        ...(a?.transcript != null ? { transcript: String(a.transcript) } : {}),
        ...(a?.audioUrl != null ? { audioUrl: String(a.audioUrl) } : {}),
        ...(Array.isArray(a?.picks) ? { picks: a.picks } : {}), // roleta (Lote 9)
      }))
    : [];

  const gq: GradeQuestion[] = questions.map((q) => ({
    id: q.id,
    type: q.type,
    marks: q.marks, // PONTOS do item (painel de pontuação)
    options: Array.isArray(q.options) ? (q.options as any[]) : undefined,
    accepted: q.accepted,
    config: (q as any).config ?? null, // roleta: pool/rounds
  }));
  const result = gradeSubmission(gq, answers, quiz.passingPct);

  const subData = {
    quizId: quiz.id,
    studentId: me.id,
    percentage: result.percentage,
    passed: result.passed,
    answers: result.graded as unknown as object,
  };
  const submission = await prisma.aulaQuizSubmission.create({ data: subData });

  // Progresso: completed se passou; senão in_progress (nunca rebaixa).
  const prev = await prisma.aulaProgress.findFirst({ where: { aulaId: aula.id, studentId: me.id } });
  const status = result.passed ? "completed" : (prev?.status === "completed" ? "completed" : "in_progress");
  if (prev) await prisma.aulaProgress.update({ where: { id: prev.id }, data: { status } });
  else await prisma.aulaProgress.create({ data: { aulaId: aula.id, studentId: me.id, status } });

  return NextResponse.json({ submissionId: submission.id, percentage: result.percentage, passed: result.passed, graded: result.graded });
}
