/**
 * Zaeon — Roles & super-admin allowlist
 *
 * Dois "admins supremos" fundadores são fixados aqui por e-mail (allowlist no
 * código → funcionam JÁ, sem depender de migração/edição de banco). Além deles,
 * qualquer usuário com `User.role === "super_admin"` (definível pela UI admin no
 * futuro) também é tratado como super admin.
 *
 * Super admin = pode tudo, incluindo usar a sala Projetos (Zaeon Code)
 * independentemente do curso.
 */

// Admins extras via ENV (sem mexer no código): defina UMA ou várias contas como
// super admin. Use NEXT_PUBLIC_SUPER_ADMIN_EMAILS (vale no cliente E no servidor) ou
// SUPER_ADMIN_EMAILS (só servidor). Ex.: NEXT_PUBLIC_SUPER_ADMIN_EMAILS="voce@gmail.com"
const ENV_SUPERS: string[] = (
  process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS || process.env.SUPER_ADMIN_EMAILS || ""
)
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

/** Fundadores — sempre super admin (case-insensitive). Allowlist do código + ENV. */
export const SUPER_ADMINS: string[] = [
  "donmartinezcaiudoceu@gmail.com",   // fundador (Gmail) — acesso a Tutoriais + modo CEO
  "donmartinez@aluno.unilab.edu.br",  // fundador (institucional)
  "zaeondao@gmail.com",
  "martinez@zaeon.space",
  ...ENV_SUPERS,
];

/** Valor canônico do papel de super admin no campo `User.role`. */
export const SUPER_ADMIN_ROLE = "super_admin";

function normEmail(email?: string | null): string {
  return (email ?? "").trim().toLowerCase();
}

/** True se o e-mail está na allowlist de fundadores. */
export function isSuperAdminEmail(email?: string | null): boolean {
  const e = normEmail(email);
  return !!e && SUPER_ADMINS.map((a) => a.toLowerCase()).includes(e);
}

/** True se o papel guardado no banco é super admin. */
export function isSuperAdminRole(role?: string | null): boolean {
  return (role ?? "").trim().toLowerCase() === SUPER_ADMIN_ROLE;
}

/** Super admin por allowlist OU por papel no banco. */
export function isSuperAdmin(ctx: { email?: string | null; role?: string | null }): boolean {
  return isSuperAdminEmail(ctx.email) || isSuperAdminRole(ctx.role);
}
