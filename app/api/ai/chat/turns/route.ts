/**
 * GET /api/ai/chat/turns?surface=estudos|pesquisa&scopeId= → { turns }  (últimos 20 do DONO)
 * Pra reengatar/histórico (mobile). userId SÓ da sessão.
 */
import { NextResponse } from "next/server";
import { guard } from "@/src/lib/ratelimit";
import { resolveUserId } from "@/lib/agent/transcript";
import { isChatSurface, listTurnsForUser, sanitizeScopeId } from "@/lib/agent/chat-turn-store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const rl = await guard(req, "chat-turns", "ai-light");
  if (!rl.ok) return rl.response;
  const userId = await resolveUserId().catch(() => null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  const surface = sp.get("surface") ?? "estudos";
  if (!isChatSurface(surface)) return NextResponse.json({ error: "surface inválida" }, { status: 400 });
  const turns = await listTurnsForUser(userId, surface, sanitizeScopeId(sp.get("scopeId")));
  return NextResponse.json({ turns });
}
