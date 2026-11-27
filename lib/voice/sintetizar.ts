/**
 * lib/voice/sintetizar.ts — #883 (parte 2): A voz da Zaeon, sem depender do Google (server-only).
 *
 * Um ponto só para todo lugar que fala (voz da Aura, podcast, narração da aula, vídeo do Studio, vídeo-doc):
 *
 *   1. Hugging Face (lib/voice/hf-voz.ts, Kokoro pt-BR) — o caminho principal, com o `HF_TOKEN` do chat.
 *   2. Gemini-TTS — só a reserva enquanto a credencial Google existir (sai de vez na parte 6 do #883).
 *   3. Piper do voice-engine (VOICE_ENGINE_URL) — a reserva local que já existia na voz da Aura, agora para todos.
 *
 * Sai SEMPRE `{ audio_base64, mime: "audio/wav", provedor }` no formato único da casa (24 kHz, mono, 16-bit):
 * o podcast e o vídeo juntam pedaços que podem vir de provedores diferentes.
 * Ninguém respondeu → lança "voz indisponível (…motivo de cada um…)", que o Studio mostra como "fora do ar".
 */
import { vertexCredentials } from "@/lib/ai/vertex-credentials";
import { synthGeminiTTS } from "@/lib/voice/gemini-tts";
import { gerarVozHf, hfVozDisponivel } from "@/lib/voice/hf-voz";
import { normalizarWav } from "@/lib/studio/wav";

export type ProvedorVoz = "hf" | "google" | "piper";
export interface VozSintetizada { audio_base64: string; mime: "audio/wav"; provedor: ProvedorVoz }

type Deps = {
  hf: (texto: string, voz: string | undefined, timeoutMs: number) => Promise<Buffer>;
  hfLigado: () => boolean;
  google: (texto: string, voz: string | undefined, timeoutMs: number, onUsage?: (u: unknown, m: string) => void) => Promise<{ audio_base64: string }>;
  googleLigado: () => boolean;
  piper: (texto: string, timeoutMs: number) => Promise<Buffer | null>;
};

const VOICE_URL = () => process.env.VOICE_ENGINE_URL ?? "http://localhost:8004";

/** Piper do voice-engine (o `natural-br`). Sem o container (dev local, deploy enxuto), falha rápido. */
async function piperReal(texto: string, timeoutMs: number): Promise<Buffer | null> {
  const res = await fetch(`${VOICE_URL()}/synthesize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: texto, voice: "natural-br" }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`piper ${res.status}`);
  const data = (await res.json().catch(() => null)) as { audio_base64?: string } | null;
  return data?.audio_base64 ? Buffer.from(data.audio_base64, "base64") : null;
}

const depsReais: Deps = {
  hf: (texto, voz, timeoutMs) => gerarVozHf(texto, { voz, timeoutMs }),
  hfLigado: () => hfVozDisponivel(),
  google: (texto, voz, timeoutMs, onUsage) => synthGeminiTTS(texto, voz, timeoutMs, onUsage),
  googleLigado: () => {
    const c = vertexCredentials();
    return !!(c.project && c.client_email && c.private_key);
  },
  piper: piperReal,
};

const curto = (e: unknown) => String((e as Error)?.message || e).replace(/\s+/g, " ").slice(0, 200);

/**
 * Sintetiza `texto` com a voz pedida (ids antigos como "leda"/"Charon" continuam valendo: viram a feminina/masculina
 * do provedor). `timeoutMs` é o prazo do pedido INTEIRO, dividido entre as tentativas. `onUsage` só existe no Google
 * (é o que o ledger do lounge registra); o HF é cobrado na conta do HF.
 */
export async function sintetizarVoz(
  texto: string,
  voz?: string,
  timeoutMs = 30_000,
  onUsage?: (u: unknown, modelo: string) => void,
  deps: Deps = depsReais,
): Promise<VozSintetizada> {
  const limpo = (texto || "").trim();
  if (!limpo) throw new Error("texto vazio");
  const fim = Date.now() + timeoutMs;
  const resta = () => Math.max(1_000, fim - Date.now());
  const motivos: string[] = [];
  const pronto = (wav: Buffer | null, provedor: ProvedorVoz): VozSintetizada | null => {
    const n = wav ? normalizarWav(wav) : null;
    return n ? { audio_base64: n.toString("base64"), mime: "audio/wav", provedor } : null;
  };

  if (deps.hfLigado()) {
    try {
      // com reserva, o HF fica com 3/4 do prazo; a reserva precisa de tempo para tentar
      const r = pronto(await deps.hf(limpo, voz, Math.round(timeoutMs * 0.75)), "hf");
      if (r) return r;
      motivos.push("hf: áudio ilegível");
    } catch (e) { motivos.push(curto(e)); }
  }
  if (deps.googleLigado() && fim - Date.now() > 2_000) {
    try {
      const g = await deps.google(limpo, voz, resta(), onUsage);
      const r = pronto(Buffer.from(g.audio_base64 || "", "base64"), "google");
      if (r) return r;
      motivos.push("google: áudio ilegível");
    } catch (e) { motivos.push(`google: ${curto(e)}`); }
  }
  if (fim - Date.now() > 1_500) {
    try {
      const r = pronto(await deps.piper(limpo, resta()), "piper");
      if (r) return r;
      motivos.push("piper: sem áudio");
    } catch (e) { motivos.push(`piper: ${curto(e)}`); }
  }
  console.warn("[voz] nenhum provedor respondeu:", motivos.join(" | "));
  throw new Error(`voz indisponível (${motivos.join(" | ") || "sem provedor ligado"})`.slice(0, 500));
}
