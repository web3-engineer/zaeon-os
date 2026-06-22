import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { guard } from "@/src/lib/ratelimit";
import { synthGeminiTTS } from "@/lib/voice/gemini-tts";

export const runtime = "nodejs";
export const maxDuration = 60;

// Fallback offline: engine Python de voz (Piper "natural-br"). Caminho PRINCIPAL é
// o Gemini-TTS no Vertex (voz feminina, no crédito GenAI). O engine só entra se o
// Gemini-TTS falhar — resiliência, sem 503 silencioso.
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
  const voice = typeof body.voice === "string" ? body.voice : undefined;
  if (text.length < 1) return json({ error: "Texto vazio." }, 400);
  if (text.length > 4000) return json({ error: "Texto muito longo (máx. 4000)." }, 400);

  // CAMINHO PRINCIPAL: Gemini-TTS no Vertex (voz feminina pt-BR, no crédito GenAI).
  let geminiErr = "";
  try {
    const out = await synthGeminiTTS(text, voice);
    return json(out, 200);
  } catch (e) {
    // segue para o fallback offline (Piper) sem derrubar a tela.
    geminiErr = (e as Error)?.message || String(e);
    console.warn("[ai/voice] gemini-tts falhou, tentando Piper:", geminiErr);
  }

  // FALLBACK: engine Python (Piper "natural-br"). Garante áudio em vez de 503 silencioso.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(`${VOICE_URL}/synthesize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice: "natural-br" }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.audio_base64) return json(data, 200);
    }
  } catch {
    clearTimeout(timer);
  }
  // DIAGNÓSTICO TEMPORÁRIO: expõe o motivo real da falha do Gemini-TTS no corpo do 503
  // (mensagem do Vertex, sem segredo) pra identificar modelo/região/allowlist. Remover depois.
  return json({ error: "Engine de voz indisponível.", detail: geminiErr }, 503);
}
