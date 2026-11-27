import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { guard } from "@/src/lib/ratelimit";
import { sintetizarVoz } from "@/lib/voice/sintetizar";

export const runtime = "nodejs";
export const maxDuration = 60;

// #883 (parte 2): a voz vem de lib/voice/sintetizar — Hugging Face (Kokoro pt-BR) primeiro, o Gemini-TTS só de
// reserva enquanto a credencial existir, e o Piper do voice-engine por último (a reserva que esta rota já tinha).

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });

  const rl = await guard(req, "ai-voice", "ai-heavy");
  if (!rl.ok) return rl.response;

  // session.user não carrega id — checa existência por email (padrão do projeto).
  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!dbUser) return new Response("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const voice = typeof body.voice === "string" ? body.voice : undefined;
  if (text.length < 1) return json({ error: "Texto vazio." }, 400);
  if (text.length > 4000) return json({ error: "Texto muito longo (máx. 4000)." }, 400);

  // 45 s para o pedido inteiro (a rota tem 60): texto longo vira vários trechos no HF.
  try {
    const out = await sintetizarVoz(text, voice, 45_000);
    return json(out, 200);
  } catch (e) {
    // o motivo vai para o log (sintetizar já registra cada provedor); o aluno recebe a frase curta
    console.warn("[ai/voice]", (e as Error)?.message || e);
    return json({ error: "A voz está fora do ar agora." }, 503);
  }
}
