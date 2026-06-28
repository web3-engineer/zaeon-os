// Gate de professor reusado pelas rotas de Aulas. Mesma regra do
// app/workstation/teacher/layout.tsx (role teacher/professor ou admin),
// incluindo super admin (allowlist por e-mail / role super_admin).
import { isSuperAdmin } from "@/lib/auth/roles";

export function isTeacherSession(session: unknown): boolean {
  const u = (session as { user?: { role?: string; isAdmin?: boolean; email?: string } } | null)?.user;
  const role = (u?.role ?? "").toLowerCase();
  return (
    role === "teacher" ||
    role === "professor" ||
    !!u?.isAdmin ||
    isSuperAdmin({ email: u?.email, role: u?.role })
  );
}
