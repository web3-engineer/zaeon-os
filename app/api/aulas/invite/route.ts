// Convite por turma: o professor nomeia (label) e gera um token. O aluno aceita
// em /join/[token] → vira membro da turma (aparece como card rotulado no chat).
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { isTeacherSession } from "@/lib/aulas/roles";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isTeacherSession(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const me = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const turmaId = typeof body.turmaId === "string" ? body.turmaId : "";
  if (!turmaId) return NextResponse.json({ error: "turmaId é obrigatório." }, { status: 400 });

  // A turma precisa ser DESTE professor.
  const turma = await prisma.turma.findUnique({ where: { id: turmaId }, select: { id: true, name: true, professorId: true } });
  if (!turma || turma.professorId !== me.id) return NextResponse.json({ error: "Turma não encontrada." }, { status: 404 });

  const label = typeof body.label === "string" && body.label.trim() ? body.label.trim().slice(0, 120) : turma.name;
  const token = crypto.randomBytes(16).toString("hex");
  const data = { turmaId, token, label };
  await prisma.turmaInvite.create({ data });

  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host") ?? "";
  const inviteUrl = host ? `${proto}://${host}/join/${token}` : `/join/${token}`;
  return NextResponse.json({ token, label, inviteUrl });
}
