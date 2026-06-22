"use client";

/**
 * Curingas de voz ("fillers") POR VOZ — frases-isca pré-gravadas como ÁUDIO FIXO que tocam
 * NA HORA (zero latência) enquanto o 1º pedaço da fala REAL ainda sintetiza no Vertex
 * (cold-start ~3-5s). Cada voz do catálogo tem o SEU conjunto, então a curinga sai sempre
 * na MESMA voz que o usuário escolheu — sem trocar de voz no meio (mantém a personalidade).
 *
 * Clipes em public/agents/voice-fillers/<id-da-voz>/, gerados uma vez pelo
 * scripts/generate-voice-fillers.mjs. O manifest.json é indexado por voz:
 *   { "kore": ["/agents/voice-fillers/kore/filler-01.wav", ...], "aoede": [...], ... }
 * Sem clipes → pickFiller() devolve null e a fala se comporta como antes.
 */
type FillerManifest = Record<string, string[]>;

const DEFAULT_VOICE_ID = "kore";
let cache: FillerManifest | null = null;
let inflight: Promise<FillerManifest> | null = null;

async function loadManifest(): Promise<FillerManifest> {
  if (cache) return cache;
  if (!inflight) {
    inflight = fetch("/agents/voice-fillers/manifest.json", { cache: "force-cache" })
      .then((r) => (r.ok ? r.json() : {}))
      .then((obj) => {
        cache = obj && typeof obj === "object" && !Array.isArray(obj) ? (obj as FillerManifest) : {};
        return cache;
      })
      .catch(() => {
        cache = {};
        return cache;
      });
  }
  return inflight;
}

/** Pré-carrega o manifest (chamar cedo, ex.: ao montar a página de pesquisa). */
export function preloadFillers(): void {
  void loadManifest();
}

/**
 * Devolve a URL de uma curinga aleatória NA VOZ pedida (evitando `avoid` p/ não repetir).
 * Se a voz não tiver clipes, cai na voz padrão; se nada existir, null.
 */
export async function pickFiller(voiceId?: string | null, avoid?: string | null): Promise<string | null> {
  const m = await loadManifest();
  const id = (voiceId || "").trim().toLowerCase();
  const list =
    (id && m[id]) ||
    m[DEFAULT_VOICE_ID] ||
    Object.values(m)[0] ||
    [];
  if (!list.length) return null;
  const pool = list.length > 1 && avoid ? list.filter((u) => u !== avoid) : list;
  const choices = pool.length ? pool : list;
  return choices[Math.floor(Math.random() * choices.length)];
}
