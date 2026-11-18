/**
 * POST /api/ai/camera — a CÂMERA AO VIVO ("be my eyes"). Recebe UM frame (data URL) + uma pergunta
 * opcional, e devolve a descrição do que a câmera vê. O cliente chama em laço (~1 fps).
 *
 * Gating em camadas, e cada uma falha HONESTA (nunca 500 seco):
 *   · sessão      — recurso por-usuário; anônimo não entra (evita câmera aberta sem dono).
 *   · VISAO_CAMERA — a flag (lib/ai/camera). Desligada = o recurso não existe → 404.
 *   · credencial  — sem Vertex a visão não responde → erro claro `sem_credencial`, não 500.
 *
 * A chamada de visão é a mesma da PR-4 (descreverImagem, Vertex direto). Frame-polling, não streaming.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { cameraAoVivoLigada, descreverFrame } from "@/lib/ai/camera";
import { visaoDisponivel } from "@/lib/ai/descreverImagem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!cameraAoVivoLigada()) {
    return NextResponse.json({ ok: false, erro: "camera_desligada" }, { status: 404 });
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, erro: "sem_sessao" }, { status: 401 });
  }
  if (!visaoDisponivel()) {
    return NextResponse.json({ ok: false, erro: "sem_credencial" }, { status: 503 });
  }

  let body: { frame?: unknown; pergunta?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: "corpo_invalido" }, { status: 400 });
  }
  const frame = typeof body?.frame === "string" ? body.frame : "";
  const pergunta = typeof body?.pergunta === "string" ? body.pergunta : undefined;
  if (!frame) return NextResponse.json({ ok: false, erro: "frame_ausente" }, { status: 400 });

  const r = await descreverFrame(frame, pergunta);
  // erro de visão não é erro do servidor: devolve 200 com {ok:false} pra o laço do cliente seguir.
  return NextResponse.json(r.ok ? { ok: true, texto: r.texto } : { ok: false, erro: r.erro });
}
