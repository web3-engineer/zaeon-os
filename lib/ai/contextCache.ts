/**
 * Context caching do PDF no Vertex (cachedContents) — paga o PDF UMA vez por sessão
 * e referencia o cache nos turnos seguintes (tokens cacheados = 10% do custo).
 * Resolve o gasto do chat de PDF, que reenviava o PDF inteiro a cada pergunta.
 *
 * Auth reusa lib/ai/vertex-credentials.ts (mesmo service account do resto da IA),
 * via REST (mesmo padrão de lib/voice/gemini-tts.ts) — sem risco de versão de SDK.
 * Helpers puros (sem rede) ficam testáveis; os callers REST são verificados por tsc.
 */
import { GoogleAuth } from "google-auth-library";
import { vertexCredentials } from "./vertex-credentials";
import { GEMINI_MODEL_FLASH } from "./model";

const SCOPES = ["https://www.googleapis.com/auth/cloud-platform"];

async function vertexAccessToken(client_email: string, private_key: string): Promise<string | null> {
  const auth = new GoogleAuth({ credentials: { client_email, private_key }, scopes: SCOPES });
  return (await auth.getAccessToken()) || null;
}

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

/**
 * Cria um cache do PDF no Vertex (TTL em segundos). Devolve {name, expireTime} ou null
 * em QUALQUER falha (PDF pequeno demais p/ cachear, erro, timeout) — o caller faz inline.
 * Nunca lança.
 */
export async function createPdfCache(opts: {
  pdfBase64: string;
  ttlSeconds?: number;
  model?: string;
  timeoutMs?: number;
}): Promise<{ name: string; expireTime: string } | null> {
  try {
    const { project, client_email, private_key, location } = vertexCredentials();
    const model = opts.model || GEMINI_MODEL_FLASH;
    const token = await vertexAccessToken(client_email, private_key);
    if (!token) return null;
    const url =
      `https://${location}-aiplatform.googleapis.com/v1/projects/${project}` +
      `/locations/${location}/cachedContents`;
    const body = buildCacheRequest({
      project, location, model,
      pdfBase64: opts.pdfBase64,
      ttlSeconds: opts.ttlSeconds ?? PDF_CACHE_TTL_SECONDS,
    });
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    const name = parseCacheName(data);
    if (!name) return null;
    return { name, expireTime: typeof data.expireTime === "string" ? data.expireTime : "" };
  } catch {
    return null;
  }
}

/**
 * Gera contra um cache existente: manda só o histórico (texto) + o novo turno, com o
 * systemText (persona + contexto dinâmico) como prefixo. O PDF NÃO vai no request — está
 * no cache. Lança CacheMissError se o cache sumiu/expirou (p/ o caller recriar).
 */
export async function generateWithCache(opts: {
  cacheName: string;
  systemText: string;
  prompt: string;
  history?: { role: string; parts: { text: string }[] }[];
  model?: string;
  timeoutMs?: number;
}): Promise<string> {
  const { project, client_email, private_key, location } = vertexCredentials();
  const model = opts.model || GEMINI_MODEL_FLASH;
  const token = await vertexAccessToken(client_email, private_key);
  if (!token) throw new Error("cache_gen_no_token");
  const url =
    `https://${location}-aiplatform.googleapis.com/v1/projects/${project}` +
    `/locations/${location}/publishers/google/models/${model}:generateContent`;
  const contents = [
    ...(opts.history ?? []),
    { role: "user", parts: [{ text: `${opts.systemText}\n\n${opts.prompt}` }] },
  ];
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ cachedContent: opts.cacheName, contents }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 45_000),
  });
  if (res.status === 404 || res.status === 403 || res.status === 400) {
    const detail = await res.text().catch(() => "");
    if (res.status === 404 || /cache/i.test(detail)) {
      throw new CacheMissError(`cache_miss_${res.status}`);
    }
    throw new Error(`cache_gen_http_${res.status}`);
  }
  if (!res.ok) throw new Error(`cache_gen_http_${res.status}`);
  const data: any = await res.json();
  return (
    data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join("") ?? ""
  );
}
