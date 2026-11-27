/**
 * lib/voice/hf-voz.ts — #883 (parte 2): voz pelo Hugging Face, sem o Google (server-only).
 *
 * O Gemini-TTS ficou fora do ar (403 "requires billing") e o Martinez pediu para tirar o Google da equação.
 * A voz vai pelo MESMO router e o MESMO `HF_TOKEN` do chat e da imagem, no Kokoro em português do fal-ai
 * (`fal-ai/kokoro/brazilian-portuguese`): vozes pf_dora (feminina), pm_alex e pm_santa (masculinas).
 *
 *   HF_VOZ=0             desliga só a voz pelo HF (HF_RESERVA=0 desliga o HF inteiro).
 *   HF_VOZ_F / HF_VOZ_M  troca a voz feminina / masculina (default pf_dora / pm_alex).
 *   HF_VOZ_TIMEOUT_MS    teto de CADA trecho (default 30 s).
 *
 * Texto longo (aula, vídeo) é dividido em trechos por frase e os WAVs são juntados. Toda saída é WAV no formato
 * único da casa (24 kHz, mono, 16-bit), para o podcast e o vídeo juntarem pedaços de qualquer provedor.
 * Cada trecho gerado gasta créditos da conta do HF (área do Martinez).
 */
import { spawn } from "node:child_process";
import { HF_ROUTER_URL } from "@/lib/llm/reservaHf";
import { hostPermitido, lerAteOTeto } from "@/lib/ai/hf-image";
import { concatWav, isWav, normalizarWav } from "@/lib/studio/wav";

type Env = Record<string, string | undefined>;
type Fetch = typeof fetch;

export const HF_VOZ_ENDPOINT = "fal-ai/kokoro/brazilian-portuguese";
export const VOZES_KOKORO_PT = ["pf_dora", "pm_alex", "pm_santa"] as const;
export const HF_VOZ_TIMEOUT_PADRAO_MS = 30_000;
/** Teto de um trecho de texto: o Kokoro lê bem frases curtas, e um trecho que falha perde pouco. */
export const TRECHO_MAX = 450;
/** Teto de um áudio baixado (um trecho de ~450 caracteres dá bem menos de 2 MB em WAV). */
export const HF_VOZ_MAX_BYTES = 8 * 1024 * 1024;

const DESLIGADO = /^(0|off|false|nao|não|no)$/i;

/** Vozes femininas e masculinas do catálogo antigo (ids e nomes do Gemini-TTS que o app ainda manda). */
const MASCULINAS = new Set(["charon", "puck", "fenrir", "orus", "pm_alex", "pm_santa", "m"]);

export function hfVozDisponivel(env: Env = process.env): boolean {
  if (!env.HF_TOKEN?.trim()) return false;
  const geral = env.HF_RESERVA?.trim();
  const voz = env.HF_VOZ?.trim();
  return !(geral && DESLIGADO.test(geral)) && !(voz && DESLIGADO.test(voz));
}

export function hfVozTimeout(env: Env = process.env): number {
  const n = Number(env.HF_VOZ_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? n : HF_VOZ_TIMEOUT_PADRAO_MS;
}

const vozValida = (v: string | undefined, padrao: string) =>
  v && (VOZES_KOKORO_PT as readonly string[]).includes(v.trim()) ? v.trim() : padrao;

/**
 * O id/nome que o app pede ("leda", "Charon", "pm_santa", vazio…) → a voz do Kokoro em português.
 * Masculina conhecida → a masculina; qualquer outra → a feminina (a voz padrão da Zaeon é feminina).
 */
export function vozKokoro(pedida: string | undefined, env: Env = process.env): string {
  const q = (pedida || "").trim();
  if ((VOZES_KOKORO_PT as readonly string[]).includes(q)) return q;
  const f = vozValida(env.HF_VOZ_F, "pf_dora");
  const m = vozValida(env.HF_VOZ_M, "pm_alex");
  return MASCULINAS.has(q.toLowerCase()) ? m : f;
}

/** Texto → trechos de até `max` caracteres, cortando em fim de frase (ou de vírgula/espaço, se a frase for enorme). */
export function dividirTexto(texto: string, max = TRECHO_MAX): string[] {
  const limpo = (texto || "").replace(/\s+/g, " ").trim();
  if (!limpo) return [];
  if (limpo.length <= max) return [limpo];
  const frases = limpo.match(/[^.!?…]+[.!?…]+["')\]]*\s*|[^.!?…]+$/g) ?? [limpo];
  const out: string[] = [];
  let atual = "";
  const empurrar = (s: string) => { if (s.trim()) out.push(s.trim()); };
  for (const f of frases) {
    if ((atual + f).length <= max) { atual += f; continue; }
    empurrar(atual);
    atual = "";
    if (f.length <= max) { atual = f; continue; }
    // frase maior que o teto: corta em vírgula/espaço
    let resto = f.trim();
    while (resto.length > max) {
      const corte = Math.max(resto.lastIndexOf(", ", max), resto.lastIndexOf(" ", max));
      const i = corte > max / 3 ? corte + 1 : max;
      empurrar(resto.slice(0, i));
      resto = resto.slice(i).trim();
    }
    atual = resto ? `${resto} ` : "";
  }
  empurrar(atual);
  return out;
}

/** O pedido HTTP de um trecho (puro: os testes conferem URL e corpo sem rede). */
export function montarPedidoVoz(texto: string, voz: string): { url: string; body: Record<string, unknown> } {
  // `prompt` é o campo do Kokoro no fal; `text` é o que o cliente oficial do HF manda para TTS no fal.
  return { url: `${HF_ROUTER_URL}/fal-ai/${HF_VOZ_ENDPOINT}`, body: { prompt: texto, text: texto, voice: voz, speed: 1 } };
}

const FFMPEG = () => process.env.FFMPEG_PATH || "ffmpeg";

/** Áudio que não é WAV (mp3, ogg…) → WAV 24 kHz mono pelo ffmpeg (que já está no container por causa do Studio). */
export function paraWavComFfmpeg(audio: Buffer, timeoutMs = 20_000): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const out: Buffer[] = [];
    let p;
    try {
      p = spawn(FFMPEG(), ["-hide_banner", "-loglevel", "error", "-i", "pipe:0", "-ac", "1", "-ar", "24000", "-sample_fmt", "s16", "-f", "wav", "pipe:1"], { stdio: ["pipe", "pipe", "ignore"] });
    } catch { return resolve(null); }
    const t = setTimeout(() => { p.kill("SIGKILL"); resolve(null); }, timeoutMs);
    p.on("error", () => { clearTimeout(t); resolve(null); });
    p.stdout.on("data", (d: Buffer) => out.push(d));
    p.on("close", (code: number) => { clearTimeout(t); resolve(code === 0 && out.length ? Buffer.concat(out) : null); });
    p.stdin.on("error", () => { /* ffmpeg morreu antes de ler tudo */ });
    p.stdin.end(audio);
  });
}

