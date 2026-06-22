/**
 * Context caching do PDF no Vertex (cachedContents) — paga o PDF UMA vez por sessão
 * e referencia o cache nos turnos seguintes (tokens cacheados = 10% do custo).
 * Resolve o gasto do chat de PDF, que reenviava o PDF inteiro a cada pergunta.
 *
 * Auth reusa lib/ai/vertex-credentials.ts (mesmo service account do resto da IA),
 * via REST (mesmo padrão de lib/voice/gemini-tts.ts) — sem risco de versão de SDK.
 * Helpers puros (sem rede) ficam testáveis; os callers REST são verificados por tsc.
 */
export const PDF_CACHE_TTL_SECONDS = Number(process.env.PDF_CACHE_TTL_SECONDS) || 2700;
export const PDF_CACHE_ENABLED = (process.env.PDF_CACHE_ENABLED ?? "on") !== "off";
// Piso de tamanho: o cache do Vertex exige ~2048 tokens (~8 páginas). Abaixo disso não
// dá pra cachear → inline (que é barato p/ PDF pequeno). ~40k chars base64 ≈ 30KB.
export const MIN_CACHE_BASE64 = 40_000;

/** Erro tipado: cache inexistente/expirado → o caller recria e tenta de novo. */
export class CacheMissError extends Error {}

/** Segundos → string de ttl do Vertex ("2700s"); nunca abaixo de 1s. */
export function ttlString(seconds: number): string {
  return `${Math.max(1, Math.round(seconds))}s`;
}

/** Vale a pena cachear este PDF? (feature ligada E acima do piso de tamanho.) */
export function isCacheableEstimate(base64Length: number): boolean {
  return PDF_CACHE_ENABLED && base64Length >= MIN_CACHE_BASE64;
}

/** Extrai o resource name do cache da resposta do Vertex. */
export function parseCacheName(resp: unknown): string | null {
  if (resp && typeof resp === "object" && typeof (resp as { name?: unknown }).name === "string") {
    return (resp as { name: string }).name;
  }
  return null;
}

/** Corpo do POST cachedContents — cacheia SÓ o PDF (persona/contexto vão por turno). */
export function buildCacheRequest(opts: {
  project: string;
  location: string;
  model: string;
  pdfBase64: string;
  ttlSeconds: number;
}): Record<string, unknown> {
  return {
    model: `projects/${opts.project}/locations/${opts.location}/publishers/google/models/${opts.model}`,
    contents: [
      { role: "user", parts: [{ inlineData: { mimeType: "application/pdf", data: opts.pdfBase64 } }] },
    ],
    ttl: ttlString(opts.ttlSeconds),
  };
}
