/**
 * Utilidades de áudio PCM/WAV — PURAS (sem rede, sem fs), portanto testáveis.
 *
 * Por que existe: o Gemini-TTS devolve áudio como PCM cru `audio/L16;rate=24000`
 * (16-bit, little-endian), que o <audio> do navegador NÃO toca direto. Aqui
 * embrulhamos o PCM num contêiner WAV (header RIFF de 44 bytes) — aí o
 * ttsController toca via `data:audio/wav;base64,...` sem mudar nada no player.
 * Também concatenamos vários WAVs (segmentos do podcast) num só.
 */

export interface PcmFormat {
  sampleRate: number;
  bitsPerSample: number;
  channels: number;
}

const DEFAULT_FORMAT: PcmFormat = { sampleRate: 24000, bitsPerSample: 16, channels: 1 };

/**
 * Extrai taxa/bits/canais de um mime de áudio cru do Gemini-TTS.
 * Ex.: "audio/L16;codec=pcm;rate=24000" → { sampleRate:24000, bitsPerSample:16, channels:1 }.
 * Campos ausentes caem no default (24kHz, 16-bit, mono).
 */
export function parseAudioMime(mime?: string): PcmFormat {
  const out: PcmFormat = { ...DEFAULT_FORMAT };
  if (!mime) return out;
  const lower = mime.toLowerCase();
  const bits = lower.match(/(?:^|[^a-z])l(\d+)/); // L16, L24…
  if (bits) out.bitsPerSample = parseInt(bits[1], 10) || out.bitsPerSample;
  const rate = lower.match(/rate=(\d+)/);
  if (rate) out.sampleRate = parseInt(rate[1], 10) || out.sampleRate;
  const ch = lower.match(/channels=(\d+)/);
  if (ch) out.channels = parseInt(ch[1], 10) || out.channels;
  return out;
}

/** true se o buffer já é um WAV (tem marcadores RIFF/WAVE). */
export function isWav(buf: Buffer): boolean {
  return (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WAVE"
  );
}

/** Embrulha PCM cru (little-endian) num WAV PCM com header de 44 bytes. */
export function pcmToWav(pcm: Buffer, fmt: PcmFormat = DEFAULT_FORMAT): Buffer {
  const sampleRate = fmt.sampleRate || DEFAULT_FORMAT.sampleRate;
  const bitsPerSample = fmt.bitsPerSample || DEFAULT_FORMAT.bitsPerSample;
  const channels = fmt.channels || DEFAULT_FORMAT.channels;
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;

  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcm.length, 4); // tamanho total - 8
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16); // tamanho do subchunk fmt (PCM)
  header.writeUInt16LE(1, 20); // audioFormat = 1 (PCM)
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

/** Lê o formato e o chunk `data` de um WAV (pula chunks extras como LIST/fact). */
export function readWav(buf: Buffer): { fmt: PcmFormat; data: Buffer } {
  if (!isWav(buf)) throw new Error("Buffer não é WAV (faltam marcadores RIFF/WAVE)");
  const fmt: PcmFormat = {
    channels: buf.readUInt16LE(22),
    sampleRate: buf.readUInt32LE(24),
    bitsPerSample: buf.readUInt16LE(34),
  };
  let offset = 12;
  let data = Buffer.alloc(0);
  while (offset + 8 <= buf.length) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (id === "data") {
      data = Buffer.from(buf.subarray(start, Math.min(start + size, buf.length)));
      break;
    }
    offset = start + size + (size % 2); // chunks alinhados a 2 bytes
  }
  return { fmt, data };
}

/**
 * Concatena vários WAVs (mesmo formato) num único WAV. Usa o formato do 1º.
 * Ignora buffers vazios. Sem nenhum válido → WAV vazio (header + 0 bytes).
 */
export function concatWav(buffers: Buffer[]): Buffer {
  const wavs = (buffers || []).filter((b) => b && b.length && isWav(b));
  if (!wavs.length) return pcmToWav(Buffer.alloc(0));
  const first = readWav(wavs[0]);
  const datas = wavs.map((b) => readWav(b).data);
  return pcmToWav(Buffer.concat(datas), first.fmt);
}
