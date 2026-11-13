import { describe, it, expect } from "vitest";
import { INICIANTES } from "./catalogoIniciantes";
import { esqueletoPorId, montarCursoEsqueleto } from "./cursoRepo";

describe("catálogo de iniciantes (Fase C)", () => {
  it("são 10 projetos, um por arquétipo, com id/repo/conceito/licença", () => {
    expect(INICIANTES).toHaveLength(10);
    const ids = INICIANTES.map((e) => e.id);
    expect(new Set(ids).size).toBe(10); // ids únicos
    for (const e of INICIANTES) {
      expect(e.repo).toMatch(/^[\w.-]+\/[\w.-]+$/); // owner/name real
      expect(e.conceito && e.titulo && e.resumo).toBeTruthy();
      expect(e.licenca?.spdx).toBe("MIT");
      expect(e.licenca?.url).toContain(e.repo);
    }
  });

  it("cada um é achável pelo id e vira um CursoRepo com board + licença do repo + dos engines", () => {
    for (const e of INICIANTES) {
      expect(esqueletoPorId(e.id)?.repo).toBe(e.repo);
      const curso = montarCursoEsqueleto(e);
      expect(curso.modulos.map((m) => m.papel)).toEqual(["entender", "espelho", "entregar"]);
      // a licença do repo estudado vem primeiro, depois as dos dois engines (3 no total)
      expect(curso.licencas).toHaveLength(3);
      expect(curso.licencas[0].spdx).toBe("MIT");
      expect(curso.licencas[0].titular).toBe(e.licenca?.titular);
    }
  });

  it("os arquétipos pedidos estão cobertos", () => {
    const conceitos = INICIANTES.map((e) => e.conceito);
    for (const alvo of ["lista de tarefas", "app de clima", "calculadora", "quiz", "API REST mínima (CRUD)", "página de portfólio"]) {
      expect(conceitos).toContain(alvo);
    }
  });
});
