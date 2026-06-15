/**
 * GET /api/ai/capabilities — o que a conta do usuário pode usar na IA.
 * Hoje: { deepThink } — se o "pensamento profundo" (Gemini Pro) está liberado.
 * Usado pela UI pra esconder/mostrar o toggle "Profundo" (modo econômico).
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { canDeepThink } from "@/lib/ai/deepThinkAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ deepThink: false });
  return NextResponse.json({ deepThink: await canDeepThink(session.user.email) });
}
