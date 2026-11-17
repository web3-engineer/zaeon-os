/**
 * POST /api/octa/rea/upload — envia um BINÁRIO (ou APK/firmware/HAR…) pro motor do REA na Contabo e devolve um
 * handle. O binário NÃO fica na Zaeon: vai direto pro motor (Tailscale), transitório. O agente analisa com a
 * tool octa_rea passando o handle. Portões: login + OCTA_REA=1 + REA_BRIDGE_URL/TOKEN. Multipart (campo "file").
 */
export const dynamic = "force-dynamic";
export const maxDuration = 120;
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { reaBridgeConfigurado, uploadRea } from "@/lib/octa/rea";
import { reaTierDoUsuario } from "@/lib/rea/tier";

const MAX = 256 * 1024 * 1024; // 256 MB

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!reaBridgeConfigurado()) return NextResponse.json({ error: "REA desligado (OCTA_REA + motor)" }, { status: 503 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "envie um arquivo no campo 'file'" }, { status: 400 });
  if (file.size < 1 || file.size > MAX) return NextResponse.json({ error: "arquivo vazio ou maior que 256 MB" }, { status: 413 });
  const buf = Buffer.from(await file.arrayBuffer());
  // o handle vive no motor do tier da conta — o upload e a análise (octa_rea / octa_rea_sessao) usam o MESMO
  const tier = await reaTierDoUsuario(String((session.user as { id?: string }).id ?? session.user.email));
  const r = await uploadRea({ nome: file.name || "artifact", conteudo: buf }, process.env, fetch, tier);
  if (!r.ok) return NextResponse.json({ error: r.erro ?? "upload falhou" }, { status: 502 });
  return NextResponse.json({ handle: r.handle, name: r.name, bytes: r.bytes });
}
