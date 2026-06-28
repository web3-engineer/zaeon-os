import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth"; // Ajuste o caminho se necessário
import { redirect } from "next/navigation";
import { isSuperAdminEmail } from "@/lib/auth/roles";

export default async function TeacherWorkstationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // Verifica se está logado e se é professor (ou admin da Lista VIP)
  // @ts-ignore - Baseado na tipagem dinâmica do seu auth.ts
  const isTeacher = session?.user?.role === "teacher" || session?.user?.isAdmin || isSuperAdminEmail(session?.user?.email);

  if (!isTeacher) {
    redirect("/workstation"); // Redireciona alunos ou não-logados para fora
  }

  return <>{children}</>;
}