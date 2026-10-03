/**
 * GET /api/map?scopeId=  → o cérebro da conversa do DONO + o estado da bolinha (§3):
 *   { mapa: MapaView|null, estudavel, tituloSugerido, gerando }
 * Atrás de MAP_HARNESS=1. Docs: docs/HANDOFF_CEREBRO_AURA.md.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { entrar, sanitizeScopeId } from "@/lib/map/route-auth";
import { findOwnMapa } from "@/lib/map/store";
import { estadoDaBolinha } from "@/lib/map/bolinha";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const a = await entrar(req, "map-get");
  if ("response" in a) return a.response;
  const scopeId = sanitizeScopeId(new URL(req.url).searchParams.get("scopeId"));
  if (!scopeId) return NextResponse.json({ error: "scopeId inválido" }, { status: 400 });
  const [mapa, conv] = await Promise.all([
    findOwnMapa(a.userId, "estudos", scopeId),
    prisma.conversation.findFirst({ where: { userId: a.userId, surface: "estudos", scopeId }, select: { estudavel: true, tituloSugerido: true, mapaId: true } }),
  ]);
  const estado = estadoDaBolinha({ estudavel: !!conv?.estudavel, mapaId: conv?.mapaId ?? mapa?.id ?? null, temMapa: !!mapa, backbone: mapa?.backbone.length ?? 0 });
  return NextResponse.json({ mapa, estudavel: !!conv?.estudavel, tituloSugerido: conv?.tituloSugerido ?? null, estado });
}
