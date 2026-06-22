/**
 * Catálogo de vozes do Gemini-TTS — PURO (sem rede), compartilhado por
 * /api/ai/voice (síntese) e /api/ai/voices (lista pra UI). A voz feminina pt-BR
 * é o default da Zaeon. Os `voiceName` são vozes pré-construídas do Gemini-TTS
 * (multilíngues; o pt-BR sai do próprio texto). Override por env.
 */

/** Voz feminina/masculina padrão (override por env). */
export const ZAEON_VOICE_F = process.env.ZAEON_TTS_VOICE_F || "Leda"; // feminina, clara
export const ZAEON_VOICE_M = process.env.ZAEON_TTS_VOICE_M || "Charon"; // masculina, grave

export const ZAEON_DEFAULT_VOICE_ID = "zaeon-f";

export interface GeminiVoice {
  id: string;
  label: string;
  gender: "f" | "m";
  lang: string;
  tier: "free" | "premium";
  voiceName: string; // interno: nome da voz pré-construída do Gemini
}

export const GEMINI_VOICES: GeminiVoice[] = [
  { id: "zaeon-f", label: "Zaeon — feminina (pt-BR)", gender: "f", lang: "pt-BR", tier: "premium", voiceName: ZAEON_VOICE_F },
  { id: "zaeon-m", label: "Zaeon — masculina (pt-BR)", gender: "m", lang: "pt-BR", tier: "premium", voiceName: ZAEON_VOICE_M },
  { id: "gem-kore", label: "Kore — feminina", gender: "f", lang: "pt-BR", tier: "premium", voiceName: "Kore" },
  { id: "gem-aoede", label: "Aoede — feminina", gender: "f", lang: "pt-BR", tier: "premium", voiceName: "Aoede" },
  { id: "gem-puck", label: "Puck — masculina", gender: "m", lang: "pt-BR", tier: "premium", voiceName: "Puck" },
  { id: "gem-fenrir", label: "Fenrir — masculina", gender: "m", lang: "pt-BR", tier: "premium", voiceName: "Fenrir" },
];

/** id da voz → voiceName do Gemini. Default feminino se id ausente/desconhecido. */
export function resolveGeminiVoiceName(id?: string): string {
  const v = id ? GEMINI_VOICES.find((x) => x.id === id) : null;
  return v?.voiceName || ZAEON_VOICE_F;
}

/** true se o id pertence ao catálogo Gemini (vs. voz do engine Piper/Kokoro). */
export function isGeminiVoiceId(id?: string): boolean {
  return !!id && GEMINI_VOICES.some((x) => x.id === id);
}

/** Versão pública (sem o voiceName interno) p/ enviar à UI. */
export function publicGeminiVoices(): Omit<GeminiVoice, "voiceName">[] {
  return GEMINI_VOICES.map(({ voiceName: _omit, ...pub }) => pub);
}
