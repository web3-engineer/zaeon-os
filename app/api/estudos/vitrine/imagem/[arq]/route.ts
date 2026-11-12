/**
 * GET /api/estudos/vitrine/imagem/<vimg_xxx.ext> — serve a FOTO de um card da vitrine (lib/estudos/curadoria). Público:
 * a vitrine é pública. O nome do arquivo é o hash do conteúdo, então a resposta pode ficar em cache pra sempre.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { readStudioFile } from "@/lib/studio/storage";
import { ARQ_IMAGEM_RE, MIME_IMAGEM } from "@/lib/estudos/curadoria";

export async function GET(_req: Request, { params }: { params: { arq: string } }) {
    const arq = String(params.arq ?? "");
    if (!ARQ_IMAGEM_RE.test(arq)) return NextResponse.json({ erro: "Inválido" }, { status: 400 });
    const dot = arq.lastIndexOf("."), ext = arq.slice(dot + 1);
    let buf: Buffer;
    try { buf = await readStudioFile(arq.slice(0, dot), ext); } catch { return NextResponse.json({ erro: "Não encontrada" }, { status: 404 }); }
    return new NextResponse(new Uint8Array(buf), {
        status: 200,
        headers: {
            "Content-Type": MIME_IMAGEM[ext] ?? "application/octet-stream",
            "Content-Length": String(buf.length),
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
        },
    });
}
