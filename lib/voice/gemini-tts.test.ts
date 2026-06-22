import { describe, it, expect } from "vitest";
import {
  parsePcmRate,
  pcmToWav,
  resolveGeminiVoice,
  GEMINI_VOICES,
  DEFAULT_GEMINI_VOICE_ID,
} from "./gemini-tts";

describe("parsePcmRate", () => {
  it("extracts the sample rate from a Gemini L16 mime", () => {
    expect(parsePcmRate("audio/L16;rate=24000")).toBe(24000);
  });
  it("handles spaces and codec ordering", () => {
    expect(parsePcmRate("audio/L16; codec=pcm; rate=16000")).toBe(16000);
  });
  it("defaults to 24000 when no rate is present", () => {
    expect(parsePcmRate("audio/L16")).toBe(24000);
    expect(parsePcmRate(undefined)).toBe(24000);
  });
});

describe("pcmToWav", () => {
  // 4 bytes of fake 16-bit PCM (2 samples).
  const pcm = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const pcmB64 = pcm.toString("base64");

  it("wraps PCM in a valid 44-byte RIFF/WAVE header", () => {
    const wav = Buffer.from(pcmToWav(pcmB64, 24000), "base64");
    expect(wav.length).toBe(44 + pcm.length);
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(wav.toString("ascii", 8, 12)).toBe("WAVE");
    expect(wav.toString("ascii", 12, 16)).toBe("fmt ");
    expect(wav.toString("ascii", 36, 40)).toBe("data");
  });

  it("writes mono / 16-bit / the given sample rate into the fmt chunk", () => {
    const wav = Buffer.from(pcmToWav(pcmB64, 16000), "base64");
    expect(wav.readUInt16LE(22)).toBe(1); // numChannels
    expect(wav.readUInt32LE(24)).toBe(16000); // sampleRate
    expect(wav.readUInt16LE(34)).toBe(16); // bitsPerSample
    expect(wav.readUInt32LE(40)).toBe(pcm.length); // data chunk size
  });

  it("preserves the original PCM bytes after the header", () => {
    const wav = Buffer.from(pcmToWav(pcmB64, 24000), "base64");
    expect(wav.subarray(44)).toEqual(pcm);
  });
});

describe("GEMINI_VOICES catalog", () => {
  it("has a female default voice that exists in the catalog", () => {
    const def = GEMINI_VOICES.find((v) => v.id === DEFAULT_GEMINI_VOICE_ID);
    expect(def).toBeTruthy();
    expect(def?.gender).toBe("f");
    expect(def?.lang).toBe("pt-BR");
  });
  it("every voice carries a Gemini prebuilt voice name", () => {
    for (const v of GEMINI_VOICES) expect(typeof v.gemini).toBe("string");
  });
});

describe("resolveGeminiVoice", () => {
  it("resolves a known Zaeon voice id to its Gemini prebuilt name", () => {
    const v = GEMINI_VOICES[0];
    expect(resolveGeminiVoice(v.id)).toBe(v.gemini);
  });
  it("falls back to the default female voice for unknown / legacy ids", () => {
    const def = GEMINI_VOICES.find((v) => v.id === DEFAULT_GEMINI_VOICE_ID)!;
    expect(resolveGeminiVoice("natural-br")).toBe(def.gemini); // legacy male Piper id
    expect(resolveGeminiVoice(undefined)).toBe(def.gemini);
    expect(resolveGeminiVoice("")).toBe(def.gemini);
  });
  it("accepts a raw Gemini voice name directly (case-insensitive)", () => {
    const name = GEMINI_VOICES[0].gemini;
    expect(resolveGeminiVoice(name.toLowerCase())).toBe(name);
  });
});
