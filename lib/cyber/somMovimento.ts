/**
 * Cyberespaço — os SONS do movimento turbinado (PURO, sintetizados — sem arquivo; lib/cyber/movimento). Tom ADULTO, de
 * jogo de ação: só ar, corpo, impacto e grave — nada tonal/"de brinquedo" (sem bipes nem zips):
 *  - DASH (~0,5 s): o deslocamento de ar encorpado (ruído marrom num passa-baixa ressonante varrendo 1,9 kHz → 240 Hz),
 *    o estalo de TECIDO (ruído picotado a ~31 Hz, curtinho) e um soco GRAVE saturado;
 *  - ALERTA (~0,7 s): a EXPIRAÇÃO pesada de quem acabou de se esforçar (ruído com formantes de voz soprada, sem tom);
 *  - DECOLA (~0,7 s): a IGNIÇÃO do jato — o tranco grave + o rugido que cresce e assenta (o jato contínuo segue);
 *  - IMPACTO-HERÓI (~1,6 s): o estrondo do hero landing — boom grave longo, o estilhaço do chão e a cauda de detritos.
 */

/** PRNG determinístico (mulberry32) — a síntese sai igual sempre (e dá pra testar) */
function prng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const normalizar = (x: Float32Array, pico: number) => { let m = 0; for (const v of x) m = Math.max(m, Math.abs(v)); if (m > 0) for (let i = 0; i < x.length; i++) x[i] = (x[i]! / m) * pico; return x; };
const fimSemClique = (x: Float32Array, n = 256) => { for (let i = 0; i < n && i < x.length; i++) x[x.length - 1 - i]! *= i / n; return x; };
/** filtro de estado variável (2 polos): devolve passa-baixa e passa-banda a cada amostra */
function svf() { let low = 0, band = 0; return (x: number, fc: number, q: number, sr: number) => { const f = 2 * Math.sin((Math.PI * Math.min(fc, sr / 6)) / sr); low += f * band; const high = x - low - q * band; band += f * high; return { low, band }; }; }
/** saturação macia (o "peso" dos sons de ação) */
const sat = (x: number, k: number) => Math.tanh(x * k) / Math.tanh(k);

export function sintetizarDash(sr: number): Float32Array {
  const n = Math.round(sr * 0.5), out = new Float32Array(n), r = prng(31), ar = svf(), pano = svf();
  let marrom = 0, faseSub = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, w = r() * 2 - 1;
    marrom = 0.985 * marrom + 0.15 * w;
    // AR: o corpo passando — passa-baixa ressonante varrendo do médio-agudo pro grave, envelope que INCHA e some
    const fc = 240 + 1660 * Math.exp(-t * 9), a = ar(marrom * 0.7 + w * 0.3, fc, 0.55, sr);
    const envAr = Math.min(1, t / 0.035) * Math.exp(-Math.max(0, t - 0.05) * 6.5);
    // TECIDO: o estalo da roupa no arranque (ruído picotado, médio-agudo, só no começo)
    const p = pano(w, 2200, 0.9, sr), picote = 0.5 + 0.5 * Math.sign(Math.sin(2 * Math.PI * 31 * t));
    const tecido = p.band * picote * Math.exp(-t * 22) * (t < 0.14 ? 1 : 0);
    // SOCO: 75 → 36 Hz, curto
    const fs = 36 + 39 * Math.exp(-t * 22); faseSub += (2 * Math.PI * fs) / sr;
    const soco = Math.sin(faseSub) * Math.min(1, t / 0.004) * Math.exp(-t * 13);
    out[i] = sat(a.low * envAr * 1.6 + a.band * envAr * 0.8 + tecido * 0.35 + soco * 0.75, 1.8);
  }
  return normalizar(fimSemClique(out), 0.9);
}

export function sintetizarAlerta(sr: number): Float32Array {
  const n = Math.round(sr * 0.7), out = new Float32Array(n), r = prng(57), f1 = svf(), f2 = svf(), f3 = svf();
  for (let i = 0; i < n; i++) {
    const t = i / sr, w = r() * 2 - 1;
    // a expiração: ataque rápido (o ar sai de uma vez), cai devagar; formantes de voz soprada (~650, 1150, 2400 Hz)
    const env = Math.min(1, t / 0.05) * Math.exp(-Math.max(0, t - 0.08) * 4.2) * (1 + 0.15 * Math.sin(2 * Math.PI * 9 * t));
    const v = f1(w, 650, 0.6, sr).band * 1.0 + f2(w, 1150, 0.7, sr).band * 0.6 + f3(w, 2400, 0.9, sr).band * 0.25;
    out[i] = v * env;
  }
  return normalizar(fimSemClique(out), 0.6);
}

