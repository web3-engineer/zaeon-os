/**
 * POST /api/octa/turnos/[id]/aprovar — `{ aprovado: boolean }`: a decisão do aluno sobre a tool que parou o turno.
 * Só isso vem do cliente: as msgs e a tool pendente estão guardadas no servidor (OctaTurno). Retoma o mesmo turno
 * (reenfileira) e devolve 202. 404 = turno de outro dono; 409 = o turno não está aguardando (aprovado 2×, já andou).
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { aprovarTurno, depsReais, ErroTurno } from "@/lib/queue/octa";

export const runtime = "nodejs";

type Ctx = { params: { id: string } };

export async function POST(req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = String((session!.user as any).id ?? email);
  const body = await req.json().catch(() => ({} as any));
  if (typeof body?.aprovado !== "boolean") return NextResponse.json({ error: "aprovado deve ser true ou false" }, { status: 400 });

  try {
    await aprovarTurno(await depsReais(), { userId, turnoId: params.id, aprovado: body.aprovado,...((session!.user as any).reaIdentity==="google_verified"?{reaIdentityVerified:true}:{}) });
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (e) {
    if (e instanceof ErroTurno && e.codigo === "turno_inexistente") return NextResponse.json({ error: "Turno não encontrado" }, { status: 404 });
    if (e instanceof ErroTurno && e.codigo === "nao_aguardando") return NextResponse.json({ error: "nao_aguardando" }, { status: 409 });
    throw e;
  }
}
