import { json, negado } from "../_comum";
import { montarElenco, type LinhaLedgerAgente, type MentorDb } from "@/lib/orquestra/elenco";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET ?dias=7 — os AGENTES DA CASA (personas, mentores, criados no admin) com capacidades, prompt, bases e o
 * uso real do TokenLedger na janela (docs/HERMES_ZAEON.md). Os motores da orquestra continuam no /painel.
 * Banco fora → o elenco do seed, sem uso (o console mostra "—", não inventa número).
 */
export async function GET(req: Request) {
  const n = await negado(req);
  if (n) return n;
  const dias = Math.min(Math.max(1, Number(new URL(req.url).searchParams.get("dias")) || 7), 90);
  let mentores: MentorDb[] = [], perfis: any[] = [], ledger: LinhaLedgerAgente[] = [], bancoOk = true;
  try {
    const { prisma } = await import("@/src/lib/prisma");
    [mentores, perfis, ledger] = await Promise.all([
      prisma.mentorTemplate.findMany({
        select: { slug: true, name: true, course: true, emoji: true, personaText: true, order: true, enabledSkills: true, signatureArtifacts: true, sources: true, guardrail: true, academicLevel: true },
      }) as Promise<MentorDb[]>,
      prisma.agentProfile.findMany(),
      prisma.tokenLedger.findMany({
        where: { at: { gte: new Date(Date.now() - dias * 86_400_000) } },
        orderBy: { at: "desc" }, take: 60_000,
        select: { at: true, agentKey: true, model: true, surface: true, phase: true, ok: true, erro: true, ms: true, totalTokens: true, estimatedCostUsd: true, taskId: true },
      }) as unknown as Promise<LinhaLedgerAgente[]>,
    ]);
  } catch (e) {
    bancoOk = false;
    console.error("[orquestra/console] agentes:", (e as Error)?.message);
  }
  return json({ geradoEm: new Date().toISOString(), janelaDias: dias, bancoOk, agentes: montarElenco({ mentores, perfis, ledger, janelaDias: dias }) });
}
