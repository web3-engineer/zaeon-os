import { describe, it, expect } from "vitest";
import {
  GEMINI_VOICES,
  ZAEON_DEFAULT_VOICE_ID,
  ZAEON_VOICE_F,
  resolveGeminiVoiceName,
  isGeminiVoiceId,
  publicGeminiVoices,
} from "@/lib/voice/gemini-voices";

describe("catálogo de vozes Gemini", () => {
  it("o default é a voz feminina pt-BR", () => {
    const def = GEMINI_VOICES.find((v) => v.id === ZAEON_DEFAULT_VOICE_ID);
    expect(def?.gender).toBe("f");
    expect(def?.lang).toBe("pt-BR");
  });

  it("resolveGeminiVoiceName mapeia id → voiceName, com fallback feminino", () => {
    expect(resolveGeminiVoiceName("zaeon-m")).toBe(GEMINI_VOICES.find((v) => v.id === "zaeon-m")!.voiceName);
    expect(resolveGeminiVoiceName(undefined)).toBe(ZAEON_VOICE_F);
    expect(resolveGeminiVoiceName("nao-existe")).toBe(ZAEON_VOICE_F);
  });

  it("isGeminiVoiceId distingue voz Gemini de voz do engine", () => {
    expect(isGeminiVoiceId("zaeon-f")).toBe(true);
    expect(isGeminiVoiceId("natural-br")).toBe(false);
    expect(isGeminiVoiceId(undefined)).toBe(false);
  });

  it("publicGeminiVoices esconde o voiceName interno", () => {
    const pub = publicGeminiVoices();
    expect(pub.length).toBe(GEMINI_VOICES.length);
    expect((pub[0] as any).voiceName).toBeUndefined();
    expect(pub[0].id).toBe("zaeon-f");
  });
});
