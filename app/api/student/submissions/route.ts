import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { prisma } from '@/src/lib/prisma';

export const dynamic = 'force-dynamic';

const normalize = (s: unknown) =>
  String(s ?? '').toLowerCase().replace(/\s/g, '').replace(/,/g, '');

type Q = { number?: number; answer?: string; type?: string };
type A = { number?: number; answer?: string };

// POST — student submits answers to a prova/tarefa. Closed-form items auto-grade
// (gradedBy='ai'); if any item lacks an answer key, it's left for the teacher.
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const student = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { documentId, answers } = await req.json();
    if (!documentId || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'documentId and answers[] required' }, { status: 400 });
    }

    const doc = await prisma.teacherDocument.findUnique({ where: { id: documentId } });
    if (!doc || doc.status !== 'published') {
      return NextResponse.json({ error: 'Document not available' }, { status: 404 });
    }
    if (doc.assignedTo.length > 0 && !doc.assignedTo.includes(student.id)) {
      return NextResponse.json({ error: 'Not assigned to you' }, { status: 403 });
    }

    // Auto-grade closed-form questions (those with an answer key).
    const questions = (Array.isArray(doc.questions) ? doc.questions : []) as Q[];
    const byNumber = new Map<number, string>(
      (answers as A[]).map((a) => [Number(a.number), String(a.answer ?? '')]),
    );
    const closed = questions.filter((q) => q.answer != null && String(q.answer).length > 0);
    const hasOpen = questions.length > closed.length;
    let score: number | null = null;
    if (closed.length > 0) {
      const correct = closed.filter(
        (q) => normalize(byNumber.get(Number(q.number))) === normalize(q.answer),
      ).length;
      score = Math.round((correct / closed.length) * 100);
    }
    // Fully closed → AI-graded; mixed/open → wait for teacher (provisional score kept).
    const status = hasOpen ? 'submitted' : 'graded';
    const gradedBy = hasOpen ? null : 'ai';

    const submission = await prisma.examSubmission.upsert({
      where: { documentId_studentId: { documentId, studentId: student.id } },
      create: { documentId, studentId: student.id, answers, score, status, gradedBy },
      update: { answers, score, status, gradedBy, updatedAt: new Date() },
    });

    return NextResponse.json(submission);
  } catch (error) {
    console.error('[student/submissions POST]', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}

// GET — the student's own submissions (with the document title/type).
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const student = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const submissions = await prisma.examSubmission.findMany({
      where: { studentId: student.id },
      orderBy: { updatedAt: 'desc' },
      include: { document: { select: { title: true, type: true, subject: true } } },
    });

    return NextResponse.json(submissions);
  } catch (error) {
    console.error('[student/submissions GET]', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
