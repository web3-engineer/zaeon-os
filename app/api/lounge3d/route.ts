/**
 * /api/lounge3d — salas de co-working 3D do Lounge (CollabDoc kind "lounge_canvas").
 *   GET  → { salas: [{id,title,isOwner,membros}] } (só as que SOU membro)
 *   POST { title? } → cria a minha sala (members=[eu], token de convite) → { sala }
 * Entrar por convite: POST /api/collab/join { token } (já existe; vale pra qualquer CollabDoc).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/src/lib/prisma";
import { guard } from "@/src/lib/ratelimit";
import { eu, exigirFlag, viewSala, type SalaRow } from "@/lib/lounge3d/server";
import { COWORK_SUBMERSO, KIND_SALA } from "@/lib/lounge3d/tipos";
import { sanitizarTexto } from "@/lib/lounge3d/sala";

export async function GET(req: Request) {
  const off = exigirFlag(); if (off) return off;
  const rl = await guard(req, "lounge3d-list"); if (!rl.ok) return rl.response;
  const me = await eu(); if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const submersa = new URL(req.url).searchParams.has("submersa");
  const docs = await prisma.collabDoc.findMany({ where: { kind: KIND_SALA, ...(submersa ? { sourceType: COWORK_SUBMERSO } : {}), members: { has: me.id } }, orderBy: { updatedAt: "desc" }, take: 20, select: { id: true, title: true, ownerId: true, members: true, updatedAt: true } });
  return NextResponse.json({ salas: docs.map((d) => ({ id: d.id, title: d.title, isOwner: d.ownerId === me.id, membros: d.members.length, updatedAt: d.updatedAt.toISOString() })) });
}

export async function POST(req: Request) {
  const off = exigirFlag(); if (off) return off;
  const rl = await guard(req, "lounge3d-create"); if (!rl.ok) return rl.response;
  const me = await eu(); if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const title = sanitizarTexto(b?.title, 120) || "Sala de estudos";
  const doc = await prisma.collabDoc.create({ data: { ownerId: me.id, title, kind: KIND_SALA, ...(b?.submersa === true ? { sourceType: COWORK_SUBMERSO } : {}), content: JSON.stringify({ notes: [], artifacts: [] }), members: [me.id], token: randomBytes(12).toString("base64url") } });
  return NextResponse.json({ sala: viewSala(doc as SalaRow, me.id) }, { status: 201 });
}
