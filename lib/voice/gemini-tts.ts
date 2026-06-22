/**
 * Gemini-TTS via Vertex AI — voz feminina pt-BR, rápida, FATURADA NO CRÉDITO GenAI.
 *
 * Por que existe: a voz self-hosted (Kokoro feminina) é inviável na CPU do VPS
 * (~8s/trecho → 503). O Gemini-TTS sintetiza no Vertex (mesmo crédito do Gemini),
 * devolve PCM 16-bit (audio/L16;rate=24000) que o <audio> do navegador NÃO toca
 * cru → embrulhamos num header WAV aqui e devolvemos {audio_base64, mime:"audio/wav"}.
 *
 * Auth reusa lib/ai/vertex-credentials.ts (mesmo service account do resto da IA).
 * Modelo via env GEMINI_TTS_MODEL (default gemini-2.5-flash-preview-tts).
 */
import { GoogleAuth } from "google-auth-library";
import { vertexCredentials } from "../ai/vertex-credentials";

export type GeminiVoice = {
  /** id estável usado pela UI/cliente (e persistido em localStorage). */
  id: string;
  /** nome da voz prebuilt do Gemini-TTS (o que vai no request). */
  gemini: string;
  label: string;
  gender: "f" | "m";
  lang: string;
};

/** Catálogo de vozes Gemini-TTS expostas pela Zaeon. Default = feminino pt-BR. */
export const GEMINI_VOICES: GeminiVoice[] = [
  { id: "kore", gemini: "Kore", label: "Kore (feminina, pt-BR)", gender: "f", lang: "pt-BR" },
  { id: "aoede", gemini: "Aoede", label: "Aoede (feminina, pt-BR)", gender: "f", lang: "pt-BR" },
  { id: "leda", gemini: "Leda", label: "Leda (feminina, pt-BR)", gender: "f", lang: "pt-BR" },
  { id: "callirrhoe", gemini: "Callirrhoe", label: "Callirrhoe (feminina, pt-BR)", gender: "f", lang: "pt-BR" },
  { id: "charon", gemini: "Charon", label: "Charon (masculina, pt-BR)", gender: "m", lang: "pt-BR" },
];

export const DEFAULT_GEMINI_VOICE_ID = "kore";

const GEMINI_TTS_MODEL = process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts";

/** Extrai a taxa de amostragem de um mime tipo "audio/L16;rate=24000". Default 24000. */
export function parsePcmRate(mime?: string): number {
  const m = /rate=(\d+)/i.exec(mime || "");
  return m ? parseInt(m[1], 10) : 24000;
}

/**
 * Embrulha PCM 16-bit mono (base64) num container WAV (base64) — header RIFF de 44 bytes.
 * O navegador toca WAV nativamente; PCM cru, não.
 */
export function pcmToWav(pcmBase64: string, sampleRate: number): string {
  const pcm = Buffer.from(pcmBase64, "base64");
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcm.length, 4); // ChunkSize
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16); // Subchunk1Size (PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40); // Subchunk2Size
  return Buffer.concat([header, pcm]).toString("base64");
}

/** Mapeia o id pedido (ou nome cru de voz Gemini) para o nome prebuilt do Gemini-TTS.
 *  Default = voz feminina padrão para ids desconhecidos/legados (ex.: "natural-br"). */
export function resolveGeminiVoice(requested?: string): string {
  const def = GEMINI_VOICES.find((v) => v.id === DEFAULT_GEMINI_VOICE_ID)!.gemini;
  const q = (requested || "").trim().toLowerCase();
  if (!q) return def;
  const byId = GEMINI_VOICES.find((v) => v.id.toLowerCase() === q);
  if (byId) return byId.gemini;
  const byName = GEMINI_VOICES.find((v) => v.gemini.toLowerCase() === q);
  if (byName) return byName.gemini;
  return def;
}

/**
 * Sintetiza `text` com Gemini-TTS no Vertex. Retorna {audio_base64, mime:"audio/wav"}
 * ou lança em falha (a rota decide o fallback). `timeoutMs` evita pendurar a função.
 */
export async function synthGeminiTTS(
  text: string,
  voice?: string,
  timeoutMs = 30_000,
): Promise<{ audio_base64: string; mime: string }> {
  const { project, client_email, private_key, location } = vertexCredentials();
  const voiceName = resolveGeminiVoice(voice);

  const auth = new GoogleAuth({
    credentials: { client_email, private_key },
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const token = await auth.getAccessToken();
  if (!token) throw new Error("gemini_tts_no_token");

  const url =
    `https://${location}-aiplatform.googleapis.com/v1/projects/${project}` +
    `/locations/${location}/publishers/google/models/${GEMINI_TTS_MODEL}:generateContent`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
        },
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`gemini_tts_http_${res.status}:${detail.slice(0, 200)}`);
    }
    const data: any = await res.json();
    const part = data?.candidates?.[0]?.content?.parts?.find((p: any) => p?.inlineData?.data);
    const inline = part?.inlineData;
    if (!inline?.data) throw new Error("gemini_tts_no_audio");
    const mime: string = inline.mimeType || "audio/L16;rate=24000";
    // Já é um container tocável (raro)? devolve direto; senão embrulha o PCM em WAV.
    if (/wav|mpeg|mp3|ogg/i.test(mime)) return { audio_base64: inline.data, mime };
    return { audio_base64: pcmToWav(inline.data, parsePcmRate(mime)), mime: "audio/wav" };
  } finally {
    clearTimeout(timer);
  }
}
