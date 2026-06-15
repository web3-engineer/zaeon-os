/**
 * Modo econômico — controle de acesso ao "pensamento profundo" (Gemini Pro).
 *
 * Por padrão, usuários comuns NÃO usam deep thinking (economiza créditos). O admin
 * libera por usuário ligando o campo `deepThinkEnabled` (Mongoose, strict:false —
 * sem migração). Super admins (allowlist/role) sempre podem.
 */
import connectToDatabase from "@/src/lib/db";
import User from "@/src/models/User";
import { isSuperAdmin } from "@/lib/auth/roles";

/** True se o e-mail pode usar deep thinking (admin OU liberado pelo admin). */
export async function canDeepThink(email?: string | null): Promise<boolean> {
  if (!email) return false;
  try {
    await connectToDatabase();
    const u: any = await User.findOne({ email }).select("role deepThinkEnabled").lean();
    if (isSuperAdmin({ email, role: u?.role })) return true;
    return !!u?.deepThinkEnabled;
  } catch {
    // Em falha de DB, seja conservador no modo econômico: nega (só admin por e-mail passa).
    return isSuperAdmin({ email });
  }
}
