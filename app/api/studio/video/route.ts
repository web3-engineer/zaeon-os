/**
 * /api/studio/video — Vídeo Overview (Nível A: slides Imagen + narração Gemini-TTS).
 * Cria o artefato (queued) e gera em background (ffmpeg); o cliente faz polling em
 * /api/studio/[id] e toca /api/studio/[id]/file quando done. Cache por sourceIds.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { guard } from "@/src/lib/ratelimit";
import { studioUid } from "@/lib/studio/auth";
import { loadStudyContext, sameIdSet } from "@/lib/studio/content";
import { runVideoGeneration } from "@/lib/studio/video-pipeline";
import type { VideoOptions } from "@/lib/studio/video";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const userId = await studioUid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await guard(req, "studio-video", "ai-heavy");
  if (!rl.ok) return rl.response;

  const body = await req.json().catch(() => ({} as any));
  const sourceIds: string[] | undefined = Array.isArray(body.sourceIds) ? body.sourceIds.map(String) : undefined;
  const spaceId: string | undefined = typeof body.spaceId === "string" ? body.spaceId : undefined;
  const force = body.force === true;
  const options: VideoOptions = typeof body.options === "object" && body.options ? body.options : {};

  const ctx = await loadStudyContext({ ownerId: userId, sourceIds, spaceId });
  if (!ctx.text) return NextResponse.json({ error: "Sem conteúdo de estudo para o vídeo." }, { status: 400 });

  if (!force) {
    const existing = await prisma.studioArtifact.findFirst({
      where: { ownerId: userId, kind: "video", status: "done" },
      orderBy: { createdAt: "desc" },
    });
    if (existing && sameIdSet(existing.sourceIds, ctx.sourceIds)) {
      return NextResponse.json({ ...existing, cached: true });
    }
  }

  const art = await prisma.studioArtifact.create({
    data: {
      ownerId: userId,
      sourceIds: ctx.sourceIds,
      kind: "video",
      status: "queued",
      title: `Vídeo — ${ctx.title}`,
      meta: { options } as any,
    },
  });

  void runVideoGeneration(art.id, ctx.text, options);

  return NextResponse.json(art);
}
