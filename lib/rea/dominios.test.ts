import { describe, it, expect, vi } from "vitest";
import { declararDominio, dominiosLiberados, listarDominios, revogarDominio, type DominiosDb } from "./dominios";
import { normalizarDominio, TERMO_HASH, TERMO_TEXTO, TERMO_VERSAO, termoHash } from "./termo";

function dbFalso() {
  const linhas: any[] = [];
  const casa = (l: any, w: Record<string, unknown>) => Object.entries(w).every(([k, v]) => (v === null ? l[k] == null : l[k] === v));
  const db: DominiosDb = {
    reaDominio: {
      findMany: async ({ where, orderBy }) => { const r = linhas.filter((l) => casa(l, where)); return orderBy ? [...r].sort((a, b) => b.aceitoEm - a.aceitoEm) : r; },
      create: async ({ data }) => { const l = { id: `id${linhas.length}`, aceitoEm: new Date(Date.now() + linhas.length), revogadoEm: null, ...data }; linhas.push(l); return l; },
      updateMany: async ({ where, data }) => { const r = linhas.filter((l) => casa(l, where)); r.forEach((l) => Object.assign(l, data)); return { count: r.length }; },
    },
  };
  return { db, linhas };
}
const aceite = { versao: TERMO_VERSAO, hash: TERMO_HASH };
const quem = { userId: "u1", email: "a@b.com", ip: "200.1.2.3", userAgent: "Mozilla/5.0" };

describe("Termo de Uso do REA", () => {
  it("hash = SHA-256 do texto exato (mudar uma letra muda o hash)", () => {
    expect(TERMO_HASH).toMatch(/^[0-9a-f]{64}$/);
    expect(termoHash(TERMO_TEXTO + " ")).not.toBe(TERMO_HASH);
    expect(TERMO_TEXTO).toContain(TERMO_VERSAO);
  });
  it("domínio normalizado igual ao motor (minúsculas, sem www., sem caminho); recusa IP e interno", () => {
    expect(normalizarDominio("https://WWW.LeonaFlow.com/pt-BR/")).toBe("leonaflow.com");
    for (const d of ["127.0.0.1", "[::1]", "intranet", "x.local", "a.ts.net", "", "a.test"]) expect(() => normalizarDominio(d), d).toThrow();
  });
});

describe("declarar domínio", () => {
  it("grava a PROVA: conta, domínio, finalidade, versão + hash do termo, IP e navegador", async () => {
    const { db, linhas } = dbFalso();
    const r = await declararDominio(quem, { dominio: "www.LeonaSolutions.io", finalidade: "reconstrucao", titular: true, aceite }, db);
    expect(r).toMatchObject({ ok: true, dominio: { dominio: "leonasolutions.io", vigente: true } });
    expect(linhas[0]).toMatchObject({ userId: "u1", email: "a@b.com", dominio: "leonasolutions.io", finalidade: "reconstrucao", titular: true, termoVersao: TERMO_VERSAO, termoHash: TERMO_HASH, ip: "200.1.2.3", userAgent: "Mozilla/5.0" });
  });
  it("sem declarar titularidade, sem finalidade válida ou com termo de outra versão/hash: não grava", async () => {
    const { db, linhas } = dbFalso();
    expect(await declararDominio(quem, { dominio: "a.com", finalidade: "estudo", titular: false, aceite }, db)).toEqual({ ok: false, erro: "titular_obrigatorio" });
    expect(await declararDominio(quem, { dominio: "a.com", finalidade: "hackear", titular: true, aceite }, db)).toEqual({ ok: false, erro: "finalidade_invalida" });
    expect(await declararDominio(quem, { dominio: "a.com", finalidade: "estudo", titular: true, aceite: { versao: TERMO_VERSAO, hash: "0".repeat(64) } }, db)).toEqual({ ok: false, erro: "termo_desatualizado" });
    expect(await declararDominio(quem, { dominio: "a.com", finalidade: "estudo", titular: true, aceite: undefined }, db)).toEqual({ ok: false, erro: "termo_desatualizado" });
    expect(await declararDominio(quem, { dominio: "10.0.0.1", finalidade: "estudo", titular: true, aceite }, db)).toEqual({ ok: false, erro: "dominio_ip" });
    expect(linhas).toHaveLength(0);
  });
  it("declarar de novo o mesmo domínio não duplica; limite de 20 ativos", async () => {
    const { db, linhas } = dbFalso();
    await declararDominio(quem, { dominio: "a.com", finalidade: "estudo", titular: true, aceite }, db);
    await declararDominio(quem, { dominio: "https://a.com/x", finalidade: "estudo", titular: true, aceite }, db);
    expect(linhas).toHaveLength(1);
    for (let i = 0; i < 19; i++) await declararDominio(quem, { dominio: `d${i}.com`, finalidade: "estudo", titular: true, aceite }, db);
    expect(await declararDominio(quem, { dominio: "z.com", finalidade: "estudo", titular: true, aceite }, db)).toEqual({ ok: false, erro: "limite_de_dominios" });
  });
  it("revogar tira das sessões mas a prova fica (revogadoEm); domínios são por conta", async () => {
    const { db, linhas } = dbFalso();
    await declararDominio(quem, { dominio: "a.com", finalidade: "estudo", titular: true, aceite }, db);
    await declararDominio({ ...quem, userId: "u2" }, { dominio: "b.com", finalidade: "estudo", titular: true, aceite }, db);
    expect(await dominiosLiberados("u1", db)).toEqual(["a.com"]);
    expect(await revogarDominio("u1", "A.com", db)).toBe(true);
    expect(await dominiosLiberados("u1", db)).toEqual([]);
    expect(linhas.find((l) => l.dominio === "a.com").revogadoEm).toBeInstanceOf(Date);
    expect(await dominiosLiberados("u2", db)).toEqual(["b.com"]);
  });
  it("aceite de um termo antigo (hash diferente) não libera — pede o novo", async () => {
    const { db, linhas } = dbFalso();
    await declararDominio(quem, { dominio: "a.com", finalidade: "estudo", titular: true, aceite }, db);
    linhas[0].termoHash = "f".repeat(64);
    expect((await listarDominios("u1", db))[0].vigente).toBe(false);
    expect(await dominiosLiberados("u1", db)).toEqual([]);
  });
});

