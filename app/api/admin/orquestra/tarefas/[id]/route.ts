import { json, negado } from "../../_comum";
import { detalheDe, type LinhaLedgerDb, type LinhaTarefa } from "@/lib/orquestra/console";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET — a trilha completa de uma tarefa + cada chamada de modelo dela no TokenLedger (taskId) */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const n = await negado(req);
  if (n) return n;
  if (!/^[a-f0-9]{24}$/i.test(params.id)) return json({ erro: "nao_encontrada" }, 404);
  try {
    const { prisma } = await import("@/src/lib/prisma");
    const [linha, ledger] = await Promise.all([
      prisma.orquestraTarefa.findUnique({ where: { id: params.id } }),
      prisma.tokenLedger.findMany({
        where: { taskId: params.id }, orderBy: { at: "asc" }, take: 1_000,
        select: { at: true, model: true, provedor: true, phase: true, promptTokens: true, completionTokens: true, ms: true, ok: true, erro: true, estimatedCostUsd: true },
      }),
    ]);
    if (!linha) return json({ erro: "nao_encontrada" }, 404);
    return json(detalheDe(linha as unknown as LinhaTarefa, ledger as unknown as LinhaLedgerDb[]));
  } catch (e) {
    console.error("[orquestra/console] tarefa:", (e as Error)?.message);
    return json({ erro: "erro_interno" }, 500);
  }
}
