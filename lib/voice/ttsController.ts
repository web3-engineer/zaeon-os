"use client";

/**
 * Controlador GLOBAL de TTS (singleton) — um único áudio no app inteiro.
 *
 * Resolve o bug do "parar com delay / áudio dobrado": antes cada botão tinha o
 * seu próprio <audio> e a requisição ao engine não era cancelável. Agora:
 *  - speak() PARA qualquer fala anterior (e aborta a requisição em voo) antes de iniciar;
 *  - stop() aborta o fetch em andamento E pausa o áudio → resposta imediata, sem eco;
 *  - todos os botões compartilham o mesmo estado (quem está falando, e qual texto).
 *
 * Caminho neural: POST /api/ai/voice (Kokoro/Piper). Fallback: speechSynthesis do navegador.
 */
import { pickFiller } from "./fillers";

export type TTSState = { speaking: boolean; loading: boolean; text: string | null };

let audio: HTMLAudioElement | null = null;
let ctrl: AbortController | null = null;
let state: TTSState = { speaking: false, loading: false, text: null };
const listeners = new Set<(s: TTSState) => void>();

function emit() { for (const l of listeners) l(state); }
function set(p: Partial<TTSState>) { state = { ...state, ...p }; emit(); }

export function subscribe(cb: (s: TTSState) => void) {
  listeners.add(cb);
  cb(state);
  return () => { listeners.delete(cb); };
}
export function getTTSState(): TTSState { return state; }

function pref(key: string): string | undefined {
  try { return localStorage.getItem(key) || undefined; } catch { return undefined; }
}

export function stop() {
  if (ctrl) { ctrl.abort(); ctrl = null; }
  if (audio) { audio.pause(); audio.src = ""; audio = null; }
  try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
  set({ speaking: false, loading: false, text: null });
}

// Limpa o texto para a VOZ: remove markdown (**negrito**, #, links, código) e emojis,
// que o TTS leria literalmente ("asterisco asterisco", "rosto sorrindo").
export function cleanForSpeech(text: string): string {
  let t = text || "";
  t = t.replace(/```[\s\S]*?```/g, " ");          // blocos de código
  t = t.replace(/`([^`]+)`/g, "$1");              // código inline
  t = t.replace(/!\[[^\]]*\]\([^)]*\)/g, " ");    // imagens
  t = t.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");  // links → só o texto
  t = t.replace(/^\s{0,3}#{1,6}\s+/gm, "");        // títulos #
  t = t.replace(/^\s{0,3}>\s?/gm, "");             // citações >
  t = t.replace(/^\s*[-*+]\s+/gm, "");             // marcadores de lista
  t = t.replace(/[*_`#>~|]/g, "");                 // sobras de marcadores markdown
  // emojis / símbolos pictográficos / setas / dingbats / variation selectors
  t = t.replace(/[\u{1F000}-\u{1FAFF}\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, "");
  t = t.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return t;
}

// Divide em frases (corta em . ! ? … e quebras de linha).
function splitSentences(text: string): string[] {
  return (text || "").split(/(?<=[.!?…])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
}

// Monta os pedaços da LEITURA otimizados para baixa latência:
//  - 1º pedaço = só a 1ª frase (áudio começa quase na hora);
//  - demais agrupam frases até ~420 chars (menos requisições, fala fluida).
export function buildSpeechChunks(parts: string[], max = 420): string[] {
  const sentences = parts.flatMap((p) => splitSentences(cleanForSpeech(p)));
  const chunks: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if (chunks.length === 0 && !cur) { chunks.push(s); continue; } // 1ª frase sozinha = start rápido
    if (cur && cur.length + 1 + s.length > max) { chunks.push(cur); cur = ""; }
    cur = cur ? `${cur} ${s}` : s;
  }
  if (cur) chunks.push(cur);
  return chunks;
}

// Quebra um texto longo em pedaços <= max chars, preferindo cortar em fim de frase.
function chunkText(text: string, max = 3200): string[] {
  const clean = (text || "").trim();
  if (!clean) return [];
  if (clean.length <= max) return [clean];
  const out: string[] = [];
  const parts = clean.split(/(?<=[.!?…])\s+|\n+/);
  let cur = "";
  for (const p of parts) {
    const s = p.trim();
    if (!s) continue;
    if ((cur ? cur.length + 1 + s.length : s.length) > max) {
      if (cur) { out.push(cur); cur = ""; }
      if (s.length > max) { for (let i = 0; i < s.length; i += max) out.push(s.slice(i, i + max)); }
      else cur = s;
    } else {
      cur = cur ? `${cur} ${s}` : s;
    }
  }
  if (cur) out.push(cur);
  return out;
}

