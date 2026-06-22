/**
 * Montadores/parsers PUROS do corpo da requisição do Gemini-TTS (Vertex REST).
 * Sem rede — o wrapper multi-locutor (auth+fetch) fica em lib/studio/podcast-tts.ts.
 *
 * Forma da chamada (generateContent com responseModalities=["AUDIO"]):
 *   - 1 voz:      speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName
 *   - multi voz:  speechConfig.multiSpeakerVoiceConfig.speakerVoiceConfigs[]
 * Saída: candidates[0].content.parts[].inlineData { data (base64), mimeType }.
 */

export interface SpeakerVoice {
  /** Nome do locutor como aparece no texto ("Dr. Ana:", "Léo:"). */
  speaker: string;
  /** Voz pré-construída do Gemini-TTS (ex.: "Leda", "Charon"). */
  voiceName: string;
}

export interface TtsBody {
  contents: { role: "user"; parts: { text: string }[] }[];
  generationConfig: {
    responseModalities: ["AUDIO"];
    speechConfig: Record<string, unknown>;
  };
}

/** Corpo p/ narração de 1 voz. */
export function buildTtsBody(text: string, voiceName: string): TtsBody {
  return {
    contents: [{ role: "user", parts: [{ text }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
    },
  };
}

/**
 * Corpo p/ podcast multi-locutor. O `text` deve trazer os turnos rotulados
 * ("Dr. Ana: ...\nLéo: ...") e `speakers` mapeia cada rótulo → voz.
 * O Gemini-TTS multi-speaker aceita ATÉ 2 locutores por requisição.
 */
export function buildMultiSpeakerTtsBody(text: string, speakers: SpeakerVoice[]): TtsBody {
  return {
    contents: [{ role: "user", parts: [{ text }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: speakers.map((s) => ({
            speaker: s.speaker,
            voiceConfig: { prebuiltVoiceConfig: { voiceName: s.voiceName } },
          })),
        },
      },
    },
  };
}

/** Extrai o áudio (base64 + mime) da resposta. Aceita inlineData OU inline_data. */
export function parseTtsResponse(json: any): { data: string; mimeType: string } | null {
  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  for (const p of parts) {
    const inline = p?.inlineData || p?.inline_data;
    if (inline?.data) {
      return { data: inline.data, mimeType: inline.mimeType || inline.mime_type || "audio/L16;rate=24000" };
    }
  }
  return null;
}
