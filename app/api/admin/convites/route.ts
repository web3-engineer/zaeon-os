import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { generateCode } from "@/lib/invite-codes";
import { isSuperAdminEmail } from "@/lib/auth/roles";

// A cópia local da allowlist saiu: era a terceira, e discordava das outras duas. Fonte única em
// lib/auth/roles.ts (allowlist + SUPER_ADMIN_EMAILS por ENV + User.role). Isto ALARGA esta rota dos
// 2 e-mails de antes para os fundadores de roles.ts — é o efeito pretendido da unificação, não um
// descuido: convite de admin é coisa de fundador, e antes o próprio dono não passava por aqui.
const isAdmin = (email: string | null | undefined) => isSuperAdminEmail(email);

// GET /api/admin/convites — list all codes with owner name
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const codes = await prisma.inviteCode.findMany({
    orderBy: { createdAt: "desc" },
    include: { owner: { select: { name: true } } },
  });

  return NextResponse.json(
    codes.map((c) => ({
      id: c.id,
      code: c.code,
      usedCount: c.usedCount,
      maxUses: c.maxUses,
      ownerName: c.owner?.name ?? "admin",
      createdAt: c.createdAt.toISOString(),
    }))
  );
}

// POST /api/admin/convites — generate N new admin codes
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  let quantidade: number;
  try {
    const body = await req.json();
    quantidade = Math.max(1, Math.min(Number(body?.quantidade) || 1, 10));
  } catch {
    quantidade = 1;
  }

  const created: string[] = [];
  for (let i = 0; i < quantidade; i++) {
    let code = generateCode();
    while (await prisma.inviteCode.findUnique({ where: { code } })) {
      code = generateCode();
    }
    await prisma.inviteCode.create({
      data: { code, ownerId: null, maxUses: 3 },
    });
    created.push(code);
  }

  return NextResponse.json({ ok: true, codes: created });
}
