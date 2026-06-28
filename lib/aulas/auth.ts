/**
 * Helper de sessão p/ as rotas de Aulas: resolve o id (ObjectId) do usuário atual
 * a partir do e-mail da sessão NextAuth — mesmo padrão das rotas da Fase 1, num só lugar.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

export async function currentUser(): Promise<{ session: any; id: string } | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const me = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!me) return null;
  return { session, id: me.id };
}
