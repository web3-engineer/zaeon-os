import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { publicGeminiVoices, ZAEON_DEFAULT_VOICE_ID } from "@/lib/voice/gemini-voices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Catálogo de vozes (GET). Lidera com as vozes do Gemini-TTS (premium, no crédito
// Google; feminina pt-BR é o default). Tenta anexar as vozes do engine Python
// (Piper/Kokoro) como fallback selecionável — best-effort: se o engine estiver
// offline, devolve só as do Gemini, então a UI nunca fica vazia.
const VOICE_URL = process.env.VOICE_ENGINE_URL ?? "http://localhost:8004";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });

  const voices: any[] = [...publicGeminiVoices()];

  // anexa as vozes do engine (Piper) como fallback, se disponível
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${VOICE_URL}/voices`, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (Array.isArray(data?.voices)) {
        for (const v of data.voices) {
          if (v?.id && !voices.some((x) => x.id === v.id)) voices.push({ ...v, tier: v.tier || "free" });
        }
      }
    }
  } catch {
    clearTimeout(timer);
  }

  return json({ default: ZAEON_DEFAULT_VOICE_ID, voices }, 200);
}
