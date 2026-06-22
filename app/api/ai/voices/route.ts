import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { GEMINI_VOICES, DEFAULT_GEMINI_VOICE_ID } from "@/lib/voice/gemini-tts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Catálogo de vozes (GET) — agora as vozes Gemini-TTS (Vertex, no crédito GenAI),
// feminina por default. O caminho de síntese (POST /api/ai/voice) usa o mesmo
// catálogo; o engine Python só entra como fallback offline e não aparece aqui.
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });

  return json(
    {
      default: DEFAULT_GEMINI_VOICE_ID,
      voices: GEMINI_VOICES.map((v) => ({
        id: v.id,
        label: v.label,
        gender: v.gender,
        lang: v.lang,
        tier: "free" as const,
      })),
    },
    200,
  );
}
