import { describe, expect, it } from "vitest";
import { normalizar, paraUI } from "./vitrineAdmin";
import { normalizarPesquisa } from "./pesquisas";
import { skinDaVitrine } from "./skinVitrine";

describe("skins da vitrine", () => {
  it.each([
    [{ tipo: "codigo", tags: ["agronomia"] }, "tecnologia"],
    [{ tipo: "pesquisa", titulo: "Atlas do Coração" }, "dossie"],
    [{ tipo: "curso", titulo: "História do Recife" }, "historia"],
    [{ tipo: "curso", titulo: "Atlas de bacias" }, "geografia"],
    [{ tipo: "rwa", tags: ["café"] }, "agronomia"],
    [{ kind: "diagram" }, "dados"],
    [{ kind: "aula" }, "caderno"],
    [{ kind: "image" }, "portfolio"],
    [{ tipo: "pesquisa", skin: "dados" }, "dados"],
  ])("classifica %o como %s", (entrada, skin) => {
    expect(skinDaVitrine(entrada)).toBe(skin);
  });

  it("grava a skin na criação e mantém a edição explícita", () => {
    expect(normalizar({ titulo: "Horta vertical", tipo: "rwa" }).data?.skin).toBe("agronomia");
    expect(normalizar({ skin: "geografia" }, { parcial: true }).data?.skin).toBe("geografia");
    expect(normalizar({ skin: "inválida" }, { parcial: true }).erro).toBeTruthy();
    expect(normalizar({ titulo: "Outro título" }, { parcial: true }).data).not.toHaveProperty("skin");
    expect(paraUI({ skin: "historia", titulo: "Novo título" } as Parameters<typeof paraUI>[0]).skin).toBe("historia");
    expect(normalizarPesquisa({ titulo: "Atlas de bacias", partes: [{ tipo: "dados", conteudo: "Amostra" }] }).data?.skin).toBe("geografia");
  });
});
