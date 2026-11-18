import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { FLAGS_DE_RECURSO, reciboDeFlags } from "@/lib/flags/recibo";
import { modoKnn } from "@/lib/agent/roteadorKnn";
import { visaoNoHarnessLigado } from "@/lib/agent/toolsVisao";
import { memoriaL3Ligada } from "@/lib/agent/memory-boot";
import { cacheLigado } from "@/lib/rag/cacheRespostas";

const HARNESS = ["VISAO_HARNESS", "MEMORY_L3", "CACHE_RESPOSTAS", "ORQ_AUTOMATICO"];
const compose = readFileSync("docker-compose.beta.yml", "utf8");
/** o bloco de um serviço do compose (até o próximo serviço de mesmo nível) */
const bloco = (svc: string) => {
  const i = compose.indexOf(`\n  ${svc}:\n`);
  expect(i, `serviço ${svc} no compose`).toBeGreaterThan(-1);
  const resto = compose.slice(i + 1);
  const fim = resto.slice(1).search(/\n  [a-z][a-z0-9-]*:\n/);
  return fim < 0 ? resto : resto.slice(0, fim + 1);
};

describe("reciboDeFlags — o que está ligado, por nome", () => {
  it("separa ligadas de desligadas, aceitando 1/true/on", () => {
    const r = reciboDeFlags({ VISAO_HARNESS: "1", MEMORY_L3: "true", CACHE_RESPOSTAS: " ON ", ORQ_AUTOMATICO: "0", CHAT_BG: "" });
    expect(r.ligadas).toEqual(["VISAO_HARNESS", "MEMORY_L3", "CACHE_RESPOSTAS"]);
    expect(r.desligadas).toContain("ORQ_AUTOMATICO");
    expect(r.desligadas).toContain("CHAT_BG");
    expect(r.ligadas.length + r.desligadas.length).toBe(FLAGS_DE_RECURSO.length);
  });

  it("sem nada no ambiente, tudo aparece como desligado — e nunca um valor", () => {
    const r = reciboDeFlags({});
    expect(r.ligadas).toEqual([]);
    expect(r.desligadas).toEqual([...FLAGS_DE_RECURSO]);
    expect(r.roteadorKnn).toBe("off");
    expect(JSON.stringify(reciboDeFlags({ MEMORY_L3: "1", DATABASE_URL: "mongodb://segredo" }))).not.toContain("segredo");
  });

  it("o roteador tem três estados, iguais aos do código que roteia", () => {
    for (const v of ["on", "1", "sombra", "off", "", "lixo"]) {
      expect(reciboDeFlags({ ROTEADOR_KNN: v }).roteadorKnn, v).toBe(modoKnn({ ROTEADOR_KNN: v }));
    }
  });

  it("o recibo concorda com quem LÊ a flag de verdade", () => {
    const env = { VISAO_HARNESS: "1", MEMORY_L3: "1", CACHE_RESPOSTAS: "1", DATABASE_URL: "x" };
    const r = reciboDeFlags(env);
    expect(r.ligadas.includes("VISAO_HARNESS")).toBe(visaoNoHarnessLigado(env));
    expect(r.ligadas.includes("MEMORY_L3")).toBe(memoriaL3Ligada(env));
    expect(r.ligadas.includes("CACHE_RESPOSTAS")).toBe(cacheLigado(env));
  });

  it("sem nome repetido na lista", () => {
    expect(new Set(FLAGS_DE_RECURSO).size).toBe(FLAGS_DE_RECURSO.length);
  });
});

describe("pipeline · os recursos do harness sobem LIGADOS (dono: 'nada off, quero tudo on')", () => {
  it("as quatro flags estão no recibo", () => {
    for (const f of HARNESS) expect(FLAGS_DE_RECURSO).toContain(f);
  });

  it.each(["web", "worker"])("compose · %s: default ligado, com kill-switch pelo .env", (svc) => {
    const b = bloco(svc);
    for (const f of HARNESS) expect(b, `${f} em ${svc}`).toMatch(new RegExp(`\\n\\s+${f}: \\$\\{${f}:-1\\}`));
    expect(b).toMatch(/\n\s+ROTEADOR_KNN: \$\{ROTEADOR_KNN:-on\}/);
  });

  it("o default do compose é um valor que o código entende como LIGADO", () => {
    const doCompose = { VISAO_HARNESS: "1", MEMORY_L3: "1", CACHE_RESPOSTAS: "1", ORQ_AUTOMATICO: "1", ROTEADOR_KNN: "on", DATABASE_URL: "x" };
    expect(visaoNoHarnessLigado(doCompose)).toBe(true);
    expect(memoriaL3Ligada(doCompose)).toBe(true);
    expect(cacheLigado(doCompose)).toBe(true);
    expect(modoKnn(doCompose)).toBe("on");
    const r = reciboDeFlags(doCompose);
    for (const f of HARNESS) expect(r.ligadas).toContain(f);
  });
});
