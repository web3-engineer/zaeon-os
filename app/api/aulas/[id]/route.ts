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
import { parseCloze, parseDragwords, shuffleSeeded } from "@/lib/aulas/fillBlanks";
import { currentUser } from "@/lib/aulas/auth";

export const dynamic = "force-dynamic";

async function loadQuiz(aulaId: string) {
  const quiz = await prisma.aulaQuiz.findUnique({ where: { aulaId } });
  if (!quiz) return null;
  const questions = await prisma.aulaQuestion.findMany({ where: { quizId: quiz.id }, orderBy: { order: "asc" } });
  return { quiz, questions };
}

// remove gabarito p/ o aluno (não vaza respostas certas) — inclui marks/noPaste/config
// (roleta), mas tira isCorrect/explanation das opções (inclusive do pool da roleta).
function stripOptions(opts: any): any {
  return Array.isArray(opts) ? opts.map((o) => ({ text: o.text })) : undefined;
}
function stripConfig(config: any): any {
  if (!config || typeof config !== "object") return undefined;
  // cloze/dragwords: manda só parts + banco embaralhado; NUNCA o gabarito (answers/texto marcado).
  if (typeof config.text === "string" || typeof config.sentence === "string") {
    const m = typeof config.text === "string" ? parseCloze(config.text) : parseDragwords(config);
    return { parts: m.parts, bank: shuffleSeeded(m.bank, String(config.text || config.sentence || "")), allowType: typeof config.text === "string" };
  }
  // flashcards/memória: sem gabarito escondido → repassa direto.
  if (Array.isArray(config.cards)) return { cards: config.cards.map((c: any) => ({ front: String(c?.front ?? ""), back: String(c?.back ?? "") })) };
  if (Array.isArray(config.pairs)) return { pairs: config.pairs.map((p: any) => ({ a: String(p?.a ?? ""), b: String(p?.b ?? "") })) };
  const pool = Array.isArray(config.pool)
    ? config.pool.map((p: any) => ({ text: p.text, type: p.type, options: stripOptions(p.options) }))
    : undefined;
  return { ...(pool ? { pool } : {}), ...(typeof config.rounds === "number" ? { rounds: config.rounds } : {}) };
}
function stripAnswers(questions: any[]) {
  return questions.map((q) => ({
    id: q.id,
    text: q.text,
    type: q.type,
    marks: q.marks,
    noPaste: !!q.noPaste,
    order: q.order,
    options: stripOptions(q.options),
    ...(q.config ? { config: stripConfig(q.config) } : {}),
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
