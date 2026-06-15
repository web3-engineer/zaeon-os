import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { generateCode } from "@/lib/invite-codes";
import { buildUserUpdateData } from "@/lib/convite/migrate";
import { checkEdu } from "@/lib/eduEligibility";
import { grantStudentTrial } from "@/lib/plans";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const st = searchParams.get("st");

  if (!st) return redirect("/convite?erro=sem-sessao");

  // Verify cookie matches to guard against token theft
  const cookieToken = cookies().get("convite_session")?.value;
  if (!cookieToken || cookieToken !== st) {
    return redirect("/convite?erro=sessao-invalida");
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return redirect("/convite");

  const pending = await prisma.pendingRegistration.findUnique({
    where: { sessionToken: st },
  });

  if (!pending || pending.expiresAt < new Date()) {
    return redirect("/convite?erro=sessao-expirada");
  }

  // Look up the invite code to find ownerId (referredBy)
  const inviteCodeRecord = await prisma.inviteCode.findUnique({
    where: { code: pending.inviteCode },
  });

  // Generate a unique code for the new user (retry on collision, extremely rare)
  let newCode = generateCode();
  while (await prisma.inviteCode.findUnique({ where: { code: newCode } })) {
    newCode = generateCode();
  }

  const updateData = buildUserUpdateData({
    name: pending.name,
    age: pending.age,
    area: pending.area,
    role: pending.role,
    subject: pending.subject,
    institution: pending.institution,
    verificationDoc: pending.verificationDoc,
    referredBy: inviteCodeRecord?.ownerId ?? null,
    inviteCode: pending.inviteCode,
    myInviteCode: newCode,
  });

  // Fast-track do Plus: se o login Google é uma conta de estudante (.edu),
  // libera o Plano Plus na hora e marca como verificado. Caso contrário, o
  // cadastro fica "pending" na fila do admin (que analisa o comprovante).
  const edu = checkEdu(session.user.email);
  if (edu.eligible) {
    const grant = grantStudentTrial({ plan: "free", plusUntil: null, trialGranted: false });
    updateData.plan = grant.plan;
    updateData.plusUntil = grant.plusUntil;
    updateData.trialGranted = true;
    updateData.eduEmail = session.user.email;
    updateData.eduVerified = true;
    updateData.kycStatus = "verified";
  }

  // Update user record with onboarding data
  const updatedUser = await prisma.user.update({
    where: { email: session.user.email },
    data: updateData,
    select: { id: true },
  });

  // Create the InviteCode record for the new user (their 3-use code)
  await prisma.inviteCode.create({
    data: {
      code: newCode,
      ownerId: updatedUser.id,
      maxUses: 3,
    },
  });

  // Increment usedCount on the invite code that was used
  await prisma.inviteCode.update({
    where: { code: pending.inviteCode },
    data: { usedCount: { increment: 1 } },
  });

  // Cleanup: delete pending registration and clear cookie
  await prisma.pendingRegistration.delete({ where: { sessionToken: st } });
  cookies().delete("convite_session");

  redirect("/dashboard");
}
