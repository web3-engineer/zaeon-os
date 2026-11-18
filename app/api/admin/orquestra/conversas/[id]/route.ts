import { json, negado } from "../../_comum";
import { conversaParaApp, idValido } from "@/lib/orquestra/conversa";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET — a conversa inteira, com o progresso ao vivo do turno que estiver rodando. */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const n = await negado(req);
  if (n) return n;
  if (!idValido(params.id)) return json({ erro: "conversa_nao_encontrada" }, 404);
  const { prisma } = await import("@/src/lib/prisma");
  const c = await prisma.consoleConversa.findUnique({ where: { id: params.id } }).catch(() => null);
  return c ? json({ conversa: conversaParaApp(c) }) : json({ erro: "conversa_nao_encontrada" }, 404);
}

/** DELETE — apaga a conversa (as tarefas e o ledger dos turnos ficam: são o histórico do console). */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const n = await negado(req);
  if (n) return n;
  if (!idValido(params.id)) return json({ erro: "conversa_nao_encontrada" }, 404);
  const { prisma } = await import("@/src/lib/prisma");
  const r = await prisma.consoleConversa.deleteMany({ where: { id: params.id } }).catch(() => ({ count: 0 }));
  return r.count ? json({ ok: true }) : json({ erro: "conversa_nao_encontrada" }, 404);
}