// Resultado da síntese de um pedaço: áudio neural pronto, ou fallback do navegador.
type Prepared = { kind: "audio"; url: string } | { kind: "browser"; text: string } | null;

// CACHE de síntese (memória): roteiro do onboarding é fixo → pré-sintetizar mata o
// cold-start. Key = voz + texto do chunk. Só guarda áudio premium (não null).
const synthCache = new Map<string, { kind: "audio"; url: string }>();
const synthKey = (text: string, voiceId?: string) => `${voiceId || ""}|${text}`;

// SÓ sintetiza (não toca) — devolve o áudio pronto. Permite pré-carregar o próximo
// pedaço enquanto o atual ainda está tocando (pipeline = sem gaps entre blocos).
async function synthChunk(text: string, voiceId: string | undefined, ac: AbortController): Promise<Prepared> {
  const key = synthKey(text, voiceId);
  const cached = synthCache.get(key);
  if (cached) return cached; // latência ~zero quando pré-aquecido (prewarmSpeech)
  try {
    const res = await fetch("/api/ai/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.slice(0, 4000), voice: voiceId }),
      signal: ac.signal,
    });
    if (ac.signal.aborted) return null;
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.audio_base64) {
        const prepared = { kind: "audio" as const, url: `data:${data.mime || "audio/wav"};base64,${data.audio_base64}` };
        synthCache.set(key, prepared);
        return prepared;
      }
    }
  } catch { /* engine indisponível */ }
  return null; // SEM fallback do navegador (nada de voz do Google) — só a voz premium
}

// Toca um pedaço JÁ sintetizado e resolve quando termina. `gender` é usado só no
// fallback do navegador, para a voz casar (ao menos) com o gênero escolhido.
function playPrepared(item: Prepared, ac: AbortController, gender: "f" | "m" = "f"): Promise<void> {
  return new Promise((resolve) => {
    if (!item || ac.signal.aborted) return resolve();
    if (item.kind === "audio") {
      const a = new Audio(item.url);
      audio = a;
      a.onended = () => { if (audio === a) audio = null; resolve(); };
      a.onerror = () => { if (audio === a) audio = null; resolve(); };
      a.play().catch(() => { if (audio === a) audio = null; resolve(); });
    } else resolve(); // pedaço sem áudio premium → pula em silêncio (sem voz do navegador)
  });
}

// Toca uma CURINGA (áudio fixo) inteira e resolve no fim — mascara o cold-start da voz real.
function playFillerAudio(url: string, ac: AbortController): Promise<void> {
  return new Promise((resolve) => {
    if (ac.signal.aborted) return resolve();
    const a = new Audio(url);
    audio = a;
    a.onended = () => { if (audio === a) audio = null; resolve(); };
    a.onerror = () => { if (audio === a) audio = null; resolve(); }; // clipe faltando → segue
    a.play().catch(() => { if (audio === a) audio = null; resolve(); });
  });
}

/** Lê uma SEQUÊNCIA de textos em ordem (modo leitura do estudo inteiro), com
 *  PIPELINE: pré-sintetiza o próximo pedaço enquanto o atual toca → sem demora entre blocos. */