/** Qualquer áudio → WAV no formato da casa; null se não der. */
export async function emWav(audio: Buffer, converter: (b: Buffer) => Promise<Buffer | null> = paraWavComFfmpeg): Promise<Buffer | null> {
  if (!audio.length) return null;
  if (isWav(audio)) return normalizarWav(audio);
  const wav = await converter(audio);
  return wav ? normalizarWav(wav) : null;
}

/**
 * A resposta do fal (`{ audio: { url } }`, ou `audio_url`) → bytes do áudio. O link só é baixado de host de
 * provedor (https, sem seguir redirecionamento), com o prazo do trecho e o teto de tamanho.
 */
export async function lerAudio(res: Response, fetchImpl: Fetch, signal?: AbortSignal): Promise<Buffer | null> {
  const tipo = (res.headers.get("content-type") || "").toLowerCase();
  if (tipo.startsWith("audio/")) return lerAteOTeto(res, HF_VOZ_MAX_BYTES);
  const j = (await res.json().catch(() => null)) as { audio?: { url?: string }; audio_url?: string } | null;
  const url = j?.audio?.url || j?.audio_url;
  if (!url) return null;
  const embutido = url.match(/^data:audio\/[a-z0-9.+-]+;base64,(.+)$/i);
  if (embutido) {
    const b = Buffer.from(embutido[1], "base64");
    return b.length <= HF_VOZ_MAX_BYTES ? b : null;
  }
  if (!hostPermitido(url)) return null;
  const r = await fetchImpl(url, { redirect: "error", signal: signal ?? AbortSignal.timeout(20_000) });
  if (!r.ok) return null;
  return lerAteOTeto(r, HF_VOZ_MAX_BYTES);
}

function descreverErro(e: unknown): string {
  const nome = (e as Error)?.name;
  return nome === "TimeoutError" || nome === "AbortError" ? "demorou demais" : String((e as Error)?.message || e).slice(0, 120);
}

/**
 * Sintetiza `texto` pelo HF e devolve UM WAV (24 kHz, mono). Lança com o motivo quando não dá (quem chama decide a
 * reserva). Um trecho que falha derruba o pedido: áudio com buraco no meio é pior que a reserva.
 */
export async function gerarVozHf(
  texto: string,
  opts: { voz?: string; timeoutMs?: number; env?: Env; fetchImpl?: Fetch; converter?: (b: Buffer) => Promise<Buffer | null> } = {},
): Promise<Buffer> {
  const env = opts.env ?? process.env;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const token = env.HF_TOKEN?.trim();
  if (!token || !hfVozDisponivel(env)) throw new Error("voz pelo Hugging Face desligada (sem HF_TOKEN ou HF_VOZ=0)");
  const trechos = dividirTexto(texto);
  if (!trechos.length) throw new Error("texto vazio");

  const voz = vozKokoro(opts.voz, env);
  const porTrecho = hfVozTimeout(env);
  const fim = Date.now() + Math.max(opts.timeoutMs ?? porTrecho * trechos.length, 2_000);
  const wavs: Buffer[] = [];

  for (const [i, trecho] of trechos.entries()) {
    const resta = fim - Date.now();
    if (resta < 1_000) throw new Error(`Hugging Face não gerou a voz (sem tempo no trecho ${i + 1} de ${trechos.length})`);
    const sinal = AbortSignal.timeout(Math.min(porTrecho, resta));
    const { url, body } = montarPedidoVoz(trecho, voz);
    let res: Response;
    try {
      res = await fetchImpl(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: sinal,
      });
    } catch (e) {
      throw new Error(`Hugging Face não gerou a voz (fal-ai: ${descreverErro(e)})`);
    }
    if (!res.ok) {
      const corpo = (await res.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 160);
      throw new Error(`Hugging Face não gerou a voz (fal-ai ${res.status}${corpo ? `: ${corpo}` : ""})`);
    }
    let wav: Buffer | null = null;
    try {
      const audio = await lerAudio(res, fetchImpl, sinal);
      wav = audio ? await emWav(audio, opts.converter) : null;
    } catch (e) {
      throw new Error(`Hugging Face não gerou a voz (fal-ai: ${descreverErro(e)})`);
    }
    if (!wav) throw new Error("Hugging Face não gerou a voz (fal-ai: resposta sem áudio)");
    wavs.push(wav);
  }
  return wavs.length === 1 ? wavs[0] : concatWav(wavs);
}
