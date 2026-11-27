import { describe, it, expect, vi } from "vitest";
import {
  dividirTexto,
  emWav,
  gerarVozHf,
  hfVozDisponivel,
  lerAudio,
  montarPedidoVoz,
  vozKokoro,
  TRECHO_MAX,
} from "@/lib/voice/hf-voz";
import { FORMATO_VOZ, normalizarWav, pcmToWav, readWav } from "@/lib/studio/wav";

const ENV = { HF_TOKEN: "hf_teste" };
const jsonRes = (j: unknown, status = 200) => new Response(JSON.stringify(j), { status, headers: { "content-type": "application/json" } });
/** WAV de `n` amostras num formato qualquer */
const wav = (n: number, fmt = FORMATO_VOZ) => pcmToWav(Buffer.alloc(n * (fmt.bitsPerSample / 8) * fmt.channels, 1), fmt);

describe("#883 · voz pelo Hugging Face — configuração", () => {
  it("só liga com HF_TOKEN; HF_RESERVA=0 (kill switch do HF) e HF_VOZ=0 desligam", () => {
    expect(hfVozDisponivel({})).toBe(false);
    expect(hfVozDisponivel(ENV)).toBe(true);
    expect(hfVozDisponivel({ ...ENV, HF_RESERVA: "0" })).toBe(false);
    expect(hfVozDisponivel({ ...ENV, HF_VOZ: "off" })).toBe(false);
  });

  it("os ids antigos viram a voz certa do Kokoro pt-BR: feminina por padrão, Charon masculina", () => {
    expect(vozKokoro(undefined, {})).toBe("pf_dora");
    expect(vozKokoro("leda", {})).toBe("pf_dora");
    expect(vozKokoro("Leda", {})).toBe("pf_dora");
    expect(vozKokoro("natural-br", {})).toBe("pf_dora");
    expect(vozKokoro("Charon", {})).toBe("pm_alex");
    expect(vozKokoro("pm_santa", {})).toBe("pm_santa");
    expect(vozKokoro("charon", { HF_VOZ_M: "pm_santa" })).toBe("pm_santa");
    expect(vozKokoro("leda", { HF_VOZ_F: "voz-que-nao-existe" })).toBe("pf_dora");
  });

  it("o pedido vai ao Kokoro pt-BR do fal-ai pelo router, com o texto e a voz", () => {
    const p = montarPedidoVoz("Olá, turma.", "pf_dora");
    expect(p.url).toBe("https://router.huggingface.co/fal-ai/fal-ai/kokoro/brazilian-portuguese");
    expect(p.body).toMatchObject({ prompt: "Olá, turma.", text: "Olá, turma.", voice: "pf_dora" });
  });
});

describe("#883 · texto longo vira trechos", () => {
  it("curto fica inteiro; longo é cortado em fim de frase, sem passar do teto e sem perder texto", () => {
    expect(dividirTexto("  Oi.  ")).toEqual(["Oi."]);
    expect(dividirTexto("")).toEqual([]);
    const frase = "A mitocôndria produz energia para a célula. ";
    const longo = frase.repeat(30);
    const trechos = dividirTexto(longo);
    expect(trechos.length).toBeGreaterThan(1);
    expect(trechos.every((t) => t.length <= TRECHO_MAX)).toBe(true);
    expect(trechos.every((t) => t.endsWith("."))).toBe(true);
    expect(trechos.join(" ").replace(/\s+/g, " ")).toBe(longo.trim());
  });

  it("frase gigante sem ponto é cortada em espaço", () => {
    const gigante = "palavra ".repeat(200).trim();
    const t = dividirTexto(gigante);
    expect(t.every((x) => x.length <= TRECHO_MAX)).toBe(true);
    expect(t.join(" ")).toBe(gigante);
  });
});

