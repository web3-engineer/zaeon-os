import { describe, it, expect } from "vitest";
import {
  buildTtsBody,
  buildMultiSpeakerTtsBody,
  parseTtsResponse,
} from "@/lib/studio/gemini-tts-request";

describe("buildTtsBody", () => {
  it("monta corpo de 1 voz com responseModalities AUDIO", () => {
    const body = buildTtsBody("olá", "Leda");
    expect(body.contents[0].parts[0].text).toBe("olá");
    expect(body.generationConfig.responseModalities).toEqual(["AUDIO"]);
    expect(body.generationConfig.speechConfig).toEqual({
      voiceConfig: { prebuiltVoiceConfig: { voiceName: "Leda" } },
    });
  });
});

describe("buildMultiSpeakerTtsBody", () => {
  it("monta speakerVoiceConfigs para 2 locutores", () => {
    const body = buildMultiSpeakerTtsBody("Ana: oi\nLéo: e aí", [
      { speaker: "Ana", voiceName: "Leda" },
      { speaker: "Léo", voiceName: "Charon" },
    ]);
    const cfg: any = body.generationConfig.speechConfig;
    expect(cfg.multiSpeakerVoiceConfig.speakerVoiceConfigs).toHaveLength(2);
    expect(cfg.multiSpeakerVoiceConfig.speakerVoiceConfigs[0]).toEqual({
      speaker: "Ana",
      voiceConfig: { prebuiltVoiceConfig: { voiceName: "Leda" } },
    });
    expect(cfg.multiSpeakerVoiceConfig.speakerVoiceConfigs[1].speaker).toBe("Léo");
  });
});

describe("parseTtsResponse", () => {
  it("extrai inlineData (camelCase)", () => {
    const out = parseTtsResponse({
      candidates: [{ content: { parts: [{ inlineData: { data: "AAAA", mimeType: "audio/L16;rate=24000" } }] } }],
    });
    expect(out).toEqual({ data: "AAAA", mimeType: "audio/L16;rate=24000" });
  });

  it("aceita inline_data (snake_case) e mime default", () => {
    const out = parseTtsResponse({
      candidates: [{ content: { parts: [{ inline_data: { data: "BBBB" } }] } }],
    });
    expect(out?.data).toBe("BBBB");
    expect(out?.mimeType).toBe("audio/L16;rate=24000");
  });

  it("pula partes de texto e acha a parte de áudio", () => {
    const out = parseTtsResponse({
      candidates: [{ content: { parts: [{ text: "ruído" }, { inlineData: { data: "CCCC", mimeType: "audio/wav" } }] } }],
    });
    expect(out?.data).toBe("CCCC");
  });

  it("devolve null sem áudio", () => {
    expect(parseTtsResponse({ candidates: [{ content: { parts: [{ text: "x" }] } }] })).toBeNull();
    expect(parseTtsResponse({})).toBeNull();
    expect(parseTtsResponse(null)).toBeNull();
  });
});
