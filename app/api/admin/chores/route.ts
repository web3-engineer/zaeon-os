/**
 * /api/admin/chores (founder-only, flags NEXT_PUBLIC_AGENTS_ADMIN + CHORES_QUEUE) — Fatia 7, C8.
 *   POST { tipo, alvo, canalId?, parentId?, agentKey?, rodada? } → cria QUALQUER tipo (é o que o gate usa).
 *        Sem canalId = modo silencioso (grava resultado, não posta). requesterId = o admin (pedida por humano).
 *   GET ?range=24h|7d|30d&tipo&status → lista (status/trecho/ms/LLM/alvo).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { assertAdmin } from "@/lib/admin/assertAdmin";
import { agentsAdmin } from "@/lib/canal/flags";
import { choresLigadas, criarDoPedido, choreParaWire } from "@/lib/chore/criar";
import { dispararChore } from "@/lib/queue/chores";
import { ehTipoChore, listar, type ChoreDb, type StatusChore } from "@/lib/chore/store";

const RANGES: Record<string, number> = { "24h": 86_400_000, "7d": 7 * 86_400_000, "30d": 30 * 86_400_000 };
const STATUS: readonly StatusChore[] = ["queued", "running", "delayed", "done", "skipped", "failed", "expired"];
const OID = /^[a-f0-9]{24}$/i;

async function gate(): Promise<NextResponse | { email: string }> {
  if (!agentsAdmin() || !choresLigadas()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const a = await assertAdmin();
  if (!a.ok) return NextResponse.json({ error: a.status === 401 ? "Unauthorized" : "Forbidden" }, { status: a.status });
  return { email: a.email };
}

export async function POST(req: Request) {
  const g = await gate(); if (g instanceof NextResponse) return g;
  const admin = await prisma.user.findUnique({ where: { email: g.email }, select: { id: true } }).catch(() => null);
  const body = await req.json().catch(() => ({}));
  const canalId = typeof body?.canalId === "string" && OID.test(body.canalId) ? body.canalId : null;
  const parentId = typeof body?.parentId === "string" && OID.test(body.parentId) ? body.parentId : null;
  const rodada = body?.rodada == null ? undefined : String(body.rodada).slice(0, 16);
  const r = await criarDoPedido(prisma as unknown as ChoreDb, { tipo: body?.tipo, alvo: body?.alvo, agentKey: body?.agentKey, canalId, parentId, requesterId: admin?.id ?? null, rodada });
  if ("erro" in r) return NextResponse.json({ error: r.erro }, { status: r.status });
  const via = r.row.status === "queued" ? await dispararChore(r.row) : "existente";
  return NextResponse.json({ ok: true, chore: choreParaWire(r.row), via }, { status: 201 });
}

export async function GET(req: Request) {
  const g = await gate(); if (g instanceof NextResponse) return g;
  const q = new URL(req.url).searchParams;
  const range = q.get("range") ?? "24h";
  if (!(range in RANGES)) return NextResponse.json({ error: "range inválido" }, { status: 400 });
  const tipo = q.get("tipo"), status = q.get("status");
  if (tipo && !ehTipoChore(tipo)) return NextResponse.json({ error: "tipo inválido" }, { status: 400 });
  if (status && !STATUS.includes(status as StatusChore)) return NextResponse.json({ error: "status inválido" }, { status: 400 });
  const rows = await listar(prisma as unknown as ChoreDb, { desde: new Date(Date.now() - RANGES[range]), tipo: (tipo ?? undefined) as any, status: (status ?? undefined) as any, take: 500 });
  return NextResponse.json({ range, chores: rows.map(choreParaWire) });
}
