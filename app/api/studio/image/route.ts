/**
 * /api/studio/image — gera uma imagem didática (Imagen) a partir de:
 *   - um `prompt` direto (chat: "gere uma imagem de…"), ou
 *   - um estudo (`spaceId`/`sourceIds`) → a Zaeon cria o prompt a partir do conteúdo.
 *
 * Persiste o StudioArtifact (kind=image, arquivo em .studio/<id>.png) e devolve
 * também `dataUrl` pra render instantâneo (balão do chat / preview no Studio).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { guard } from "@/src/lib/ratelimit";
import { geminiJson } from "@/lib/scholar/gemini";
import { studioUid } from "@/lib/studio/auth";
import { loadStudyContext } from "@/lib/studio/content";
import { generateImage, imagenAvailable } from "@/lib/studio/imagen";
import { writeStudioFile } from "@/lib/studio/storage";

export const runtime = "nodejs";
export const maxDuration = 120;

async function craftPromptFromStudy(content: string): Promise<string> {
  const system =
    "Você cria UM prompt de imagem didática (em inglês, descritivo e claro) que ILUSTRA o material de estudo " +
    "— ex.: diagrama anatômico, esquema, ilustração científica. Sem texto/legendas dentro da imagem. " +
    'Responda SOMENTE JSON: {"prompt":"..."}';
  try {
    const out = await geminiJson<{ prompt?: string }>(system, `Material:\n${content.slice(0, 8000)}\n\nGere o prompt.`);
    return (out?.prompt || "").trim();
  } catch {
    return "";
  }
}

export async function POST(req: Request) {
  const userId = await studioUid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await guard(req, "studio-image", "ai-heavy");
  if (!rl.ok) return rl.response;

  if (!imagenAvailable()) {
    return NextResponse.json({ error: "Geração de imagem indisponível (credencial Google ausente)." }, { status: 503 });
  }

  const body = await req.json().catch(() => ({} as any));
  const sourceIds: string[] | undefined = Array.isArray(body.sourceIds) ? body.sourceIds.map(String) : undefined;
  const spaceId: string | undefined = typeof body.spaceId === "string" ? body.spaceId : undefined;
  const aspectRatio: string | undefined = typeof body.aspectRatio === "string" ? body.aspectRatio : undefined;

  let prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  let usedSourceIds: string[] = [];
  let title = prompt ? prompt.slice(0, 60) : "Imagem";

  // Sem prompt direto → tenta criar a partir do estudo.
  if (!prompt && (spaceId || sourceIds?.length)) {
    const ctx = await loadStudyContext({ ownerId: userId, sourceIds, spaceId });
    if (ctx.text) {
      prompt = await craftPromptFromStudy(ctx.text);
      usedSourceIds = ctx.sourceIds;
      title = `Imagem — ${ctx.title}`;
    }
  }
  if (!prompt) return NextResponse.json({ error: "Forneça um prompt ou um estudo com conteúdo." }, { status: 400 });

  const art = await prisma.studioArtifact.create({
    data: { ownerId: userId, sourceIds: usedSourceIds, kind: "image", status: "running", title, meta: { prompt } as any },
  });

  try {
    const img = await generateImage(prompt, aspectRatio ? { aspectRatio } : undefined);
    if (!img) throw new Error("Imagen não retornou imagem (confirme IMAGEN_MODEL no projeto/região).");

    const ext = /jpe?g/i.test(img.mimeType) ? "jpg" : "png";
    await writeStudioFile(art.id, ext, Buffer.from(img.data, "base64"));
    const updated = await prisma.studioArtifact.update({
      where: { id: art.id },
      data: { status: "done", mime: img.mimeType, storageRef: ext, meta: { prompt } as any },
    });
    return NextResponse.json({ ...updated, dataUrl: `data:${img.mimeType};base64,${img.data}` });
  } catch (e: any) {
    await prisma.studioArtifact.update({
      where: { id: art.id },
      data: { status: "error", error: String(e?.message || e).slice(0, 500) },
    });
    return NextResponse.json({ error: String(e?.message || "Não consegui gerar a imagem."), id: art.id }, { status: 502 });
  }
}
