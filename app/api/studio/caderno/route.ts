/**
 * /api/studio/caderno — o CADERNO de uma Jornada na Sala de Estudos (piloto MuseScore). Diferente das
 * outras rotas do Studio, NÃO gera com modelo: o conteúdo é o ESQUELETO CURADO (lib/jornadas), servido
 * pronto. É a parte "nós curamos" do modelo híbrido; a personalização da Zaeon entra por cima depois.
 *
 * POST { topic?|cadernoId? } → { id, status:"done", title, meta } na hora. O caderno do aluno é
 * reusado (curado é determinístico — não duplica artefato a cada abertura).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { guard } from "@/src/lib/ratelimit";
import { studioUid } from "@/lib/studio/auth";
import { cadernoPorId } from "@/lib/jornadas/cadernoRitmo";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const userId = await studioUid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await guard(req, "studio-caderno", "ai-light");
  if (!rl.ok) return rl.response;

  const body = (await req.json().catch(() => ({}))) as { cadernoId?: unknown; topic?: unknown };
  const pedido = typeof body.cadernoId === "string" ? body.cadernoId : typeof body.topic === "string" ? body.topic : "ritmo";
  const caderno = cadernoPorId(pedido);
  if (!caderno) return NextResponse.json({ error: "caderno_inexistente" }, { status: 404 });

  const chave = `caderno:${caderno.id}`;
  const existente = await prisma.studioArtifact.findFirst({
    where: { ownerId: userId, kind: "caderno", sourceIds: { has: chave }, status: "done" },
    orderBy: { createdAt: "desc" },
  });
  const art = existente ?? (await prisma.studioArtifact.create({
    data: { ownerId: userId, sourceIds: [chave], kind: "caderno", status: "done", title: caderno.titulo, mime: "application/json", meta: caderno as unknown as object },
  }));

  return NextResponse.json({ id: art.id, status: "done", title: caderno.titulo, meta: caderno });
}
