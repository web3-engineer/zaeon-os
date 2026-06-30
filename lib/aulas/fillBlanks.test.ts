import { describe, it, expect } from "vitest";
import { parseCloze, parseDragwords, gradeBlanks, shuffleSeeded } from "@/lib/aulas/fillBlanks";

describe("parseCloze", () => {
  it("quebra texto em parts e extrai respostas dos *marcadores*", () => {
    const m = parseCloze("A capital é *Brasília* no *Brasil*.");
    expect(m.answers).toEqual(["Brasília", "Brasil"]);
    expect(m.parts).toEqual([
      { t: "text", s: "A capital é " },
      { t: "blank", i: 0 },
      { t: "text", s: " no " },
      { t: "blank", i: 1 },
      { t: "text", s: "." },
    ]);
    expect(m.bank.slice().sort()).toEqual(["Brasil", "Brasília"]);
  });
  it("sem marcadores → sem lacunas", () => {
    const m = parseCloze("texto sem lacuna");
    expect(m.answers).toEqual([]);
    expect(m.parts).toEqual([{ t: "text", s: "texto sem lacuna" }]);
  });
});

describe("parseDragwords", () => {
  it("respostas da sentence + distratores no banco", () => {
    const m = parseDragwords({ sentence: "O *gato* subiu no *telhado*.", words: ["cachorro"] });
    expect(m.answers).toEqual(["gato", "telhado"]);
    expect(m.bank.slice().sort()).toEqual(["cachorro", "gato", "telhado"]);
    expect(m.parts.filter((p) => p.t === "blank")).toHaveLength(2);
  });
});

describe("gradeBlanks", () => {
  it("crédito parcial, posição a posição, normalizado", () => {
    expect(gradeBlanks(["Brasília", "Brasil"], ["brasilia", "Brasil"])).toEqual({ correct: 2, total: 2, perBlank: [true, true] });
    expect(gradeBlanks(["a", "b", "c"], ["a", "x", "c"])).toEqual({ correct: 2, total: 3, perBlank: [true, false, true] });
    expect(gradeBlanks(["a"], [null])).toEqual({ correct: 0, total: 1, perBlank: [false] });
  });
});

describe("shuffleSeeded", () => {
  it("determinístico por seed e preserva os elementos", () => {
    const a = shuffleSeeded(["1", "2", "3", "4"], "q1");
    const b = shuffleSeeded(["1", "2", "3", "4"], "q1");
    expect(a).toEqual(b);
    expect(a.slice().sort()).toEqual(["1", "2", "3", "4"]);
  });
});
