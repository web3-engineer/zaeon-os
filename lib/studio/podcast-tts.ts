/**
 * Síntese MULTI-LOCUTOR do Gemini-TTS (Vertex REST) — usada só pelo podcast.
 *
 * A voz de 1 locutor (narração/Ouvir) vive em lib/voice/gemini-tts.ts (synthGeminiTTS).
 * O podcast precisa de até 2 vozes numa tacada (speechConfig.multiSpeakerVoiceConfig),
 * então este módulo faz a chamada multi-speaker e devolve um WAV (Buffer) por chunk —
 * o pipeline concatena os chunks (lib/studio/wav → concatWav).
 *
 * Auth reusa o mesmo service account do Vertex; sem credencial → retorna null
 * (o pipeline marca o artefato como erro). Modelo via env GEMINI_TTS_MODEL.
 */
import { GoogleAuth } from "google-auth-library";
import { vertexCredentials } from "@/lib/ai/vertex-credentials";
import { buildMultiSpeakerTtsBody, parseTtsResponse, type SpeakerVoice } from "@/lib/studio/gemini-tts-request";
import { pcmToWav, parseAudioMime, isWav } from "@/lib/studio/wav";

const GEMINI_TTS_MODEL = process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-tts";

/**
 * Sintetiza um trecho rotulado ("Ana: ...\nLéo: ...") com até 2 vozes.
 * Retorna o WAV (Buffer) ou null em falha/sem credencial.
 */
export async function synthGeminiTTSMulti(
  text: string,
  speakers: SpeakerVoice[],
  timeoutMs = 120_000,
): Promise<Buffer | null> {
  const clean = (text || "").trim();
  if (!clean || !speakers?.length) return null;

  const { project, client_email, private_key, location } = vertexCredentials();
  if (!project || !client_email || !private_key) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const auth = new GoogleAuth({
      credentials: { client_email, private_key },
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const token = await auth.getAccessToken();
    if (!token) return null;

    const url =
      `https://${location}-aiplatform.googleapis.com/v1/projects/${project}` +
      `/locations/${location}/publishers/google/models/${GEMINI_TTS_MODEL}:generateContent`;

    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(buildMultiSpeakerTtsBody(clean, speakers.slice(0, 2))),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn("[podcast-tts] HTTP", res.status, (await res.text().catch(() => "")).slice(0, 300));
      return null;
    }

    const json = await res.json().catch(() => null);
    const parsed = parseTtsResponse(json);
    if (!parsed) return null;

    const raw = Buffer.from(parsed.data, "base64");
    // PCM L16 cru → WAV (ou já é um container tocável).
    return isWav(raw) ? raw : pcmToWav(raw, parseAudioMime(parsed.mimeType));
  } catch (e) {
    console.warn("[podcast-tts] erro:", (e as Error)?.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
