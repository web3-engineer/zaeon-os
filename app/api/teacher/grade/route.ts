/**
 * POST /api/teacher/grade — correção ASSISTIDA por IA (Gemini).
 *
 * Recebe { submissionId }. Carrega a entrega do aluno + o documento (com gabarito),
 * e pede ao Gemini uma SUGESTÃO de nota (0-100) + feedback + comentário por questão.
 * NÃO grava nada: é só sugestão. O professor revisa e confirma via PATCH
 * /api/teacher/submissions (aí sim grava score/feedback e gradedBy = professor).
 *
 * Segue o padrão das rotas de IA: auth + guard (rate-limit) + cache (best-effort).
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { geminiText } from "@/lib/ai/gemini-text";
import { guard } from "@/src/lib/ratelimit";
import { cacheJson, hashKey } from "@/src/lib/cache";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teacher = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true, role: true } });
  if (!teacher || (teacher.role !== "teacher" && teacher.role !== "professor")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rl = await guard(req, "teacher-grade", "ai-heavy");
  if (!rl.ok) return rl.response;

  const { submissionId } = await req.json().catch(() => ({} as any));
  if (!submissionId) return NextResponse.json({ error: "submissionId obrigatório" }, { status: 400 });

  const submission = await prisma.examSubmission.findUnique({
    where: { id: String(submissionId) },
    include: { document: { select: { teacherId: true, title: true, type: true, subject: true, questions: true } } },
  });
  if (!submission) return NextResponse.json({ error: "Entrega não encontrada" }, { status: 404 });
  if (submission.document.teacherId !== teacher.id) return NextResponse.json({ error: "Não é seu documento" }, { status: 403 });

  const questions: any[] = Array.isArray(submission.document.questions as any) ? (submission.document.questions as any) : [];
  const answers: any[] = Array.isArray(submission.answers as any) ? (submission.answers as any) : [];
  const ansByNum = new Map(answers.map((a: any) => [a.number, a.answer]));

  // Monta um pacote legível: enunciado, gabarito (se houver) e resposta do aluno.
  const pack = questions.map((q: any) => ({
    number: q.number,
    statement: q.statement,
    type: q.type,
    expected: q.answer ?? null,
    student: ansByNum.get(q.number) ?? "(em branco)",
  }));

  try {
    const suggestion = await cacheJson(
      hashKey("grade", { id: submissionId, answers }),
      60 * 60 * 24 * 7,
      async () => {
        const raw = await geminiText({
          temperature: 0.3,
          system:
            "Você é um professor assistente justo e construtivo. Recebe as questões de uma avaliação " +
            "(com gabarito quando existir) e as respostas de um aluno. Avalie e responda SOMENTE um JSON " +
            "válido, sem markdown, no formato: " +
            '{"score": <0-100>, "feedback": "<2-4 frases em português do Brasil, construtivas>", ' +
            '"perQuestion": [{"number": <n>, "correct": <true|false|null>, "comment": "<curto>"}]}. ' +
            "Para questões abertas sem gabarito, avalie pela coerência e profundidade. Seja honesto e gentil.",
          prompt:
            `Avaliação: ${submission.document.title} (${submission.document.type})\n` +
            `Disciplina: ${submission.document.subject || "-"}\n\n` +
            `Questões e respostas:\n${JSON.stringify(pack, null, 2)}`,
        });
        let parsed: any = {};
        try { parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()); } catch { parsed = {}; }
        const score = Math.max(0, Math.min(100, Number(parsed.score) || 0));
        return {
          score,
          feedback: typeof parsed.feedback === "string" ? parsed.feedback : "",
          perQuestion: Array.isArray(parsed.perQuestion) ? parsed.perQuestion : [],
        };
      },
    );
    return NextResponse.json({ ok: true, suggestion });
  } catch (e: any) {
    return NextResponse.json({ error: "ai_error", message: "Não consegui sugerir a correção agora." }, { status: 502 });
  }
}
