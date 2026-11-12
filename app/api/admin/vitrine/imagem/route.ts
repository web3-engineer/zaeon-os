/**
 * /api/admin/vitrine/imagem — sobe a FOTO de um card da vitrine (a curadoria, lib/estudos/curadoria).
 *   POST multipart { file } → { url } (até 4 MB; png, jpg, webp, gif ou avif — SVG não, pode carregar script).
 * O arquivo vai pro disco persistente da Zaeon (o mesmo do Studio) com o nome tirado do PRÓPRIO conteúdo (sha-256): a
 * mesma foto subida duas vezes vira o mesmo arquivo. O tipo é conferido pelos primeiros bytes, não pelo que o
 * navegador diz. Quem sobe: super-admin ou o console.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import crypto from "crypto";
import { NextResponse } from "next/server";
import { autorizar } from "@/lib/orquestra/console";
import { writeStudioFile } from "@/lib/studio/storage";
import { MAX_BYTES_IMAGEM, extDaAssinatura, urlDaImagem } from "@/lib/estudos/curadoria";

const json = (b: unknown, status = 200) => NextResponse.json(b, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
    if (!(await autorizar(req))) return json({ erro: "nao_autorizado" }, 401);
    let form: FormData;
    try { form = await req.formData(); } catch { return json({ erro: "Esperado multipart/form-data." }, 400); }
    const file = form.get("file");
    if (!(file instanceof Blob) || !file.size) return json({ erro: "Escolha uma imagem." }, 400);
    if (file.size > MAX_BYTES_IMAGEM) return json({ erro: "Imagem grande demais (máx. 4 MB)." }, 413);
    const buf = Buffer.from(await file.arrayBuffer());
    const ext = extDaAssinatura(buf);
    if (!ext) return json({ erro: "Formato não suportado (use PNG, JPG, WEBP, GIF ou AVIF)." }, 415);
    const id = `vimg_${crypto.createHash("sha256").update(buf).digest("hex").slice(0, 32)}`;
    await writeStudioFile(id, ext, buf);
    return json({ url: urlDaImagem(`${id}.${ext}`) }, 201);
}
