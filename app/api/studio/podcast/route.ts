/**
 * /api/studio/podcast — gera o podcast (2 vozes) a partir do estudo.
 * Cria o artefato (queued) e dispara a geração em background; o cliente faz polling
 * em /api/studio/[id] e toca /api/studio/[id]/file quando status="done".
 * Cache por (sourceIds + kind=podcast): reusa o último pronto (a menos de force).
 */
import { skinDaVitrine } from "@/lib/estudos/skinVitrine";
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

  const topic = typeof body.topic === "string" ? body.topic.trim().slice(0, 300) : "";
  const ctx = await loadStudyContext({ ownerId: userId, sourceIds, spaceId });
  // Pedido nascido na CONVERSA chega com um estudo recém-criado e VAZIO — e a rota devolvia 400,
  // que o cliente engole calado: "faz um podcast sobre X" pelo chat nunca funcionou (auditoria
  // 2026-10, docs/APRENDER_INTERATIVO.md). Com o tópico na mão, gera a partir dele (mesma regra
  // do text-pipeline: fica marcado `doTopico` — sai do conhecimento do modelo, não das fontes).
  const doTopico = !ctx.text && !!topic;
  const material = ctx.text || (topic ? `Tópico pedido na conversa: ${topic}` : "");
  if (!material) return NextResponse.json({ error: "Sem conteúdo de estudo para o podcast — e sem tópico." }, { status: 400 });

  // cache: reaproveita o último podcast pronto deste estudo
  if (!force && !doTopico) {
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
      kind: "podcast", skin: skinDaVitrine({ kind: "podcast", titulo: ctx.text ? ctx.title : topic }),
      status: "queued",
      title: `Podcast — ${ctx.text ? ctx.title : topic}`,
      meta: { options, ...(doTopico ? { doTopico: true, topic } : {}) } as any,
    },
  });

  // background (servidor de longa duração); cliente faz polling em /api/studio/[id]
  void runPodcastGeneration(art.id, material, options);

  return NextResponse.json(art);
}
