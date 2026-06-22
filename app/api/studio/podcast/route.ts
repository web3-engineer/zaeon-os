/**
 * /api/studio/podcast — gera o podcast (2 vozes) a partir do estudo.
 * Cria o artefato (queued) e dispara a geração em background; o cliente faz polling
 * em /api/studio/[id] e toca /api/studio/[id]/file quando status="done".
 * Cache por (sourceIds + kind=podcast): reusa o último pronto (a menos de force).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { guard } from "@/src/lib/ratelimit";
import { studioUid } from "@/lib/studio/auth";
import { loadStudyContext, sameIdSet } from "@/lib/studio/content";
import { runPodcastGeneration } from "@/lib/studio/podcast-pipeline";
import type { PodcastOptions } from "@/lib/studio/podcast";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const userId = await studioUid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await guard(req, "studio-podcast", "ai-heavy");
  if (!rl.ok) return rl.response;

  const body = await req.json().catch(() => ({} as any));
  const sourceIds: string[] | undefined = Array.isArray(body.sourceIds) ? body.sourceIds.map(String) : undefined;
  const spaceId: string | undefined = typeof body.spaceId === "string" ? body.spaceId : undefined;
  const force = body.force === true;
  const options: PodcastOptions = typeof body.options === "object" && body.options ? body.options : {};

  const ctx = await loadStudyContext({ ownerId: userId, sourceIds, spaceId });
  if (!ctx.text) return NextResponse.json({ error: "Sem conteúdo de estudo para o podcast." }, { status: 400 });

  // cache: reaproveita o último podcast pronto deste estudo
  if (!force) {
    const existing = await prisma.studioArtifact.findFirst({
      where: { ownerId: userId, kind: "podcast", status: "done" },
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
      kind: "podcast",
      status: "queued",
      title: `Podcast — ${ctx.title}`,
      meta: { options } as any,
    },
  });

  // background (servidor de longa duração); cliente faz polling em /api/studio/[id]
  void runPodcastGeneration(art.id, ctx.text, options);

  return NextResponse.json(art);
}
