import { describe, it, expect } from "vitest";
import { esqueletoDaSkill, resolverEsqueleto } from "./esqueletoResolver";

describe("esqueletoResolver — skill-curso de código vira esqueleto da Forja", () => {
  it("uma skill de board (astropy) vira esqueleto com o repo certo", () => {
    const esq = esqueletoDaSkill("astropy-astronomia");
    expect(esq).toBeTruthy();
    expect(esq!.id).toBe("astropy-astronomia");
    expect(esq!.repo).toBe("astropy/astropy");
    expect(esq!.modo).toBe("curso");
    expect(esq!.titulo.length).toBeGreaterThan(0);
  });

  it("uma skill device (musescore) NÃO vira esqueleto — não tem repo, não é board", () => {
    expect(esqueletoDaSkill("musescore-partituras")).toBeUndefined();
  });

  it("slug inexistente é undefined", () => {
    expect(esqueletoDaSkill("nao-existe-xyz")).toBeUndefined();
    expect(esqueletoDaSkill("")).toBeUndefined();
  });

  it("resolverEsqueleto acha o curado primeiro, depois a skill", () => {
    expect(resolverEsqueleto("exemplo")?.id).toBe("exemplo");     // curado (lib/forja/cursoRepo)
    expect(resolverEsqueleto("pandas-analise-de-dados")?.repo).toBe("pandas-dev/pandas"); // skill
    expect(resolverEsqueleto("nao-existe-xyz")).toBeUndefined();
  });
});
