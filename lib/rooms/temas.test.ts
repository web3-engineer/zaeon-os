import { describe, expect, it } from "vitest";
import { CURSOS_POR_TEMA, TEMAS_ID, VISUAL_TEMA, ehTema, temaDoCurso, temaOuLounge } from "./temas";

describe("temas (fonte única das salas por área)", () => {
  it("todo tema tem visual e rota coerentes", () => {
    for (const id of TEMAS_ID) {
      expect(VISUAL_TEMA[id].nome).toBeTruthy();
      expect(VISUAL_TEMA[id].rota).toBe(`/study-rooms/${id}`);
    }
  });

  it("cada curso pertence a UM tema só", () => {
    const vistos = new Map<string, string>();
    for (const [tema, cursos] of Object.entries(CURSOS_POR_TEMA)) {
      for (const c of cursos) {
        const k = c.trim().toLowerCase();
        expect(vistos.get(k), `"${c}" está em ${vistos.get(k)} e em ${tema}`).toBeUndefined();
        vistos.set(k, tema);
      }
    }
    expect(vistos.size).toBe(68);
  });

  it("casa o curso sem diferença de maiúscula ou espaço", () => {
    expect(temaDoCurso("Medicina")).toBe("med");
    expect(temaDoCurso("  medicina ")).toBe("med");
    expect(temaDoCurso("CIÊNCIA DA COMPUTAÇÃO")).toBe("cyber");
    expect(temaDoCurso("Biologia")).toBe("bio");
  });

  it("curso desconhecido: null no estrito, lounge no que cai no lounge", () => {
    expect(temaDoCurso("Culinária Marciana")).toBeNull();
    expect(temaDoCurso("")).toBeNull();
    expect(temaDoCurso(undefined)).toBeNull();
    expect(temaOuLounge("Culinária Marciana")).toBe("lounge");
    expect(temaOuLounge(undefined)).toBe("lounge");
  });

  it("ehTema reconhece só ids de tema", () => {
    expect(ehTema("bio")).toBe(true);
    expect(ehTema("lounge")).toBe(true);
    expect(ehTema("cozinha")).toBe(false);
  });
});
