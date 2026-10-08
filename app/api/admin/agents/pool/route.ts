/**
 * GET /api/admin/agents/pool?range=24h|7d|30d (founder-only, flag NEXT_PUBLIC_AGENTS_ADMIN) — Fatia 7, G8.
 * Telemetria do pool grátis: por alvo (chamadas, ok, 429, esgotado, cooldown, tokens, JSON válido, p95, custo),
 * chores por tipo, tokens/chamada vs 8K TPM e o "custo R$ 0 comprovado". Leitura → visível por default.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { assertAdmin } from "@/lib/admin/assertAdmin";
import { agentsAdmin } from "@/lib/canal/flags";
import { TETOS_DIA, poolConfigurado } from "@/lib/llm/pool";
import { alertaJson, chores, cooldown, custoZero, desdePool, porAlvo, rangePoolValido, taxa429, tokensPorChore, type LinhaChore, type LinhaLedgerPool, type RangePool } from "@/lib/metrics/pool";

export const TAKE_MAX = 50_000;
const ALVOS_POOL = ["gemini-free", "cloudflare", "groq", "glm"];

export async function GET(req: Request) {
  if (!agentsAdmin()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const a = await assertAdmin();
  if (!a.ok) return NextResponse.json({ error: a.status === 401 ? "Unauthorized" : "Forbidden" }, { status: a.status });
  const range = new URL(req.url).searchParams.get("range") ?? "24h";
  if (!rangePoolValido(range)) return NextResponse.json({ error: "range: 24h | 7d | 30d" }, { status: 400 });
  const desde = desdePool(range as RangePool);
  const db = prisma as any;

  const [ledger, rowsChore, primeira] = await Promise.all([
    db.tokenLedger.findMany({ where: { at: { gte: desde }, OR: [{ surface: "chore" }, { alvo: { in: ALVOS_POOL } }] }, orderBy: { at: "desc" }, take: TAKE_MAX }).catch(() => []) as Promise<LinhaLedgerPool[]>,
    db.agentChore?.findMany({ where: { createdAt: { gte: desde } }, select: { tipo: true, status: true, motivo: true, chamadasLlm: true, ms: true, origemConteudo: true, resultado: true }, take: TAKE_MAX }).catch(() => []) as Promise<LinhaChore[]>,
    db.tokenLedger.findFirst({ where: { OR: [{ surface: "chore" }, { alvo: { in: ALVOS_POOL } }] }, orderBy: { at: "asc" }, select: { at: true } }).catch(() => null),
  ]);
  const alvos = porAlvo(ledger);
  return NextResponse.json({
    range, alvos, taxa429: taxa429(ledger), cooldown: cooldown(ledger), chores: chores(rowsChore ?? []), tokensPorChore: tokensPorChore(ledger),
    custoZero: custoZero(alvos, rowsChore ?? []), alertaJson: alertaJson(alvos), tetos: TETOS_DIA, configurados: poolConfigurado(),
    medindoDesde: primeira?.at ? new Date(primeira.at).toISOString() : null,
  });
}
