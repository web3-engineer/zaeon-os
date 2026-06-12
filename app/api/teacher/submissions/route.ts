import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { prisma } from '@/src/lib/prisma';

export const dynamic = 'force-dynamic';

// GET — all submissions to this teacher's documents (optionally ?documentId=).
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const teacher = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!teacher) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('documentId');

    const docs = await prisma.teacherDocument.findMany({
      where: { teacherId: teacher.id, ...(documentId ? { id: documentId } : {}) },
      select: { id: true },
    });
    const docIds = docs.map((d) => d.id);
    if (docIds.length === 0) return NextResponse.json([]);

    const submissions = await prisma.examSubmission.findMany({
      where: { documentId: { in: docIds } },
      orderBy: { updatedAt: 'desc' },
      include: {
        document: { select: { title: true, type: true, subject: true } },
        student: { select: { name: true, email: true, image: true } },
      },
    });

    return NextResponse.json(submissions);
  } catch (error) {
    console.error('[teacher/submissions GET]', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}

// PATCH — teacher grades/overrides a submission. Body: { submissionId, score?, feedback? }
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const teacher = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!teacher) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { submissionId, score, feedback } = await req.json();
    if (!submissionId) return NextResponse.json({ error: 'submissionId required' }, { status: 400 });

    // Ownership: the submission's document must belong to this teacher.
    const submission = await prisma.examSubmission.findUnique({
      where: { id: submissionId },
      include: { document: { select: { teacherId: true } } },
    });
    if (!submission) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    if (submission.document.teacherId !== teacher.id) {
      return NextResponse.json({ error: 'Not your document' }, { status: 403 });
    }

    const updated = await prisma.examSubmission.update({
      where: { id: submissionId },
      data: {
        ...(typeof score === 'number' ? { score } : {}),
        ...(feedback !== undefined ? { feedback } : {}),
        status: 'graded',
        gradedBy: teacher.id,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[teacher/submissions PATCH]', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
