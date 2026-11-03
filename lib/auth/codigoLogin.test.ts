/** #686: o código de entrar — vale uma vez, vence em 10 min, cai depois de 5 erros e não deixa pedir sem parar. */
import { describe, it, expect, vi, afterEach } from "vitest";
import { MAX_TENTATIVAS, VALIDADE_MS, conferirCodigo, prepararCodigo, resumoDoCodigo, type ColecaoCodigos } from "./codigoLogin";
import { enviarCodigoLogin } from "@/lib/email";

/** a coleção em memória, com os filtros que o código usa ($lt, $gt, $exists) e $set/$unset/$inc */
function colecao() {
  const docs: Record<string, any>[] = [];
  const casa = (d: Record<string, any>, f: Record<string, any>) => Object.entries(f).every(([k, v]) => {
    if (v && typeof v === "object" && !(v instanceof Date)) {
      if ("$lt" in v) return (d[k] ?? 0) < v.$lt;
      if ("$gt" in v) return d[k] instanceof Date && d[k].getTime() > v.$gt.getTime();
      if ("$exists" in v) return (k in d) === v.$exists;
    }
    return d[k] === v;
  });
  const c: ColecaoCodigos = {
    async findOne(f) { return (docs.find((d) => casa(d, f)) as any) ?? null; },
    async updateOne(f, u, o) {
      let d = docs.find((x) => casa(x, f));
      if (!d) { if (!o?.upsert) return { modifiedCount: 0 }; d = {}; docs.push(d); }
      Object.assign(d, (u as any).$set ?? {});
      for (const k of Object.keys((u as any).$unset ?? {})) delete d[k];
      for (const [k, n] of Object.entries((u as any).$inc ?? {})) d[k] = (d[k] ?? 0) + (n as number);
      return { modifiedCount: 1 };
    },
  };
  return { c, docs };
}
const E = "ana@zaeon.com", T0 = 1_000_000_000;
const fixo = (n: string) => () => n;

describe("conferirCodigo", () => {
  it("o código certo entra uma vez só", async () => {
    const { c } = colecao();
    await prepararCodigo(c, E, T0, fixo("123456"));
    expect(await conferirCodigo(c, E, "123456", T0 + 1000)).toBe(true);
    expect(await conferirCodigo(c, E, "123456", T0 + 2000)).toBe(false);
  });
  it("código errado, de outro e-mail ou fora do formato não entra", async () => {
    const { c } = colecao();
    await prepararCodigo(c, E, T0, fixo("123456"));
    expect(await conferirCodigo(c, E, "654321", T0)).toBe(false);
    expect(await conferirCodigo(c, "bia@zaeon.com", "123456", T0)).toBe(false);
    expect(await conferirCodigo(c, E, "12345", T0)).toBe(false);
    expect(await conferirCodigo(c, E, "", T0)).toBe(false);
  });
  it("depois de 10 minutos, o código vence", async () => {
    const { c } = colecao();
    await prepararCodigo(c, E, T0, fixo("123456"));
    expect(await conferirCodigo(c, E, "123456", T0 + VALIDADE_MS + 1)).toBe(false);
  });
  it("depois de 5 tentativas erradas, nem o certo entra", async () => {
    const { c } = colecao();
    await prepararCodigo(c, E, T0, fixo("123456"));
    for (let i = 0; i < MAX_TENTATIVAS; i++) await conferirCodigo(c, E, "000000", T0);
    expect(await conferirCodigo(c, E, "123456", T0)).toBe(false);
  });
  it("sem pedir código, não entra", async () => {
    const { c } = colecao();
    expect(await conferirCodigo(c, E, "123456", T0)).toBe(false);
  });
  it("o número não fica guardado, só o resumo", async () => {
    const { c, docs } = colecao();
    await prepararCodigo(c, E, T0, fixo("123456"));
    expect(JSON.stringify(docs)).not.toContain("123456");
    expect(docs[0]!.hash).toBe(resumoDoCodigo(E, "123456"));
  });
});

describe("prepararCodigo", () => {
  it("pedir de novo antes de 60 s espera; depois, o código novo troca o antigo", async () => {
    const { c } = colecao();
    await prepararCodigo(c, E, T0, fixo("111111"));
    expect(await prepararCodigo(c, E, T0 + 10_000, fixo("222222"))).toEqual({ ok: false, motivo: "espera", esperaS: 50 });
    expect(await prepararCodigo(c, E, T0 + 61_000, fixo("222222"))).toEqual({ ok: true, codigo: "222222" });
    expect(await conferirCodigo(c, E, "111111", T0 + 62_000)).toBe(false);
    expect(await conferirCodigo(c, E, "222222", T0 + 62_000)).toBe(true);
  });
  it("no máximo 5 envios por hora", async () => {
    const { c } = colecao();
    for (let i = 0; i < 5; i++) expect((await prepararCodigo(c, E, T0 + i * 61_000)).ok).toBe(true);
    const r = await prepararCodigo(c, E, T0 + 5 * 61_000);
    expect(r).toMatchObject({ ok: false, motivo: "limite" });
    expect((await prepararCodigo(c, E, T0 + 3_600_001)).ok).toBe(true);
  });
  it("o código novo zera as tentativas", async () => {
    const { c } = colecao();
    await prepararCodigo(c, E, T0, fixo("111111"));
    for (let i = 0; i < MAX_TENTATIVAS; i++) await conferirCodigo(c, E, "000000", T0);
    await prepararCodigo(c, E, T0 + 61_000, fixo("222222"));
    expect(await conferirCodigo(c, E, "222222", T0 + 62_000)).toBe(true);
  });
});

describe("enviarCodigoLogin", () => {
  afterEach(() => { vi.unstubAllEnvs(); });
  it("com a chave, manda pelo Resend para o e-mail certo, com o código no assunto", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_teste");
    const f = vi.fn(async () => new Response("{}", { status: 200 }));
    expect(await enviarCodigoLogin(E, "123456", f as unknown as typeof fetch)).toBe(true);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_teste");
    const corpo = JSON.parse(init.body as string);
    expect(corpo).toMatchObject({ to: [E], from: "Zaeon <login@zaeon.com.br>" });
    expect(corpo.subject).toContain("123456");
  });
  it("o Resend recusou: não finge que mandou", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_teste");
    expect(await enviarCodigoLogin(E, "123456", (async () => new Response("{}", { status: 403 })) as unknown as typeof fetch)).toBe(false);
    expect(await enviarCodigoLogin(E, "123456", (async () => { throw new Error("rede"); }) as unknown as typeof fetch)).toBe(false);
  });
  it("sem a chave em produção, não manda nem finge", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("NODE_ENV", "production");
    const f = vi.fn();
    expect(await enviarCodigoLogin(E, "123456", f as unknown as typeof fetch)).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
});
