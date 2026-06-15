/**
 * Cache helper sobre o Upstash Redis (src/lib/redis.ts).
 *
 * Tudo aqui é "best-effort": se o Redis não estiver configurado (sem env) ou
 * falhar, a função degrada pra sem-cache — nunca derruba a rota. Use para
 * memorizar saídas caras e determinísticas (respostas de IA por input, buscas
 * externas), NÃO para dados mutáveis por-usuário (ex.: o feed/itens).
 */
import { createHash } from "crypto";
import { redis } from "@/src/lib/redis";

export const redisEnabled = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

/** Chave estável a partir de qualquer payload (hash curto e determinístico). */
export function hashKey(prefix: string, payload: unknown): string {
  const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
  return `${prefix}:${createHash("sha256").update(raw).digest("hex").slice(0, 32)}`;
}

/** Lê do cache (ou null). Nunca lança. */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redisEnabled) return null;
  try { return (await redis.get<T>(key)) ?? null; } catch { return null; }
}

/** Grava no cache com TTL (segundos). Nunca lança. */
export async function cacheSet(key: string, value: unknown, ttlSec: number): Promise<void> {
  if (!redisEnabled) return;
  try { await redis.set(key, value, { ex: ttlSec }); } catch { /* ignore */ }
}

/** Invalida uma chave. Nunca lança. */
export async function cacheDel(key: string): Promise<void> {
  if (!redisEnabled) return;
  try { await redis.del(key); } catch { /* ignore */ }
}

/**
 * Get-or-compute: devolve o valor do cache; se não houver, roda `produce()`,
 * guarda e devolve. Se o Redis estiver fora, só roda `produce()`.
 */
export async function cacheJson<T>(key: string, ttlSec: number, produce: () => Promise<T>): Promise<T> {
  const hit = await cacheGet<T>(key);
  if (hit !== null) return hit;
  const fresh = await produce();
  // não cacheia null/undefined (deixa tentar de novo na próxima)
  if (fresh != null) await cacheSet(key, fresh, ttlSec);
  return fresh;
}
