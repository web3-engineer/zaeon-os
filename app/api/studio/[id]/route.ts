/**
 * /api/studio/[id]
 *   GET    → status + meta do artefato (polling de áudio/vídeo; leitura de texto/JSON)
 *   DELETE → remove o artefato (e o arquivo em .studio, se houver)
 *
 * Acesso só do dono (ownerId). Conteúdo textual/JSON vem em `meta`; binário é
 * servido por /api/studio/[id]/file.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { studioUid } from "@/lib/studio/auth";
import { deleteStudioFile } from "@/lib/studio/storage";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const userId = await studioUid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const art = await prisma.studioArtifact.findUnique({ where: { id: params.id } });
  if (!art || art.ownerId !== userId) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json(art);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const userId = await studioUid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const art = await prisma.studioArtifact.findUnique({ where: { id: params.id } });
  if (!art || art.ownerId !== userId) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  if (art.storageRef) await deleteStudioFile(art.id, art.storageRef);
  await prisma.studioArtifact.delete({ where: { id: art.id } });
  return NextResponse.json({ ok: true });
}
