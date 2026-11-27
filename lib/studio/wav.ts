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

/** #883 (parte 2): o formato único da voz da Zaeon — 24 kHz, mono, 16-bit (o do Gemini-TTS de antes). */
export const FORMATO_VOZ: PcmFormat = { sampleRate: 24000, bitsPerSample: 16, channels: 1 };

/**
 * Qualquer WAV (PCM 16/24/32-bit ou float 32, mono ou estéreo, qualquer taxa) → WAV no FORMATO_VOZ.
 *
 * Por que: o `concatWav` usa o formato do 1º pedaço para todos. O Kokoro (HF), o Piper (22,05 kHz) e o Gemini
 * podem devolver formatos diferentes; misturados sem converter, o podcast sairia acelerado ou lento.
 * Devolve null se o buffer não for um WAV que dê para ler.
 */
export function normalizarWav(buf: Buffer, alvo: PcmFormat = FORMATO_VOZ): Buffer | null {
  if (!isWav(buf) || buf.length < 44) return null;
  const formato = buf.readUInt16LE(20); // 1 = PCM inteiro, 3 = float, 0xFFFE = extensível
  let fmt: PcmFormat;
  let data: Buffer;
  try { ({ fmt, data } = readWav(buf)); } catch { return null; }
  const { sampleRate, bitsPerSample, channels } = fmt;
  if (!sampleRate || !channels || ![16, 24, 32].includes(bitsPerSample)) return null;
  if (sampleRate === alvo.sampleRate && channels === alvo.channels && bitsPerSample === alvo.bitsPerSample && formato === 1) {
    return pcmToWav(data, alvo);
  }
  const ehFloat = formato === 3 || (formato === 0xfffe && bitsPerSample === 32 && buf.readUInt16LE(44) === 3);
  const bytes = bitsPerSample / 8;
  const quadros = Math.floor(data.length / (bytes * channels));
  // 1) amostras mono em [-1, 1]
  const mono = new Float32Array(quadros);
  for (let i = 0; i < quadros; i++) {
    let soma = 0;
    for (let c = 0; c < channels; c++) {
      const o = (i * channels + c) * bytes;
      let v: number;
      if (bitsPerSample === 16) v = data.readInt16LE(o) / 32768;
      else if (bitsPerSample === 24) v = data.readIntLE(o, 3) / 8388608;
      else v = ehFloat ? data.readFloatLE(o) : data.readInt32LE(o) / 2147483648;
      soma += v;
    }
    mono[i] = soma / channels;
  }
  // 2) reamostragem linear para a taxa do alvo
  const n = quadros ? Math.max(1, Math.round((quadros * alvo.sampleRate) / sampleRate)) : 0;
  const out = Buffer.alloc(n * 2);
  for (let j = 0; j < n; j++) {
    const pos = (j * sampleRate) / alvo.sampleRate;
    const a = Math.floor(pos);
    const b = Math.min(a + 1, quadros - 1);
    const v = mono[a] + (mono[b] - mono[a]) * (pos - a);
    out.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(v * 32767))), j * 2);
  }
  return pcmToWav(out, { ...alvo, channels: 1, bitsPerSample: 16 });
}
