import { describe, it, expect } from "vitest";
import { AVANCADOS, TEMA_AVANCADO } from "./catalogoAvancado";
import { INICIANTES } from "./catalogoIniciantes";
import { ESQUELETOS, esqueletoPorId, montarCursoEsqueleto } from "./cursoRepo";
import { CATALOGO, ITENS_FORJA_AVANCADOS } from "@/lib/estudos/vitrine";
import { forjaDoItem } from "./desbloqueioForja";

// Licenças PERMISSIVAS aceitas na trilha avançada (HANDOFF-AVANCADO §4): sem copyleft (GPL/AGPL).
const PERMISSIVAS = ["MIT", "Apache-2.0", "BSD-3-Clause", "BSD-2-Clause", "ISC", "MPL-2.0", "Unlicense", "0BSD"];

describe("catálogo da trilha AVANÇADA (card #793)", () => {
  it("os 28 repos ✅ enxutos, ids únicos, cada um com repo/conceito/licença permissiva", () => {
    expect(AVANCADOS).toHaveLength(28);
    const ids = AVANCADOS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    const repos = AVANCADOS.map((e) => e.repo);
    expect(new Set(repos).size).toBe(repos.length); // nenhum repo registrado duas vezes
    for (const e of AVANCADOS) {
      expect(e.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/); // kebab-case → card "forja:<id>"
      expect(e.repo).toMatch(/^[\w.-]+\/[\w.-]+$/);
      expect(e.modo).toBe("curso"); // entregável = estudar/rodar/simular
      expect(e.conceito && e.titulo && e.resumo).toBeTruthy();
      expect(e.conceito).toContain("(avançado)"); // nível sinalizado (HANDOFF-AVANCADO §3)
      expect(PERMISSIVAS).toContain(e.licenca?.spdx);
      expect(e.licenca?.titular).toBeTruthy();
      expect(e.licenca?.url).toContain(`https://github.com/${e.repo}/`);
    }
  });

  it("não colide com os iniciantes nem com o 'exemplo' (ids e repos)", () => {
    const outros = [...INICIANTES.map((e) => e.id), "exemplo"];
    for (const e of AVANCADOS) expect(outros).not.toContain(e.id);
    const reposIni = INICIANTES.map((e) => e.repo);
    for (const e of AVANCADOS) expect(reposIni).not.toContain(e.repo);
  });

  it("estão ligados no cursoRepo: achados pelo id e viram CursoRepo com board + licenças", () => {
    for (const e of AVANCADOS) {
      expect(ESQUELETOS).toContain(e);
      expect(esqueletoPorId(e.id)?.repo).toBe(e.repo);
      const curso = montarCursoEsqueleto(e);
      expect(curso.modulos.map((m) => m.papel)).toEqual(["entender", "espelho", "entregar"]);
      expect(curso.licencas).toHaveLength(3); // a do repo estudado + as dos dois engines
      expect(curso.licencas[0].spdx).toBe(e.licenca?.spdx);
      expect(curso.licencas[0].titular).toBe(e.licenca?.titular);
    }
  });

  it("estão na vitrine como itens GRÁTIS 'forja:<id>', marcados como avançados (não iniciante)", () => {
    expect(ITENS_FORJA_AVANCADOS).toHaveLength(AVANCADOS.length);
    const idsVitrine = CATALOGO.map((i) => i.id);
    for (const e of AVANCADOS) {
      const item = CATALOGO.find((i) => i.id === `forja:${e.id}`);
      expect(item, `forja:${e.id} fora do CATALOGO`).toBeTruthy();
      expect(idsVitrine.filter((x) => x === `forja:${e.id}`)).toHaveLength(1);
      expect(item!.preco).toBe(0);
      expect(item!.tipo).toBe("curso");
      expect(item!.fracoes.total).toBe(1);
      expect(item!.tags).toContain("avançado");
      expect(item!.tags).not.toContain("iniciante");
      expect(item!.entrega.join(" ")).toContain(e.repo);
      expect(item!.entrega.join(" ")).not.toMatch(/primeiro projeto/i); // entregável é rodar/simular
      expect(forjaDoItem(item)).toBe(e.id); // o card desbloqueia o board certo na Sala de Estudos
    }
  });

  it("cobre os 5 temas da trilha (robótica, sistemas, IA, gráficos/jogos, redes/distribuído)", () => {
    const repos = AVANCADOS.map((e) => e.repo);
    for (const r of ["koide3/glim", "cstack/db_tutorial", "karpathy/nanoGPT", "liabru/matter-js", "rqlite/rqlite"]) {
      expect(repos).toContain(r);
    }
    // todo curso tem tema, e os 5 temas aparecem
    for (const e of AVANCADOS) expect(TEMA_AVANCADO[e.id]).toBeTruthy();
    expect(new Set(Object.values(TEMA_AVANCADO))).toEqual(
      new Set(["robotica", "sistemas", "ia", "graficos-jogos", "redes-distribuido"]),
    );
  });
});