describe("octa_rea_sessao", () => {
  it("abre a sessão mandando os domínios DO BANCO (nunca do argumento) e o dono como hash da conta", async () => {
    vi.resetModules();
    vi.doMock("@/lib/rea/dominios", () => ({ dominiosLiberados: async (u: string) => (u === "u1" ? ["leonasolutions.io"] : []) }));
    vi.doMock("@/lib/rea/tier", () => ({ reaTierDoUsuario: async (u: string) => (u === "u1" ? "max" : "users") }));
    const env = { OCTA_REA: "1", REA_BRIDGE_URL: "http://motor-max", REA_BRIDGE_URL_USERS: "http://motor-users", REA_BRIDGE_TOKEN: "t" };
    Object.assign(process.env, env);
    const f = vi.fn(async (_url: string, init: any) => new Response(JSON.stringify({ ok: true, sessao: "a".repeat(32), dominios: JSON.parse(init.body).dominios, ferramentas: [{ nome: "zaeon_abrir_pagina", nivel: "ponte", descricao: "x" }, { nome: "inspect_web_page", nivel: "web", descricao: "y" }] }), { status: 200 }));
    vi.stubGlobal("fetch", f);
    const { FERRAMENTAS_REA } = await import("@/lib/octa/agente");
    const t = FERRAMENTAS_REA.find((x) => x.name === "octa_rea_sessao")!;
    const r: any = await t.run({ acao: "abrir", dominios: ["evil.com"] }, { userId: "u1" } as any);
    expect(f.mock.calls[0][0]).toBe("http://motor-max/sessao");   // u1 = max → motor primário
    const corpo = JSON.parse(f.mock.calls[0][1].body);
    expect(corpo.dominios).toEqual(["leonasolutions.io"]);
    expect(corpo.dono).toMatch(/^[0-9a-f]{64}$/);
    expect(corpo.dono).not.toContain("u1");
    expect(JSON.stringify(r)).toContain("inspect_web_page");
    const semId: any = await t.run({ acao: "abrir" }, {} as any);
    expect(JSON.stringify(semId)).toMatch(/identificado/);
    // conta comum (u2) → motor dos usuários
    f.mockClear();
    await t.run({ acao: "abrir" }, { userId: "u2" } as any);
    expect(f.mock.calls[0][0]).toBe("http://motor-users/sessao");
    vi.unstubAllGlobals(); vi.doUnmock("@/lib/rea/dominios"); vi.doUnmock("@/lib/rea/tier");
    for (const k of Object.keys(env)) delete (process.env as any)[k];
  });
});
