import { NextResponse } from "next/server";

/**
 * GET /api/versao — #756: só o commit que está no ar (o mesmo `GIT_SHA` do /api/health), sem as sondas do health.
 * O AvisoVersaoNova pergunta isso ao voltar para a aba e de tempos em tempos: se mudou, a aba aberta está rodando a
 * versão velha (foi o "gráfico sem funções" e o "Application error" dos testes do #749) e a pessoa é avisada.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ commit: process.env.GIT_SHA ?? null }, { headers: { "Cache-Control": "no-store" } });
}
