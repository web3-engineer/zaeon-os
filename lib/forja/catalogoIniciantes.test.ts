import { describe, it, expect } from "vitest";
import { INICIANTES } from "./catalogoIniciantes";
import { esqueletoPorId, montarCursoEsqueleto } from "./cursoRepo";

// Licenças PERMISSIVAS aceitas (um curso de iniciante que publica o próprio projeto): sem copyleft.
// Para forjar um curso novo, veja docs/forja/HANDOFF-NOVOS-CURSOS.md.
const PERMISSIVAS = ["MIT", "Apache-2.0", "BSD-3-Clause", "BSD-2-Clause", "ISC", "Unlicense", "0BSD"];

describe("catálogo de iniciantes (Fase C)", () => {
  it("≥10 projetos, ids únicos, cada um com repo/conceito/licença permissiva", () => {
    expect(INICIANTES.length).toBeGreaterThanOrEqual(10);
    const ids = INICIANTES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length); // ids únicos
    for (const e of INICIANTES) {
      expect(e.repo).toMatch(/^[\w.-]+\/[\w.-]+$/); // owner/name real (host da allowlist do bridge)
      expect(e.conceito && e.titulo && e.resumo).toBeTruthy();
      expect(PERMISSIVAS).toContain(e.licenca?.spdx); // nada de GPL/AGPL (copyleft) num starter
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
      expect(PERMISSIVAS).toContain(curso.licencas[0].spdx);
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
