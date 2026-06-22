"use client";

/**
 * Curingas de voz ("fillers") — frases curtas pré-geradas como ÁUDIO FIXO que tocam NA
 * HORA (zero latência) enquanto o primeiro pedaço da fala REAL ainda está sintetizando no
 * Vertex (cold-start de ~3-5s). Disfarça a espera: o usuário ouve a Aura "ganhando tempo"
 * em vez de silêncio. O ttsController toca a curinga INTEIRA antes da voz real — sem
 * sobreposição (ver speakSequence).
 *
 * Os clipes vivem em public/agents/voice-fillers/ e são gerados UMA vez pelo
 * scripts/generate-voice-fillers.mjs (com as credenciais Vertex). O manifest.json lista os
 * que existem. Sem clipes → pickFiller() devolve null e a fala se comporta como antes.
 */
let cache: string[] | null = null;
let inflight: Promise<string[]> | null = null;

async function loadManifest(): Promise<string[]> {
  if (cache) return cache;
  if (!inflight) {
    inflight = fetch("/agents/voice-fillers/manifest.json", { cache: "force-cache" })
      .then((r) => (r.ok ? r.json() : []))
      .then((arr) => {
        cache = Array.isArray(arr) ? arr.filter((u) => typeof u === "string") : [];
        return cache;
      })
      .catch(() => {
        cache = [];
        return cache;
      });
  }
  return inflight;
}

/** Pré-carrega o manifest (chamar cedo, ex.: ao montar a página de pesquisa). */
export function preloadFillers(): void {
  void loadManifest();
}

/** Devolve a URL de uma curinga aleatória (evitando `avoid` p/ não repetir), ou null. */
export async function pickFiller(avoid?: string | null): Promise<string | null> {
  const list = await loadManifest();
  if (!list.length) return null;
  const pool = list.length > 1 && avoid ? list.filter((u) => u !== avoid) : list;
  const choices = pool.length ? pool : list;
  return choices[Math.floor(Math.random() * choices.length)];
}
