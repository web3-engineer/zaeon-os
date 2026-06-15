/**
 * POST /api/study/summarize — resumo generativo (Gemini Flash) de um item colado
 * no feed "Meus Estudos". { text, title? } → { summary }.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { geminiText } from "@/lib/ai/gemini-text";
import { cacheJson, hashKey } from "@/src/lib/cache";
import { guard } from "@/src/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await guard(req, "study-summarize", "ai-light");
  if (!rl.ok) return rl.response;
  const body = await req.json().catch(() => ({} as any));
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 8000) : "";
  const title = typeof body.title === "string" ? body.title.slice(0, 200) : "";
  if (text.length < 10) return NextResponse.json({ error: "Conteúdo curto demais para resumir." }, { status: 400 });
  try {
    // mesmo (título+texto) → mesmo resumo, cacheado 7 dias.
    const summary = await cacheJson(hashKey("sum", { title, text }), 60 * 60 * 24 * 7, () => geminiText({
      temperature: 0.4,
      system: "Você é a Zaeon. Resuma em português do Brasil de forma clara e curta (3-5 frases), em texto corrido, destacando só o essencial para estudo. Sem listas longas, sem citar que é um resumo.",
      prompt: `${title ? `Título: ${title}\n\n` : ""}Conteúdo:\n${text}`,
    }));
    return NextResponse.json({ summary });
  } catch (e: any) {
    return NextResponse.json({ error: "ai_error", message: "Não consegui resumir agora." }, { status: 502 });
  }
}
