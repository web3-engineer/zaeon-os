/**
 * POST /api/ai/deepthink — modo "pensamento profundo" com Gemini PRO, em CHUNKS.
 *
 * A conexão é limitada (~10s por função na Vercel) e o Pro é mais lento. Em vez de
 * uma única chamada longa, o CLIENTE orquestra a cadeia de pensamento em passos
 * curtos (cada um < 10s):
 *   step "plan"   → o Pro devolve um plano/raciocínio enxuto (poucos tokens);
 *   step "answer" → o Pro escreve a resposta final SEGUINDO o plano.
 * Assim "fatiamos" a cadeia de pensamento do Pro para caber na nossa janela.
 *
 * O foco do app segue sendo o Flash (/api/ai/chat); este modo é opcional.
 */
import { NextResponse } from "next/server";
import { geminiText } from "@/lib/ai/gemini-text";
import { GEMINI_MODEL_PRO } from "@/lib/ai/model";
import { guard } from "@/src/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const rl = await guard(req, "ai-deepthink", "ai-heavy");
    if (!rl.ok) return rl.response;
    const body = await req.json().catch(() => ({} as any));
    const step = body.step === "answer" ? "answer" : "plan";
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const plan = typeof body.plan === "string" ? body.plan : "";
    const context = typeof body.context === "string" ? body.context.slice(0, 6000) : "";
    if (prompt.length < 2) return NextResponse.json({ error: "Prompt inválido." }, { status: 400 });

    if (step === "plan") {
      // Passo 1 — raciocínio curto (cabe folgado em <10s).
      const text = await geminiText({
        model: GEMINI_MODEL_PRO,
        temperature: 0.3,
        system: "Você é a Zaeon em modo de pensamento profundo. Liste em 3 a 6 bullets curtos o raciocínio/plano para responder bem à pergunta. Só os bullets, sem introdução.",
        prompt: context ? `CONTEXTO:\n${context}\n\nPERGUNTA:\n${prompt}` : prompt,
      });
      return NextResponse.json({ step: "plan", plan: text });
    }

    // Passo 2 — resposta final seguindo o plano.
    const text = await geminiText({
      model: GEMINI_MODEL_PRO,
      temperature: 0.5,
      system: "Você é a Zaeon — calorosa, clara e profunda. Escreva a resposta final em português do Brasil seguindo o PLANO dado, em texto corrido e bem fundamentado, sem citar que existe um plano nem qual IA você usa.",
      prompt: `${context ? `CONTEXTO:\n${context}\n\n` : ""}PERGUNTA:\n${prompt}\n\nPLANO A SEGUIR:\n${plan || "(elabore por conta própria)"}\n\nResponda agora.`,
    });
    return NextResponse.json({ step: "answer", text });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Falha no modo profundo." }, { status: 500 });
  }
}
