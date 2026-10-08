/**
 * GET /api/canal/[id]/chores?desde=ISO — as chores da sala (status + trecho, sem o texto completo).
 * Quem pode LER o canal (mesma regra de escrever: membro/aberto). CHORES_QUEUE off → 404.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma, sessaoUsuario, exigirFlag, isObjectId } from "@/lib/canal/server";
import { podeEscrever } from "@/lib/canal/gate";
import { choresLigadas, choreParaWire } from "@/lib/chore/criar";
import { listar, type ChoreDb } from "@/lib/chore/store";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const off = exigirFlag(); if (off) return off;
  if (!choresLigadas()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const u = await sessaoUsuario();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isObjectId(params.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const canal = await prisma.canal.findUnique({ where: { id: params.id } });
  if (!canal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!podeEscrever(canal, u.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const d = new URL(req.url).searchParams.get("desde");
  const desde = d && !Number.isNaN(Date.parse(d)) ? new Date(d) : new Date(Date.now() - 7 * 86_400_000);
  const rows = await listar(prisma as unknown as ChoreDb, { canalId: canal.id, desde, take: 100 });
  return NextResponse.json({ chores: rows.map(choreParaWire) });
}
