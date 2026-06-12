import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { generateCode } from "@/lib/invite-codes";

export const dynamic = "force-dynamic";

// GET — devolve (e gera, se faltar) o código de convite pessoal do usuário logado,
// para ele convidar novas pessoas pelo menu. Cada código tem 3 usos.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, myInviteCode: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let code = user.myInviteCode;

  // Usuários antigos podem não ter código ainda → gera um (3 usos) na primeira vez.
  if (!code) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateCode();
      try {
        await prisma.inviteCode.create({ data: { code: candidate, ownerId: user.id, maxUses: 3 } });
        await prisma.user.update({ where: { id: user.id }, data: { myInviteCode: candidate } });
        code = candidate;
        break;
      } catch {
        // colisão no índice unique → tenta outro código
      }
    }
    if (!code) return NextResponse.json({ error: "Falha ao gerar o código." }, { status: 500 });
  }

  const record = await prisma.inviteCode.findUnique({
    where: { code },
    select: { usedCount: true, maxUses: true },
  });
  const usedCount = record?.usedCount ?? 0;
  const maxUses = record?.maxUses ?? 3;

  return NextResponse.json({
    code,
    usedCount,
    maxUses,
    remaining: Math.max(0, maxUses - usedCount),
    link: `/convite?code=${code}`,
  });
}
