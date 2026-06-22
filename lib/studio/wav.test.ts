import { describe, it, expect } from "vitest";
import { parseAudioMime, isWav, pcmToWav, readWav, concatWav } from "@/lib/studio/wav";

describe("parseAudioMime", () => {
  it("lê taxa, bits e canais do mime do Gemini-TTS", () => {
    expect(parseAudioMime("audio/L16;codec=pcm;rate=24000")).toEqual({
      sampleRate: 24000,
      bitsPerSample: 16,
      channels: 1,
    });
  });

  it("usa defaults (24k/16/mono) quando faltam campos ou mime vazio", () => {
    expect(parseAudioMime(undefined)).toEqual({ sampleRate: 24000, bitsPerSample: 16, channels: 1 });
    expect(parseAudioMime("audio/wav")).toEqual({ sampleRate: 24000, bitsPerSample: 16, channels: 1 });
  });

  it("respeita rate e channels explícitos", () => {
    const f = parseAudioMime("audio/L24;rate=48000;channels=2");
    expect(f.sampleRate).toBe(48000);
    expect(f.channels).toBe(2);
    expect(f.bitsPerSample).toBe(24);
  });
});

describe("pcmToWav / isWav", () => {
  const pcm = Buffer.from([0, 0, 1, 0, 2, 0, 3, 0]); // 4 amostras 16-bit

  it("produz header WAV de 44 bytes com marcadores e dados", () => {
    const wav = pcmToWav(pcm, { sampleRate: 24000, bitsPerSample: 16, channels: 1 });
    expect(wav.length).toBe(44 + pcm.length);
    expect(isWav(wav)).toBe(true);
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(wav.toString("ascii", 8, 12)).toBe("WAVE");
    expect(wav.toString("ascii", 36, 40)).toBe("data");
  });

  it("grava taxa, canais, bits e tamanhos corretos no header", () => {
    const wav = pcmToWav(pcm, { sampleRate: 24000, bitsPerSample: 16, channels: 1 });
    expect(wav.readUInt16LE(20)).toBe(1); // PCM
    expect(wav.readUInt16LE(22)).toBe(1); // canais
    expect(wav.readUInt32LE(24)).toBe(24000); // sampleRate
    expect(wav.readUInt32LE(28)).toBe(48000); // byteRate = 24000*1*2
    expect(wav.readUInt16LE(34)).toBe(16); // bits
    expect(wav.readUInt32LE(40)).toBe(pcm.length); // tamanho do data
    expect(wav.readUInt32LE(4)).toBe(36 + pcm.length); // RIFF size
  });

  it("isWav é falso para buffer cru", () => {
    expect(isWav(pcm)).toBe(false);
  });
});

describe("readWav", () => {
  it("faz round-trip do formato e dos dados", () => {
    const pcm = Buffer.from([10, 0, 20, 0, 30, 0]);
    const wav = pcmToWav(pcm, { sampleRate: 16000, bitsPerSample: 16, channels: 1 });
    const out = readWav(wav);
    expect(out.fmt).toEqual({ sampleRate: 16000, bitsPerSample: 16, channels: 1 });
    expect(Buffer.compare(out.data, pcm)).toBe(0);
  });

  it("lança erro para não-WAV", () => {
    expect(() => readWav(Buffer.from([1, 2, 3]))).toThrow(/não é WAV/i);
  });
});

describe("concatWav", () => {
  it("soma os dados de vários WAVs num só, mantendo o formato", () => {
    const a = pcmToWav(Buffer.from([1, 0, 2, 0]), { sampleRate: 24000, bitsPerSample: 16, channels: 1 });
    const b = pcmToWav(Buffer.from([3, 0, 4, 0]), { sampleRate: 24000, bitsPerSample: 16, channels: 1 });
    const merged = concatWav([a, b]);
    const out = readWav(merged);
    expect(out.data.length).toBe(8); // 4 + 4
    expect(out.fmt.sampleRate).toBe(24000);
    expect(Buffer.compare(out.data, Buffer.from([1, 0, 2, 0, 3, 0, 4, 0]))).toBe(0);
  });

  it("ignora buffers vazios/invalidos e devolve WAV vazio sem nenhum válido", () => {
    const merged = concatWav([Buffer.alloc(0), Buffer.from([9, 9, 9])]);
    expect(isWav(merged)).toBe(true);
    expect(readWav(merged).data.length).toBe(0);
  });
});
