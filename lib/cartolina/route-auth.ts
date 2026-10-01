/**
 * Porta de entrada comum das rotas da cartolina: flag, rate-limit e SESSÃO.
 * O userId vem sempre da sessão (e-mail → usuário) — nunca do corpo/query.
 */
import { NextResponse } from "next/server";
import { guard } from "@/src/lib/ratelimit";
import { resolveUserId } from "@/lib/agent/transcript";
import { cartolinaMemoriaOn } from "@/lib/cartolina/store";
import { cartolinaCoworkOn } from "@/lib/cartolina/cowork-store";

export async function entrar(req: Request, bucket: string, limite: "ai-heavy" | "ai-light" = "ai-light", opts: { cowork?: boolean } = {}):
  Promise<{ userId: string } | { response: Response }> {
  // Flag desligada = a rota não existe (merge não muda nada até ligar). Rotas de
  // coworking exigem as DUAS flags (não há colaboração sem persistência).
  if (!cartolinaMemoriaOn() || (opts.cowork && !cartolinaCoworkOn())) return { response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  const rl = await guard(req, bucket, limite);
  if (!rl.ok) return { response: rl.response };
  const userId = await resolveUserId().catch(() => null);
  if (!userId) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  return { userId };
}

// Reexportado daqui por compatibilidade com as rotas; a definição é pura em scope.ts.
export { sanitizeScopeId } from "@/lib/cartolina/scope";

/** Falha do store → resposta HTTP. not_found cobre "não existe" E "sem acesso". */
export function falha(reason: "not_found" | "forbidden" | "invalid" | "conflict"): Response {
  const map = { not_found: [404, "Not found"], forbidden: [403, "Sem permissão"], invalid: [400, "Inválido"], conflict: [409, "Conflito"] } as const;
  const [status, error] = map[reason];
  return NextResponse.json({ error }, { status });
}
