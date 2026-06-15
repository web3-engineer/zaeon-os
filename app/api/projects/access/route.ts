/**
 * GET /api/projects/access
 *
 * Capacidade do usuário atual para o Zaeon Code (sala Projetos). A Plugin Store
 * usa isto para decidir o que acontece ao "Ativar": super admin ou curso de
 * Computação → entra; senão mostra o aviso de elegibilidade.
 *
 * Sempre responde 200 (mesmo deslogado) para simplificar o consumo no cliente.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { checkEligibility } from "@/lib/projects/access";
import { isSuperAdmin } from "@/lib/auth/roles";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) {
    return NextResponse.json({ authenticated: false, canUse: false, superAdmin: false, reason: "unauthenticated", course: null });
  }
  let course: string | null = null;
  let role: string | null = null;
  try {
    const dbUser = await prisma.user.findUnique({ where: { email }, select: { course: true, role: true } });
    course = dbUser?.course ?? null;
    role = dbUser?.role ?? null;
  } catch { /* DB indisponível → trata como sem curso */ }
  const ctx = { email, role };
  const res = checkEligibility(course, ctx);
  return NextResponse.json({
    authenticated: true,
    superAdmin: isSuperAdmin(ctx),
    canUse: res.eligible,
    reason: res.reason, // exact | keyword | super-admin | no-course | out-of-scope | gate-disabled
    course,
  });
}
