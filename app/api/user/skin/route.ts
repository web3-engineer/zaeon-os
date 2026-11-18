/**
 * /api/user/skin — a skin do laboratório escolhida pela pessoa, na conta (UserSpaceData.settings.labSkin).
 *   GET → { skin, salva }   (salva=false: nunca escolheu → o navegador decide)
 *   PUT { skin } → { skin } (só ids de lib/skins/paletas; as outras chaves de `settings` ficam como estão)
 * Só a própria conta (sessão).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { SKIN_PADRAO, ehSkin } from "@/lib/skins/paletas";

async function meuId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) return null;
  const u = await prisma.user.findFirst({ where: { email }, select: { id: true } });
  return u?.id ?? null;
}
const semLogin = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const objeto = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? { ...(v as Record<string, unknown>) } : {});

export async function GET() {
  const userId = await meuId(); if (!userId) return semLogin();
  const d = await prisma.userSpaceData.findUnique({ where: { userId }, select: { settings: true } });
  const salvo = objeto(d?.settings).labSkin;
  return NextResponse.json(ehSkin(salvo) ? { skin: salvo, salva: true } : { skin: SKIN_PADRAO, salva: false });
}

export async function PUT(req: Request) {
  const userId = await meuId(); if (!userId) return semLogin();
  const body = (await req.json().catch(() => null)) as { skin?: unknown } | null;
  if (!ehSkin(body?.skin)) return NextResponse.json({ error: "skin inválida" }, { status: 400 });
  try {
    const atual = await prisma.userSpaceData.findUnique({ where: { userId }, select: { settings: true } });
    const settings = { ...objeto(atual?.settings), labSkin: body.skin };
    await prisma.userSpaceData.upsert({ where: { userId }, update: { settings }, create: { userId, settings } });
    return NextResponse.json({ skin: body.skin });
  } catch (err) {
    return NextResponse.json({ error: (err as Error)?.message || "Erro" }, { status: 500 });
  }
}
