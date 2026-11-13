import { describe, it, expect } from "vitest";
import { esqueletoPorId, montarCursoEsqueleto, cursoEsqueletoPorId, LICENCAS_ENGINES, ESQUELETOS } from "./cursoRepo";
import { conexoesDoBoard } from "./curso";

describe("cursoRepo — esqueleto curado", () => {
  it("acha o esqueleto por id; id vazio cai no primeiro; id inexistente é undefined", () => {
    expect(esqueletoPorId("exemplo")?.id).toBe("exemplo");
    expect(esqueletoPorId("")?.id).toBe(ESQUELETOS[0].id);
    expect(esqueletoPorId(null)?.id).toBe(ESQUELETOS[0].id);
    expect(esqueletoPorId("nao-existe")).toBeUndefined();
  });

  it("monta um CursoRepo com board pronto e grafo/árvore vazios (até o engine preencher)", () => {
    const c = montarCursoEsqueleto(esqueletoPorId("exemplo")!);
    expect(c.modo).toBe("curso");
    expect(c.modulos.map((m) => m.papel)).toEqual(["entender", "espelho", "entregar"]);
    expect(conexoesDoBoard(c.modulos)).toHaveLength(2);
    expect(c.grafo.nos).toEqual([]);
    expect(c.arvore.raiz.titulo).toBe("Estudo de repositório");
    expect(c.arvore.raiz.filhos).toEqual([]);
  });

  it("carrega as licenças dos dois engines (atribuição preservada)", () => {
    const c = cursoEsqueletoPorId("exemplo")!;
    // "exemplo" não tem repo-licença própria → só as dos dois engines
    expect(c.licencas).toEqual(LICENCAS_ENGINES);
    expect(c.licencas.map((l) => l.spdx).sort()).toEqual(["Apache-2.0 OR MIT", "MIT"]);
    expect(c.licencas.every((l) => l.url?.startsWith("https://github.com/"))).toBe(true);
  });

  it("cursoEsqueletoPorId com id inexistente é undefined", () => {
    expect(cursoEsqueletoPorId("nao-existe")).toBeUndefined();
  });
});
