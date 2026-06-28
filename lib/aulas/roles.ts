// Gate de professor reusado pelas rotas de Aulas. Mesma regra do
// app/workstation/teacher/layout.tsx (role teacher/professor ou admin).
export function isTeacherSession(session: unknown): boolean {
  const u = (session as { user?: { role?: string; isAdmin?: boolean } } | null)?.user;
  const role = (u?.role ?? "").toLowerCase();
  return role === "teacher" || role === "professor" || !!u?.isAdmin;
}
