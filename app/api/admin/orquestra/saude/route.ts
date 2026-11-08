import { json, negado } from "../_comum";
import { saudeDoChat, type LinhaSaude } from "@/lib/orquestra/saude";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET ?horas=24 — a saúde do chat (Aura e orquestra) pelo TokenLedger: fases, falhas, reserva, modelos */
export async function GET(req: Request) {
  const n = await negado(req);
  if (n) return n;
  const horas = Math.min(Math.max(1, Number(new URL(req.url).searchParams.get("horas")) || 24), 24 * 14);
  try {
    const { prisma } = await import("@/src/lib/prisma");
    const linhas = (await prisma.tokenLedger.findMany({
      where: { at: { gte: new Date(Date.now() - horas * 3_600_000) }, surface: { in: ["estudos", "pesquisa"] } },
      orderBy: { at: "desc" }, take: 30_000,
      select: { at: true, phase: true, provedor: true, alvo: true, ok: true, erro: true, ms: true, model: true, taskId: true, surface: true },
    })) as unknown as LinhaSaude[];
    return json(saudeDoChat(linhas, horas));
  } catch (e) {
    console.error("[orquestra/console] saude:", (e as Error)?.message);
    return json({ erro: "erro_interno" }, 500);
  }
}
