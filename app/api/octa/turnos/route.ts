/**
 * POST /api/octa/turnos — começa um turno do agente Octa (fluxo landing) num projeto do aluno: `{ projetoId, pedido }`.
 * Devolve 202 `{ turnoId }` na hora; o turno roda em job (lib/queue/octa) e a tela acompanha por
 * GET /api/octa/turnos/[id]/eventos. Dono e email vêm da SESSÃO; a permissão vem do projeto — nada disso do corpo.
 * 404 = projeto de outro dono ou inexistente; 409 = já há um turno ativo no projeto (volta o turnoId dele).
 * /api/octa/agente (o fluxo antigo, síncrono) continua igual.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { guard } from "@/src/lib/ratelimit";
import { octaGatewayConfigurado } from "@/lib/octa/litellm";
import { depsReais, iniciarTurno, ErroTurno } from "@/lib/queue/octa";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = String((session!.user as any).id ?? email);

  const body = await req.json().catch(() => ({} as any));
  const pedido = typeof body?.pedido === "string" ? body.pedido.trim().slice(0, 8000) : "";
  const projetoId = typeof body?.projetoId === "string" ? body.projetoId : "";
  if (!pedido || !projetoId) return NextResponse.json({ error: "projetoId e pedido são obrigatórios" }, { status: 400 });
  if (!octaGatewayConfigurado()) return NextResponse.json({ error: "gateway_off", detalhe: "O gateway de modelo (LiteLLM) não está ligado neste servidor." }, { status: 503 });
  const rl = await guard(req, "octa-turno", "ai-heavy");
  if (!rl.ok) return rl.response;

  try {
    const { turnoId } = await iniciarTurno(await depsReais(), { userId, email, projetoId, pedido,...((session!.user as any).reaIdentity==="google_verified"&&process.env.REA_SUCCESS_MEMORY==="1"?{reaIdentityVerified:true}:{}) });
    return NextResponse.json({ turnoId }, { status: 202 });
  } catch (e) {
    if (e instanceof ErroTurno && e.codigo === "projeto_inexistente") return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
    if (e instanceof ErroTurno && e.codigo === "turno_ativo") return NextResponse.json({ error: "turno_ativo", turnoId: e.turnoId }, { status: 409 });
    throw e;
  }
}
