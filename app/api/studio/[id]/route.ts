/**
 * /api/studio/[id]
 *   GET    → status + meta do artefato (polling de áudio/vídeo; leitura de texto/JSON)
 *   DELETE → remove o artefato (e o arquivo em .studio, se houver)
 *
 * Acesso só do dono (ownerId). Conteúdo textual/JSON vem em `meta`; binário é
 * servido por /api/studio/[id]/file.
 */
import { skinDaVitrine } from "@/lib/estudos/skinVitrine";
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
  return NextResponse.json({ ...art, skin: skinDaVitrine({ kind: art.kind, titulo: art.title, skin: art.skin }) });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const userId = await studioUid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const art = await prisma.studioArtifact.findUnique({ where: { id: params.id } });
  if (!art || art.ownerId !== userId) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  // o VÍDEO DO DOCUMENTO (lib/videodoc) é compartilhado (documento público serve a todo mundo) e conta no teto do dia:
  // apagar quebraria o card dos outros e zeraria o teto — não sai por aqui
  if (art.kind === "video-doc") return NextResponse.json({ error: "O vídeo do documento não se apaga por aqui." }, { status: 409 });
  if (art.storageRef) await deleteStudioFile(art.id, art.storageRef);
  // aula: um áudio por beat (.studio/<id>-<beat>.<ext>)
  if (art.kind === "aula") {
    for (const [beat, t] of Object.entries<any>((art.meta as any)?.tempos ?? {})) {
      if (t?.audio) await deleteStudioFile(`${art.id}-${beat}`, t.audio);
    }
  }
  await prisma.studioArtifact.delete({ where: { id: art.id } });
  return NextResponse.json({ ok: true });
}
