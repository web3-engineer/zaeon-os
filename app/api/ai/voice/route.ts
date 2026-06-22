import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { guard } from "@/src/lib/ratelimit";
import { geminiTTS, geminiTTSAvailable } from "@/lib/voice/gemini-tts";
import { resolveGeminiVoiceName } from "@/lib/voice/gemini-voices";

export const runtime = "nodejs";
export const maxDuration = 60;

// Proxy para o engine Python de voz (não roda na Vercel; ver voice-engine/).
const VOICE_URL = process.env.VOICE_ENGINE_URL ?? "http://localhost:8004";

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
  const voiceId = typeof body.voice === "string" ? body.voice : undefined;
  if (text.length < 1) return json({ error: "Texto vazio." }, 400);
  if (text.length > 4000) return json({ error: "Texto muito longo (máx. 4000)." }, 400);

  // FALLBACK: síntese pelo engine Python (Piper). Devolve o JSON ou null (falhou).
  async function synth(engineVoice: string | undefined, timeoutMs: number): Promise<any | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${VOICE_URL}/synthesize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: engineVoice }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) return null;
      const data = await res.json().catch(() => null);
      return data?.audio_base64 ? data : null;
    } catch {
      clearTimeout(timer);
      return null;
    }
  }

  // 1) Gemini-TTS — voz premium dentro do crédito GenAI do Google. Feminina pt-BR
  //    por padrão; mapeia a voz escolhida quando for do catálogo Gemini. Saída já
  //    vem como WAV ({ audio_base64, mime:"audio/wav" }) → drop-in pro ttsController.
  let data: any = null;
  if (geminiTTSAvailable()) {
    const g = await geminiTTS(text, { voiceName: resolveGeminiVoiceName(voiceId), timeoutMs: 25_000 });
    if (g) data = g;
  }
  // 2) Fallback: Piper (natural-br) — garante áudio se o Gemini falhar/estourar o
  //    tempo, ou se o modelo TTS ainda não estiver habilitado no projeto/região.
  if (!data) data = await synth("natural-br", 30_000);
  if (!data) return json({ error: "Engine de voz indisponível." }, 503);
  return json(data, 200);
}
