/**
 * POST /api/aulas/audio — sobe o áudio de uma resposta por voz do aluno.
 * multipart/form-data com campo "file". Reaproveita o storage do Studio em disco.
 * Retorna { url } servida por GET /api/aulas/audio/<id>.<ext>.
 */
import { NextResponse } from "next/server";
import crypto from "crypto";
import { writeStudioFile } from "@/lib/studio/storage";
import { currentUser } from "@/lib/aulas/auth";

export const runtime = "nodejs";
export const maxDuration = 30;

const EXT_BY_MIME: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/mp4": "mp4",
  "audio/mpeg": "mp3",
};

export async function POST(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "Esperado multipart/form-data." }, { status: 400 }); }
  const file = form.get("file");
  if (!(file instanceof Blob)) return NextResponse.json({ error: "Arquivo ausente." }, { status: 400 });
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "Áudio grande demais (máx 8MB)." }, { status: 413 });

  const ext = EXT_BY_MIME[file.type] || "webm";
  const id = `aulavoice_${crypto.randomBytes(10).toString("hex")}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await writeStudioFile(id, ext, buf);

  return NextResponse.json({ url: `/api/aulas/audio/${id}.${ext}` });
}
