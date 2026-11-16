import { describe, it, expect } from "vitest";
import { TUTORIAIS, tutoriaisDoCurso } from "./tutoriais";
import { montarArquivo, estaCompleto, snippetsDoCard, validarDigitado } from "./tutorialArquivo";
import { validarCardContraArquivo } from "./cardsDoRepo";

describe("tutoriais — os cards bundlados são reais e harmônicos", () => {
  const todos = Object.entries(TUTORIAIS).flatMap(([curso, cards]) => cards.map((c) => [curso, c] as const));

  it("algoritmos-classicos entrega os três algoritmos que a skill promete", () => {
    const cards = tutoriaisDoCurso("algoritmos-classicos");
    expect(cards).toHaveLength(4);
    expect(cards.map((c) => c.arquivo)).toEqual([
      "searches/binary_search.py",
      "sorts/insertion_sort.py",
      "maths/greatest_common_divisor.py",
      "projeto.py",
    ]);
  });

  it.each(todos)("[%s] %o: a harmonia fecha e o card está completo", (_curso, card) => {
    // concatenar os snippets reconstrói o arquivo, sem quebrar a invariante
    expect(validarCardContraArquivo(card, montarArquivo(card))).toBe(true);
    // digitar cada snippet exato completa o arquivo
    expect(estaCompleto(card, snippetsDoCard(card).map((s) => s.codigo))).toBe(true);
    // todo card ensina de verdade: função, ao menos um snippet, e um teste ponta-a-ponta
    expect(card.funcao.length).toBeGreaterThan(10);
    expect(snippetsDoCard(card).length).toBeGreaterThan(0);
    expect((card.teste ?? "").length).toBeGreaterThan(0);
    // cada snippet se valida contra o próprio código (e recusa o vazio: nada de colar nada)
    for (const s of snippetsDoCard(card)) {
      expect(validarDigitado(s, s.codigo)).toBe(true);
      expect(validarDigitado(s, "")).toBe(false);
    }
  });
});