describe("#883 · áudio no formato da casa", () => {
  it("WAV já no formato passa direto; Piper (22,05 kHz) e estéreo são convertidos para 24 kHz mono", () => {
    const certo = readWav(normalizarWav(wav(240))!);
    expect(certo.fmt).toEqual(FORMATO_VOZ);
    expect(certo.data.length).toBe(480);
    const piper = readWav(normalizarWav(wav(22050, { sampleRate: 22050, bitsPerSample: 16, channels: 1 }))!);
    expect(piper.fmt).toEqual(FORMATO_VOZ);
    expect(piper.data.length).toBe(24000 * 2); // 1 segundo continua 1 segundo
    const estereo = readWav(normalizarWav(wav(100, { sampleRate: 24000, bitsPerSample: 16, channels: 2 }))!);
    expect(estereo.fmt.channels).toBe(1);
    expect(normalizarWav(Buffer.from("não é wav"))).toBeNull();
  });

  it("WAV float 32 (comum em modelo de voz) vira PCM 16", () => {
    const pcm = Buffer.alloc(4 * 4);
    [0.5, -0.5, 1, 0].forEach((v, i) => pcm.writeFloatLE(v, i * 4));
    const f32 = pcmToWav(pcm, { sampleRate: 24000, bitsPerSample: 32, channels: 1 });
    f32.writeUInt16LE(3, 20); // formato float
    const r = readWav(normalizarWav(f32)!);
    expect(r.fmt).toEqual(FORMATO_VOZ);
    expect(r.data.readInt16LE(0)).toBe(Math.round(0.5 * 32767));
    expect(r.data.readInt16LE(2)).toBe(Math.round(-0.5 * 32767));
  });

  it("áudio que não é WAV passa pelo conversor (ffmpeg); conversor falhou → null", async () => {
    const conv = vi.fn().mockResolvedValue(wav(10));
    expect(await emWav(Buffer.from("ID3mp3"), conv)).not.toBeNull();
    expect(conv).toHaveBeenCalled();
    expect(await emWav(Buffer.from("ID3mp3"), async () => null)).toBeNull();
  });

  it("só baixa o áudio de host de provedor, sem seguir redirecionamento", async () => {
    const baixar = vi.fn().mockResolvedValue(new Response(new Uint8Array(wav(10)), { headers: { "content-type": "audio/wav" } }));
    expect(await lerAudio(jsonRes({ audio: { url: "https://v3.fal.media/files/a.wav" } }), baixar)).not.toBeNull();
    expect(baixar).toHaveBeenCalledWith("https://v3.fal.media/files/a.wav", expect.objectContaining({ redirect: "error" }));
    const nao = vi.fn();
    expect(await lerAudio(jsonRes({ audio: { url: "https://169.254.169.254/x" } }), nao)).toBeNull();
    expect(nao).not.toHaveBeenCalled();
  });
});

describe("#883 · gerarVozHf", () => {
  const falOk = () =>
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("router.huggingface.co")) {
        expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer hf_teste");
        return jsonRes({ audio: { url: "https://fal.media/files/x.wav" } });
      }
      return new Response(new Uint8Array(wav(2400)), { headers: { "content-type": "audio/wav" } });
    });

  it("um trecho → um WAV 24 kHz, com a voz pedida", async () => {
    const f = falOk();
    const out = await gerarVozHf("Olá.", { voz: "Charon", env: ENV, fetchImpl: f as unknown as typeof fetch });
    expect(readWav(out).fmt).toEqual(FORMATO_VOZ);
    expect(JSON.parse(String(f.mock.calls[0][1]?.body)).voice).toBe("pm_alex");
  });

  it("texto longo: um pedido por trecho, e os WAVs juntados num só", async () => {
    const f = falOk();
    const texto = "Uma frase de teste para a narração da aula. ".repeat(25);
    const n = dividirTexto(texto).length;
    const out = await gerarVozHf(texto, { env: ENV, fetchImpl: f as unknown as typeof fetch });
    expect(f.mock.calls.filter(([u]) => String(u).includes("router")).length).toBe(n);
    expect(readWav(out).data.length).toBe(n * 2400 * 2);
  });

  it("provedor recusou → erro com o status e sem o token; sem token nem chama a rede", async () => {
    const f = vi.fn(async () => new Response("payment required", { status: 402 }));
    await expect(gerarVozHf("x", { env: ENV, fetchImpl: f as unknown as typeof fetch })).rejects.toThrow(/Hugging Face não gerou a voz \(fal-ai 402: payment required\)/);
    await expect(gerarVozHf("x", { env: ENV, fetchImpl: f as unknown as typeof fetch })).rejects.not.toThrow(/hf_teste/);
    const g = vi.fn();
    await expect(gerarVozHf("x", { env: {}, fetchImpl: g as unknown as typeof fetch })).rejects.toThrow(/desligada/);
    await expect(gerarVozHf("   ", { env: ENV, fetchImpl: g as unknown as typeof fetch })).rejects.toThrow(/texto vazio/);
    expect(g).not.toHaveBeenCalled();
  });
});
