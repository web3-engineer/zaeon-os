/**
 * Pipeline compartilhado dos geradores de TEXTO do Studio (guia, FAQ, flashcards,
 * mapa mental, linha do tempo). Cada rota chama runTextGeneration(kind, req).
 *
 * Fluxo: auth → rate limit → carrega o estudo → (cache por sourceIds+kind) →
 * cria o StudioArtifact (running) → Gemini JSON → normaliza (1 retry se inválido)
 * → salva meta + status done. Nunca renderiza lixo: inválido vira status "error".
 */
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { guard } from "@/src/lib/ratelimit";
import { geminiJson } from "@/lib/scholar/gemini";
import { studioUid } from "@/lib/studio/auth";
import { loadStudyContext, sameIdSet } from "@/lib/studio/content";
import { TEXT_TRANSFORMS, type TextKind } from "@/lib/studio/transformations";

export async function runTextGeneration(kind: TextKind, req: Request): Promise<Response> {
  const userId = await studioUid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await guard(req, `studio-${kind}`, "ai-heavy");
  if (!rl.ok) return rl.response;

  const body = await req.json().catch(() => ({} as any));
  const sourceIds: string[] | undefined = Array.isArray(body.sourceIds) ? body.sourceIds.map(String) : undefined;
  const spaceId: string | undefined = typeof body.spaceId === "string" ? body.spaceId : undefined;
  const force = body.force === true;

  const ctx = await loadStudyContext({ ownerId: userId, sourceIds, spaceId });
  if (!ctx.text) return NextResponse.json({ error: "Sem conteúdo de estudo para usar." }, { status: 400 });

  // Cache por (kind + sourceIds): o Studio reusa o último artefato pronto.
  if (!force) {
    const existing = await prisma.studioArtifact.findFirst({
      where: { ownerId: userId, kind, status: "done" },
      orderBy: { createdAt: "desc" },
    });
    if (existing && sameIdSet(existing.sourceIds, ctx.sourceIds)) {
      return NextResponse.json({ ...existing, cached: true });
    }
  }

  const spec = TEXT_TRANSFORMS[kind];
  const { system, user } = spec.build(ctx.text);

  const art = await prisma.studioArtifact.create({
    data: { ownerId: userId, sourceIds: ctx.sourceIds, kind, status: "running", title: spec.title(ctx.title) },
  });

  try {
    let parsed: unknown;
    try {
      parsed = spec.normalize(await geminiJson<any>(system, user));
    } catch {
      // 1 retry com instrução reforçada de formato (§8).
      parsed = spec.normalize(
        await geminiJson<any>(system, `${user}\n\nIMPORTANTE: responda APENAS com JSON válido no formato exato pedido.`),
      );
    }
    const updated = await prisma.studioArtifact.update({
      where: { id: art.id },
      data: { status: "done", mime: "application/json", meta: parsed as any },
    });
    return NextResponse.json(updated);
  } catch (e: any) {
    await prisma.studioArtifact.update({
      where: { id: art.id },
      data: { status: "error", error: String(e?.message || e).slice(0, 500) },
    });
    return NextResponse.json({ error: "Falha ao gerar o artefato.", id: art.id }, { status: 502 });
  }
}
