import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { prisma } from '@/src/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const student = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

        const { searchParams } = new URL(req.url);
        const subject = searchParams.get('subject'); // optional — omit to get ALL assigned docs (Provas gateway)

        // Retrieve published documents assigned to this student (optionally by subject)
        const documents = await prisma.teacherDocument.findMany({
            where: {
                ...(subject ? { subject } : {}),
                status: 'published',
                assignedTo: { has: student.id }
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                title: true,
                type: true,
                subject: true,
                dueAt: true,
                createdAt: true,
                context: true,
                questions: true,
            }
        });

        // O Frontend em ClassesView.tsx mapeia task.content; o gateway de Provas usa
        // `questions`. Removemos a chave `answer` de cada questão para o aluno não trapacear.
        const stripAnswers = (qs: unknown) =>
            Array.isArray(qs)
                ? qs.map((q) => {
                      if (q && typeof q === 'object') {
                          const { answer, ...rest } = q as Record<string, unknown>;
                          void answer;
                          return rest;
                      }
                      return q;
                  })
                : [];

        const mapped = documents.map(d => ({
            id: d.id,
            title: d.title,
            type: d.type,
            subject: d.subject,
            dueAt: d.dueAt,
            createdAt: d.createdAt,
            content: d.context || "Documento da disciplina",
            questions: stripAnswers(d.questions),
        }));

        return NextResponse.json(mapped);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
