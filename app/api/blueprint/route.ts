/**
 * GET /api/blueprint?limite=40 → { blueprints, temMais } — os BLUEPRINTS da pessoa (um por conversa que virou estudo), pro
 * seletor no topo da Sala de Estudos, os mais recentes primeiro. `temMais`: há mais depois deles ("ver mais" — #683).
 * lib/blueprint/server. Flag BLUEPRINT_PRATICO (off = 404).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { POR_PAGINA, listarPagina } from "@/lib/blueprint/server";
import { blueprintOn } from "@/lib/blueprint/tipos";
import { entrarNoBoard, falhaBoard } from "@/lib/estudos/rota";

export async function GET(req: Request) {
  if (!blueprintOn()) return falhaBoard("not_found");
  const a = await entrarNoBoard(req, "blueprint-lista"); if ("response" in a) return a.response;
  const limite = Number(new URL(req.url).searchParams.get("limite")) || POR_PAGINA;
  return NextResponse.json(await listarPagina(a.userId, limite));
}
