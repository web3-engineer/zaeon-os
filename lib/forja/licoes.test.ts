import { describe, it, expect } from "vitest";
import { licoesDaTemperatura, refsPrincipais, exigeCodebox } from "./licoes";
import { cursoEsqueletoPorId } from "./cursoRepo";
import type { CursoRepo } from "./tipos";

const base = cursoEsqueletoPorId("exemplo")!;

describe("licoes da Forja por temperatura", () => {
  it("básico só pergunta (sem digitação); avançado traz o codebox sem-colar", () => {
    const b = licoesDaTemperatura(base, "basico");
    expect(b.map((l) => l.tipo)).toEqual(["perguntas"]);
    expect(b.every((l) => !l.semColar)).toBe(true);
    expect(exigeCodebox("basico")).toBe(false);

    const a = licoesDaTemperatura(base, "avancado");
    expect(a.map((l) => l.tipo)).toContain("codebox");
    expect(a.find((l) => l.tipo === "codebox")!.semColar).toBe(true);
    expect(exigeCodebox("avancado")).toBe(true);
    // cada lição carrega a temperatura e um id estável
    expect(a.every((l) => l.temperatura === "avancado")).toBe(true);
    expect(a.find((l) => l.tipo === "codebox")!.id).toBe("avancado:codebox");
  });

  it("refsPrincipais pega os nós mais centrais; vazio antes do engine", () => {
    expect(refsPrincipais(base)).toEqual([]);
    const comGrafo: CursoRepo = {
      ...base,
      grafo: { nos: [
        { id: "a", tipo: "funcao", nome: "a", grau: 1 },
        { id: "b", tipo: "funcao", nome: "b", grau: 9 },
        { id: "c", tipo: "funcao", nome: "c", grau: 5 },
      ], arestas: [] },
    };
    expect(refsPrincipais(comGrafo, 2)).toEqual(["b", "c"]);
    expect(licoesDaTemperatura(comGrafo, "basico")[0].refs).toEqual(["b", "c", "a"]);
  });
});
