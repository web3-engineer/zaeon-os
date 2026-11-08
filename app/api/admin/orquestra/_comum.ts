/**
 * app/api/admin/orquestra/_comum.ts — o que as rotas do console Zaeon Hermes dividem (docs/HERMES_ZAEON.md).
 * Autenticação: Bearer ORQUESTRA_CONSOLE_TOKEN (≥ 32 caracteres) ou sessão de super-admin.
 */
import { NextResponse } from "next/server";
import { autorizar, type LinhaTarefa } from "@/lib/orquestra/console";

export const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function negado(req: Request): Promise<NextResponse | null> {
  return (await autorizar(req)) ? null : json({ erro: "nao_autorizado" }, 401);
}

const SELECT_RESUMO = {
  id: true, criadaEm: true, atualizadaEm: true, status: true, origem: true, motor: true, nomeMotor: true,
  formato: true, intent: true, plano: true, objetivo: true, relatorio: true,
} as const;

export async function listarTarefas(f: { motor?: string | null; status?: string | null; limite?: number } = {}): Promise<LinhaTarefa[]> {
  const { prisma } = await import("@/src/lib/prisma");
  return (await prisma.orquestraTarefa.findMany({
    where: { ...(f.motor ? { motor: f.motor } : {}), ...(f.status ? { status: f.status } : {}) },
    orderBy: { criadaEm: "desc" },
    take: Math.min(Math.max(1, f.limite ?? 200), 500),
    select: SELECT_RESUMO,
  })) as unknown as LinhaTarefa[];
}
