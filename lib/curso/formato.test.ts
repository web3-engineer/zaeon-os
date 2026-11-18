/**
 * lib/curso/formato.test.ts — o contrato de um curso, e a reutilização do validador do professor.
 */
import { describe, expect, it } from "vitest";
import {
  KINDS_DE_PROVA, MIN_ESTUDO_CHARS, MIN_MODULOS, MIN_PROVA_BLOCOS, blocoValido, resumoDoCurso,
  validarCurso, type BlocoAutorado, type Modulo,
} from "@/lib/curso/formato";
import { EVALUABLE_KINDS } from "@/lib/aulas/blockTypes";

/** Blocos reais, na forma que `buildQuestionBlock` aceita. */
const choice = (): BlocoAutorado => ({
  kind: "q-choice",
  block: {
    text: "Qual é a velocidade da luz no vácuo?",
    options: [
      { text: "≈ 300.000 km/s", isCorrect: true, explanation: "c ≈ 2,998×10⁸ m/s." },
      { text: "≈ 300 km/s", isCorrect: false, explanation: "mil vezes menos." },
    ],
    marks: 2,
  },
});
const escrita = (): BlocoAutorado => ({
  kind: "q-written",
  block: { text: "Em uma frase, o que é o horizonte de eventos?", accepted: ["ponto sem retorno", "limite do buraco negro"], marks: 3 },
});

const estudo = (n = MIN_ESTUDO_CHARS + 20) => "x".repeat(n);
const modulo = (over: Partial<Modulo> = {}): Modulo => ({
  titulo: "Módulo",
  estudo: estudo(),
  prova: [choice(), escrita()],
  desafio: escrita(),
  sandbox: { tipo: "none" },
  ...over,
});
const curso = (mods = [modulo(), modulo()]) => ({ modulos: mods });

describe("KINDS_DE_PROVA — só avaliável e pronto", () => {
  it("todo kind de prova é avaliável", () => {
    for (const k of KINDS_DE_PROVA) expect(EVALUABLE_KINDS.has(k as any)).toBe(true);
  });
  it("inclui múltipla escolha e escrita, exclui o que não pontua", () => {
    expect(KINDS_DE_PROVA.has("q-choice")).toBe(true);
    expect(KINDS_DE_PROVA.has("q-written")).toBe(true);
    expect(KINDS_DE_PROVA.has("flashcards"), "flashcards não é avaliável").toBe(false);
    expect(KINDS_DE_PROVA.has("game-memory"), "jogo da memória não é avaliável").toBe(false);
  });
});

describe("blocoValido — o MESMO validador do professor", () => {
  it("aceita bloco bem-formado de um kind de prova", () => {
    expect(blocoValido(choice())).toBeTruthy();
    expect(blocoValido(escrita())).toBeTruthy();
  });
  it("recusa kind que não serve de prova, mesmo bem-formado", () => {
    expect(blocoValido({ kind: "flashcards", block: { cards: [{ front: "a", back: "b" }] } })).toBeNull();
  });
  it("recusa bloco degenerado — choice sem resposta correta", () => {
    expect(blocoValido({ kind: "q-choice", block: { text: "t", options: [{ text: "a", isCorrect: false }] } })).toBeNull();
  });
  it("não lança com lixo", () => {
    expect(blocoValido({ kind: "q-choice", block: undefined })).toBeNull();
    expect(blocoValido(null as any)).toBeNull();
  });
});

describe("validarCurso — completude estática, com o caminho do erro", () => {
  it("aceita um curso completo", () => {
    const v = validarCurso(curso());
    expect("curso" in v).toBe(true);
  });

  it("menos de dois módulos é recusado — curso não é uma aula só", () => {
    const v = validarCurso(curso([modulo()]));
    expect("problemas" in v && v.problemas.some((p) => p.motivo.includes(String(MIN_MODULOS)))).toBe(true);
  });

  it("estudo curto é recusado, com o módulo apontado", () => {
    const v = validarCurso(curso([modulo({ estudo: "curto" }), modulo()]));
    expect("problemas" in v && v.problemas.some((p) => p.onde === "módulo 1" && /estudo|caracteres/.test(p.motivo))).toBe(true);
  });

  it("prova pequena é recusada", () => {
    const v = validarCurso(curso([modulo({ prova: [choice()] }), modulo()]));
    expect("problemas" in v && v.problemas.some((p) => p.onde.includes("prova") && p.motivo.includes(String(MIN_PROVA_BLOCOS)))).toBe(true);
  });

  it("bloco de prova inválido aponta o ÍNDICE exato", () => {
    const ruim = { kind: "q-choice", block: { text: "t", options: [] } };
    const v = validarCurso(curso([modulo({ prova: [choice(), ruim] }), modulo()]));
    expect("problemas" in v && v.problemas.some((p) => p.onde === "módulo 1 · prova[1]")).toBe(true);
  });

  it("sem desafio é recusado", () => {
    const m = modulo(); delete (m as any).desafio;
    const v = validarCurso(curso([m, modulo()]));
    expect("problemas" in v && v.problemas.some((p) => p.onde.includes("desafio"))).toBe(true);
  });

  it("sandbox de código sem teste é recusado — tem de dizer se a prática passou", () => {
    const v = validarCurso(curso([modulo({ sandbox: { tipo: "python", inicial: "print(1)" } }), modulo()]));
    expect("problemas" in v && v.problemas.some((p) => p.onde.includes("sandbox") && p.motivo.includes("teste"))).toBe(true);
  });

  it("sandbox 'none' não exige código nem teste", () => {
    expect("curso" in validarCurso(curso())).toBe(true);
  });

  it("falta de `modulos` é recusado", () => {
    expect("problemas" in validarCurso({})).toBe(true);
    expect("problemas" in validarCurso({ modulos: "nope" })).toBe(true);
  });
});

describe("resumoDoCurso — o que o card mostra", () => {
  it("conta módulos, sandboxes e blocos de prova", () => {
    const c = { modulos: [modulo({ sandbox: { tipo: "python", inicial: "x", teste: "y" } }), modulo()] };
    expect(resumoDoCurso(c)).toEqual({ modulos: 2, comSandbox: 1, blocosDeProva: 4 });
  });
});
