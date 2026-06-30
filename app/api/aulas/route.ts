// Aulas: GET → professor vê as suas (todas); aluno vê as ENVIADAS das turmas
// em que está. POST (professor) cria um rascunho.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { isTeacherSession } from "@/lib/aulas/roles";
import { resolveBlockRefs } from "@/lib/aulas/persistBlocks";
import { aulaBlock } from "@/lib/aulas/blockTypes";

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

  // Fatia rica: cria o QUIZ + perguntas e grava a sequência ORDENADA (Aula.blocks).
  // As perguntas vêm como blocos do canvas (questions) e os `blocks` referenciam-nas por
  // qref → questionId real. Compat: requests sem `blocks` seguem criando perguntas no fim.
  const rawQs = Array.isArray(body.questions) ? (body.questions as any[]) : [];
  const rawBlocks = Array.isArray(body.blocks) ? (body.blocks as any[]) : [];
  if (rawQs.length) {
    const quizData = { aulaId: aula.id, title: `Quiz — ${title}`.slice(0, 160), passingPct: 70 };
    const quiz = await prisma.aulaQuiz.create({ data: quizData });
    const QT = new Set(["choice", "input", "open", "voice", "roulette", "cloze", "dragwords", "flashcards", "memory"]);
    const idByRef: Record<string, string> = {};
    let order = 0;
    for (const q of rawQs) {
      if (!q || typeof q.text !== "string" || !q.text.trim()) continue;
      // type subjacente vem do registro (baseType do kind); fallback ao q.type (compat).
      const baseType = aulaBlock(typeof q.kind === "string" ? q.kind : "")?.baseType || (typeof q.type === "string" ? q.type : "open");
      const qData = {
        quizId: quiz.id,
        text: String(q.text).slice(0, 600),
        type: QT.has(baseType) ? baseType : "open",
        options: Array.isArray(q.options) ? (q.options as object) : undefined,
        accepted: Array.isArray(q.accepted) ? q.accepted.filter((x: any) => typeof x === "string").map((x: string) => String(x).slice(0, 200)) : [],
        marks: Number.isFinite(q.marks) && q.marks > 0 ? Math.min(20, Math.floor(q.marks)) : 1,
        noPaste: !!q.noPaste,
        config: q.config && typeof q.config === "object" ? (q.config as object) : undefined,
        order: order++,
      };
      const created = await prisma.aulaQuestion.create({ data: qData });
      if (typeof q.id === "string") idByRef[q.id] = created.id;
    }
    if (rawBlocks.length) {
      const persisted = resolveBlockRefs(rawBlocks as any, idByRef);
      await prisma.aula.update({ where: { id: aula.id }, data: { blocks: persisted as object } });
    }
  }
  const fresh = await prisma.aula.findUnique({ where: { id: aula.id } });
  return NextResponse.json({ aula: fresh ?? aula });
}
