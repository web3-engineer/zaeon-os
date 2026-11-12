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

/**
 * Fundadores — sempre super admin (case-insensitive). Allowlist do código + ENV.
 *
 * `zaeondao@gmail.com` SAIU daqui a pedido do dono (nov/2026): ela é a conta com que ele percorre o
 * produto como ALUNO, e enquanto estivesse nesta lista ele não conseguia ver o que um usuário comum
 * vê — a Cidade Zaeon abre pro fundador e está fechada pros outros, e o login por código de e-mail
 * é recusado pra conta de admin (`entraSoPeloGoogle`). Conta de teste dentro da allowlist não testa
 * nada. Pra devolver o privilégio a ela, basta a ENV abaixo — sem deploy.
 */
export const SUPER_ADMINS: string[] = [
  "donmartinezcaiudoceu@gmail.com",   // fundador (Gmail) — acesso a Tutoriais + modo CEO
  "donmartinez@aluno.unilab.edu.br",  // fundador (institucional)
  "martinez@zaeon.space",
  ...ENV_SUPERS,
];

/**
 * O DONO DA VITRINE — a conta a que pertencem TODO item pago e TODO curso (regra do dono,
 * nov/2026). É o fundador principal, e vem de `SUPER_ADMINS[0]` DE PROPÓSITO: fonte única. O
 * e-mail do fundador não é redigitado aqui — se um dia a conta principal mudar, muda num lugar só,
 * e o `roles.test.ts` já guarda essa lista contra uma segunda cópia. A regra é verificada no
 * portão das skills (`lib/agent/skills-dir.test.ts`): card pago ou de curso com outro dono não
 * sobe para produção.
 */
export const DONO_VITRINE: string = SUPER_ADMINS[0];

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
