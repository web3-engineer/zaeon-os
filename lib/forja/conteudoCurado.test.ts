import { describe, it, expect } from "vitest";
import { conteudoCuradoDoCurso } from "./conteudoCurado";
import type { EsqueletoRepo } from "./tipos";

// PROVA REAL: lê os curso.json AUTORAIS do disco (não fixtures), como a vitrine faz com os cards reais.
const esq = (id: string): EsqueletoRepo => ({ id, repo: "owner/x", titulo: `Curso ${id}`, resumo: "resumo", modo: "curso" });
const CURSOS_COM_JSON = ["algoritmos-classicos", "buraco-negro-ascii", "game-engine-brutal"];

describe("conteudoCuradoDoCurso — base curada a partir dos curso.json reais", () => {
  for (const id of CURSOS_COM_JSON) {
    it(`${id}: árvore não-vazia, cada módulo com estudo real e ao menos uma prova`, () => {
      const c = conteudoCuradoDoCurso(esq(id));
      expect(c, `curso.json de ${id} deveria existir e parsear`).not.toBeNull();
      expect(c!.arvore.raiz.filhos.length).toBeGreaterThan(0);
      for (const ramo of c!.arvore.raiz.filhos) {
        expect(ramo.resumo.trim().length, `${id}/${ramo.id} sem estudo`).toBeGreaterThan(20);
        const lic = c!.licoesPorNo[ramo.id];
        expect(lic, `${id}/${ramo.id} sem lição`).toBeTruthy();
        expect(lic.prova.length, `${id}/${ramo.id} sem prova`).toBeGreaterThan(0);
        for (const q of lic.prova) {
          expect(q.enunciado.length).toBeGreaterThan(3);
          if (q.tipo === "escolha") expect(q.opcoes.some((o) => o.correta)).toBe(true);
          if (q.tipo === "escrita") expect(q.aceitas.length).toBeGreaterThan(0);
        }
      }
    });
  }

  it("id sem curso.json e sem skill no disco → null (curso depende do motor)", () => {
    expect(conteudoCuradoDoCurso(esq("nao-existe-xyz-123"))).toBeNull();
  });
});
