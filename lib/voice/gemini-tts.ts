/**
 * Gemini-TTS via Vertex AI (REST). Voz premium dentro do crédito GenAI do Google.
 *
 * Por que REST e não o SDK @google-cloud/vertexai: o SDK não passa
 * `responseModalities`/`speechConfig` no generationConfig. Aqui pegamos um access
 * token do service account (mesmas credenciais do Vertex) e chamamos o endpoint
 * :generateContent direto — controle total do corpo.
 *
 * Saída do modelo: PCM cru (audio/L16) → embrulhamos em WAV (lib/studio/wav) e
 * devolvemos { audio_base64, mime:"audio/wav", voice } — mesmo formato que o
 * voice-engine, então é DROP-IN no ttsController e em /api/ai/voice.
 *
 * Sem credencial válida → retorna null (o chamador cai no fallback Piper).
 */
import { GoogleAuth } from "google-auth-library";
import { vertexCredentials } from "@/lib/ai/vertex-credentials";
import {
  buildTtsBody,
  buildMultiSpeakerTtsBody,
  parseTtsResponse,
  type SpeakerVoice,
} from "@/lib/studio/gemini-tts-request";
import { pcmToWav, parseAudioMime, isWav } from "@/lib/studio/wav";
import { ZAEON_VOICE_F } from "@/lib/voice/gemini-voices";

const TTS_MODEL = process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts";

export type TtsAudio = { audio_base64: string; mime: string; voice: string };

let _auth: GoogleAuth | null = null;
function getAuth(): GoogleAuth | null {
  if (_auth) return _auth;
  const c = vertexCredentials();
  if (!c.project || !c.client_email || !c.private_key) return null;
  _auth = new GoogleAuth({
    credentials: { client_email: c.client_email, private_key: c.private_key },
    projectId: c.project,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  return _auth;
}

function endpoint(): string {
  const c = vertexCredentials();
  return `https://${c.location}-aiplatform.googleapis.com/v1/projects/${c.project}/locations/${c.location}/publishers/google/models/${TTS_MODEL}:generateContent`;
}

async function callTTS(body: unknown, voiceLabel: string, timeoutMs: number): Promise<TtsAudio | null> {
  const auth = getAuth();
  if (!auth) return null; // sem credencial → fallback do chamador
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const client = await auth.getClient();
    const token = (await client.getAccessToken())?.token;
    if (!token) {
      clearTimeout(timer);
      return null;
    }
    const res = await fetch(endpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    const parsed = parseTtsResponse(json);
    if (!parsed) return null;
    const raw = Buffer.from(parsed.data, "base64");
    // Gemini-TTS devolve PCM L16 cru → WAV pro browser tocar (ou já é WAV).
    const wav = isWav(raw) ? raw : pcmToWav(raw, parseAudioMime(parsed.mimeType));
    return { audio_base64: wav.toString("base64"), mime: "audio/wav", voice: voiceLabel };
  } catch {
    clearTimeout(timer);
    return null;
  }
}

/** Narração de 1 voz. */
export async function geminiTTS(
  text: string,
  opts?: { voiceName?: string; timeoutMs?: number },
): Promise<TtsAudio | null> {
  const clean = (text || "").trim();
  if (!clean) return null;
  const voiceName = opts?.voiceName || ZAEON_VOICE_F;
  return callTTS(buildTtsBody(clean.slice(0, 5000), voiceName), voiceName, opts?.timeoutMs ?? 30_000);
}

/**
 * Podcast multi-locutor (até 2 vozes). `text` traz turnos rotulados
 * ("Ana: ...\nLéo: ..."); `speakers` mapeia rótulo→voz.
 */
export async function geminiTTSMulti(
  text: string,
  speakers: SpeakerVoice[],
  opts?: { timeoutMs?: number },
): Promise<TtsAudio | null> {
  const clean = (text || "").trim();
  if (!clean || !speakers?.length) return null;
  return callTTS(
    buildMultiSpeakerTtsBody(clean, speakers.slice(0, 2)),
    "gemini-multi",
    opts?.timeoutMs ?? 60_000,
  );
}

/** Se há credencial Google → o caminho Gemini-TTS está disponível. */
export function geminiTTSAvailable(): boolean {
  return getAuth() !== null;
}
