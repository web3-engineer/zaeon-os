/**
 * GET /api/aulas/audio/<id>.<ext> — serve o áudio de uma resposta por voz.
 * O param vem como "<id>.<ext>" (ex.: aulavoice_ab12.webm). Requer login.
 */
import { NextResponse } from "next/server";
import { readStudioFile } from "@/lib/studio/storage";
import { currentUser } from "@/lib/aulas/auth";

export const runtime = "nodejs";

const MIME_BY_EXT: Record<string, string> = {
  webm: "audio/webm",
  ogg: "audio/ogg",
  wav: "audio/wav",
  mp4: "audio/mp4",
  mp3: "audio/mpeg",
};

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dot = params.id.lastIndexOf(".");
  const id = dot > 0 ? params.id.slice(0, dot) : params.id;
  const ext = dot > 0 ? params.id.slice(dot + 1).toLowerCase() : "webm";
  if (!id.startsWith("aulavoice_")) return NextResponse.json({ error: "Inválido" }, { status: 400 });

  try {
    const buf = await readStudioFile(id, ext);
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: { "Content-Type": MIME_BY_EXT[ext] || "application/octet-stream", "Cache-Control": "private, max-age=86400" },
    });
  } catch {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }
}
