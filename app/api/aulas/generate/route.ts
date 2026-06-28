/**
 * POST /api/aulas/generate — worker generativo de AULAS (professor).
 *
 * Comando em linguagem natural → aula completa: corpo markdown + sugestão de vídeo +
 * quiz (perguntas de múltipla escolha / resposta curta / voz). Cria um RASCUNHO
 * (Aula status=draft) + AulaQuiz + AulaQuestion. Robustez espelha o worker de estudo:
 * parse tolerante + validação + 1 retry; saída degenerada → 502 (não grava lixo).
 */
import { NextResponse } from "next/server";
import { geminiText } from "@/lib/ai/gemini-text";
import { guard } from "@/src/lib/ratelimit";
import { prisma } from "@/src/lib/prisma";
import { isTeacherSession } from "@/lib/aulas/roles";
import { currentUser } from "@/lib/aulas/auth";
import { buildAula } from "@/lib/aulas/generateParse";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM =
  "Você é a Zaeon montando uma AULA completa para um professor, a partir de um comando. " +
  "Responda SOMENTE um JSON válido (sem markdown em volta, sem crases), no formato: " +
  '{"title":"<título da aula>","body":"<conteúdo em MARKDOWN>","youtube":["<id do YouTube quando tiver CERTEZA>"],' +
  '"quiz":{"title":"<título>","passingPct":70,"questions":[{"text":"...","type":"choice|input|open|voice",' +
  '"options":[{"text":"...","isCorrect":true,"explanation":"..."}],"accepted":["..."],"marks":1}]}}. ' +
  "Regras: 'body' é a aula em português do Brasil, didática, em MARKDOWN (use ## subtítulos, listas, **negrito**), " +
  "longa o suficiente para ensinar de verdade. 'quiz.questions': de 3 a 6 perguntas, misture 'choice' (3 a 5 'options' " +
  "com EXATAMENTE 1 isCorrect e uma 'explanation') e 'input' (liste respostas em 'accepted'); pode incluir 1 'open' ou " +
  "'voice'. 'youtube': só inclua IDs reais de 11 caracteres que você tem CERTEZA que existem; na dúvida, deixe [].";

const RETRY_HINT =
  "\n\nResponda SOMENTE o JSON. 'body' com pelo menos 3 parágrafos reais em markdown e 'quiz.questions' com 3 a 6 perguntas válidas.";

export async function POST(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isTeacherSession(me.session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rl = await guard(req, "aula-generate", "ai-light");
  if (!rl.ok) return rl.response;

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const command = typeof body.command === "string" ? body.command.trim() : "";
  if (command.length < 2) return NextResponse.json({ error: "Comando muito curto." }, { status: 400 });
  const turmaId = typeof body.turmaId === "string" && body.turmaId ? body.turmaId : null;

  let parsed;
  try {
    const first = await geminiText({ temperature: 0.5, system: SYSTEM, prompt: `Comando do professor: ${command}` });
    parsed = buildAula(first, command);
    if (!parsed) {
      const second = await geminiText({ temperature: 0.2, system: SYSTEM, prompt: `Comando do professor: ${command}${RETRY_HINT}` });
      parsed = buildAula(second, command);
    }
  } catch {
    return NextResponse.json({ error: "ai_error", message: "Falha ao gerar a aula." }, { status: 502 });
  }
  if (!parsed) return NextResponse.json({ error: "ai_degenerate", message: "Não consegui montar a aula agora. Tente reformular." }, { status: 502 });

  // Cria a aula (rascunho) + quiz + perguntas. data em const separada (excess-property check).
  const aulaData = {
    professorId: me.id,
    title: parsed.title,
    body: parsed.body,
    turmaId,
    youtubeIds: parsed.youtubeIds,
    status: "draft",
  };
  const aula = await prisma.aula.create({ data: aulaData });

  const quizData = { aulaId: aula.id, title: parsed.quiz.title, passingPct: parsed.quiz.passingPct };
  const quiz = await prisma.aulaQuiz.create({ data: quizData });

  for (const q of parsed.quiz.questions) {
    const qData = {
      quizId: quiz.id,
      text: q.text,
      type: q.type,
      options: q.options ? (q.options as unknown as object) : undefined,
      accepted: q.accepted,
      marks: q.marks,
      order: q.order,
    };
    await prisma.aulaQuestion.create({ data: qData });
  }

  return NextResponse.json({ aula, quiz, questionCount: parsed.quiz.questions.length });
}
