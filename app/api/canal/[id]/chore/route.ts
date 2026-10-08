/**
 * POST /api/canal/[id]/chore { tipo, alvo, parentId?, agentKey? } — membro do canal pede uma chore
 * (Fatia 7, C8). Tipos do canal: resumir_link · extrair_campos · formatar_abnt · traduzir_trecho · link_rot.
 * destino = este canal + thread (parentId), FIXADO aqui; requesterId = a sessão. CHORES_QUEUE off → 404.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma, sessaoUsuario, exigirFlag, isObjectId } from "@/lib/canal/server";
import { podeEscrever } from "@/lib/canal/gate";
import { choresLigadas, criarDoPedido, choreParaWire, TIPOS_DO_CANAL } from "@/lib/chore/criar";
import { dispararChore } from "@/lib/queue/chores";
import type { ChoreDb } from "@/lib/chore/store";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const off = exigirFlag(); if (off) return off;
  if (!choresLigadas()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const u = await sessaoUsuario();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isObjectId(params.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const canal = await prisma.canal.findUnique({ where: { id: params.id } });
  if (!canal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!podeEscrever(canal, u.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const parentId = isObjectId(body?.parentId) ? body.parentId : null;
  const r = await criarDoPedido(prisma as unknown as ChoreDb, { tipo: body?.tipo, alvo: body?.alvo, agentKey: body?.agentKey, canalId: canal.id, parentId, requesterId: u.id, tiposPermitidos: TIPOS_DO_CANAL });
  if ("erro" in r) return NextResponse.json({ error: r.erro }, { status: r.status });
  const via = r.row.status === "queued" ? await dispararChore(r.row) : "existente";
  return NextResponse.json({ ok: true, chore: choreParaWire(r.row), via }, { status: 201 });
}
