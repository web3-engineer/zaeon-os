/**
 * GET /api/cartolina/:id/imagem/:artId → o arquivo da imagem de fallback de uma prancha.
 *
 * Por que existe: /api/studio/:id/file só serve ao DONO do artefato — num board
 * compartilhado, o colaborador veria imagem quebrada. Aqui o acesso vem do BOARD, e só
 * para um artefato que um card do board realmente referencia (não vira proxy pra
 * qualquer StudioArtifact de quem compartilhou).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { entrar } from "@/lib/cartolina/route-auth";
import { getBoardForUser } from "@/lib/cartolina/store";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: { id: string; artId: string } }) {
  const a = await entrar(req, "cartolina-imagem");
  if ("response" in a) return a.response;
  const nao = () => NextResponse.json({ error: "Not found" }, { status: 404 });
  const board = await getBoardForUser(params.id, a.userId);
  if (!board || !board.cards.some((c) => c.imagemId === params.artId)) return nao();
  const art = await prisma.studioArtifact.findUnique({ where: { id: params.artId }, select: { kind: true, status: true, mime: true, storageRef: true } });
  if (!art || art.kind !== "image" || art.status !== "done" || !art.storageRef) return nao();
  const { readStudioFile } = await import("@/lib/studio/storage");
  const buf = await readStudioFile(params.artId, art.storageRef).catch(() => null);
  if (!buf) return nao();
  return new Response(new Uint8Array(buf), {
    headers: { "Content-Type": art.mime || "image/png", "Cache-Control": "private, max-age=86400" },
  });
}
