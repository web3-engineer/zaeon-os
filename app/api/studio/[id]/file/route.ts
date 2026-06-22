/**
 * /api/studio/[id]/file — stream do arquivo binário do artefato (áudio/vídeo/imagem).
 * Lê de .studio/<id>.<storageRef>. Só o dono baixa.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { studioUid } from "@/lib/studio/auth";
import { readStudioFile } from "@/lib/studio/storage";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const userId = await studioUid();
  if (!userId) return new Response("Unauthorized", { status: 401 });
  const art = await prisma.studioArtifact.findUnique({ where: { id: params.id } });
  if (!art || art.ownerId !== userId) return new Response("Não encontrado", { status: 404 });
  if (!art.storageRef) return new Response("Sem arquivo (artefato é textual)", { status: 404 });

  try {
    const buf = await readStudioFile(art.id, art.storageRef);
    const download = new URL(req.url).searchParams.get("download") === "1";
    const filename = `${(art.title || art.kind || "artefato").replace(/[^\w.-]+/g, "_").slice(0, 80)}.${art.storageRef}`;
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": art.mime || "application/octet-stream",
        "Content-Length": String(buf.length),
        "Cache-Control": "private, max-age=3600",
        ...(download ? { "Content-Disposition": `attachment; filename="${filename}"` } : {}),
      },
    });
  } catch {
    return new Response("Arquivo indisponível", { status: 404 });
  }
}
