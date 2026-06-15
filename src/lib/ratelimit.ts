/**
 * Rate limiting das rotas de IA via @upstash/ratelimit (sliding window).
 *
 * Best-effort: sem env do Redis, `guard()` libera tudo (no-op) — nunca derruba
 * a rota por causa de infra. Protege o custo do Gemini e evita abuso.
 *
 * Uso numa rota:
 *   const rl = await guard(req, "ai-chat");
 *   if (!rl.ok) return rl.response;   // 429 pronto
 */
import { Ratelimit } from "@upstash/ratelimit";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { redis } from "@/src/lib/redis";
import { redisEnabled } from "@/src/lib/cache";

// Limites por "classe" de rota. Ajuste fino aqui.
const LIMITS = {
  // rotas caras de IA: 20 req / 60s por usuário
  "ai-heavy": { tokens: 20, window: "60 s" as const },
  // rotas de IA leves/cache-friendly: 40 req / 60s
  "ai-light": { tokens: 40, window: "60 s" as const },
} as const;

type Bucket = keyof typeof LIMITS;

const limiters: Partial<Record<Bucket, Ratelimit>> = {};
function limiter(bucket: Bucket): Ratelimit | null {
  if (!redisEnabled) return null;
  if (!limiters[bucket]) {
    const cfg = LIMITS[bucket];
    limiters[bucket] = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(cfg.tokens, cfg.window),
      prefix: `rl:${bucket}`,
      analytics: false,
    });
  }
  return limiters[bucket]!;
}

/** Identidade do chamador: e-mail do usuário logado, senão IP. */
async function callerId(req: Request): Promise<string> {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.email) return `u:${session.user.email}`;
  } catch { /* ignore */ }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip") || "anon";
  return `ip:${ip}`;
}

export type Guard = { ok: true } | { ok: false; response: NextResponse };

/**
 * Aplica o rate limit. `name` só rotula a chave (granularidade por rota);
 * `bucket` escolhe o limite. Devolve {ok:true} ou {ok:false, response:429}.
 */
export async function guard(req: Request, name: string, bucket: Bucket = "ai-heavy"): Promise<Guard> {
  const rl = limiter(bucket);
  if (!rl) return { ok: true }; // Redis off → não limita
  try {
    const id = await callerId(req);
    const { success, limit, remaining, reset } = await rl.limit(`${name}:${id}`);
    if (success) return { ok: true };
    const retry = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return {
      ok: false,
      response: NextResponse.json(
        { error: "rate_limited", message: "Muitas requisições. Tente de novo em instantes.", retryAfter: retry },
        { status: 429, headers: { "Retry-After": String(retry), "X-RateLimit-Limit": String(limit), "X-RateLimit-Remaining": String(remaining) } },
      ),
    };
  } catch {
    return { ok: true }; // falha de infra não bloqueia
  }
}
