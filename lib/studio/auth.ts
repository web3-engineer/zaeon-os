/**
 * Helpers de autenticação/propriedade das rotas do Studio (padrão do projeto:
 * sessão por e-mail → id do usuário; dono do artefato pode ler/mutar).
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

export async function studioUid(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const u = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  return u?.id ?? null;
}
