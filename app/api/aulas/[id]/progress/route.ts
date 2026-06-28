/**
 * POST /api/aulas/[id]/progress — aluno atualiza progresso de leitura (modo foco).
 * { addMs?: number, status?: "in_progress"|"completed" }. Soma readingMs e sobe o
 * status (nunca rebaixa: new → in_progress → completed). Usado pra "tempo de leitura"
 * em Meus Alunos (Fase 5).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { currentUser } from "@/lib/aulas/auth";

export const runtime = "nodejs";

const RANK: Record<string, number> = { new: 0, in_progress: 1, completed: 2 };

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const aula = await prisma.aula.findUnique({ where: { id: params.id }, select: { id: true, turmaId: true, status: true } });
  if (!aula || aula.status !== "sent" || !aula.turmaId) return NextResponse.json({ error: "Indisponível" }, { status: 403 });
  const member = await prisma.turmaMember.findFirst({ where: { turmaId: aula.turmaId, studentId: me.id }, select: { id: true } });
  if (!member) return NextResponse.json({ error: "Indisponível" }, { status: 403 });

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const addMs = Number.isFinite(body.addMs) ? Math.max(0, Math.min(3_600_000, Math.floor(body.addMs as number))) : 0;
  const wantStatus = body.status === "completed" || body.status === "in_progress" ? body.status : "in_progress";

  const prev = await prisma.aulaProgress.findFirst({ where: { aulaId: aula.id, studentId: me.id } });
  const status = RANK[wantStatus] >= RANK[prev?.status ?? "new"] ? wantStatus : (prev?.status ?? "new");
  const readingMs = (prev?.readingMs ?? 0) + addMs;

  const progress = prev
    ? await prisma.aulaProgress.update({ where: { id: prev.id }, data: { status, readingMs } })
    : await prisma.aulaProgress.create({ data: { aulaId: aula.id, studentId: me.id, status, readingMs } });

  return NextResponse.json({ progress });
}