export async function speakSequence(parts: string[], opts?: { voice?: string; gender?: "f" | "m"; filler?: boolean }) {
  stop(); // mata fala/sequência anterior
  const myCtrl = new AbortController();
  ctrl = myCtrl; // stop() aborta a sequência inteira
  const voiceId = opts?.voice || pref("zaeon.voice.id");
  const gender = (opts?.gender || (pref("zaeon.voice.gender") as "f" | "m") || "f");
  const chunks = buildSpeechChunks(parts);
  if (!chunks.length) return;
  set({ speaking: true, loading: true, text: chunks[0] });

  // Buffer de LOOKAHEAD: dispara a síntese de até 3 pedaços à frente, então a
  // reprodução nunca espera (o próximo já vem pronto enquanto o atual toca).
  const LOOKAHEAD = 2;
  const synth: (Promise<Prepared> | undefined)[] = [];
  const ensure = (idx: number) => { if (idx < chunks.length && !synth[idx]) synth[idx] = synthChunk(chunks[idx], voiceId, myCtrl); };
  for (let k = 0; k <= LOOKAHEAD; k++) ensure(k);

  // COLD-START (só com opts.filler — leitura de DOCUMENTO INTEIRO): enquanto o 1º pedaço
  // REAL sintetiza (~3-5s), toca curingas prontas (áudio fixo, zero latência) pra não deixar
  // o usuário no silêncio. Cada curinga toca INTEIRA; a voz real só entra quando o pedaço
  // estiver pronto E a curinga acabar (sem sobreposição). Latência longa → encadeia outra.
  // NÃO usar em fala curta (título, resposta de chat) nem na sala de estudos — só onde o
  // texto é longo o bastante pra valer o disfarce. Sem clipes → não roda.
  if (opts?.filler) {
    let chunk0Ready = false;
    synth[0]!.then(() => { chunk0Ready = true; }).catch(() => { chunk0Ready = true; });
    // janela curta: se o 1º pedaço vier rápido, nem toca curinga (sem delay artificial).
    await Promise.race([synth[0]!.catch(() => {}), new Promise((r) => setTimeout(r, 450))]);
    let lastFiller: string | null = null;
    while (!chunk0Ready && !myCtrl.signal.aborted) {
      const url = await pickFiller(voiceId, lastFiller); // curinga NA MESMA voz do usuário
      if (!url) break;
      lastFiller = url;
      set({ speaking: true, loading: false, text: "…" }); // curinga É áudio → ondas ligadas
      await playFillerAudio(url, myCtrl);
    }
  }

  for (let i = 0; i < chunks.length; i++) {
    if (myCtrl.signal.aborted) return;
    let prepared = await synth[i]!;
    // Se a síntese voltou null (cold-start/timeout do 1º request → era o bug da "1ª estrofe
    // omitida": playPrepared(null) resolvia em silêncio e pulava o pedaço), tenta 1x de novo.
    if (!prepared && !myCtrl.signal.aborted) prepared = await synthChunk(chunks[i], voiceId, myCtrl);
    if (myCtrl.signal.aborted) return;
    ensure(i + 1); ensure(i + 1 + LOOKAHEAD); // mantém o buffer cheio à frente
    set({ speaking: true, loading: false, text: chunks[i] });
    await playPrepared(prepared, myCtrl, gender);
    if (myCtrl.signal.aborted) return;
  }
  if (!myCtrl.signal.aborted) set({ speaking: false, loading: false, text: null });
}

export async function speak(text: string, opts?: { voice?: string; gender?: "f" | "m" }) {
  // TODA fala passa pelo MESMO caminho do "ler o estudo inteiro" (o único que sempre
  // funcionou): quebra o texto em pedaços de ~420 chars e toca em sequência (pipeline).
  // Mandar o texto INTEIRO numa requisição só (jeito antigo) estourava o timeout do
  // Gemini-TTS com texto longo → 503 "aborted". Por isso só funcionava com texto curto.
  return speakSequence([text], opts);
}

// ── FILA DE FALA (onboarding) ──────────────────────────────────────────────
// Avançar um card do tour NÃO pode cortar a fala anterior (cada `speak` chama
// `stop()` internamente). `speakQueued` ENFILEIRA: a próxima fala só começa quando
// a atual termina. `clearSpeechQueue` (no skip/fim do tour) esvazia a fila.
let speakQueue: { text: string; opts?: { voice?: string; gender?: "f" | "m" } }[] = [];
let draining = false;

export function clearSpeechQueue() { speakQueue = []; }

export async function speakQueued(text: string, opts?: { voice?: string; gender?: "f" | "m" }) {
  if (!text || !text.trim()) return;
  speakQueue.push({ text, opts });
  if (draining) return;
  draining = true;
  try {
    while (speakQueue.length) {
      const next = speakQueue.shift()!;
      await speakSequence([next.text], next.opts); // espera terminar antes da próxima (não corta)
    }
  } finally {
    draining = false;
  }
}

// ── PREWARM (onboarding) ───────────────────────────────────────────────────
// Pré-sintetiza um roteiro FIXO em background e popula o `synthCache` → quando o
// passo toca, o áudio já está pronto (latência ~zero). Chunka cada texto SEPARADO
// (igual ao playback: speak([text]) → buildSpeechChunks([text])) pra a key bater.
export function prewarmSpeech(texts: string[], opts?: { voice?: string }) {
  if (typeof window === "undefined") return;
  const voiceId = opts?.voice || pref("zaeon.voice.id");
  const chunks = Array.from(new Set(texts.flatMap((t) => buildSpeechChunks([t])))).filter(Boolean);
  const dummy = new AbortController(); // nunca aborta — prewarm não deve ser cortado
  let i = 0;
  const CONC = 3; // throttle leve pra não estourar o engine/rate-limit
  const worker = async (): Promise<void> => {
    while (i < chunks.length) {
      const c = chunks[i++];
      if (synthCache.has(synthKey(c, voiceId))) continue;
      try { await synthChunk(c, voiceId, dummy); } catch { /* */ }
    }
  };
  // fire-and-forget: roda em background enquanto o usuário lê/interage.
  void Promise.all(Array.from({ length: CONC }, worker));
}
