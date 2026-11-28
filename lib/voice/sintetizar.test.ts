/**
 * #883 (parte 2) · a voz da Zaeon sem o Google: HF primeiro, Google só de reserva, Piper por último.
 */
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { sintetizarVoz, vozDoVoiceEngine } from "@/lib/voice/sintetizar";
import { FORMATO_VOZ, pcmToWav, readWav } from "@/lib/studio/wav";
import { mensagemDeFalha } from "@/lib/studio/falhaArtefato";

const ler = (p: string) => readFileSync(path.resolve(__dirname, "../..", p), "utf8");
const wav = (rate = 24000) => pcmToWav(Buffer.alloc(rate / 10 * 2, 3), { sampleRate: rate, bitsPerSample: 16, channels: 1 });

function deps(o: Partial<{ hfLigado: boolean; googleLigado: boolean; hf: () => Promise<Buffer>; google: () => Promise<{ audio_base64: string }>; piper: () => Promise<Buffer | null> }> = {}) {
  return {
    hfLigado: () => o.hfLigado ?? true,
    googleLigado: () => o.googleLigado ?? true,
    hf: vi.fn(o.hf ?? (async () => wav())),
    google: vi.fn(o.google ?? (async () => ({ audio_base64: wav().toString("base64") }))),
    piper: vi.fn(o.piper ?? (async () => wav(22050))),
  };
}

describe("#883 · sintetizarVoz", () => {
  it("HF ligado: a voz vem do HF e o Google nem é chamado", async () => {
    const d = deps();
    const r = await sintetizarVoz("Olá, turma.", "leda", 30_000, undefined, d);
    expect(r.provedor).toBe("hf");
    expect(r.mime).toBe("audio/wav");
    expect(d.hf).toHaveBeenCalledWith("Olá, turma.", "leda", 22_500);
    expect(d.google).not.toHaveBeenCalled();
    expect(d.piper).not.toHaveBeenCalled();
  });

  it("HF falhou → Google de reserva; Google 403 → Piper, convertido para 24 kHz", async () => {
    const d = deps({ hf: async () => { throw new Error("Hugging Face não gerou a voz (fal-ai 402)"); } });
    expect((await sintetizarVoz("x", undefined, 30_000, undefined, d)).provedor).toBe("google");
    const d2 = deps({
      hf: async () => { throw new Error("hf caiu"); },
      google: async () => { throw new Error("gemini_tts_http_403: requires billing"); },
    });
    const r = await sintetizarVoz("x", undefined, 30_000, undefined, d2);
    expect(r.provedor).toBe("piper");
    expect(readWav(Buffer.from(r.audio_base64, "base64")).fmt).toEqual(FORMATO_VOZ);
  });

  it("sem credencial Google, nem tenta o Google", async () => {
    const d = deps({ googleLigado: false, hf: async () => { throw new Error("hf caiu"); } });
    expect((await sintetizarVoz("x", undefined, 30_000, undefined, d)).provedor).toBe("piper");
    expect(d.google).not.toHaveBeenCalled();
  });

  it("ninguém respondeu → 'voz indisponível' com o motivo de cada um, e o Studio mostra 'fora do ar'", async () => {
    const d = deps({
      hf: async () => { throw new Error("Hugging Face não gerou a voz (fal-ai 402)"); },
      google: async () => { throw new Error("gemini_tts_http_403"); },
      piper: async () => { throw new Error("fetch failed"); },
    });
    const erro = await sintetizarVoz("x", undefined, 30_000, undefined, d).catch((e: Error) => e.message);
    expect(erro).toMatch(/^voz indisponível \(Hugging Face não gerou a voz \(fal-ai 402\) \| google: gemini_tts_http_403 \| piper: fetch failed\)/);
    expect(mensagemDeFalha("podcast", `Síntese de voz do podcast falhou: ${erro}`).texto).toBe("A geração de podcast está fora do ar agora.");
    expect(mensagemDeFalha("video", `Nenhuma cena pôde ser gerada: ${erro}`).texto).toBe("A geração de vídeo está fora do ar agora.");
  });

  it("#883 (revisão): o Piper de reserva recebe a voz pedida e usa a feminina do voice-engine (o natural-br é masculino)", async () => {
    const d = deps({ hfLigado: false, googleLigado: false });
    await sintetizarVoz("x", "leda", 30_000, undefined, d);
    expect(d.piper).toHaveBeenCalledWith("x", expect.any(Number), "leda");
    expect(vozDoVoiceEngine("leda")).toBe("aura-f");
    expect(vozDoVoiceEngine(undefined)).toBe("aura-f");
    expect(vozDoVoiceEngine("Charon")).toBe("aura-m");
    expect(vozDoVoiceEngine("pm_santa")).toBe("aura-m");
  });

  it("texto vazio não chama ninguém", async () => {
    const d = deps();
    await expect(sintetizarVoz("   ", undefined, 30_000, undefined, d)).rejects.toThrow(/texto vazio/);
    expect(d.hf).not.toHaveBeenCalled();
  });
});

describe("#883 · todo lugar que fala usa a voz nova (menos o cyberespaço, que é o PR 2b)", () => {
  it("voz da Aura, podcast, vídeo, narração da aula e vídeo-doc chamam sintetizarVoz", () => {
    for (const p of ["app/api/ai/voice/route.ts", "lib/studio/podcast-pipeline.ts", "lib/studio/video-pipeline.ts", "lib/aula-interativa/narracao.ts", "lib/videodoc/gerar-server.ts"]) {
      const s = ler(p);
      expect(s, p).toMatch(/sintetizarVoz/);
      expect(s, p).not.toMatch(/synthGeminiTTS\(/);
    }
  });

  it("a voz da Aura não manda mais o erro cru do Google para a tela", () => {
    const r = ler("app/api/ai/voice/route.ts");
    expect(r).not.toMatch(/detail: geminiErr/);
    expect(r).toMatch(/A voz está fora do ar agora/);
  });

  it("o podcast e o vídeo levam o motivo da voz para a mensagem de erro", () => {
    expect(ler("lib/studio/podcast-pipeline.ts")).toContain("Síntese de voz do podcast falhou: ${motivoVoz");
    expect(ler("lib/studio/video-pipeline.ts")).toContain("motivoImagem ?? motivoVoz");
  });

  it("o deploy passa as variáveis da voz", () => {
    const deploy = ler(".github/workflows/deploy.yml");
    for (const v of ["HF_VOZ", "HF_VOZ_F", "HF_VOZ_M", "HF_VOZ_TIMEOUT_MS"]) {
      expect(deploy).toContain(`${v}: \${{ vars.${v} || '' }}`);
      expect(deploy).toMatch(new RegExp(`envs:.*[,:\\s]${v},`));
      expect(deploy).toMatch(new RegExp(`HFV=".*\\s${v}[\\s"]`));
    }
  });
});