export function sintetizarDecola(sr: number): Float32Array {
  const n = Math.round(sr * 0.7), out = new Float32Array(n), r = prng(71), ronco = svf();
  let marrom = 0, faseSub = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, w = r() * 2 - 1;
    marrom = 0.99 * marrom + 0.1 * w;
    // o RUGIDO da ignição: abre do grave pro médio e assenta (o jato contínuo assume)
    const fc = 300 + 1300 * Math.min(1, t / 0.12) * Math.exp(-Math.max(0, t - 0.12) * 3), a = ronco(marrom + w * 0.15, fc, 0.7, sr);
    const env = Math.min(1, t / 0.02) * Math.exp(-Math.max(0, t - 0.1) * 4.5);
    // o TRANCO: o empurrão do chão (60 → 30 Hz)
    const fs = 30 + 30 * Math.exp(-t * 18); faseSub += (2 * Math.PI * fs) / sr;
    const tranco = Math.sin(faseSub) * Math.min(1, t / 0.003) * Math.exp(-t * 11);
    out[i] = sat(a.low * env * 1.4 + a.band * env * 0.5 + tranco * 0.9, 2);
  }
  return normalizar(fimSemClique(out), 0.88);
}

export function sintetizarImpactoHeroi(sr: number): Float32Array {
  const n = Math.round(sr * 1.6), out = new Float32Array(n), r = prng(97), crunch = svf(), detrito = svf();
  let faseBoom = 0, prox = 0.05;
  for (let i = 0; i < n; i++) {
    const t = i / sr, w = r() * 2 - 1;
    // BOOM: 58 → 24 Hz, longo (o chão inteiro responde)
    const fb = 24 + 34 * Math.exp(-t * 7); faseBoom += (2 * Math.PI * fb) / sr;
    const boom = Math.sin(faseBoom) * Math.min(1, t / 0.003) * Math.exp(-t * 2.6);
    // ESTILHAÇO: o chão rachando — ruído médio com estalos (impulsos aleatórios), curto
    const c = crunch(w, 900, 0.5, sr), estalo = r() < 0.015 * Math.exp(-t * 6) ? (r() * 2 - 1) * 3 : 0;
    const estilhaco = (c.band + estalo) * Math.exp(-t * 9);
    // DETRITOS: pedrinhas caindo depois (cliques esparsos, cada vez mais raros e baixos)
    let pedra = 0; if (t > prox) { pedra = (r() * 2 - 1) * Math.exp(-t * 2.2); prox = t + 0.03 + r() * 0.12 * (1 + t * 2); }
    const d = detrito(pedra, 3200, 0.8, sr).band;
    out[i] = sat(boom * 1.1 + estilhaco * 0.55 + d * 0.8, 2.2);
  }
  return normalizar(fimSemClique(out, 1024), 0.95);
}

/** GOLPE de espada (~0,4 s): o corte de ar da lâmina — mais agudo e rápido que o dash (passa-banda varrendo 3,2 kHz →
 *  700 Hz), com um brilho METÁLICO escuro no fim (parciais inarmônicos baixinhos, sem "plim" de brinquedo) */
export function sintetizarGolpe(sr: number): Float32Array {
  const n = Math.round(sr * 0.4), out = new Float32Array(n), r = prng(113), ar = svf();
  for (let i = 0; i < n; i++) {
    const t = i / sr, w = r() * 2 - 1;
    const fc = 700 + 2500 * Math.exp(-Math.max(0, t - 0.03) * 14), a = ar(w, fc, 0.45, sr);
    const env = Math.min(1, t / 0.03) * Math.exp(-Math.max(0, t - 0.06) * 11);
    let metal = 0; for (const [f, d] of [[1830, 9], [2910, 12], [4470, 15]] as const) metal += Math.sin(2 * Math.PI * f * t) * Math.exp(-t * d);
    out[i] = sat(a.band * env * 2.2 + metal * 0.05 * Math.min(1, t / 0.02), 1.6);
  }
  return normalizar(fimSemClique(out), 0.88);
}

/** ACERTO (~0,45 s): o golpe pegando — soco grave curto (90 → 45 Hz), o estalo de energia (ruído picotado agudo) e um
 *  chiado elétrico que some (a espada é de energia) */
export function sintetizarAcerto(sr: number): Float32Array {
  const n = Math.round(sr * 0.45), out = new Float32Array(n), r = prng(131), fx = svf();
  let fase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, w = r() * 2 - 1;
    const f = 45 + 45 * Math.exp(-t * 30); fase += (2 * Math.PI * f) / sr;
    const soco = Math.sin(fase) * Math.min(1, t / 0.002) * Math.exp(-t * 14);
    const estalo = w * Math.exp(-t * 60);
    const eletrico = fx(w, 5200, 0.5, sr).band * (0.5 + 0.5 * Math.sign(Math.sin(2 * Math.PI * 57 * t))) * Math.exp(-t * 9);
    out[i] = sat(soco * 1.2 + estalo * 0.6 + eletrico * 0.35, 2.4);
  }
  return normalizar(fimSemClique(out), 0.92);
}
