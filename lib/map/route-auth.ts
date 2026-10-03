/**
 * Porta de entrada das rotas /api/map/*: flag MAP_HARNESS, rate-limit e SESSÃO (userId nunca vem
 * do cliente). Mesma disciplina de lib/cartolina/route-auth.
 */
import { NextResponse } from "next/server";
import { guard } from "@/src/lib/ratelimit";
import { resolveUserId } from "@/lib/agent/transcript";
import { mapHarnessOn } from "@/lib/map/tipos";

export async function entrar(req: Request, bucket: string, limite: "ai-heavy" | "ai-light" = "ai-light"): Promise<{ userId: string } | { response: Response }> {
  if (!mapHarnessOn()) return { response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  const rl = await guard(req, bucket, limite);
  if (!rl.ok) return { response: rl.response };
  const userId = await resolveUserId().catch(() => null);
  if (!userId) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  return { userId };
}

export { sanitizeScopeId } from "@/lib/cartolina/scope";

export function falha(reason: "not_found" | "forbidden" | "invalid" | "conflict"): Response {
  const map = { not_found: [404, "Not found"], forbidden: [403, "Sem permissão"], invalid: [400, "Inválido"], conflict: [409, "Conflito"] } as const;
  const [status, error] = map[reason];
  return NextResponse.json({ error }, { status });
}
