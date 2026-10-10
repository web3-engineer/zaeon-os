/**
 * Corridas — os SONS (PURO, sintetizados no navegador como os da moto — lib/cyber/audio `SINTESE`):
 *  - `corrida-bip`: o bipe da contagem (3, 2, 1) — curto, grave-médio;
 *  - `corrida-largada`: o "VAI": o bipe uma oitava acima, longo, com um brilho;
 *  - `corrida-portao`: passou num portão — um "shhh-ping" (sopro + sino curto subindo);
 *  - `corrida-boost`: portão de boost — o sino + um zunido subindo (o tanque enchendo);
 *  - `corrida-volta`: fechou a volta — arpejo de 3 notas;
 *  - `corrida-fim`: a chegada — fanfarra curta (acorde maior subindo) com cauda.
 */
function prng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const normalizar = (x: Float32Array, pico: number) => { let m = 0; for (const v of x) m = Math.max(m, Math.abs(v)); if (m > 0) for (let i = 0; i < x.length; i++) x[i] = (x[i]! / m) * pico; return x; };
const fimSemClique = (x: Float32Array, k = 256) => { for (let i = 0; i < Math.min(k, x.length); i++) x[x.length - 1 - i]! *= i / k; return x; };
/** uma nota "sino": seno + 2º/3º harmônicos, ataque curto e decaimento */
const sino = (t: number, f: number, dec: number) => (t < 0 ? 0 : Math.min(1, t * 400) * Math.exp(-t * dec) * (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(2 * Math.PI * f * 2 * t) + 0.12 * Math.sin(2 * Math.PI * f * 3.01 * t)));

export function sintetizarBip(sr: number): Float32Array {
  const n = Math.round(sr * 0.32), out = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / sr; out[i] = Math.sin(2 * Math.PI * 660 * t) * Math.min(1, t * 300) * (t < 0.2 ? 1 : Math.exp(-(t - 0.2) * 30)) + 0.3 * Math.sin(2 * Math.PI * 1320 * t) * Math.exp(-t * 12); }
  return normalizar(fimSemClique(out), 0.7);
}
export function sintetizarLargada(sr: number): Float32Array {
  const n = Math.round(sr * 0.9), out = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / sr; out[i] = (Math.sin(2 * Math.PI * 1320 * t) + 0.5 * Math.sin(2 * Math.PI * 1980 * t) * Math.exp(-t * 4)) * Math.min(1, t * 300) * (t < 0.6 ? 1 : Math.exp(-(t - 0.6) * 12)); }
  return normalizar(fimSemClique(out), 0.8);
}
export function sintetizarPortao(sr: number): Float32Array {
  const n = Math.round(sr * 0.55), out = new Float32Array(n), r = prng(131); let lp = 0, hp = 0, ant = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, w = r() * 2 - 1; lp += (w - lp) * 0.25; hp = 0.9 * (hp + lp - ant); ant = lp;
    out[i] = hp * 1.2 * Math.sin(Math.PI * Math.min(1, t / 0.3)) * (t < 0.3 ? 1 : 0) + sino(t - 0.06, 1567.98, 9) * 0.5 + sino(t - 0.12, 2093, 10) * 0.4;
  }
  return normalizar(fimSemClique(out), 0.7);
}
export function sintetizarBoostPortao(sr: number): Float32Array {
  const n = Math.round(sr * 0.9), out = new Float32Array(n); let fase = 0;
  for (let i = 0; i < n; i++) { const t = i / sr; fase += (2 * Math.PI * (220 * Math.pow(4, Math.min(1, t / 0.7)))) / sr; out[i] = Math.sin(fase) * 0.45 * Math.sin(Math.PI * Math.min(1, t / 0.8)) + sino(t, 1318.5, 6) * 0.6 + sino(t - 0.1, 1975.5, 7) * 0.4; }
  return normalizar(fimSemClique(out), 0.8);
}
export function sintetizarVolta(sr: number): Float32Array {
  const n = Math.round(sr * 1.1), out = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / sr; out[i] = sino(t, 1046.5, 5) + sino(t - 0.11, 1318.5, 5) + sino(t - 0.22, 1568, 4); }
  return normalizar(fimSemClique(out), 0.75);
}
export function sintetizarFim(sr: number): Float32Array {
  const n = Math.round(sr * 2.4), out = new Float32Array(n), notas: [number, number][] = [[0, 523.25], [0.12, 659.25], [0.24, 783.99], [0.36, 1046.5], [0.62, 1318.5]];
  for (let i = 0; i < n; i++) { const t = i / sr; let v = 0; for (const [t0, f] of notas) v += sino(t - t0, f, 2.2) * (t0 > 0.5 ? 1.2 : 0.8) + 0.15 * Math.sin(2 * Math.PI * f * 0.5 * (t - t0)) * (t > t0 ? Math.exp(-(t - t0) * 2) : 0); out[i] = v; }
  return normalizar(fimSemClique(out, 1024), 0.85);
}

export const SINTESE_CORRIDA = {
  "corrida-bip": sintetizarBip, "corrida-largada": sintetizarLargada, "corrida-portao": sintetizarPortao,
  "corrida-boost": sintetizarBoostPortao, "corrida-volta": sintetizarVolta, "corrida-fim": sintetizarFim,
} as const;
export type NomeSomCorrida = keyof typeof SINTESE_CORRIDA;
