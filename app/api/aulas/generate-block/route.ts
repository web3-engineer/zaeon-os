/**
 * POST /api/aulas/generate-block — gera UM bloco interativo de aula (Lote 9).
 * { kind, topic } → IA gera 1 pergunta do tipo pedido (voz/choice/escrita/roleta),
 * usando o genHint do registro (lib/aulas/blockTypes). Parse tolerante + 1 retry
 * (lib/aulas/generateParse.buildQuestionBlock). Saída degenerada → 502. Professor edita depois.
 */
import { NextResponse } from "next/server";
import { geminiText } from "@/lib/ai/gemini-text";
import { guard } from "@/src/lib/ratelimit";
import { isTeacherSession } from "@/lib/aulas/roles";
import { currentUser } from "@/lib/aulas/auth";
import { buildQuestionBlock } from "@/lib/aulas/generateParse";
import { aulaBlock } from "@/lib/aulas/blockTypes";

export const runtime = "nodejs";
export const maxDuration = 45;

export async function POST(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isTeacherSession(me.session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rl = await guard(req, "aula-block", "ai-light");
  if (!rl.ok) return rl.response;

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const kind = typeof body.kind === "string" ? body.kind : "";
  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  const def = aulaBlock(kind);
  if (!def || !def.ready) return NextResponse.json({ error: "Tipo de bloco indisponível." }, { status: 400 });
  if (topic.length < 2) return NextResponse.json({ error: "Tema muito curto." }, { status: 400 });

  const SYSTEM =
    "Você é a Zaeon gerando UM bloco de aula para um professor. Responda SOMENTE um JSON válido " +
    "(sem markdown em volta, sem crases). " + def.genHint +
    ' Inclua "marks" (pontos, inteiro 1 a 5). Campos por tipo: choice → "text"+"options"[{text,isCorrect,explanation}]; ' +
    'escrita → "text"+"accepted"[]; voz → "text" (+ "accepted" se houver resposta objetiva); roleta → "config":{"rounds":N,"pool":[…]}.';
  const RETRY = "\n\nResponda SOMENTE o objeto JSON pedido — válido e completo, nada fora dele.";

  let block;
  try {
    const first = await geminiText({ temperature: 0.5, system: SYSTEM, prompt: `Tema: ${topic}` });
    block = buildQuestionBlock(first, kind);
    if (!block) {
      const second = await geminiText({ temperature: 0.2, system: SYSTEM, prompt: `Tema: ${topic}${RETRY}` });
      block = buildQuestionBlock(second, kind);
    }
  } catch {
    return NextResponse.json({ error: "ai_error", message: "Falha ao gerar o bloco." }, { status: 502 });
  }
  if (!block) return NextResponse.json({ error: "ai_degenerate", message: "Não consegui gerar o bloco. Tente reformular o tema." }, { status: 502 });

  return NextResponse.json({ kind, block });
}
