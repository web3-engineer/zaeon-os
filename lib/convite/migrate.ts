interface MigrateInput {
  name: string;
  age: number;
  area: string;
  role: string;
  subject: string | null;
  institution: string;
  verificationDoc: string | null;
  referredBy: string | null;
  inviteCode: string;
  myInviteCode: string;
}

/**
 * Builds the Prisma user update payload from a PendingRegistration.
 * Pure function — no DB calls, fully testable.
 */
export function buildUserUpdateData(input: MigrateInput): Record<string, unknown> {
  const data: Record<string, unknown> = {
    name: input.name,
    age: input.age,
    course: input.area,          // area of study/work for all roles
    role: input.role,
    institution: input.institution,
    inviteCodeUsed: input.inviteCode,
    myInviteCode: input.myInviteCode,
    referredBy: input.referredBy ?? null,
    // Toda submissão de convite entra na fila do admin como "pending" (Node Queue).
    kycStatus: "pending",
  };

  if (input.role === "teacher" && input.subject) {
    data.subject = input.subject;
  }

  if (input.verificationDoc) {
    data.verificationDoc = input.verificationDoc;
  }

  return data;
}
