/**
 * A ALLOWLIST DE ADMIN, e o portão que impede a próxima cópia dela.
 *
 * O defeito que isto fecha foi MEDIDO, não imaginado: a mesma lista existia em TRÊS lugares
 * (lib/auth/roles.ts, src/lib/auth.ts e app/api/admin/convites/route.ts) e as três DISCORDAVAM.
 * `session.user.isAdmin` saía da cópia de 2 e-mails em src/lib/auth.ts, então a conta fundadora do
 * dono era super admin por roles.ts e NÃO era `isAdmin` — não via a UI de admin que uma conta
 * secundária via. Consertar uma cópia deixaria as outras duas erradas, e foi assim que isso durou.
 *
 * Por isso parte deste arquivo afirma sobre o TEXTO-FONTE: um teste de comportamento não percebe o
 * nascimento de uma quarta lista, e o nascimento dela é justamente o jeito de o defeito voltar.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SUPER_ADMINS, isSuperAdmin, isSuperAdminEmail, isSuperAdminRole } from "./roles";

const leia = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("allowlist de super admin", () => {
  it("zaeondao@gmail.com NÃO é mais super admin (é a conta com que o dono percorre o produto como aluno)", () => {
    expect(isSuperAdminEmail("zaeondao@gmail.com")).toBe(false);
    expect(SUPER_ADMINS).not.toContain("zaeondao@gmail.com");
  });

  it("os fundadores seguem dentro, e a comparação ignora caixa e espaço", () => {
    expect(isSuperAdminEmail("donmartinezcaiudoceu@gmail.com")).toBe(true);
    expect(isSuperAdminEmail("  DonMartinezCaiuDoCeu@Gmail.com ")).toBe(true);
    expect(isSuperAdminEmail("martinez@zaeon.space")).toBe(true);
    expect(isSuperAdminEmail("")).toBe(false);
    expect(isSuperAdminEmail(null)).toBe(false);
    expect(isSuperAdminEmail("alguem@outro.com")).toBe(false);
  });

  it("o papel no banco também vale, e é independente do e-mail", () => {
    expect(isSuperAdminRole("super_admin")).toBe(true);
    expect(isSuperAdminRole("student")).toBe(false);
    expect(isSuperAdmin({ email: "alguem@outro.com", role: "super_admin" })).toBe(true);
    expect(isSuperAdmin({ email: "alguem@outro.com", role: "student" })).toBe(false);
    // o que devolve o privilégio à zaeondao sem deploy: papel no banco, ou SUPER_ADMIN_EMAILS
    expect(isSuperAdmin({ email: "zaeondao@gmail.com", role: "super_admin" })).toBe(true);
  });
});

describe("FONTE ÚNICA — nenhuma segunda cópia da allowlist", () => {
  const ALVOS = ["src/lib/auth.ts", "app/api/admin/convites/route.ts"];

  it.each(ALVOS)("%s não declara a própria lista de e-mails de admin", (rel) => {
    const txt = leia(rel);
    // guarda contra afirmação vazia: se o arquivo não foi lido de verdade, o resto não vale nada
    expect(txt.length, `${rel} veio vazio`).toBeGreaterThan(500);
    expect(txt, `${rel} deixou de usar roles.ts`).toMatch(/from "@\/lib\/auth\/roles"/);
    // nenhum e-mail de admin escrito aqui, e nenhuma lista local com esse nome
    expect(txt, `${rel} voltou a escrever e-mail de admin no código`).not.toMatch(/@gmail\.com|@zaeon\.space/);
    expect(txt, `${rel} recriou uma ADMIN_EMAILS local`).not.toMatch(/const\s+ADMIN_EMAILS\s*=/);
  });

  it("roles.ts é o ÚNICO arquivo que lista e-mail de fundador", () => {
    const txt = leia("lib/auth/roles.ts");
    expect(txt.length).toBeGreaterThan(500);
    expect(txt).toMatch(/donmartinezcaiudoceu@gmail\.com/);   // a lista mora aqui — e só aqui
    expect(SUPER_ADMINS.length).toBeGreaterThanOrEqual(3);
  });
});
