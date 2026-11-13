/**
 * lib/audio/pitch.ts — detecção de ALTURA (pitch) por AUTOCORRELAÇÃO. PURO (recebe um buffer de
 * amostras, devolve a frequência). É o coração do P3: o microfone capta o instrumento, isto diz QUE
 * NOTA é, e a lição compara com o alvo ("certo/errado").
 *
 * Autocorrelação clássica para sinal MONOFÔNICO (uma nota por vez — voz, flauta, violão dedilhado):
 * acha o período que melhor se repete e devolve sampleRate/período, refinado por interpolação
 * parabólica. Funciona pra qualquer instrumento afinado em 440; por isso "novos instrumentos" entram
 * de graça — é só tocar.
 *
 * Nada aqui toca no navegador: o AudioContext/Analyser/microfone moram no hook (useMicrofone). Assim
 * esta lógica, que é a arriscada, roda no teste com ondas sintéticas.
 */

const NOMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

/** RMS mínimo pra considerar que há som (abaixo disso é silêncio/ruído). */
const RMS_MIN = 0.01;

/**
 * Frequência fundamental do buffer, ou null (silêncio ou sem altura clara).
 * `buf` = amostras no tempo (Float32, -1..1), como o AnalyserNode.getFloatTimeDomainData entrega.
 */
export function detectarPitch(buf: Float32Array, sampleRate: number): number | null {
  const n = buf.length;
  let rms = 0;
  for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / n);
  if (rms < RMS_MIN) return null;

  // autocorrelação: c[lag] = soma buf[i]*buf[i+lag]
  const c = new Float32Array(n);
  for (let lag = 0; lag < n; lag++) {
    let soma = 0;
    for (let i = 0; i < n - lag; i++) soma += buf[i] * buf[i + lag];
    c[lag] = soma;
  }

  // pula o primeiro vale (lag pequeno, autocorrelação alta e descendo)
  let d = 0;
  while (d < n - 1 && c[d] > c[d + 1]) d++;

  // o maior pico depois do vale = o período fundamental
  let maxval = -1, maxpos = -1;
  for (let i = d; i < n; i++) {
    if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  }
  if (maxpos <= 0) return null;

  // interpolação parabólica em torno do pico, pra precisão sub-amostra
  let T0 = maxpos;
  if (maxpos > 0 && maxpos < n - 1) {
    const x1 = c[maxpos - 1], x2 = c[maxpos], x3 = c[maxpos + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a !== 0) T0 = maxpos - b / (2 * a);
  }

  const freq = sampleRate / T0;
  // fora da faixa musical útil (≈ C1..C7) é erro de detecção
  if (freq < 30 || freq > 2100) return null;
  return freq;
}

/** Número MIDI (fracionário) de uma frequência. A4 (440 Hz) = 69. */
export function freqParaMidi(freq: number): number {
  return 12 * Math.log2(freq / 440) + 69;
}

export type NotaDetectada = { id: string; midi: number; cents: number; freq: number };

/**
 * A nota mais próxima de uma frequência: `id` no formato do teclado ("C4", "C#4"), e `cents` = quão
 * desafinado (−50..+50; 0 = afinado). null se a frequência não faz sentido.
 */
export function notaDeFreq(freq: number): NotaDetectada | null {
  if (!(freq > 0) || !isFinite(freq)) return null;
  const m = freqParaMidi(freq);
  const midi = Math.round(m);
  const cents = Math.round((m - midi) * 100);
  const id = NOMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
  return { id, midi, cents, freq };
}

/** Atalho: a nota detectada direto do buffer (ou null). */
export function notaDoBuffer(buf: Float32Array, sampleRate: number): NotaDetectada | null {
  const f = detectarPitch(buf, sampleRate);
  return f === null ? null : notaDeFreq(f);
}
