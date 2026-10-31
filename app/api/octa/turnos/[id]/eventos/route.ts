/**
 * GET /api/octa/turnos/[id]/eventos?depois=<seq> — os eventos do turno com seq > depois (em ordem), o status,
 * a tool pendente (só nome e caminho) e a resposta final. Turno de outro dono = 404 (igual a inexistente).
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { listarEventos, type TurnosDb } from "@/lib/queue/octa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function GET(req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = String((session!.user as any).id ?? email);
  const n = Number(new URL(req.url).searchParams.get("depois"));
  const depois = Number.isInteger(n) && n > 0 ? n : 0;
  const r = await listarEventos(prisma as unknown as TurnosDb, { userId, turnoId: params.id, depois,...((session!.user as any).reaIdentity==="google_verified"?{reaIdentityVerified:true}:{}) });
  return r ? NextResponse.json(r) : NextResponse.json({ error: "Turno não encontrado" }, { status: 404 });
}
