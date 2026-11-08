import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { MENTORES_POR_SKILL, montarEscritorio, departamentoDe, porDepartamento, DEPARTAMENTOS } from "./mapa";
import { MENTOR_SEED } from "@/lib/agent/mentors";

describe("escritório como dado", () => {
  it("todo mentor do seed vira um pod — o escritório não inventa gente", () => {
    const pods = montarEscritorio();
    expect(pods.length).toBe(MENTOR_SEED.length);
    expect(new Set(pods.map((p) => p.slug)).size).toBe(MENTOR_SEED.length);
  });

  it("ninguém ocupa a mesma célula (dois pods no mesmo lugar = um some)", () => {
    const pods = montarEscritorio();
    const celulas = pods.map((p) => `${p.x},${p.z}`);
    expect(new Set(celulas).size).toBe(pods.length);
  });

  it("o centro fica livre pro ⟁", () => {
    const pods = montarEscritorio();
    expect(pods.some((p) => p.x === 0)).toBe(false);
  });

  it("a cor vem do skill DISTINTIVO, não de memory/studio que todos têm", () => {
    expect(departamentoDe({ enabledSkills: ["memory", "studio", "literature"] })).toBe(DEPARTAMENTOS.literature);
    expect(departamentoDe({ enabledSkills: ["memory", "studio", "molecule"] })).toBe(DEPARTAMENTOS.molecule);
    // só as comuns → cai no Estúdio em vez de quebrar
    expect(departamentoDe({ enabledSkills: ["memory", "studio"] })).toBe(DEPARTAMENTOS.studio);
  });

  it("DISTINTIVO é o mais RARO, não o primeiro declarado — e a contagem sai do seed", () => {
    // `literature` está em 12 dos 13 mentores: é tão pouco distintiva quanto memory e studio, e
    // antes vencia só por vir primeiro na lista. Agora perde para qualquer skill mais rara.
    expect(MENTORES_POR_SKILL.get("literature")).toBe(12);
    expect(MENTORES_POR_SKILL.get("anatomia"), "anatomia é de um mentor só").toBe(1);
    expect(departamentoDe({ enabledSkills: ["literature", "memory", "studio", "anatomia"] })).toBe(DEPARTAMENTOS.anatomia);
    expect(departamentoDe({ enabledSkills: ["literature", "memory", "studio", "molecule"] })).toBe(DEPARTAMENTOS.molecule);
    // empate de raridade: vence quem o mentor declarou primeiro
    expect(departamentoDe({ enabledSkills: ["studio", "code"] })).toBe(DEPARTAMENTOS.code);
  });

  it("os pods que a regra do mais raro muda, nomeados — nenhum outro se mexe", () => {
    const pods = montarEscritorio();
    const dep = (slug: string) => pods.find((p) => p.slug === slug)!.departamento.id;
    expect(dep("medicina"), "era Biblioteca; o Osler é o único com anatomia").toBe("anatomia");
    // O Eiffel ganhou `cad` (docs/HANDOFF_EIFFEL_CAD.md) e `cad` passou a ser a skill mais rara do
    // seed — um mentor só a tem. Então o pod dele deixa de dizer "Biblioteca" (11 em 13) e passa a
    // dizer "Prancheta" (1 em 13), que é exatamente o que a regra do departamento mais raro existe
    // pra fazer: o pod mostra o que DISTINGUE o agente, não o que todos têm.
    expect(dep("eng-civil"), "ganhou cad: o pod dele agora é a Prancheta").toBe("cad");
    expect(dep("biologia"), "era Biblioteca; molecule está em 3 de 13").toBe("molecule");
    // os outros dez continuam onde estavam (o eng-civil saiu desta lista: ele é o caso acima)
    for (const [slug, esperado] of [
      ["enfermagem", "literature"], ["eng-computacao", "code"], ["eng-energias", "literature"],
      ["matematica", "studio"], ["fisica", "literature"], ["agronomia", "literature"],
      ["quimica", "molecule"], ["veterinaria", "literature"],
      ["psicologia", "literature"], ["farmacia", "molecule"],
    ] as const) {
      expect(dep(slug), `${slug} mudou de departamento sem ninguém pedir`).toBe(esperado);
    }
  });

  it("nenhum departamento fica ÓRFÃO de propósito — e os que ficam, ficam declarados", () => {
    const usados = new Set(montarEscritorio().map((p) => p.departamento.id));
    const orfaos = Object.keys(DEPARTAMENTOS).filter((d) => !usados.has(d as never)).sort();
    // `memory` nunca rotula pod (é encanamento) e `studio` só rotula quem não tem nada mais raro.
    expect(orfaos, "departamento sem nenhum pod é cor que ninguém vê").toEqual(["memory"]);
  });

  it("toda `rota` de departamento aponta para uma página que EXISTE — nada de porta no 404", () => {
    const comRota = Object.values(DEPARTAMENTOS).filter((d) => d.rota);
    expect(comRota.map((d) => d.id), "hoje só a Anatomia tem tela própria").toEqual(["anatomia"]);
    for (const d of comRota) {
      expect(d.rota!, `${d.id}`).toMatch(/^\/[a-z0-9-]+$/);
      expect(existsSync(join(process.cwd(), "app", d.rota!.slice(1), "page.tsx")), `app${d.rota}/page.tsx não existe`).toBe(true);
    }
    // e o painel do escritório tem de LER esse campo, senão a porta é dado morto
    const painel = readFileSync(join(process.cwd(), "components/office/EscritorioRoom.tsx"), "utf8");
    expect(painel, "o botão não lê departamento.rota").toContain("departamento.rota");
  });

  it("agrupa por departamento e põe o maior primeiro", () => {
    const grupos = porDepartamento(montarEscritorio());
    expect(grupos.length).toBeGreaterThan(0);
    for (let i = 1; i < grupos.length; i++) {
      expect(grupos[i - 1].pods.length).toBeGreaterThanOrEqual(grupos[i].pods.length);
    }
    expect(grupos.reduce((n, g) => n + g.pods.length, 0)).toBe(MENTOR_SEED.length);
  });
});
